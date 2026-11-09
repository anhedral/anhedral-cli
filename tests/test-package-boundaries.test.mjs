import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { buildPluginArchive } from '../scripts/plugin/package-plugin.mjs';
import { readStoredArchive } from '../scripts/plugin/publish-plugin-source.mjs';
import { scanText } from '../scripts/secret-scanner.mjs';
test('plugin ownership rejects extra files and linked distribution roots without remote connections', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-plugin-boundary-'));
  try {
    const folder = path.join(root, 'plugin');
    mkdirSync(path.dirname(folder), { recursive: true });
    cpSync(new URL('../plugin/', import.meta.url), folder, { recursive: true });
    cpSync(new URL('../package.json', import.meta.url), path.join(root, 'package.json'));
    const good = buildPluginArchive(root);
    const files = readStoredArchive(good.contents);
    assert.ok(!files.some((file) => /(?:^|\/)\.?mcp\.json$/.test(file.name)));
    // One distribution serves Codex and Claude Code; both manifests ship in the archive.
    for (const name of ['.claude-plugin/plugin.json'])
      assert.ok(
        files.some((file) => file.name === name),
        name,
      );
    for (const name of ['mcp.json', '.mcp.json']) {
      writeFileSync(
        path.join(folder, name),
        JSON.stringify({ mcpServers: { remote: { url: 'https://example.invalid/mcp' } } }),
      );
      assert.throws(() => buildPluginArchive(root), /reviewed public distribution/);
      rmSync(path.join(folder, name));
    }
    const manifestFile = path.join(folder, 'plugin.json');
    const original = readFileSync(manifestFile, 'utf8');
    for (const change of [
      (manifest) => {
        manifest.mcpServers = { remote: { url: 'https://example.invalid/mcp' } };
      },
      (manifest) => {
        manifest.extensions['com.openai'].hooks = './hooks.json';
      },
      (manifest) => {
        manifest.extensions['com.openai'].apps = './apps.json';
      },
    ]) {
      const changed = JSON.parse(original);
      change(changed);
      writeFileSync(manifestFile, JSON.stringify(changed));
      assert.throws(() => buildPluginArchive(root), /CLI plugin/);
    }
    writeFileSync(manifestFile, original);
    const claudeManifestFile = path.join(folder, '.claude-plugin/plugin.json');
    const claudeManifest = readFileSync(claudeManifestFile, 'utf8');
    const drifted = JSON.parse(claudeManifest);
    drifted.version = `${drifted.version}-drift`;
    writeFileSync(claudeManifestFile, JSON.stringify(drifted));
    assert.throws(() => buildPluginArchive(root), /Claude plugin manifest/);
    writeFileSync(claudeManifestFile, claudeManifest);
    writeFileSync(path.join(folder, 'unreviewed.mjs'), 'export const privateImplementation = 1;');
    assert.throws(() => buildPluginArchive(root), /reviewed public distribution/);
    rmSync(path.join(folder, 'unreviewed.mjs'));
    const other = path.join(root, 'actual');
    cpSync(folder, other, { recursive: true });
    rmSync(folder, { recursive: true });
    symlinkSync(other, folder);
    assert.throws(() => buildPluginArchive(root), /symbolic link/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('oversized known text is explicitly unscanned and cannot count as secret-clean', () => {
  const bytes = Buffer.alloc(5 * 1024 * 1024 + 1, 32);
  assert.deepEqual(scanText('large.json', bytes), [
    { path: 'large.json', line: 1, pattern: 'unscanned-oversized-text' },
  ]);
  assert.deepEqual(scanText('binary.png', bytes), []);
  assert.deepEqual(scanText('ordinary.json', Buffer.from('{}')), []);
});
