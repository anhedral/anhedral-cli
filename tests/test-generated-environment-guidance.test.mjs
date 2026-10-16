import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { writeSetupDocumentation } from '../dist/scaffold/documentation.js';
import { parseStandardOptions } from '../dist/standard.js';

test('generated Void guidance describes Vinext public build mapping and separate server secrets', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-environment-guidance-'));
  try {
    writeSetupDocumentation(root, parseStandardOptions([root, '--vinext', '--clerk']));
    const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
    assert.match(readme, /Vinext loads the app \.env for local builds and maps NEXT_PUBLIC_\*/);
    assert.match(readme, /supply those values in the production build environment/);
    assert.match(readme, /production server secrets use void secret with values passed via stdin/);
    assert.match(readme, /Local dotenv files remain private and untracked/);
    assert.doesNotMatch(readme, /never uploaded from local dotenv files/);
    assert.doesNotMatch(readme, /NEXT_PUBLIC_\* names require explicit framework build mapping/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
