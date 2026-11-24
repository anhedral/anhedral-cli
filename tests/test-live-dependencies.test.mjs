import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { scaffoldAnhedralStack, parseInitOptions } from '../dist/index.js';
import { runCapabilityCommand } from '../dist/composition/command.js';
import { selectReleases } from '../dist/registry/releases.js';
import * as catalog from '../dist/dependencies.js';

const run = () => {
  throw Error('Unexpected install');
};
const json = (root, name) => JSON.parse(readFileSync(path.join(root, name), 'utf8'));
function fixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-live-pins-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const calls = [];
  const records = new Map();
  function publish(name, version, data = {}) {
    const versions = records.get(name) ?? {};
    versions[version] = { version, ...data };
    records.set(name, versions);
  }
  for (const group of [
    catalog.WEB_DEPENDENCIES.dependencies,
    catalog.WEB_DEPENDENCIES.devDependencies,
    catalog.STACK_DEPENDENCIES,
    catalog.ANHEDRAL_STACK_DEPENDENCIES,
    catalog.CLIENT_DEPENDENCIES,
    catalog.CAPABILITY_DEPENDENCIES,
  ])
    for (const [name, version] of Object.entries(group)) publish(name, version);
  publish('@cloudflare/realtimekit-react', '2.0.0', {
    dependencies: { '@cloudflare/realtimekit': '2.0.0' },
  });
  publish('@types/node', catalog.ELECTRON_NODE_TYPES);
  publish('pnpm', catalog.PACKAGE_MANAGER.split('@')[1]);
  publish('expo-template-blank', '58.1.0', {
    dependencies: { expo: '58.x', react: '19.3.0', 'react-native': '0.88.1' },
  });
  t.mock.method(globalThis, 'fetch', async (url) => {
    const name = decodeURIComponent(url.pathname.split('/').pop());
    calls.push(name);
    assert.notEqual(url.host, 'index.crates.io', 'Electron resolves only npm packages');
    if (!records.has(name)) return new Response(null, { status: 503 });
    return Response.json({ name, versions: records.get(name) });
  });
  const init = (name, ...flags) =>
    scaffoldAnhedralStack(
      parseInitOptions([...flags, path.join(directory, name), '--skip-install', '--no-git']),
      run,
      { quiet: true },
    );
  async function add(root, ...args) {
    const cwd = process.cwd();
    try {
      process.chdir(root);
      await runCapabilityCommand('add', [...args, '--skip-install'], { quiet: true }, run);
    } finally {
      process.chdir(cwd);
    }
  }
  return { directory, calls, init, add, publish, records };
}
test('init and add write the highest compatible stable pins even when installation is skipped', async (t) => {
  const { directory, calls, init, add, publish, records } = fixture(t);
  publish('turbo', '2.15.0');
  publish('turbo', '2.16.0-rc.1');
  publish('turbo', '2.17.0', { deprecated: 'retired' });
  publish('turbo', '2.18.0', { engines: { node: '>=200' } });
  publish('turbo', '3.0.0');
  publish('pnpm', '10.99.0');
  await init('demo');
  const root = path.join(directory, 'demo');
  const manifest = json(root, 'package.json');
  assert.equal(manifest.devDependencies.turbo, '2.15.0');
  assert.equal(manifest.packageManager, 'pnpm@10.99.0');
  assert.deepEqual(new Set(calls), new Set(['turbo', 'pnpm']));
  publish('commander', '15.3.0');
  await add(root, 'cli');
  assert.equal(json(root, 'apps/cli/package.json').dependencies.commander, '15.3.0');
  assert.deepEqual(json(root, 'package.json').devDependencies, manifest.devDependencies);
  const before = calls.length;
  await add(root, 'cli');
  await add(root, 'desktop', '--dry-run');
  assert.equal(calls.length, before);
  assert.equal(existsSync(path.join(root, 'apps/desktop')), false);
  const cliFile = path.join(root, 'apps/cli/package.json');
  const local = json(root, 'apps/cli/package.json');
  local.description = 'My commands';
  local.dependencies['@customer/shared'] = '1.0.0';
  local.devDependencies.typescript = 'file:../compiler';
  publish('esbuild', '0.28.99', { peerDependencies: { '@customer/shared': '^2' } });
  writeFileSync(cliFile, JSON.stringify(local, null, 2));
  records.delete('hono');
  await assert.rejects(add(root, 'api'), /registry metadata for hono/);
  assert.equal(existsSync(path.join(root, 'apps/api')), false);
  assert.deepEqual(json(root, 'apps/cli/package.json'), local);
  publish('hono', '4.99.0');
  await add(root, 'api');
  assert.equal(json(root, 'apps/api/package.json').dependencies.hono, '4.99.0');
  assert.equal(json(root, 'apps/cli/package.json').dependencies.commander, '15.3.0');
  const cli = json(root, 'apps/cli/package.json');
  assert.equal(cli.description, 'My commands');
  assert.equal(cli.devDependencies.typescript, 'file:../compiler');
  assert.equal(cli.devDependencies.esbuild, catalog.CLIENT_DEPENDENCIES.esbuild);
  assert.equal(calls.includes('@customer/shared'), false);
  const apiPath = path.join(root, 'apps/api/package.json');
  const api = json(root, 'apps/api/package.json');
  api.dependencies.zod = '4.99.0';
  publish('zod', '4.99.0');
  writeFileSync(apiPath, JSON.stringify(api));
  await add(root, 'db', 'auth');
  assert.equal(json(root, 'apps/api/package.json').dependencies.zod, '4.99.0');
});
test('full init resolves the stack once, pins Electron and honors Expo constraints, and can reproduce the release catalog offline', async (t) => {
  const { directory, calls, init, publish } = fixture(t);
  publish('electron', '45.90.0', { dependencies: { '@types/node': '^24.9.0' } });
  publish('electron', '45.91.0-rc.1');
  publish('react', '19.4.0');
  publish('react-dom', '19.4.0', { peerDependencies: { react: '^19.4.0' } });
  publish('@cloudflare/realtimekit-react', '2.1.1', {
    dependencies: { '@cloudflare/realtimekit': '2.1.1' },
  });
  publish('@cloudflare/realtimekit-react-ui', '2.2.0', {
    peerDependencies: { '@cloudflare/realtimekit': '2.1.1' },
  });
  publish('@cloudflare/realtimekit-react-ui', '2.3.0');
  await init('all-dry', 'all', '--dry-run');
  await init('baseline', 'all', '--catalog-pins');
  assert.equal(calls.length, 0);
  await init('full', 'all');
  const root = path.join(directory, 'full');
  assert.equal(json(root, 'apps/web/package.json').dependencies.react, '19.4.0');
  assert.equal(json(root, 'apps/mobile/package.json').dependencies.react, '19.3.0');
  const web = json(root, 'apps/web/package.json').dependencies;
  assert.equal(web['@cloudflare/realtimekit-react'], '2.1.1');
  assert.equal(web['@cloudflare/realtimekit-react-ui'], '2.2.0');
  assert.equal(
    json(root, 'apps/web/package.json').dependencies['@workspace/styling'],
    'workspace:*',
  );
  assert.equal(calls.filter((n) => n === 'react').length, 1);
  assert.equal(json(root, 'apps/desktop/package.json').devDependencies.electron, '45.90.0');
  assert.ok(!calls.includes('@tauri-apps/cli'));
  assert.ok(!existsSync(path.join(root, 'apps/desktop/src-tauri')));
});
test('a failed init rolls back and an incompatible peer falls back to the newest working release', async (t) => {
  const { directory, records, init } = fixture(t);
  records.delete('turbo');
  await assert.rejects(init('failed'), /registry metadata for turbo/);
  assert.equal(existsSync(path.join(directory, 'failed')), false);
  const graph = new Map([
    [
      'plugin',
      [
        { version: '1.4.0', peerDependencies: { runtime: '^3' } },
        { version: '1.3.0', peerDependencies: { runtime: '^2' } },
      ],
    ],
    ['runtime', [{ version: '2.2.0' }, { version: '2.1.0' }]],
  ]);
  const solved = selectReleases(graph, 'fixture');
  assert.equal(solved.get('plugin').version, '1.3.0');
  assert.equal(solved.get('runtime').version, '2.2.0');
  graph.set('runtime', [{ version: '1.0.0' }]);
  assert.throws(() => selectReleases(graph, 'fixture'), /No compatible stable version/);
});
