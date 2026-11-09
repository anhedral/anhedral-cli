import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
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
    write('scripts/build/prepare-cli.mjs', readFileSync('scripts/build/prepare-cli.mjs'));
    write(
      'scripts/checks/repository-boundaries.mjs',
      'export function checkRepositoryBoundary() {}\n',
    );
    write('dist/bin.js', '#!/usr/bin/env node\n');
    write('dist/version.js', `export const GENERATOR_VERSION = '${version}';`);
    write(
      'dist/composition/catalog.js',
      `export const ANHEDRAL_STACK = {id:'anhedral-stack',name:'Anhedral Stack',additions:{backend:{},r2:{},stripe:{}}};`,
    );
    write('plugin/references/native-ui.md', 'retired');
    write('plugin/references/anhedral-stack.md', 'retired');
    write(
      'plugin/plugin.json',
      JSON.stringify({ version: '0.17.0', description: 'fixture description' }),
    );
    write(
      'plugin/.claude-plugin/plugin.json',
      JSON.stringify({ name: 'anhedral', version: '0.17.0', description: 'stale' }),
    );
    write(
      '.claude-plugin/marketplace.json',
      JSON.stringify({
        name: 'anhedral',
        plugins: [
          {
            name: 'anhedral',
            version: '0.17.0',
            source: { source: 'git-subdir', ref: 'plugin-v0.17.0', path: 'plugins/anhedral' },
          },
        ],
      }),
    );
    write(
      '.agents/plugins/marketplace.json',
      JSON.stringify({
        plugins: [
          { name: 'anhedral', source: { ref: 'plugin-v0.17.0', path: './plugins/anhedral' } },
        ],
      }),
    );
    write('LICENSE', 'fixture license');
    for (const name of ['software-factory', 'stack-standard', 'ui', 'capabilities'])
      write(`docs/${name}.md`, 'fixture guide\n');
    execFileSync(process.execPath, [path.join(root, 'scripts/build/prepare-cli.mjs')], {
      cwd: root,
    });
    const marketplace = JSON.parse(
      readFileSync(path.join(root, '.agents/plugins/marketplace.json')),
    );
    assert.deepEqual(marketplace.plugins[0].source, {
      ref: `plugin-v${version}`,
      path: './plugins/anhedral',
    });
    assert.equal(JSON.parse(readFileSync(path.join(root, 'plugin/plugin.json'))).version, version);
    const claudeManifest = JSON.parse(
      readFileSync(path.join(root, 'plugin/.claude-plugin/plugin.json')),
    );
    assert.equal(claudeManifest.version, version);
    assert.equal(claudeManifest.description, 'fixture description');
    const claudeMarketplace = JSON.parse(
      readFileSync(path.join(root, '.claude-plugin/marketplace.json')),
    );
    assert.equal(claudeMarketplace.plugins[0].version, version);
    assert.deepEqual(claudeMarketplace.plugins[0].source, {
      source: 'git-subdir',
      ref: `plugin-v${version}`,
      path: 'plugins/anhedral',
    });
    const registry = JSON.parse(
      readFileSync(path.join(root, 'plugin/references/stack-registry.json')),
    );
    assert.equal(registry.id, 'anhedral-stack');
    assert.equal(registry.cliVersion, version);
    assert.deepEqual(Object.keys(registry.additions).sort(), ['backend', 'r2', 'stripe']);
    assert.equal(registry.items, undefined);
    for (const name of ['native-ui.md', 'anhedral-stack.md'])
      assert.equal(existsSync(path.join(root, 'plugin/references', name)), false);
    // No Git repository or remote exists in this fixture; preparation is local only.
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
