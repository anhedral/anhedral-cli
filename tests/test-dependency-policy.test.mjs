import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findUncataloguedDependencyPins } from '../scripts/dependency-policy.mjs';

test('owned dependency policy catches quoted and unquoted pins, tags and recipe maps', () => {
  for (const source of [
    `const manifest = {devDependencies: {eslint: '10.0.3'}}`,
    `const manifest = {dependencies: {'@provider/sdk': '^1.0.0'}}`,
    `package.dependencies = {provider: 'latest'}`,
    `const manifest = { pnpm: { overrides: { 'provider@<1.2.3': '1.2.3' } } }`,
    `sharedPackage(root, 'service', source, {provider: '1.2.3'})`,
    `worker(root, 'api', config, source, {provider: '1.2.3'})`,
    `packageSource('service', source, {provider: '1.2.3'})`,
  ])
    assert.equal(findUncataloguedDependencyPins(source, 'fixture.ts').length, 1, source);
  assert.deepEqual(
    findUncataloguedDependencyPins(
      `const manifest = {
    version: '0.1.0',
    dependencies: {...DEPENDENCIES, provider: STACK_DEPENDENCIES.provider, '@workspace/shared': 'workspace:*'},
    devDependencies: {eslint: NATIVE_ESLINT_VERSION},
  }`,
      'fixture.ts',
    ),
    [],
  );
});

test('catalog audit includes all property spellings, aliases and tagged tools without engine constraints', async () => {
  const { collectCatalogDependencyPins } = await import('../scripts/dependency-policy.mjs');
  const pins = collectCatalogDependencyPins(
    `
// renovate: datasource=npm depName=eslint
export const NATIVE_ESLINT_VERSION = '10.0.3';
const ESLINT_ALIAS = NATIVE_ESLINT_VERSION;
export const APP_DEPENDENCIES = {
 dependencies: { bare: '1.2.3', 'single-key': '2.3.4', "double-key": '3.4.5' },
 devDependencies: { eslint: ESLINT_ALIAS },
};
export const EXTRA_DEPENDENCIES = { aliased: APP_DEPENDENCIES.dependencies.bare, 'computed-alias': APP_DEPENDENCIES.dependencies['single-key']
};
export const WORKSPACE_NODE_ENGINE = '^22.13.0 || >=24.0.0';
export const PACKAGE_MANAGER = 'pnpm@10.34.5';
// renovate: datasource=npm depName=shadcn
export const SHADCN_VERSION = '4.21.4';
// renovate: datasource=npm depName=next
export const NEXT_NATIVE_VERSION = '16.4.0';
const irrelevant = { engines: { node: '24.21.0' }, version: '9.9.9' };
`,
    'fixture.ts',
  );
  assert.deepEqual(pins, [
    { name: 'eslint', version: '10.0.3' },
    { name: 'bare', version: '1.2.3' },
    { name: 'single-key', version: '2.3.4' },
    { name: 'double-key', version: '3.4.5' },
    { name: 'aliased', version: '1.2.3' },
    { name: 'computed-alias', version: '2.3.4' },
    { name: 'pnpm', version: '10.34.5' },
    { name: 'shadcn', version: '4.21.4' },
    { name: 'next', version: '16.4.0' },
  ]);
  assert.deepEqual(
    collectCatalogDependencyPins(
      `
// renovate: datasource=npm depName=void
export const VOID_VERSION = '0.27.0';
export const VOID_NODE_ENGINE = '>=24.21.0';
`,
      'void.ts',
    ),
    [{ name: 'void', version: '0.27.0' }],
  );
  assert.throws(
    () => collectCatalogDependencyPins(`const STACK_DEPENDENCIES = { broken: MISSING };`),
    /Unresolved exact dependency pin/,
  );
});

test('maintained source catalog contains deployment, bootstrap, manager and native tool pins', async () => {
  const { readFileSync } = await import('node:fs');
  const { collectCatalogDependencyPins } = await import('../scripts/dependency-policy.mjs');
  const pins = ['dependencies.ts', 'void.ts'].flatMap((name) =>
    collectCatalogDependencyPins(
      readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8'),
      name,
    ),
  );
  for (const name of [
    'void',
    'shadcn',
    'next',
    'eslint',
    'pnpm',
    'eas-cli',
    'vercel',
    'vinext',
    'react',
    'wrangler',
  ])
    assert.ok(
      pins.some((pin) => pin.name === name),
      `${name} missing from actual catalog audit`,
    );
  assert.ok(pins.length > 40, 'all generated dependency groups must be audited');
  assert.ok(pins.every((pin) => !/engine|node_version/i.test(pin.name)));
});

test('Vercel authentication and delivery use the audited provider CLI pin', async () => {
  const { VERCEL_CLI_VERSION } = await import('../dist/dependencies.js');
  const { PROVIDER_AUTH } = await import('../dist/provider-auth.js');
  const { cli } = await import('../dist/vercel-project.js');
  const vercel = PROVIDER_AUTH.find((provider) => provider.id === 'vercel');
  const coordinate = `vercel@${VERCEL_CLI_VERSION}`;
  assert.deepEqual(cli, ['dlx', coordinate]);
  assert.deepEqual(vercel.login, ['pnpm', ...cli, 'login']);
  assert.deepEqual(vercel.identity, ['pnpm', ...cli, 'whoami']);
});

test('Renovate tracks the separately reviewed Void source pin', async () => {
  const { readFileSync } = await import('node:fs');
  const config = JSON.parse(readFileSync(new URL('../renovate.json', import.meta.url), 'utf8'));
  const manager = config.customManagers.find(
    (item) => item.description === 'Pinned verified generated dependency versions',
  );
  for (const filename of ['src/dependencies.ts', 'src/void.ts'])
    assert.ok(
      manager.managerFilePatterns.some((pattern) =>
        new RegExp(pattern.slice(1, -1)).test(filename),
      ),
      filename,
    );
});

test('every generated override resolves to an audited catalog coordinate', async (t) => {
  t.mock.method(console, 'log', () => {});
  const { readFileSync, mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { collectCatalogDependencyPins } = await import('../scripts/dependency-policy.mjs');
  const { scaffoldStandardProject, parseStandardOptions } = await import('../dist/standard.js');
  const { bootstrap } = await import('./support/workspace-bootstrap.mjs');
  const pins = collectCatalogDependencyPins(
    readFileSync(new URL('../src/dependencies.ts', import.meta.url), 'utf8'),
  );
  const catalog = new Set(pins.map(({ name, version }) => `${name}@${version}`));
  for (const profile of [
    ['--vinext'],
    ['--next', '--hosting=cloudflare'],
    ['--wxt'],
    ['--electron'],
  ]) {
    const root = mkdtempSync(path.join(tmpdir(), 'anhedral-override-catalog-'));
    try {
      await scaffoldStandardProject(
        parseStandardOptions([root, ...profile, '--skip-install', '--no-git', '--json']),
        (command, args, cwd) => {
          if (args[0] === 'dlx')
            bootstrap(path.join(args[args.indexOf('--cwd') + 1], args[args.indexOf('--name') + 1]));
          if (args.includes('--lockfile-only'))
            writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
        },
      );
      const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
      assert.equal(manifest.pnpm.overrides['brace-expansion@>=3 <4'], undefined);
      for (const [selector, version] of Object.entries(manifest.pnpm.overrides)) {
        const target = selector.replace(/^.*>(?=@?[a-zA-Z])/, '');
        const name = target.match(/^(@[^/]+\/[^@]+|[^@]+)(?:@|$)/)?.[1];
        assert.ok(
          catalog.has(`${name}@${version}`),
          `${selector}: ${version} is missing from the audit catalog`,
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('Renovate discovers every compatible-major override constant', async () => {
  const { readFileSync } = await import('node:fs');
  const config = JSON.parse(readFileSync(new URL('../renovate.json', import.meta.url), 'utf8'));
  const source = readFileSync(new URL('../src/dependencies.ts', import.meta.url), 'utf8');
  const manager = config.customManagers.find(
    (item) => item.description === 'Pinned verified generated dependency versions',
  );
  const extracted = manager.matchStrings.flatMap((pattern) =>
    [...source.matchAll(new RegExp(pattern, 'g'))].map(
      ({ groups }) => `${groups.depName}@${groups.currentValue}`,
    ),
  );
  for (const coordinate of [
    'glob@10.5.0',
    'glob@11.1.0',
    'brace-expansion@1.1.21',
    'brace-expansion@2.1.7',
    'brace-expansion@5.0.12',
  ])
    assert.ok(extracted.includes(coordinate), `${coordinate} missing from Renovate extraction`);
});

test('brace-expansion catalog keeps repaired compatible lines without an unused affected 3.x pin', async () => {
  const { readFileSync } = await import('node:fs');
  const { collectCatalogDependencyPins } = await import('../scripts/dependency-policy.mjs');
  const pins = collectCatalogDependencyPins(
    readFileSync(new URL('../src/dependencies.ts', import.meta.url), 'utf8'),
  ).filter(({ name }) => name === 'brace-expansion');
  assert.deepEqual(pins.map(({ version }) => version).sort(), ['1.1.21', '2.1.7', '5.0.12']);
});
