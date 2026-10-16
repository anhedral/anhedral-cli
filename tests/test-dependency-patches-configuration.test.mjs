import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { configureDependencyPatches } from '../dist/dependency-patches.js';

const coordinates = ['braces@3.0.3', 'node-forge@1.4.0'];
function fixture(packages = coordinates) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-reviewed-patches-'));
  writeFileSync(path.join(root, 'package.json'), '{}');
  writeFileSync(
    path.join(root, 'pnpm-lock.yaml'),
    'packages:\n' +
      packages.map((name) => `  ${name}:\n    resolution: {integrity: sha512-example}\n`).join(''),
  );
  writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    "# retain customer settings\npackages: ['apps/*']\npatchedDependencies:\n  custom@1.0.0: patches/custom.patch\n",
  );
  return {
    root,
    policy: () => readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8'),
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}

test('reviewed patch staging copies both complete exact assets atomically and remains idempotent', () => {
  const f = fixture();
  try {
    assert.equal(configureDependencyPatches(f.root), true);
    const policy = parse(f.policy());
    assert.equal(policy.patchedDependencies['custom@1.0.0'], 'patches/custom.patch');
    assert.match(f.policy(), /retain customer settings/);
    for (const coordinate of coordinates) {
      assert.equal(policy.patchedDependencies[coordinate], `patches/${coordinate}.patch`);
      assert.deepEqual(
        readFileSync(path.join(f.root, `patches/${coordinate}.patch`)),
        readFileSync(new URL(`../assets/patches/${coordinate}.patch`, import.meta.url)),
      );
    }
    for (const name of ['LICENSE.braces', 'LICENSE.node-forge']) {
      assert.deepEqual(
        readFileSync(path.join(f.root, 'patches', name)),
        readFileSync(new URL(`../assets/patches/${name}`, import.meta.url)),
      );
      assert.ok(
        readFileSync(path.join(f.root, '.gitattributes'), 'utf8').includes(
          `/patches/${name} text eol=lf`,
        ),
      );
    }
    assert.ok(
      readFileSync(path.join(f.root, 'patches/node-forge@1.4.0.patch')).length > 256 * 1024,
    );
    assert.equal(configureDependencyPatches(f.root), false);
  } finally {
    f.close();
  }
});

test('a conflicting forge notice refuses all new patches and leaves customer policy unchanged', () => {
  const f = fixture();
  try {
    mkdirSync(path.join(f.root, 'patches'));
    writeFileSync(path.join(f.root, 'patches/LICENSE.node-forge'), 'customer-owned notice');
    const before = f.policy();
    assert.throws(
      () => configureDependencyPatches(f.root),
      /node-forge license notice.*different customer content/,
    );
    assert.equal(f.policy(), before);
    assert.equal(existsSync(path.join(f.root, 'patches/braces@3.0.3.patch')), false);
    assert.equal(existsSync(path.join(f.root, 'patches/node-forge@1.4.0.patch')), false);
    assert.equal(existsSync(path.join(f.root, '.gitattributes')), false);
  } finally {
    f.close();
  }
});

for (const version of ['1.3.3', '1.4.1', '1.4.00', '1x4x0'])
  test(`node-forge ${version} is not eligible for a version-mismatched patch`, () => {
    const f = fixture([`node-forge@${version}`]);
    try {
      const before = f.policy();
      assert.equal(configureDependencyPatches(f.root), false);
      assert.equal(f.policy(), before);
      assert.equal(existsSync(path.join(f.root, 'patches')), false);
    } finally {
      f.close();
    }
  });
