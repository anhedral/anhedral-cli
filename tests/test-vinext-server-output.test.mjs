import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import vm from 'node:vm';
import { VINEXT_SERVER_OUTPUT_PLUGIN } from '../dist/vinext.js';
import { verifyServerModuleGraph } from './support/server-module-graph.mjs';

test('Vinext RSC chunks share the manifest directory while client and SSR outputs retain their layout', () => {
  const plugin = vm.runInNewContext(`(${VINEXT_SERVER_OUTPUT_PLUGIN})`);
  assert.equal(plugin.apply, 'build');
  assert.equal(plugin.enforce, 'post');
  const output = {
    chunkFileNames: '_next/static/[name]-[hash].js',
    entryFileNames: 'index.js',
    sourcemap: true,
  };
  const server = plugin.outputOptions.call({ environment: { name: 'rsc' } }, output);
  assert.equal(server.chunkFileNames, '[name]-[hash].js');
  assert.equal(server.entryFileNames, output.entryFileNames);
  assert.equal(server.sourcemap, true);
  for (const name of ['client', 'ssr'])
    assert.equal(plugin.outputOptions.call({ environment: { name } }, output), undefined);
  assert.equal(output.chunkFileNames, '_next/static/[name]-[hash].js');
});

test('built server graph rejects misplaced Vinext modules and checks static, export and lazy imports', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-vinext-modules-'));
  try {
    mkdirSync(path.join(root, '_next/static'), { recursive: true });
    const manifest = '__vinext_cacheability_manifest.js';
    writeFileSync(path.join(root, manifest), 'export default { routes: {} };');
    writeFileSync(
      path.join(root, '_next/static/worker.js'),
      `import manifest from './${manifest}';`,
    );
    assert.throws(() => verifyServerModuleGraph(root), /Missing built module.*worker\.js/);
    rmSync(path.join(root, '_next/static/worker.js'));
    writeFileSync(
      path.join(root, 'worker.js'),
      `import manifest from './${manifest}'; export { default } from './${manifest}'; export const lazy = () => import('./${manifest}'); const text = 'import("./not-a-module.js")';`,
    );
    assert.deepEqual(verifyServerModuleGraph(root), { modules: 2, imports: 3 });
    writeFileSync(
      path.join(root, 'worker.js'),
      'export const lazy = () => import(`./missing.js`);',
    );
    assert.throws(() => verifyServerModuleGraph(root), /Missing built module/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
