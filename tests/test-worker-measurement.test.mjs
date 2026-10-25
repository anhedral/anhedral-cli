import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { measureWorker } from '../scripts/measure-worker.mjs';

test('bundle budget counts nested runtime JS/Wasm, excludes maps and fails growth', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'worker-budget-'));
  try {
    mkdirSync(path.join(root, 'chunks'));
    writeFileSync(path.join(root, 'worker.js'), 'export default {};');
    writeFileSync(path.join(root, 'chunks/runtime.wasm'), Buffer.from([0, 97, 115, 109]));
    writeFileSync(path.join(root, 'worker.js.map'), 'not runtime');
    const report = measureWorker(root, 1000);
    assert.equal(report.modules.length, 2);
    assert.equal(report.bytes, 22);
    assert.ok(report.passed);
    assert.equal(measureWorker(root, report.gzipBytes - 1).passed, false);
    assert.ok(measureWorker(root, report.gzipBytes).passed);
    assert.throws(() => measureWorker(root, NaN), /budget/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
