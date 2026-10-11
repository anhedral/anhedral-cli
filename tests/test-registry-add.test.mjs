import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildSourceRegistry,
  addStackItems,
  loadSourceRegistry,
  validateSourceRegistry,
  resolveSourceItems,
  parseStandardOptions,
  scaffoldStandardProject,
  inspectProject,
} from '../dist/index.js';
import { sourceFiles } from '../dist/registry/receipt.js';
import { bootstrap } from './support/workspace-bootstrap.mjs';

const runner = (_command, args, cwd) => {
  if (args[0] === 'dlx')
    bootstrap(path.join(args[args.indexOf('--cwd') + 1], args[args.indexOf('--name') + 1]));
  else if (args.includes('--lockfile-only'))
    writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
  else throw new Error(`Unexpected command: ${args}`);
};
async function project(root, flags = ['--hono']) {
  const log = console.log;
  console.log = () => {};
  try {
    await scaffoldStandardProject(
      parseStandardOptions('new', [root, ...flags, '--skip-install', '--no-git']),
      runner,
    );
  } finally {
    console.log = log;
  }
}
function sourceItem(name, dependencies = []) {
  return {
    name,
    version: '1.0.0',
    registryDependencies: dependencies,
    files: [
      {
        target: `packages/${name}/package.json`,
        content: JSON.stringify({
          name: `@workspace/${name}`,
          private: true,
          type: 'module',
          exports: { '.': './src/index.ts' },
          dependencies: Object.fromEntries(
            dependencies.map((id) => [`@workspace/${id}`, 'workspace:*']),
          ),
        }),
      },
      { target: `packages/${name}/src/index.ts`, content: `export const ${name} = true;\n` },
    ],
  };
}
const document = () => ({
  schemaVersion: 1,
  name: 'example',
  items: [sourceItem('base'), sourceItem('feature', ['base'])],
});

test('remote registries validate schema, dependency closure, paths, hooks and bounded HTTPS retrieval', async () => {
  assert.deepEqual(
    resolveSourceItems(validateSourceRegistry(document()), ['feature']).map((item) => item.name),
    ['base', 'feature'],
  );
  for (const target of [
    '../secret',
    'packages/base/../escape.ts',
    'packages/base/.env',
    'packages/base/CON',
    'packages/base/src/a:stream',
    '/tmp/escape',
    'packages/base/node_modules/code.js',
  ]) {
    const value = document();
    value.items[0].files[1].target = target;
    assert.throws(() => validateSourceRegistry(value), /Unsafe/);
  }
  const missing = document();
  missing.items[1].registryDependencies = ['missing'];
  assert.throws(() => validateSourceRegistry(missing), /dependency missing/);
  const cycle = document();
  cycle.items[0].registryDependencies = ['feature'];
  assert.throws(() => validateSourceRegistry(cycle), /cycle/);
  const hook = document();
  hook.items[0].files[0].content = JSON.stringify({
    name: '@workspace/base',
    private: true,
    scripts: { postinstall: 'curl example.com' },
  });
  assert.throws(() => validateSourceRegistry(hook), /hooks/);
  const remote = await loadSourceRegistry(
    'https://registry.example/catalog.json',
    async (_url, options) => {
      assert.equal(options.redirect, 'error');
      return new Response(JSON.stringify(document()));
    },
  );
  assert.match(remote.integrity, /^sha256-/);
  await assert.rejects(loadSourceRegistry('http://registry.example/catalog.json'), /public HTTPS/);
  await assert.rejects(loadSourceRegistry('https://127.0.0.1/catalog.json'), /public HTTPS/);
  await assert.rejects(
    loadSourceRegistry(
      'https://registry.example/catalog.json',
      async () => new Response('x'.repeat(2 * 1024 * 1024 + 1)),
    ),
    /2 MiB/,
  );
});

test('add composes bundled bindings and remote dependencies while preserving product code', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-add-'));
  const root = path.join(temp, 'app');
  try {
    await project(root);
    const file = path.join(root, 'apps/api/src/index.ts');
    writeFileSync(file, readFileSync(file, 'utf8') + '// Customer implementation stays intact.\n');
    const source = readFileSync(file, 'utf8');
    const before = sourceFiles(root);
    const preview = await addStackItems(
      root,
      { items: ['r2'], dryRun: true, skipInstall: true },
      runner,
    );
    assert.deepEqual(preview.conflicts, []);
    assert.deepEqual(sourceFiles(root), before);
    await addStackItems(root, { items: ['r2'], skipInstall: true }, runner);
    assert.equal(readFileSync(file, 'utf8'), source);
    assert.ok(
      JSON.parse(readFileSync(path.join(root, 'apps/api/wrangler.jsonc'), 'utf8')).r2_buckets,
    );
    const registryFile = path.join(temp, 'registry.json');
    writeFileSync(registryFile, JSON.stringify(document()));
    await assert.rejects(
      addStackItems(
        root,
        {
          items: ['feature'],
          registry: registryFile,
          integrity: 'sha256-invalid',
          skipInstall: true,
        },
        runner,
      ),
      /integrity differs/,
    );
    await addStackItems(
      root,
      { items: ['feature'], registry: registryFile, skipInstall: true },
      runner,
    );
    assert.ok(existsSync(path.join(root, 'packages/base/src/index.ts')));
    assert.equal(inspectProject(root).localReady, true);
    const receipt = JSON.parse(readFileSync(path.join(root, 'anhedral.registry.json'), 'utf8'));
    assert.equal(receipt.remoteItems.length, 2);
    assert.notEqual(receipt.files['apps/api/src/index.ts'], before.get('apps/api/src/index.ts'));
    const again = await addStackItems(
      root,
      { items: ['feature'], registry: registryFile, skipInstall: true },
      runner,
    );
    assert.deepEqual(again.conflicts, []);
    assert.equal(readFileSync(file, 'utf8'), source);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('add refuses edited source and symlink targets and rolls back failed dependency resolution', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-add-conflict-'));
  const root = path.join(temp, 'app');
  try {
    await project(root, ['--hono', '--styling']);
    const registryFile = path.join(temp, 'registry.json');
    const value = document();
    value.items = [sourceItem('styling')];
    writeFileSync(registryFile, JSON.stringify(value));
    writeFileSync(path.join(root, 'packages/styling/src/index.ts'), '// My custom theme\n');
    const before = sourceFiles(root);
    const preview = await addStackItems(
      root,
      { items: ['styling'], registry: registryFile, dryRun: true, skipInstall: true },
      runner,
    );
    assert.ok(preview.conflicts.includes('packages/styling/src/index.ts'));
    await assert.rejects(
      addStackItems(
        root,
        { items: ['styling'], registry: registryFile, skipInstall: true },
        runner,
      ),
      /conflicts/,
    );
    assert.deepEqual(sourceFiles(root), before);
    await assert.rejects(
      addStackItems(root, { items: ['resend'], skipInstall: true }, () => {
        throw new Error('Dependency resolution failed');
      }),
      /Dependency resolution failed/,
    );
    assert.deepEqual(sourceFiles(root), before);
    if (process.platform !== 'win32') {
      symlinkSync(temp, path.join(root, 'packages/unsafe'));
      await assert.rejects(
        addStackItems(root, { items: ['resend'], dryRun: true }, runner),
        /symlink|doctor/,
      );
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('add introduces native and web applications using the shared shadcn foundation', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-add-apps-'));
  const root = path.join(temp, 'app');
  try {
    await project(root, ['--expo']);
    await addStackItems(root, { items: ['vinext'], skipInstall: true }, runner);
    assert.ok(existsSync(path.join(root, 'apps/mobile/package.json')));
    assert.ok(existsSync(path.join(root, 'packages/ui/package.json')));
    assert.equal(inspectProject(root).localReady, true);
    const manifestFile = path.join(root, 'anhedral.project.json');
    const connected = JSON.parse(readFileSync(manifestFile, 'utf8'));
    connected.accountId = 'a'.repeat(32);
    connected.audience = 'public';
    writeFileSync(manifestFile, JSON.stringify(connected, null, 2) + '\n');
    await addStackItems(root, { items: ['electron', 'hono'], skipInstall: true }, runner);
    const delivery = JSON.parse(readFileSync(path.join(root, 'anhedral.project.json'), 'utf8'));
    assert.equal(delivery.accountId, 'a'.repeat(32));
    assert.deepEqual(
      delivery.targets.map((target) => target.id),
      ['api', 'web'],
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('registry build compiles confined local source files before writing a payload', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-registry-build-'));
  try {
    bootstrap(root);
    const manifest = document();
    manifest.items = [sourceItem('base')];
    manifest.items[0].files[1] = {
      target: 'packages/base/src/index.ts',
      path: 'apps/web/next.config.ts',
    };
    const file = path.join(root, 'registry.source.json');
    writeFileSync(file, JSON.stringify(manifest));
    assert.equal(buildSourceRegistry(file).items[0].files[1].content, 'export default {};\n');
    manifest.items[0].files[1].path = '../private.txt';
    writeFileSync(file, JSON.stringify(manifest));
    assert.throws(() => buildSourceRegistry(file), /Unsafe/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
