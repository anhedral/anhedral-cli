import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { readProjectProgress, updateProjectProgress, validateProgressUpdate, progressFreshness, inspectProgressIdentity } from '../dist/index.js';
const observe = (fields = {}) => ({ capability: 'neon', environment: 'preview', milestone: 'connected', status: 'succeeded', summary: 'Database query passed', evidence: ['Query acceptance check'], observedAt: new Date().toISOString(), source: 'local-check', identity: { accountId: 'client-a', configDigest: 'config-a' }, ...fields });
const fixture = async (work) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'anhedral-progress-'));
  try { await work(root); } finally { rmSync(root, { recursive: true, force: true }); }
};
test('CAS preserves independent milestones and environment/account evidence through restart', () => fixture(async (root) => {
  writeFileSync(path.join(root, 'anhedral.setup.json'), '{"resourcesProvisioned":false}');
  assert.equal(readProjectProgress(root), null);
  const first = await updateProjectProgress(root, { expectedRevision: 0, selected: ['next', 'neon'], observations: [observe(), observe({ milestone: 'deployed', status: 'succeeded', summary: 'Preview deployment returned', source: 'agent-reported' })], discoveries: [{ kind: 'tool', name: 'Neon plugin', status: 'available', scope: 'session', observedAt: new Date().toISOString(), summary: 'Tool callable' }, { kind: 'account', name: 'Neon CLI', status: 'unavailable', scope: 'local', observedAt: new Date().toISOString(), summary: 'CLI login missing' }] });
  assert.equal(first.revision, 1);
  const second = await updateProjectProgress(root, { expectedRevision: first.revision, observations: [observe({ status: 'failed', summary: 'Product query failed' }), observe({ environment: 'production', status: 'blocked', summary: 'Production account access required', identity: { accountId: 'client-b' } })] });
  assert.equal(second.observations.find((item) => item.milestone === 'deployed').status, 'succeeded');
  assert.equal(second.observations.find((item) => item.environment === 'preview' && item.milestone === 'connected').status, 'failed');
  assert.equal(readProjectProgress(root).observations.length, 3);
  assert.equal(readProjectProgress(root).discoveries.length, 2);
  assert.equal(readFileSync(path.join(root, 'anhedral.setup.json'), 'utf8'), '{"resourcesProvisioned":false}');
  await assert.rejects(updateProjectProgress(root, { expectedRevision: 1, nextAction: 'lost write' }), /revision conflict/);
  assert.equal(readProjectProgress(root).revision, 2);
  assert.equal(existsSync(path.join(root, '.anhedral-progress.lock')), false);
}));
test('two writers cannot silently overwrite the same revision', () => fixture(async (root) => {
  const results = await Promise.allSettled([updateProjectProgress(root, { expectedRevision: 0, nextAction: 'first' }), updateProjectProgress(root, { expectedRevision: 0, nextAction: 'second' })]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(readProjectProgress(root).revision, 1);
}));
test('strict bounded state excludes secrets and credential-bearing links', () => {
  for (const secret of [['DATABASE_URL=postgresql://person', 'password@db/test'].join(':'), 'Authorization: Bearer abc', 'TOKEN=abcdef', 'sk-proj-abcdefghijk123456']) assert.throws(() => validateProgressUpdate({ expectedRevision: 0, nextAction: secret }), /non-secret/);
  for (const url of ['https://user:password@example.com', 'https://example.com?token=abcdef', 'https://example.com#secret', 'http://example.com', 'file:///tmp/preview']) assert.throws(() => validateProgressUpdate({ expectedRevision: 0, links: { preview: url } }));
  assert.doesNotThrow(() => validateProgressUpdate({ expectedRevision: 0, links: { preview: 'http://localhost:3000', live: 'https://example.com/app' } }));
  assert.throws(() => validateProgressUpdate({ expectedRevision: 0, selected: ['neon', 'neon'] }), /Duplicate/);
  assert.throws(() => validateProgressUpdate({ expectedRevision: 0, observations: [observe({ environment: '../production' })] }), /environment/);
  assert.throws(() => validateProgressUpdate({ expectedRevision: 0, observations: [observe({ identity: { token: 'secret' } })] }), /Unknown/);
  assert.throws(() => validateProgressUpdate({ expectedRevision: 0, nextAction: 'x'.repeat(1001) }), /bounded/);
  assert.throws(() => validateProgressUpdate({ expectedRevision: 0, arbitraryCommand: 'shell' }), /Unknown/);
});
test('rejects symlink state/lock and malformed oversized state without overwriting it', () => fixture(async (root) => {
  const outside = path.join(root, 'outside.json');
  writeFileSync(outside, 'original');
  symlinkSync(outside, path.join(root, 'anhedral.progress.json'));
  assert.throws(() => readProjectProgress(root), /Unsafe/);
  await assert.rejects(updateProjectProgress(root, { expectedRevision: 0 }), /Unsafe/);
  assert.equal(readFileSync(outside, 'utf8'), 'original');
  rmSync(path.join(root, 'anhedral.progress.json'));
  symlinkSync(path.join(root, 'missing'), path.join(root, '.anhedral-progress.lock'));
  await assert.rejects(updateProjectProgress(root, { expectedRevision: 0 }), /Unsafe/);
  rmSync(path.join(root, '.anhedral-progress.lock'));
  writeFileSync(path.join(root, 'anhedral.progress.json'), 'x'.repeat(1_000_001));
  assert.throws(() => readProjectProgress(root), /size limit/);
}));
test('freshness distinguishes stale evidence and config/account drift', () => {
  const observed = observe({ observedAt: '2020-01-01T00:00:00.000Z' });
  assert.equal(progressFreshness(observed), 'stale');
  assert.equal(progressFreshness(observe(), { identity: { configDigest: 'config-b' } }), 'drifted');
  assert.equal(progressFreshness(observe(), { identity: { accountId: 'client-b' } }), 'drifted');
  assert.equal(progressFreshness(observe(), { identity: { configDigest: 'config-a', accountId: 'client-a' } }), 'current');
});
test('CLI report/read round trip and invalid report leaves state unchanged', () => fixture(async (root) => {
  const report = path.join(root, 'report.json');
  writeFileSync(report, JSON.stringify({ expectedRevision: 0, selected: ['neon'], observations: [observe()] }));
  const binary = path.resolve('dist/bin.js');
  const call = (args) => spawnSync(process.execPath, [binary, 'progress', root, ...args], { encoding: 'utf8' });
  const updated = call(['--update', report, '--json']);
  assert.equal(updated.status, 0, updated.stderr);
  assert.equal(JSON.parse(call(['--json']).stdout).revision, 1);
  writeFileSync(report, JSON.stringify({ expectedRevision: 1, nextAction: 'SECRET=bad' }));
  assert.equal(call(['--update', report, '--json']).status, 1);
  assert.equal(readProjectProgress(root).revision, 1);
}));

test('configuration fingerprints detect drift without exposing config secrets', () => fixture(async (root) => {
  writeFileSync(path.join(root, 'package.json'), '{"name":"example"}');
  writeFileSync(path.join(root, 'wrangler.jsonc'), '{"vars":{"private":"SECRET=not-for-panel"}}');
  const before = inspectProgressIdentity(root);
  assert.match(before.configDigest, /^[a-f0-9]{64}$/);
  assert.equal(before.gitRevision, undefined);
  const observation = observe({ identity: before });
  writeFileSync(path.join(root, 'wrangler.jsonc'), '{"name":"different"}');
  assert.equal(progressFreshness(observation, { identity: inspectProgressIdentity(root) }), 'drifted');
  assert.doesNotMatch(JSON.stringify(before), /not-for-panel/);
  rmSync(path.join(root, 'wrangler.jsonc'));
  symlinkSync(path.join(root, 'package.json'), path.join(root, 'wrangler.jsonc'));
  assert.throws(() => inspectProgressIdentity(root), /Unsafe/);
}));
test('separate processes serialize reports without losing a write', () => fixture(async (root) => {
  const binary = path.resolve('dist/bin.js');
  const reports = ['a', 'b'].map((name) => {
    const file = path.join(root, `${name}.json`);
    writeFileSync(file, JSON.stringify({ expectedRevision: 0, nextAction: name }));
    return file;
  });
  const launch = (report) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binary, 'progress', root, '--update', report, '--json'], { stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', resolve);
  });
  const codes = await Promise.all(reports.map(launch));
  assert.equal(codes.filter((code) => code === 0).length, 1);
  assert.equal(readProjectProgress(root).revision, 1);
}));
test('older facts and duplicate observation identities cannot hide new failures', () => fixture(async (root) => {
  await updateProjectProgress(root, { expectedRevision: 0, selected: ['neon'], observations: [observe({ status: 'failed' })] });
  await assert.rejects(updateProjectProgress(root, { expectedRevision: 1, observations: [observe({ observedAt: '2020-01-01T00:00:00.000Z' })] }), /Older observation/);
  assert.equal(readProjectProgress(root).observations[0].status, 'failed');
  assert.throws(() => validateProgressUpdate({ expectedRevision: 1, observations: [observe(), observe()] }), /Duplicate/);
}));
