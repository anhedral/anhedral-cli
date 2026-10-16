import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { writeSetupDocumentation } from '../dist/scaffold/documentation.js';
import { parseStandardOptions } from '../dist/standard.js';

test('generated audit guidance describes configuration verification and repository runtime tests', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-audit-documentation-'));
  try {
    const options = parseStandardOptions([root, '--hono', '--skip-install']);
    writeSetupDocumentation(root, options);
    const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
    assert.match(readme, /exact advisory and version, effective pnpm patch map, and patch SHA-256/);
    assert.match(readme, /Runtime regressions.*run in the Anhedral CLI repository tests/);
    assert.doesNotMatch(readme, /every installed copy|altered or unpatched copies/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
