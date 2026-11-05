import assert from 'node:assert/strict';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const cli = path.resolve('dist/bin.js');
const workspace = mkdtempSync(path.join(tmpdir(), 'anhedral-launch-tests-'));
const run = (args, cwd = workspace) =>
  spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, CI: '1' },
  });
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
function generate(name, extra = []) {
  const destination = path.join(workspace, name);
  const result = run(['init', destination, '--skip-install', '--no-git', '--json', ...extra]);
  assert.equal(result.status, 0, result.stderr);
  return destination;
}
test.after(() => rmSync(workspace, { recursive: true, force: true }));

test('public init produces only TanStack Start and Anhedral UI', () => {
  const root = generate('core');
  const configuration = json(path.join(root, 'anhedral.json'));
  assert.equal(configuration.composition.foundation, 'tanstack-start');
  assert.equal(configuration.composition.contractVersion, 2);
  assert.deepEqual(configuration.capabilities.installed, []);
  const web = json(path.join(root, 'apps/web/package.json'));
  assert.ok(web.dependencies['@tanstack/react-start']);
  assert.equal(web.scripts.dev, 'node ../../scripts/oj.mjs dev . --host=0.0.0.0 --port 3000');
  assert.equal(web.dependencies.next, undefined);
  assert.equal(web.dependencies['@opennextjs/cloudflare'], undefined);
  for (const file of ['apps/web/src/server.ts', 'apps/web/src/routes/index.tsx'])
    assert.ok(existsSync(path.join(root, file)), file);
  for (const directory of [
    'apps/api',
    'packages/db',
    'apps/mobile',
    'apps/extension',
    'apps/desktop',
  ])
    assert.equal(existsSync(path.join(root, directory)), false);
  assert.equal(web.dependencies['better-auth'], undefined);
  assert.equal(configuration.setup.cliVersion, configuration.composition.generatorVersion);
  const policy = parseYaml(readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8'));
  assert.deepEqual(policy.allowBuilds, { esbuild: true, workerd: true });
  assert.equal(policy.onlyBuiltDependencies, undefined);
  assert.equal(policy.dangerouslyAllowAllBuilds, undefined);
  assert.equal(run(['stack', 'doctor', '--json'], root).status, 0);
  assert.equal(run(['ui', 'doctor', '--web', '--json'], root).status, 0);
});

test('dry run does not create a destination and distinguishes literal flag-shaped directories', () => {
  const root = path.join(workspace, 'preview');
  const result = run(['init', root, '--dry-run', '--json']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).capabilities, []);
  assert.equal(existsSync(root), false);
  const literal = run(['init', '--dry-run', '--json', '--', '--stripe']);
  assert.equal(literal.status, 0, literal.stderr);
  assert.equal(JSON.parse(literal.stdout).capabilities.includes('stripe'), false);
});

test('backend is one atomic addition, with storage and Stripe independently progressive', () => {
  const root = generate('progression');
  let result = run(['add', 'backend', '--skip-install', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(json(path.join(root, 'anhedral.json')).capabilities.installed, [
    'hono',
    'database-auth',
  ]);
  assert.ok(existsSync(path.join(root, 'apps/api/src/auth.ts')));
  assert.ok(existsSync(path.join(root, 'apps/web/src/routes/sign-in.tsx')));
  const server = readFileSync(path.join(root, 'apps/web/src/server.ts'), 'utf8');
  assert.match(server, /createStartHandler\(defaultStreamHandler\)/);
  assert.match(
    server,
    /return handler\(request, \{ context: \{ api: bindings.ANHEDRAL_API \} \}\)/,
  );
  assert.doesNotMatch(server, /server-entry|handler\.fetch/);

  assert.equal(existsSync(path.join(root, 'apps/api/src/features/storage.ts')), false);
  assert.match(
    readFileSync(path.join(root, 'apps/api/src/auth-features.ts'), 'utf8'),
    /emailPassword: false/,
  );
  result = run(['add', 'r2', '--skip-install', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  result = run(['add', 'stripe', '--skip-install', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(path.join(root, 'apps/api/src/features/storage.ts')));
  assert.ok(existsSync(path.join(root, 'apps/api/src/features/stripe.ts')));
  assert.equal(json(path.join(root, 'anhedral.json')).composition.foundation, 'tanstack-start');
  assert.equal(run(['stack', 'doctor', '--json'], root).status, 0);
});

test('missing backend stops before storage writes, while explicit dependency expansion is supported', () => {
  const root = generate('prerequisites');
  assert.notEqual(run(['add', 'r2', '--skip-install', '--json'], root).status, 0);
  assert.equal(existsSync(path.join(root, 'apps/api')), false);
  const result = run(['add', 'stripe', '--with-dependencies', '--skip-install', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(json(path.join(root, 'anhedral.json')).capabilities.installed, [
    'hono',
    'database-auth',
    'stripe',
  ]);
  assert.equal(existsSync(path.join(root, 'apps/api/src/features/storage.ts')), false);
});

test('Stripe additions preserve customized composition adapters', () => {
  const root = generate('customized');
  const file = path.join(root, 'apps/web/vite.config.ts');
  const edited = readFileSync(file, 'utf8') + '// customer customization\n';
  writeFileSync(file, edited);
  const result = run(['add', 'backend', '--skip-install', '--json'], root);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(file, 'utf8'), edited);
  assert.equal(existsSync(path.join(root, 'apps/api/src/features/stripe.ts')), false);
});

test('init preserves an existing ignore file and refuses existing applications', () => {
  const root = path.join(workspace, 'ignore');
  mkdirSync(root);
  writeFileSync(path.join(root, '.gitignore'), '# customer rule\nlocal-material/\n');
  const first = run(['init', root, '--skip-install', '--no-git', '--json']);
  assert.equal(first.status, 0, first.stderr);
  assert.match(
    readFileSync(path.join(root, '.gitignore'), 'utf8'),
    /# customer rule\nlocal-material\//,
  );
  const before = readFileSync(path.join(root, 'anhedral.json'), 'utf8');
  assert.notEqual(run(['init', root, '--skip-install', '--no-git', '--json']).status, 0);
  assert.equal(readFileSync(path.join(root, 'anhedral.json'), 'utf8'), before);
});

test('new starter declares upload-compatible generator metadata without claiming hosting admission', () => {
  const root = generate('source-packaging');
  writeFileSync(path.join(root, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
  const result = run(['source', 'upload', '--dry-run', '--json'], root);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).files > 0);
});
