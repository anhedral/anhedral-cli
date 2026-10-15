import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { ProjectStore } from '../server/store.ts';

test('bundled MCP runtime exposes standard UI resources, extension entrypoints and working catalog tools', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-ui-mcp-'));
  writeFileSync(path.join(directory, 'package.json'), '{"name":"mcp-project"}');
  const store = new ProjectStore(path.join(directory, 'catalog'));
  const id = store.register(directory);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('dist/server.mjs'), 'serve'],
    env: { ANHEDRAL_PLUGIN_DATA: path.join(directory, 'catalog') },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'dashboard-verification', version: '1.0.0' });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const open = tools.tools.find((tool) => tool.name === 'open_projects');
    assert.ok(open);
    assert.equal(open.title, 'Anhedral');
    assert.equal(open.icons?.[0].mimeType, 'image/svg+xml');
    assert.equal(
      Buffer.from(open.icons![0].src.split(',')[1], 'base64').toString(),
      readFileSync('../distribution/assets/anhedral-mark.svg', 'utf8'),
      'The sidebar tool advertises the bundled Anhedral logo without a network request',
    );
    assert.deepEqual(
      open.icons?.map((icon) => icon.theme),
      ['light', 'dark'],
    );
    assert.equal(
      Buffer.from(open.icons![1].src.split(',')[1], 'base64').toString(),
      readFileSync('../distribution/assets/anhedral-mark-dark.svg', 'utf8'),
    );
    assert.deepEqual((open._meta?.['openai/ui'] as { entrypoints: unknown[] }).entrypoints, [
      { type: 'global' },
      { type: 'thread' },
    ]);
    const snapshot = await client.callTool({ name: 'get_project', arguments: { id } });
    assert.equal(snapshot.isError, undefined);
    assert.ok('text' in snapshot.content[0]);
    assert.deepEqual(
      JSON.parse(snapshot.content[0].text),
      snapshot.structuredContent,
      'Headless text and structured inspection agree without rendering UI',
    );
    assert.equal((snapshot.structuredContent as { projects: { id: string }[] }).projects[0].id, id);
    const services = await client.callTool({ name: 'get_project_services', arguments: { id } });
    assert.equal(services.isError, undefined);
    assert.ok('text' in services.content[0]);
    assert.deepEqual(JSON.parse(services.content[0].text), services.structuredContent);
    assert.ok(
      tools.tools.find((tool) => tool.name === 'get_project_services')?.annotations?.readOnlyHint,
    );
    const context = await client.callTool({ name: 'get_project_context', arguments: { id } });
    assert.ok('text' in context.content[0]);
    assert.equal(JSON.parse(context.content[0].text).directory, realpathSync(directory));
    const catalog = await client.callTool({ name: 'get_catalog_context', arguments: {} });
    assert.ok('text' in catalog.content[0]);
    assert.equal(
      JSON.parse(catalog.content[0].text).directory,
      realpathSync(path.join(directory, 'catalog')),
    );
    assert.equal(JSON.parse(catalog.content[0].text).runtime, path.resolve('dist/server.mjs'));
    const renamed = await client.callTool({
      name: 'rename_project',
      arguments: { id, name: 'Updated project' },
    });
    assert.equal(
      (renamed.structuredContent as { projects: { name: string }[] }).projects[0].name,
      'Updated project',
    );
    const unknown = await client.callTool({
      name: 'get_project',
      arguments: { id: '00000000-0000-4000-8000-000000000000' },
    });
    assert.equal(unknown.isError, true);
    assert.ok('text' in unknown.content[0]);
    assert.equal(JSON.parse(unknown.content[0].text).code, 'PROJECT_NOT_FOUND');
    writeFileSync(path.join(directory, 'catalog/sites.lock'), 'interrupted writer');
    const busy = await client.callTool({ name: 'set_view', arguments: { view: 'grid' } });
    assert.ok('text' in busy.content[0]);
    assert.equal(JSON.parse(busy.content[0].text).code, 'CATALOG_BUSY');
    rmSync(path.join(directory, 'catalog/sites.lock'));
    assert.equal(
      tools.tools.some((tool) => tool.name.includes('recover')),
      false,
    );
    for (const name of ['open_projects', 'get_project_context', 'get_project_services']) {
      const rejected = await client.callTool({
        name,
        arguments: { id: '00000000-0000-4000-8000-000000000000' },
      });
      assert.equal(rejected.isError, true);
      assert.doesNotMatch(JSON.stringify(rejected), /ENOENT|catalog\/|private-data/);
    }
    const resources = await client.listResources();
    assert.equal(resources.resources.length, 1);
    const ui = await client.readResource({ uri: resources.resources[0].uri });
    assert.equal(ui.contents[0].mimeType, 'text/html;profile=mcp-app');
    assert.ok('text' in ui.contents[0]);
    const html = ui.contents[0].text;
    assert.match(html, /@layer theme, base, components, utilities;/);
    assert.doesNotMatch(html, /<script[^>]*src=|<link[^>]*href=/);
    assert.ok(html.length < 800000);
    assert.doesNotMatch(JSON.stringify(snapshot), /catalog\//);
    assert.equal(
      JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')).name,
      'mcp-project',
    );
  } finally {
    await client.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
