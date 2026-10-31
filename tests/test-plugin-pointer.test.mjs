import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('candidate build coordinates the marketplace pointer without publishing a tag', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-plugin-pointer-'));
  const write = (name, value) => {
    const target = path.join(root, name);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, value);
  };
  const version = '0.18.0';
  try {
    write('package.json', JSON.stringify({ type: 'module' }));
    write('scripts/prepare-cli.mjs', readFileSync('scripts/prepare-cli.mjs'));
    write('dist/bin.js', '#!/usr/bin/env node\n');
    write('dist/version.js', `export const GENERATOR_VERSION = '${version}';`);
    write(
      'dist/stack-registry.js',
      `export const STACK_REGISTRY = {cliVersion:'${version}',items:[]}; export function validateStackCatalog() {}`,
    );
    write('plugins/codex/distribution/plugin.json', JSON.stringify({ version: '0.17.0' }));
    write(
      '.agents/plugins/marketplace.json',
      JSON.stringify({
        plugins: [
          { name: 'anhedral', source: { ref: 'plugin-v0.17.0', path: './plugins/anhedral' } },
        ],
      }),
    );
    write('LICENSE', 'fixture license');
    for (const name of [
      'software-factory',
      'anhedral-stack',
      'stack-standard',
      'native-ui',
      'ui',
      'capabilities',
    ])
      write(`docs/${name}.md`, 'fixture guide\n');
    execFileSync(process.execPath, [path.join(root, 'scripts/prepare-cli.mjs')], { cwd: root });
    const marketplace = JSON.parse(
      readFileSync(path.join(root, '.agents/plugins/marketplace.json')),
    );
    assert.deepEqual(marketplace.plugins[0].source, {
      ref: `plugin-v${version}`,
      path: './plugins/anhedral',
    });
    assert.equal(
      JSON.parse(readFileSync(path.join(root, 'plugins/codex/distribution/plugin.json'))).version,
      version,
    );
    // No Git repository or remote exists in this fixture; preparation is local only.
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
