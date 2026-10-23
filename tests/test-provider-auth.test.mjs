import { writeProjectSection } from '../dist/project-config.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseStandardOptions } from '../dist/standard.js';
import { createSetupPlan } from '../dist/capabilities.js';
import { authenticateProviders, requiredProviders } from '../dist/provider-auth.js';

function fixture(flags) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-auth-test-'));
  const options = parseStandardOptions([
    root,
    ...flags.filter((flag) => ['--stripe', '--revenuecat'].includes(flag)),
    '--skip-install',
  ]);
  writeProjectSection(root, 'setup', createSetupPlan(options));
  return root;
}

test('status does not open login; interactive auth retries and verifies the provider session', async () => {
  const root = fixture(['--vinext']);
  let loggedIn = false;
  let logins = 0;
  const run = async () => {
    if (!loggedIn) throw new Error('private diagnostic');
    return JSON.stringify({ loggedIn: true, accounts: [{ id: 'a'.repeat(32) }] });
  };
  const login = async () => {
    loggedIn = true;
    logins++;
  };
  try {
    const status = await authenticateProviders(
      root,
      { status: true, interactive: true, provider: 'cloudflare' },
      run,
      undefined,
      login,
      {},
    );
    assert.equal(status.authenticated, false);
    assert.equal(logins, 0);
    const result = await authenticateProviders(
      root,
      { interactive: true, provider: 'cloudflare' },
      run,
      undefined,
      login,
      {},
    );
    assert.equal(logins, 1);
    assert.equal(result.authenticated, true);
    assert.equal(result.provisioningReady, false);
    assert.doesNotMatch(JSON.stringify(result), /Authenticated account|private diagnostic/);
    await assert.rejects(authenticateProviders(root, { provider: 'stripe' }, run), /not required/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const [status, state] of [
  [200, 'verified'],
  [401, 'missing'],
  [403, 'insufficient-permissions'],
  [429, 'unverified'],
  [500, 'unverified'],
]) {
  test(`auth status HTTP ${status} reports ${state} without login or mutation`, async () => {
    const root = fixture(['--hono', '--revenuecat']);
    let logins = 0;
    try {
      const result = await authenticateProviders(
        root,
        { provider: 'revenuecat', status: true, interactive: true },
        async () => '',
        async (_url, options) => {
          assert.equal(options.method, undefined);
          return new Response('sensitive-diagnostic', { status });
        },
        async () => {
          logins++;
        },
        { RC_API_KEY: 'private-token' },
      );
      assert.equal(result.checks[0].state, state);
      assert.equal(result.authenticated, state === 'verified');
      assert.equal(result.provisioningReady, false);
      assert.equal(logins, 0);
      assert.doesNotMatch(JSON.stringify(result), /private-token|sensitive-diagnostic/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
for (const output of [
  '',
  '{broken',
  '{}',
  '{"loggedIn":true,"accounts":[]}',
  '{"loggedIn":false,"accounts":[{"id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]}',
  '{"loggedIn":true,"accounts":[null]}',
]) {
  test(`Cloudflare malformed or missing session fails closed: ${output}`, async () => {
    const root = fixture(['--hono']);
    try {
      const result = await authenticateProviders(
        root,
        { status: true },
        async () => output,
        undefined,
        undefined,
        {},
      );
      assert.equal(result.authenticated, false);
      assert.equal(result.checks[0].state, 'missing');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
test('missing API credential skips network and failed login remains missing', async () => {
  const root = fixture(['--hono', '--revenuecat']);
  let calls = 0;
  try {
    const result = await authenticateProviders(
      root,
      { interactive: true },
      async () => {
        throw new Error('session missing');
      },
      async () => {
        calls++;
        throw new Error('unexpected network');
      },
      async () => {
        throw new Error('login canceled');
      },
      {},
    );
    assert.equal(result.authenticated, false);
    assert.ok(result.checks.every((check) => check.state === 'missing'));
    assert.equal(calls, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const [flags, provider] of [[[], 'expo']]) {
  test(`${provider}: CLI session requires a single bounded identity, not diagnostic output`, async () => {
    const root = fixture(flags);
    try {
      for (const [output, authenticated] of [
        ['verified-user\n', true],
        ['Not logged in', false],
        ['unauthenticated', false],
        ['error', false],
        ['Warning: CLI update available\nverified-user', false],
        ['{ "token": "private" }', false],
        ['a'.repeat(1025), false],
      ]) {
        const result = await authenticateProviders(
          root,
          { provider, status: true },
          async () => output,
          undefined,
          undefined,
          {},
        );
        assert.equal(result.authenticated, authenticated, output.slice(0, 50));
        assert.equal(result.checks[0].access, authenticated ? 'session' : 'none');
        assert.equal(result.provisioningReady, false);
        assert.doesNotMatch(JSON.stringify(result), /verified-user|private/);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
