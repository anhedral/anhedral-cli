import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { dependencyNotices } from '../licenses.mjs';

test('license discovery crosses internal type-only manifests and retains split license names', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-notices-'));
  try {
    const dependency = path.join(root, 'node_modules/example-package');
    const nested = path.join(dependency, 'dist/esm');
    mkdirSync(nested, { recursive: true });
    writeFileSync(
      path.join(dependency, 'package.json'),
      '{"name":"example-package","version":"1.0.0"}',
    );
    writeFileSync(path.join(nested, 'package.json'), '{"type":"module"}');
    writeFileSync(path.join(dependency, 'LICENSE-MIT'), 'License terms and attribution');
    const module = path.join(nested, 'index.js');
    assert.match(
      dependencyNotices(new Set([module])),
      /example-package@1.0.0\nLicense terms and attribution/,
    );
    rmSync(path.join(dependency, 'LICENSE-MIT'));
    assert.throws(() => dependencyNotices(new Set([module])), /needs a license notice/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
