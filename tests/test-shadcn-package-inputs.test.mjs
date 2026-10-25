import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { stringify } from 'yaml';
import {
  collectRegistryPackageInputs,
  externalPackageName,
  externalPackageNames,
  registryPackageFingerprint,
  validateRegistryPackageInputs,
} from '../scripts/shadcn-package-inputs.mjs';
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'registry-package-provenance-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const write = (name, value) => {
    const file = path.join(root, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  };
  git('init', '--quiet');
  git('config', 'user.name', 'Native package fixture');
  git('config', 'user.email', 'ci@example.com');
  const manifest = {
    name: 'v4',
    dependencies: {
      foo: '^1.0.0',
      react: '19.2.3',
      next: '16.4.2',
      '@shadcn/helpers': 'workspace:*',
    },
  };
  const lock = {
    lockfileVersion: '9.0',
    importers: {
      'apps/v4': {
        dependencies: {
          foo: { specifier: '^1.0.0', version: '1.0.0(react@19.2.3)' },
          react: { specifier: '19.2.3', version: '19.2.3' },
          next: { specifier: '16.4.2', version: '16.4.2' },
          '@shadcn/helpers': { specifier: 'workspace:*', version: 'link:../../packages/helpers' },
        },
      },
      'packages/helpers': { dependencies: { bar: { specifier: '1.0.0', version: '1.0.0' } } },
    },
    packages: {
      'foo@1.0.0': { resolution: { integrity: 'sha512-foo' } },
      'bar@1.0.0': { resolution: { integrity: 'sha512-bar' } },
      'react@19.2.3': { resolution: { integrity: 'sha512-react' } },
      'next@16.4.2': { resolution: { integrity: 'sha512-next' } },
      'alias-real@2.0.0': { resolution: { integrity: 'sha512-alias' } },
    },
    snapshots: {
      'foo@1.0.0(react@19.2.3)': {
        dependencies: { bar: '1.0.0', react: '19.2.3', 'alias-name': 'alias-real@2.0.0' },
      },
      'bar@1.0.0': { dependencies: { foo: '1.0.0(react@19.2.3)' } },
      'react@19.2.3': {},
      'next@16.4.2': {},
      'alias-real@2.0.0': {},
    },
  };
  write('package.json', { name: 'fixture', private: true });
  write('pnpm-workspace.yaml', 'packages:\n  - apps/*\n  - packages/*\n');
  write('apps/v4/package.json', manifest);
  write('packages/helpers/package.json', {
    name: '@shadcn/helpers',
    version: '1.0.0',
    dependencies: { bar: '1.0.0' },
  });
  write('packages/helpers/src/index.ts', 'export const helper=1;');
  const commit = () => {
    write('pnpm-lock.yaml', stringify(lock));
    write('apps/v4/package.json', manifest);
    git('add', '.');
    git('commit', '--quiet', '-m', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  const inventory = {
    sources: {
      component: { imports: ['foo/subpath', '@shadcn/helpers'] },
      hook: { imports: ['react'] },
      companion: { imports: ['bar'] },
    },
    registries: { test: { items: [] } },
  };
  return { root, write, git, commit, lock, manifest, inventory };
}
test('external package roots retain scoped subpaths and registry version declarations without treating local paths as npm packages', () => {
  for (const [input, expected] of [
    ['react', 'react'],
    ['react/jsx-runtime', 'react'],
    ['foo@^1', 'foo'],
    ['@base-ui/react/button', '@base-ui/react'],
    ['@base-ui/react@^1', '@base-ui/react'],
  ])
    assert.equal(externalPackageName(input), expected);
  assert.deepEqual(
    externalPackageNames({
      sources: {},
      registries: {},
      styleGlobals: {
        sheet: { content: '@import \"future-styles/tokens.css\"; @plugin \"future-plugin\";' },
      },
    }),
    ['future-plugin', 'future-styles'],
  );
  const css = {
    sources: {},
    registries: {},
    styleGlobals: { sheet: { content: '@import \"first-styles\";', sha256: 'first' } },
  };
  assert.deepEqual(externalPackageNames(css), ['first-styles']);
  css.styleGlobals.sheet = { content: '@import \"changed-styles\";', sha256: 'changed' };
  assert.deepEqual(externalPackageNames(css), ['changed-styles']);
  for (const input of [
    '@/lib/utils',
    './relative',
    '../relative',
    '/absolute',
    'node:fs',
    'https://example.com/x',
    '#internal',
  ])
    assert.equal(externalPackageName(input), undefined);
});
test('Git package provenance scopes exact lock resolutions, transitive integrity, peer contexts, aliases and cycles', () => {
  const f = fixture();
  try {
    const commit = f.commit();
    const first = collectRegistryPackageInputs(f.root, commit, f.inventory);
    assert.doesNotThrow(() => validateRegistryPackageInputs(first, commit));
    assert.throws(
      () => validateRegistryPackageInputs(first, '0'.repeat(40)),
      /different upstream revision/,
    );
    assert.deepEqual(
      first.packages.foo.roots.map((root) => root.version),
      ['1.0.0(react@19.2.3)'],
    );
    assert.deepEqual(first.packages.foo.graph.unresolved, []);
    assert.equal(first.packages.foo.graph.nodeCount, 4);
    f.lock.packages['bar@1.0.0'].resolution.integrity = 'sha512-changed';
    const second = collectRegistryPackageInputs(f.root, f.commit(), f.inventory);
    assert.notEqual(first.packages.foo.graph.sha256, second.packages.foo.graph.sha256);
    assert.equal(first.packages.react.graph.sha256, second.packages.react.graph.sha256);
    const previous = { ...f.inventory, packageInputs: first },
      current = { ...f.inventory, packageInputs: second };
    assert.notDeepEqual(
      registryPackageFingerprint(previous, { files: [{ source: 'component' }] }, false),
      registryPackageFingerprint(current, { files: [{ source: 'component' }] }, false),
    );
    assert.deepEqual(
      registryPackageFingerprint(previous, { files: [{ source: 'hook' }] }, false),
      registryPackageFingerprint(current, { files: [{ source: 'hook' }] }, false),
    );
    f.lock.packages['next@16.4.2'].resolution.integrity = 'sha512-unrelated';
    const third = collectRegistryPackageInputs(f.root, f.commit(), f.inventory);
    assert.deepEqual(second.packages.foo, third.packages.foo);
    f.write('packages/helpers/src/index.ts', 'export const helper=2;');
    const fourth = collectRegistryPackageInputs(f.root, f.commit(), f.inventory);
    assert.notEqual(
      third.packages['@shadcn/helpers'].graph.sha256,
      fourth.packages['@shadcn/helpers'].graph.sha256,
    );
    f.lock.patchedDependencies = {
      'bar@1.0.0': { path: 'patches/bar.patch', hash: 'declared-hash' },
    };
    f.write('patches/bar.patch', 'first pinned patch bytes');
    const patched = collectRegistryPackageInputs(f.root, f.commit(), f.inventory);
    f.write('patches/bar.patch', 'changed patch bytes at the same package version');
    const repatched = collectRegistryPackageInputs(f.root, f.commit(), f.inventory);
    assert.notEqual(patched.packages.foo.graph.sha256, repatched.packages.foo.graph.sha256);
    assert.equal(patched.packages.react.graph.sha256, repatched.packages.react.graph.sha256);
    f.write('apps/v4/package.json', 'invalid working tree data');
    assert.deepEqual(collectRegistryPackageInputs(f.root, commit, f.inventory), first);
    const corrupt = structuredClone(first);
    corrupt.files['pnpm-lock.yaml'].content += '\n# drift';
    assert.throws(() => validateRegistryPackageInputs(corrupt), /integrity failed/);
    assert.equal(first.packages['tw-animate-css'].resolution, 'unresolved');
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('package review includes local source companions and CSS packages only for styled consumers', () => {
  const inventory = {
    sources: {
      entry: { imports: ['react'], relativeSources: ['companion'] },
      companion: { imports: ['foo'] },
      other: { imports: ['react'] },
    },
    packageInputs: {
      packages: {
        react: { version: '1' },
        foo: { version: '2' },
        tailwindcss: { version: '4' },
        shadcn: { version: '4' },
        'tw-animate-css': { version: '1' },
      },
    },
  };
  assert.deepEqual(
    Object.keys(registryPackageFingerprint(inventory, { files: [{ source: 'entry' }] }, false)),
    ['foo', 'react'],
  );
  assert.ok(
    Object.hasOwn(
      registryPackageFingerprint(inventory, { files: [{ source: 'entry' }] }, true),
      'tailwindcss',
    ),
  );
  assert.ok(
    !Object.hasOwn(
      registryPackageFingerprint(inventory, { files: [{ source: 'other' }] }, false),
      'foo',
    ),
  );
  assert.throws(() => validateRegistryPackageInputs({}), /missing/);
});

test('unresolved dynamic package expressions require renewed review on each upstream revision', () => {
  const original = {
    source: { commit: 'a'.repeat(40) },
    sources: { entry: { imports: ['react'], unresolvedImports: ['selectedPackage'] } },
    packageInputs: {
      packages: { react: { version: '19' } },
      files: { 'pnpm-lock.yaml': { sha256: 'lock' } },
    },
  };
  const changed = structuredClone(original);
  changed.source.commit = 'b'.repeat(40);
  const item = { files: [{ source: 'entry' }] };
  assert.notDeepEqual(
    registryPackageFingerprint(original, item, false),
    registryPackageFingerprint(changed, item, false),
  );
});
