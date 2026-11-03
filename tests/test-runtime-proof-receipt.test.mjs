import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { prepareRuntimeProof, finishRuntimeProof } from '../scripts/runtime-proof-receipt.mjs';
test('runtime proof retains exact lock before compilation and preserves it on failure', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-runtime-evidence-'));
  try {
    const lock = 'lockfileVersion: 9\n';
    writeFileSync(path.join(root, 'pnpm-lock.yaml'), lock);
    const output = path.join(root, 'proof');
    const receipt = prepareRuntimeProof({
      root,
      output,
      source: { revision: 'a'.repeat(40), dirty: false },
      generator: { name: 'anhedral', version: '0.18.0' },
      tools: { node: process.version, pnpm: '10.34.5' },
    });
    assert.equal(receipt.status, 'prepared');
    assert.equal(readFileSync(path.join(output, receipt.lock.filename), 'utf8'), lock);
    finishRuntimeProof(output, 'failed');
    assert.equal(
      JSON.parse(readFileSync(path.join(output, 'runtime-evidence.json'))).status,
      'failed',
    );
    assert.equal(readFileSync(path.join(output, receipt.lock.filename), 'utf8'), lock);
    finishRuntimeProof(output, 'passed');
    assert.equal(
      JSON.parse(readFileSync(path.join(output, 'runtime-evidence.json'))).status,
      'passed',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
