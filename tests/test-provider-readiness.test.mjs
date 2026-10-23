import { writeProjectSection } from '../dist/project-config.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectProviderReadiness } from '../dist/provider-readiness.js';

function runner(calls) {
  return async (command, args) => {
    calls.push({ command, args });
    if (command === 'pnpm' && args[0] === '--version') return '10.34.5';
    if (command === 'git' && args[0] === '--version') return 'git version 2.50.0';
    if (command === 'git' && args[0] === 'var') return 'private-author-identity-value';
    if (command === 'gh' && args[0] === 'api' && args[1] === 'user')
      return JSON.stringify({ login: 'customer' });
    throw new Error('Unexpected provider mutation or command');
  };
}
test('provider doctor separates local prerequisites from production acceptance and omits account identity values', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-provider-readiness-'));
  try {
    const calls = [];
    const report = await inspectProviderReadiness(root, runner(calls));
    assert.equal(report.localReady, false);
    assert.equal(report.productionReady, false);
    assert.equal(report.mutation, false);
    assert.equal(report.providerVerification, 'unverified');
    assert.deepEqual(report.providers, []);
    assert.equal(JSON.stringify(report).includes('private-author-identity-value'), false);
    assert.ok(calls.every((call) => ['--version', 'var', 'api'].includes(call.args[0])));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('unconfigured providers are blocked without automatically signing in or connecting', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-provider-readiness-'));
  try {
    writeProjectSection(root, 'cloudflare', { accountId: null, audience: 'unconfigured' });
    const calls = [];
    const report = await inspectProviderReadiness(root, runner(calls));
    assert.deepEqual(
      report.providers.map((provider) => provider.connection),
      ['blocked'],
    );
    assert.equal(
      report.providers.every((provider) => provider.deployment === 'unverified'),
      true,
    );
    assert.equal(report.productionReady, false);
    assert.equal(
      calls.some(
        (call) =>
          call.args.includes('login') ||
          call.args.includes('connect') ||
          call.args.includes('deploy'),
      ),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('tool failures remain actionable checks without leaking raw provider errors', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-provider-readiness-'));
  try {
    const report = await inspectProviderReadiness(root, async () => {
      throw new Error('sensitive-credential-value');
    });
    assert.equal(report.prerequisitesReady, false);
    assert.equal(report.productionReady, false);
    assert.equal(JSON.stringify(report).includes('sensitive-credential-value'), false);
    assert.ok(
      report.prerequisiteChecks
        .filter((check) => !check.ok)
        .every((check) => check.id === 'node' || typeof check.nextAction === 'string'),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
