import { resourceName } from '../dist/render.js';
import { STACK_PROFILES } from './support/stack-profiles.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import ts from 'typescript';
import {
  STANDARD_PRODUCTS,
  getStackItem,
  parseStandardOptions,
  resolveStackRegistry,
  inspectWorkspaceGraph,
} from '../dist/index.js';
import { composeStack } from '../dist/scaffold/compose.js';
import { writeEnvironmentFile } from '../dist/scaffold/environment.js';
import { bootstrap } from './support/workspace-bootstrap.mjs';

const runtimes = [
  ['--vinext'],
  ['--next'],
  ['--next', '--hosting=cloudflare'],
  ['--hono'],
  ['--expo'],
  ['--electron'],
  ['--wxt'],
];
const rejectedSelection = /Choose one|requires|select it explicitly|--hosting applies/;
const optionsFor = (directory, runtime, products) =>
  parseStandardOptions('new', [
    directory,
    ...runtime,
    ...products.map((product) => `--${product}`),
    '--skip-install',
    '--no-git',
    '--json',
  ]);
function assertSourceSyntax(root) {
  for (const file of readdirSync(root, { recursive: true })) {
    if (!/\.(?:[cm]?tsx?|[cm]?jsx?)$/.test(file)) continue;
    const source = ts.createSourceFile(
      file,
      readFileSync(path.join(root, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    assert.deepEqual(source.parseDiagnostics, [], `Invalid generated syntax in ${file}`);
  }
}

test('every option generates coherent targets, workspaces, environment and syntax in each compatible runtime', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-content-matrix-'));
  const covered = new Set();
  let generated = 0;
  try {
    for (const runtime of runtimes)
      for (const product of STANDARD_PRODUCTS) {
        const root = path.join(temporary, `selection-${generated}`);
        let options;
        try {
          options = optionsFor(root, runtime, [
            product,
            ...(getStackItem(product).selection.requiresAll ?? []),
          ]);
        } catch (error) {
          assert.match(error.message, rejectedSelection);
          continue;
        }
        bootstrap(root);
        const registry = resolveStackRegistry(options);
        await composeStack(root, options, registry);
        assertSourceSyntax(root);
        assert.ok(inspectWorkspaceGraph(root).length);
        for (const item of registry.items) {
          covered.add(item.name);
          for (const target of item.targets)
            assert.ok(existsSync(path.join(root, target)), `${item.name}: ${target}`);
          for (const key of item.environment)
            assert.match(
              readFileSync(path.join(root, '.env.example'), 'utf8'),
              new RegExp(`^${key}=`, 'm'),
            );
          assert.ok(
            readFileSync(path.join(root, 'docs/stack.md'), 'utf8').includes(`## ${item.name}\n`),
          );
        }
        const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
        if (
          options.products.includes('clerk') &&
          !options.products.includes('vinext') &&
          !options.products.includes('next')
        )
          assert.ok(!readme.includes('The web starter includes ClerkProvider'));
        if (
          options.products.every((name) =>
            [
              'expo',
              'electron',
              'wxt',
              'local-data',
              'styling',
              'sentry',
              'openai',
              'ai-sdk',
              'resend',
              'stripe',
              'revenuecat',
              'posthog',
            ].includes(name),
          )
        )
          assert.ok(!readme.includes('Cloudflare bindings contain'));
        if (
          options.products.includes('next') &&
          options.hosting === 'cloudflare' &&
          options.products.includes('better-auth')
        ) {
          const environment = readFileSync(path.join(root, 'apps/web/.dev.vars.example'), 'utf8');
          assert.match(environment, /^NEXTJS_ENV=development$/m);
          assert.match(environment, /^BETTER_AUTH_URL=http:\/\/localhost:3000$/m);
        }
        generated++;
        rmSync(root, { recursive: true, force: true });
      }
    assert.equal(generated, 162);
    for (const product of STANDARD_PRODUCTS) assert.ok(covered.has(product), product);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('every pair of options resolves deterministically across the supported runtimes or fails selection validation', () => {
  let accepted = 0;
  let rejected = 0;
  for (const runtime of runtimes)
    for (let left = 0; left < STANDARD_PRODUCTS.length; left++)
      for (let right = left + 1; right < STANDARD_PRODUCTS.length; right++) {
        const products = [STANDARD_PRODUCTS[left], STANDARD_PRODUCTS[right]];
        let options;
        try {
          options = optionsFor('pairwise', runtime, products);
        } catch (error) {
          assert.match(error.message, rejectedSelection);
          rejected++;
          continue;
        }
        const registry = resolveStackRegistry(options);
        const reversed = resolveStackRegistry(
          optionsFor('pairwise', runtime, products.toReversed()),
        );
        assert.deepEqual(registry, reversed);
        const positions = new Map(registry.items.map((item, index) => [item.name, index]));
        const packages = new Set();
        for (const item of registry.items) {
          for (const dependency of item.registryDependencies)
            assert.ok(positions.get(dependency) < positions.get(item.name));
          if (item.package) {
            assert.ok(!packages.has(item.package.name), `Package ownership overlaps: ${products}`);
            packages.add(item.package.name);
          }
          for (const conflict of getStackItem(item.name).selection.conflicts ?? [])
            assert.ok(!positions.has(conflict));
        }
        accepted++;
      }
  assert.equal(accepted + rejected, 2457);
  assert.ok(accepted > 1500);
});

test('environment examples preserve prior defaults and comments when recipes and additions extend them', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-environment-'));
  try {
    writeFileSync(
      path.join(root, '.env.example'),
      '# Custom environment\nDATABASE_URL=postgresql://example.invalid/database\n',
    );
    writeEnvironmentFile(root, '.env.example', { DATABASE_URL: '', NEXTJS_ENV: 'development' });
    writeEnvironmentFile(root, '.env.example', { NEXTJS_ENV: 'other', BETTER_AUTH_SECRET: '' });
    assert.equal(
      readFileSync(path.join(root, '.env.example'), 'utf8'),
      '# Custom environment\nDATABASE_URL=postgresql://example.invalid/database\nNEXTJS_ENV=development\nBETTER_AUTH_SECRET=\n',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the real build matrix covers every product and each runtime/hosting path', () => {
  const selected = new Set(
    Object.values(STACK_PROFILES)
      .flat()
      .filter((flag) => !flag.startsWith('--hosting'))
      .map((flag) => flag.slice(2)),
  );
  assert.deepEqual([...selected].sort(), [...STANDARD_PRODUCTS].sort());
  for (const flags of Object.values(STACK_PROFILES))
    assert.doesNotThrow(() => optionsFor('profile', flags, []));
});

test('provider names stay valid and distinct for long or punctuated project names', () => {
  for (const name of ['my.app', 'my_app', 'a'.repeat(214), '42', 'my-project']) {
    for (const suffix of ['web', 'api', 'db', 'private-files', 'jobs', 'jobs-dlq', 'workflows']) {
      const value = resourceName(name, suffix);
      assert.match(value, /^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
      assert.ok(value.length <= 63 && value.length >= 3);
      assert.equal(value, resourceName(name, suffix));
    }
  }
  assert.equal(resourceName('my-project', 'jobs'), 'my-project-jobs');
  assert.notEqual(resourceName('my.app', 'jobs'), resourceName('my_app', 'jobs'));
  assert.notEqual(resourceName('a'.repeat(213) + 'b', 'db'), resourceName('a'.repeat(214), 'db'));
});

test('generation runtime checks match dependency engines while diagnostics remain portable', async () => {
  const { assertWorkspaceRuntime } = await import('../dist/scaffold/bootstrap.js');
  const { execFile } = await import('../dist/util.js');
  for (const version of ['20.19.0', '22.12.0', '23.0.0'])
    assert.throws(
      () => assertWorkspaceRuntime(execFile, version),
      /Generated workspaces require Node/,
    );
  for (const version of ['22.13.0', '22.20.5', '24.0.0', '24.18.0'])
    assert.doesNotThrow(() => assertWorkspaceRuntime(execFile, version));
});
