import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { measureConfiguredWorker, measureWorker } from '../scripts/measure-worker.mjs';

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

test('Vite Worker entrypoints share the same budget and cannot escape the measured directory', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vite-worker-budget-'));
  try {
    writeFileSync(path.join(root, 'index.js'), 'export default {};');
    const report = measureWorker(root, 1000, 'index.js');
    assert.equal(report.modules.length, 1);
    assert.equal(report.passed, true);
    assert.equal(measureWorker(root, report.gzipBytes - 1, 'index.js').passed, false);
    assert.throws(() => measureWorker(root, 1000, '../index.js'), /basename/);
    assert.throws(() => measureWorker(root, 1000, 'missing.js'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('compiler configuration selects the emitted OJ entrypoint and rejects escaping main', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'oj-worker-budget-'));
  try {
    mkdirSync(path.join(root, 'chunks'));
    writeFileSync(path.join(root, 'index.js'), 'export default {};');
    writeFileSync(path.join(root, 'chunks/runtime.js'), 'export const ready = true;');
    const config = path.join(root, 'wrangler.json');
    writeFileSync(config, JSON.stringify({ main: './index.js' }));
    const report = measureConfiguredWorker(config, 1000);
    assert.equal(report.modules.length, 2);
    assert.equal(report.passed, true);
    writeFileSync(config, JSON.stringify({ main: '../index.js' }));
    assert.throws(() => measureConfiguredWorker(config, 1000), /measured output/);
    writeFileSync(config, JSON.stringify({}));
    assert.throws(() => measureConfiguredWorker(config, 1000), /requires main/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
