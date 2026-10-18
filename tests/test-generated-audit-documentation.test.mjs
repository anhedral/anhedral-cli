import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

test('generated maintenance guidance preserves existing framework instructions and recovery controls', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-maintenance-guidance-'));
  try {
    writeFileSync(
      path.join(root, 'AGENTS.md'),
      '# Framework-specific instructions\nPreserve this guidance.\n',
    );
    writeSetupDocumentation(root, parseStandardOptions([root, '--next', '--skip-install']));
    const agents = readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    assert.ok(agents.startsWith('# Framework-specific instructions\nPreserve this guidance.\n'));
    assert.match(
      agents,
      /trace dynamic entrypoints, shared consumers and authoritative live configuration/,
    );
    assert.match(agents, /Preserve kill switches, recovery paths and access controls/);
    assert.match(agents, /fix the cause without weakening assertions or required checks/);
    assert.match(agents, /record evidence and remaining uncertainty in docs\/verification\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
