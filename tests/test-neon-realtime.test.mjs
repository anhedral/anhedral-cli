import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { parseStandardOptions } from '../dist/standard.js';
import { resolveStackRegistry } from '../dist/registry/resolve.js';
import { composeStack } from '../dist/scaffold/compose.js';
import { readProjectConfig } from '../dist/project-config.js';
import { STACK_DEPENDENCIES } from '../dist/dependencies.js';
import { bootstrap } from './support/workspace-bootstrap.mjs';

async function fixture(flags, run) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-neon-realtime-'));
  try {
    const options = parseStandardOptions([root, ...flags]);
    bootstrap(root);
    await composeStack(root, options, resolveStackRegistry(options));
    await run(root, options);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const read = (root, file) => readFileSync(path.join(root, file), 'utf8');

test('Neon Realtime defaults and auth database choices are independent of flag order', () => {
  assert.deepEqual(parseStandardOptions(['app', '--neon-realtime']).products, [
    'anhedral-ui',
    'better-auth',
    'expo',
    'hono',
    'neon',
    'neon-realtime',
    'r2',
  ]);
  for (const flags of [
    ['--better-auth', '--neon-realtime'],
    ['--neon-realtime', '--better-auth'],
    ['--next', '--better-auth', '--neon-realtime'],
    ['--neon-realtime', '--better-auth', '--next'],
  ]) {
    const options = parseStandardOptions(['app', ...flags]);
    assert.ok(options.products.includes('neon'));
    assert.ok(options.products.includes('better-auth'));
    assert.ok(!options.products.includes('d1'));
  }
  assert.throws(() => parseStandardOptions(['app', '--d1', '--neon-realtime']), /Choose one/);
  for (const native of ['expo', 'electron', 'wxt'])
    assert.ok(
      parseStandardOptions(['app', `--${native}`, '--neon-realtime']).products.includes('hono'),
    );
  const coexisting = parseStandardOptions(['app', '--realtime', '--neon-realtime']);
  assert.ok(coexisting.products.includes('realtime'));
  assert.ok(coexisting.products.includes('neon-realtime'));
});

for (const [name, flags, runtime, environment] of [
  ['Vinext', ['--vinext', '--neon-realtime'], 'api', 'env.example'],
  ['native Vercel', ['--next', '--neon-realtime'], 'api', 'env.example'],
  ['Hono with Vercel', ['--next', '--hono', '--neon-realtime'], 'api', 'env.example'],
])
  test(`${name} composes one shared Neon Realtime package with separate server and client boundaries`, () =>
    fixture(flags, (root) => {
      const directory = 'packages/neon-realtime';
      const manifest = JSON.parse(read(root, `${directory}/package.json`));
      assert.deepEqual(manifest.exports, {
        './server': './src/server.ts',
        './client': './src/client.ts',
      });
      assert.equal(existsSync(path.join(root, directory, 'src/index.ts')), false);
      for (const dependency of ['@neon/realtime', '@neon/realtime-drizzle']) {
        assert.equal(manifest.dependencies[dependency], '0.1.0');
        assert.equal(manifest.dependencies[dependency], STACK_DEPENDENCIES[dependency]);
      }
      const client = read(root, `${directory}/src/client.ts`);
      const module = ts.createSourceFile('client.ts', client, ts.ScriptTarget.Latest, true);
      const imports = module.statements
        .filter(ts.isImportDeclaration)
        .map((statement) => statement.moduleSpecifier.text);
      assert.deepEqual(imports, ['@neon/realtime/client', '@neon/realtime-drizzle/client']);
      assert.doesNotMatch(client, /NEON_REALTIME_SECRET|DATABASE_URL|@workspace\/db|process\.env/);
      assert.match(read(root, `apps/${runtime}/${environment}`), /^NEON_REALTIME_SECRET=$/m);
      const configuration = readProjectConfig(root);
      assert.equal(configuration.registry.resourcesProvisioned, false);
      assert.ok(!Object.hasOwn(configuration, 'neon-realtime'));
      assert.deepEqual(
        readdirSync(root).filter((file) => /^anhedral.*\.json$/.test(file)),
        ['anhedral.json'],
      );
      const guide = read(root, `${directory}/README.md`);
      assert.match(guide, /Recheck authentication and authorization on every renewal/);
      assert.match(guide, /subscription\.renew\(next\)/);
      assert.match(guide, /subscription\.unsubscribe\(\)/);
      assert.match(guide, /does not enable Realtime/);
      assert.match(guide, /Never subscribe to auth\/session\/credential tables/);
    }));

test('managed Neon subscriptions coexist with independent Durable Object rooms', () =>
  fixture(['--vinext', '--realtime', '--neon-realtime'], (root) => {
    assert.ok(existsSync(path.join(root, 'packages/db/src/index.ts')));
    assert.ok(existsSync(path.join(root, 'packages/neon-realtime/src/server.ts')));
    assert.ok(existsSync(path.join(root, 'apps/realtime/src/index.ts')));
    const rooms = JSON.parse(read(root, 'apps/realtime/anhedral.cloudflare.json'));
    assert.ok(rooms.durable_objects.bindings.length > 0);
    assert.deepEqual(
      readdirSync(path.join(root, 'packages')).filter((name) => name === 'db'),
      ['db'],
    );
  }));

test('generated server wrapper passes the decoded database name and sanitizes invalid configuration errors', () =>
  fixture(['--neon-realtime'], async (root) => {
    const directory = path.join(root, 'packages/neon-realtime');
    const sdk = path.join(directory, 'node_modules/@neon/realtime');
    const adapter = path.join(directory, 'node_modules/@neon/realtime-drizzle');
    for (const target of [sdk, adapter]) mkdirSync(target, { recursive: true });
    writeFileSync(
      path.join(sdk, 'package.json'),
      JSON.stringify({ type: 'module', exports: { './server': './server.js' } }),
    );
    writeFileSync(
      path.join(sdk, 'server.js'),
      'export const createRealtime = options => options;\n',
    );
    writeFileSync(
      path.join(adapter, 'package.json'),
      JSON.stringify({ type: 'module', exports: './index.js' }),
    );
    writeFileSync(
      path.join(adapter, 'index.js'),
      'export const drizzleAdapter = () => ({ kind: "fixture-drizzle" });\n',
    );
    const compiled = ts.transpileModule(read(root, 'packages/neon-realtime/src/server.ts'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const entry = path.join(directory, 'server-test.mjs');
    writeFileSync(entry, compiled);
    const { createNeonRealtime } = await import(pathToFileURL(entry));
    const secret = 'private-test-branch-secret';
    const connection = new URL('postgresql://db.example/app%20data?sslmode=require');
    connection.username = 'fixture';
    connection.password = 'private-fixture-value';
    const value = createNeonRealtime({
      secret,
      databaseUrl: connection.href,
    });
    assert.deepEqual(value, { secret, db: 'app data', adapter: { kind: 'fixture-drizzle' } });
    for (const databaseUrl of [
      'not-a-url-private-value',
      'https://user:private-password@host/db',
      'postgres://host/',
      'postgres://host/a%2Fb',
      'postgres://host/%FF',
    ]) {
      assert.throws(
        () => createNeonRealtime({ secret, databaseUrl }),
        (error) => {
          assert.equal(
            error.message,
            'Configure a PostgreSQL DATABASE_URL with the intended database name.',
          );
          assert.ok(!error.message.includes(databaseUrl));
          assert.ok(!error.message.includes(secret));
          return true;
        },
      );
    }
    assert.throws(
      () => createNeonRealtime({ secret: '  ', databaseUrl: 'postgres://host/db' }),
      /Configure the branch NEON_REALTIME_SECRET on the server/,
    );
  }));
