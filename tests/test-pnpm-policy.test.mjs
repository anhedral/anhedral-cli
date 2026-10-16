import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { setPnpmPolicy } from '../dist/pnpm-policy.js';

function fixture(t, source) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'anhedral-pnpm-policy-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'pnpm-workspace.yaml');
  writeFileSync(file, source);
  return { root, file, read: () => readFileSync(file, 'utf8') };
}

test('owned policy keys replace quoted/multiline/JSON keys and preserve unrelated YAML', (t) => {
  for (const key of ['overrides', '"overrides"', "'overrides'"]) {
    const prefix = 'packages:\n  - apps/*\ncatalog:\n  react: 19.3.0\n';
    const f = fixture(t, `${prefix}${key}:\n  old: 1.0.0\nallowBuilds: {"esbuild":true}\n`);
    const policy = { overrides: { secure: '2.0.0' } };
    setPnpmPolicy(f.root, policy);
    assert.equal(
      f.read(),
      `${prefix}allowBuilds: {"esbuild":true}\noverrides: {"secure":"2.0.0"}\n`,
    );
    const first = f.read();
    setPnpmPolicy(f.root, policy);
    assert.equal(f.read(), first);
  }
});
