import { bootstrap } from './support/workspace-bootstrap.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  CAPABILITIES,
  STANDARD_PRODUCTS,
  STACK_REGISTRY,
  STACK_ITEMS,
  getStackItem,
  resolveStackRegistry,
  inspectWorkspaceGraph,
  parseStandardOptions,
  scaffoldStandardProject,
} from '../dist/index.js';

const names = (plan) => plan.items.map((item) => item.name);
const resolve = (args) =>
  resolveStackRegistry(parseStandardOptions('new', ['registry-test', ...args]));

test('every supported product is registered and shares selection rules with setup metadata', () => {
  for (const name of STANDARD_PRODUCTS) {
    assert.equal(getStackItem(name).name, name);
    assert.deepEqual(CAPABILITIES[name].selection, STACK_ITEMS[name].selection);
    assert.ok(getStackItem(name).targets.length);
  }
  assert.equal(
    new Set(STACK_REGISTRY.items.map((item) => item.name)).size,
    STACK_REGISTRY.items.length,
  );
  assert.throws(() => getStackItem('__proto__'), /Unknown stack registry item/);
});

test('runtime and database dependencies precede auth and resolve deterministically', () => {
  const flags = [
    '--next',
    '--expo',
    '--hono',
    '--neon',
    '--better-auth',
    '--stripe',
    '--revenuecat',
    '--posthog',
    '--basin',
  ];
  const first = resolve(flags);
  assert.deepEqual(first, resolve([...flags].reverse()));
  const ordered = names(first);
  for (const item of first.items)
    for (const dependency of item.registryDependencies)
      assert.ok(ordered.indexOf(dependency) < ordered.indexOf(item.name));
  const auth = first.items.find((item) => item.name === 'better-auth');
  assert.ok(auth.registryDependencies.includes('hono'));
  assert.ok(auth.registryDependencies.includes('neon'));
  assert.ok(ordered.indexOf('stripe') < ordered.indexOf('revenuecat'));
  assert.ok(ordered.indexOf('posthog') < ordered.indexOf('basin'));
  assert.equal(new Set(ordered).size, ordered.length);
  assert.ok(!names(resolve(['--expo'])).includes('ui'));
  assert.ok(names(resolve([])).includes('ui'));
});

test('plans resolve runtime-specific destinations, package names and bindings', () => {
  const item = (args, name) => resolve(args).items.find((entry) => entry.name === name);
  assert.deepEqual(item(['--basin'], 'basin').targets, ['packages/analytics']);
  assert.equal(item(['--basin'], 'basin').package.name, 'analytics');
  assert.deepEqual(item(['--basin', '--posthog'], 'basin').targets, ['packages/basin']);
  assert.equal(item(['--basin', '--posthog'], 'basin').package.name, 'basin');
  assert.ok(names(resolve(['--next', '--queues'])).includes('hono'));
  assert.ok(!names(resolve(['--expo', '--queues'])).includes('hono'));
  assert.equal(item(['--d1'], 'd1').bindings.d1_databases[0].database_name, 'registry-test-db');
  const nativeDatabase = item(['--next', '--neon'], 'neon');
  assert.equal(nativeDatabase.bindings, undefined);
  assert.ok(nativeDatabase.setup.resources.every((resource) => !resource.includes('Hyperdrive')));
});

test('registry inspection cannot mutate the release catalog', () => {
  const copy = getStackItem('d1');
  copy.targets.push('packages/accidental');
  copy.setup.tools.length = 0;
  assert.ok(!getStackItem('d1').targets.includes('packages/accidental'));
  assert.ok(getStackItem('d1').setup.tools.length);
  assert.throws(() => STACK_ITEMS.d1.targets.push('packages/accidental'), TypeError);
});

test('direct registry API rejects incompatible or incomplete selections', () => {
  const invalid =
    (products, hosting = 'cloudflare') =>
    () =>
      resolveStackRegistry({ products, hosting });
  assert.throws(invalid(['vinext', 'next']), /Choose one/);
  assert.throws(invalid(['hono', 'neon', 'd1']), /Choose one/);
  assert.throws(invalid(['hono', 'better-auth']), /requires.*neon or d1/);
  assert.throws(invalid(['expo', 'revenuecat']), /requires stripe/);
  assert.throws(invalid(['next', 'r2'], 'vercel'), /Cloudflare runtime/);
  assert.throws(invalid(['expo', 'neon']), /server runtime/);
  assert.throws(invalid(['made-up']), /Unknown stack product/);
});

test('registry inspection and planning work offline and do not create files', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-registry-cli-'));
  const cli = path.resolve('dist/bin.js');
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
  try {
    const list = run('registry', 'list', '--json');
    assert.equal(list.status, 0, list.stderr);
    assert.deepEqual(JSON.parse(list.stdout), STACK_REGISTRY);
    const view = run('registry', 'view', 'better-auth', '--json');
    assert.equal(view.status, 0, view.stderr);
    assert.equal(JSON.parse(view.stdout).name, 'better-auth');
    for (const args of [
      ['registry', 'view', '__proto__'],
      ['registry', 'list', 'unexpected'],
      ['registry', 'list', '--unknown'],
    ])
      assert.equal(run(...args, '--json').status, 1);
    const planned = path.join(root, 'app');
    const result = run('new', planned, '--better-auth', '--dry-run', '--json');
    assert.equal(result.status, 0, result.stderr);
    assert.ok(names(JSON.parse(result.stdout).registry).includes('d1'));
    assert.equal(existsSync(planned), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function writeManifest(root, directory, manifest) {
  mkdirSync(path.join(root, directory), { recursive: true });
  writeFileSync(path.join(root, directory, 'package.json'), JSON.stringify(manifest));
}

test('workspace graph validates references, duplicate names and cycles', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-workspace-graph-'));
  try {
    writeManifest(root, 'apps/web', {
      name: 'web',
      dependencies: { '@workspace/db': 'workspace:*', react: '^19' },
    });
    assert.throws(() => inspectWorkspaceGraph(root), /Missing workspace dependency/);
    writeManifest(root, 'packages/db', { name: '@workspace/db' });
    assert.deepEqual(inspectWorkspaceGraph(root).find((item) => item.name === 'web').dependencies, [
      '@workspace/db',
    ]);
    writeManifest(root, 'packages/db', { name: 'web' });
    assert.throws(() => inspectWorkspaceGraph(root), /Duplicate workspace package/);
    writeManifest(root, 'packages/db', {
      name: '@workspace/db',
      devDependencies: { web: 'workspace:*' },
    });
    assert.throws(() => inspectWorkspaceGraph(root), /Workspace dependency cycle/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('recipes compose all compatible products without package collisions, and invalid graphs roll back', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-registry-compose-'));
  const flags = [
    '--vinext',
    '--expo',
    '--electron',
    '--wxt',
    '--hono',
    '--neon',
    '--better-auth',
    '--r2',
    '--kv',
    '--realtime',
    '--queues',
    '--cron',
    '--workflows',
    '--openai',
    '--workers-ai',
    '--resend',
    '--stripe',
    '--revenuecat',
    '--sentry',
    '--basin',
    '--posthog',
    '--styling',
    '--local-data',
    '--skip-install',
    '--no-git',
    '--json',
  ];
  const runner = (broken) => (_command, args, cwd) => {
    if (args[0] === 'dlx')
      bootstrap(
        path.join(args[args.indexOf('--cwd') + 1], args[args.indexOf('--name') + 1]),
        broken,
      );
    else if (args.includes('--lockfile-only'))
      writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
    else throw new Error(`Unexpected command ${args}`);
  };
  const original = console.log;
  console.log = () => {};
  try {
    const target = path.join(root, 'composed');
    await scaffoldStandardProject(parseStandardOptions('new', [target, ...flags]), runner(false));
    const installed = JSON.parse(readFileSync(path.join(target, 'anhedral.registry.json'), 'utf8'));
    const workspaces = installed.workspaces.map((item) => item.directory);
    for (const directory of [
      'apps/web',
      'apps/mobile',
      'apps/desktop',
      'apps/extension',
      'apps/api',
      'packages/auth',
      'packages/db',
      'packages/billing',
      'packages/analytics',
      'packages/basin',
    ])
      assert.ok(workspaces.includes(directory), directory);
    assert.match(
      readFileSync(path.join(target, 'packages/analytics/src/index.ts'), 'utf8'),
      /PostHog/,
    );
    assert.match(
      readFileSync(path.join(target, 'packages/basin/src/index.ts'), 'utf8'),
      /recordEvents/,
    );
    assert.ok(installed.items.some((item) => item.name === 'revenuecat'));
    const invalid = path.join(root, 'invalid');
    await assert.rejects(
      scaffoldStandardProject(
        parseStandardOptions('new', [invalid, '--next', '--skip-install', '--no-git', '--json']),
        runner(true),
      ),
      /Missing workspace dependency/,
    );
    assert.equal(existsSync(invalid), false);
  } finally {
    console.log = original;
    rmSync(root, { recursive: true, force: true });
  }
});
