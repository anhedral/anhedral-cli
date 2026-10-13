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
  const options = parseStandardOptions('new', [root, ...flags, '--skip-install']);
  writeFileSync(path.join(root, 'anhedral.setup.json'), JSON.stringify(createSetupPlan(options)));
  return root;
}

test('provider selection follows the stack and deduplicates Cloudflare access', () => {
  const root = fixture(['--hono', '--d1', '--r2', '--queues', '--workers-ai']);
  try {
    assert.deepEqual(
      requiredProviders(root).map((p) => p.id),
      ['cloudflare'],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const local = fixture(['--electron', '--local-data']);
  try {
    assert.deepEqual(requiredProviders(local), []);
  } finally {
    rmSync(local, { recursive: true, force: true });
  }
});

test('status does not open login; interactive auth retries and verifies the provider session', async () => {
  const root = fixture([]);
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
      { status: true, interactive: true },
      run,
      undefined,
      login,
      {},
    );
    assert.equal(status.authenticated, false);
    assert.equal(logins, 0);
    const result = await authenticateProviders(
      root,
      { interactive: true },
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

test('API authentication distinguishes permissions and never returns credential or response values', async () => {
  const root = fixture(['--hono', '--neon', '--resend', '--openai']);
  const token = 'test-value';
  const calls = [];
  const send = async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify({ diagnostic: token }), {
      status: url.includes('resend') ? 403 : 200,
    });
  };
  try {
    const result = await authenticateProviders(
      root,
      { status: true },
      async () => JSON.stringify({ loggedIn: true, accounts: [{ id: 'a'.repeat(32) }] }),
      send,
      undefined,
      { NEON_API_KEY: token, RESEND_API_KEY: token, OPENAI_API_KEY: token },
    );
    assert.equal(calls.length, 3);
    assert.equal(result.checks.find((c) => c.provider === 'neon').state, 'verified');
    assert.equal(
      result.checks.find((c) => c.provider === 'resend').state,
      'insufficient-permissions',
    );
    assert.equal(result.authenticated, false);
    assert.doesNotMatch(JSON.stringify(result), /test-value|diagnostic/);
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
    const root = fixture(['--hono', '--neon']);
    let logins = 0;
    try {
      const result = await authenticateProviders(
        root,
        { provider: 'neon', status: true, interactive: true },
        async () => '',
        async (_url, options) => {
          assert.equal(options.method, undefined);
          return new Response('sensitive-diagnostic', { status });
        },
        async () => {
          logins++;
        },
        { NEON_API_KEY: 'private-token' },
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
  const root = fixture(['--hono', '--neon']);
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

for (const [flags, provider] of [
  [['--next', '--hosting=vercel'], 'vercel'],
  [['--expo'], 'expo'],
]) {
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

for (const [provider, runtimeCredential, managementCredential, runtimePath, managementPath] of [
  ['clerk', 'CLERK_SECRET_KEY', 'CLERK_PLATFORM_API_KEY', '/v1/users/count', '/v1/platform/me'],
  ['openai', 'OPENAI_API_KEY', 'OPENAI_ADMIN_KEY', '/v1/models', '/v1/organization/projects'],
]) {
  test(`${provider}: runtime access is labeled separately and management credentials take precedence`, async () => {
    const root = fixture(['--hono', `--${provider}`]);
    try {
      for (const management of [false, true]) {
        const environment = {
          [runtimeCredential]: 'runtime-private',
          ...(management ? { [managementCredential]: 'management-private' } : {}),
        };
        const result = await authenticateProviders(
          root,
          { provider, status: true },
          async () => '',
          async (url, options) => {
            assert.ok(url.endsWith(management ? managementPath : runtimePath));
            assert.equal(
              options.headers.Authorization,
              `Bearer ${management ? 'management-private' : 'runtime-private'}`,
            );
            return new Response('{}');
          },
          undefined,
          environment,
        );
        assert.equal(result.checks[0].access, management ? 'management' : 'runtime');
        assert.equal(result.provisioningReady, false);
        assert.doesNotMatch(JSON.stringify(result), /management-private|runtime-private/);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('PostHog authentication requires the configured region before sending management credentials', async () => {
  const root = fixture(['--hono', '--posthog']);
  try {
    let calls = 0;
    const send = async (url) => {
      calls++;
      assert.equal(url, 'https://eu.posthog.com/api/organizations/');
      return new Response('{}');
    };
    const environment = { POSTHOG_PERSONAL_API_KEY: 'private-key' };
    const pending = await authenticateProviders(
      root,
      { provider: 'posthog', status: true },
      async () => '',
      send,
      undefined,
      environment,
    );
    assert.equal(pending.checks[0].state, 'unverified');
    assert.equal(calls, 0);
    writeFileSync(
      path.join(root, 'anhedral.providers.json'),
      JSON.stringify({ schemaVersion: 1, providers: { posthog: { region: 'eu' } } }),
    );
    const checked = await authenticateProviders(
      root,
      { provider: 'posthog', status: true },
      async () => '',
      send,
      undefined,
      environment,
    );
    assert.equal(checked.checks[0].access, 'management');
    assert.equal(calls, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
