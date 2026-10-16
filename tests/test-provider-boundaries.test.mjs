import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  providerApi,
  ProviderRequestError,
  digest,
  resourceId,
  object,
  list,
  text,
} from '../dist/providers/api.js';
import { ProvisioningState } from '../dist/providers/state.js';

for (const value of [null, [], 'resource', 1, false]) {
  test(`resource objects reject ${JSON.stringify(value)}`, () =>
    assert.throws(() => object(value), /invalid resource/));
}
for (const value of [null, {}, [null], [[]], ['id']]) {
  test(`resource lists reject ${JSON.stringify(value)}`, () =>
    assert.throws(() => list(value), /invalid resource/));
}
for (const value of [
  '',
  'a/b',
  'a?b',
  'a\nb',
  0,
  -1,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
  'a'.repeat(256),
]) {
  test(`resource IDs reject ${JSON.stringify(value).slice(0, 45)}`, () =>
    assert.throws(() => resourceId(value), /invalid resource/));
}
test('resource primitives accept supported string and numeric IDs without altering fields', () => {
  assert.equal(resourceId(42), '42');
  assert.equal(resourceId('proj_1-a'), 'proj_1-a');
  assert.equal(text('a'.repeat(16384)).length, 16384);
  assert.throws(() => text('a'.repeat(16385)), /invalid resource field/);
  assert.deepEqual(list([{ id: 1 }]), [{ id: 1 }]);
});
test('operation fingerprints ignore object order but preserve array order and values', () => {
  assert.equal(digest({ b: [{ z: 2, a: 1 }], a: 0 }), digest({ a: 0, b: [{ a: 1, z: 2 }] }));
  assert.notEqual(digest([1, 2]), digest([2, 1]));
  assert.notEqual(digest({ id: '1' }), digest({ id: 1 }));
});
for (const route of [
  'https://evil.test/',
  '//evil.test/',
  '/../../secret',
  '/path#fragment',
  '/path\\escape',
  '/path\nheader',
]) {
  test(`provider API rejects unsafe route ${JSON.stringify(route)}`, async () => {
    let calls = 0;
    const api = providerApi('neon', {}, { NEON_API_KEY: 'private-token' }, async () => {
      calls++;
    });
    await assert.rejects(api(route), /Invalid provider API path|origin changed/);
    assert.equal(calls, 0);
  });
}
for (const status of [400, 401, 403, 404, 408, 409, 429, 500, 503]) {
  test(`HTTP ${status} classifies safe retry without leaking diagnostics`, async () => {
    const api = providerApi(
      'neon',
      {},
      { NEON_API_KEY: 'private-token' },
      async () => new Response('private-token and remote details', { status }),
    );
    await assert.rejects(api('/api/v2/projects'), (error) => {
      assert.ok(error instanceof ProviderRequestError);
      assert.equal(error.rejected, status < 500 && ![408, 429].includes(status));
      assert.doesNotMatch(error.message, /private-token|remote details/);
      return true;
    });
  });
}
for (const payload of ['', '{broken', 'x'.repeat(2 * 1024 * 1024 + 1)]) {
  test(`provider response rejects ${payload.length} bytes of invalid JSON`, async () => {
    const api = providerApi(
      'neon',
      {},
      { NEON_API_KEY: 'private-token' },
      async () => new Response(payload),
    );
    await assert.rejects(api('/api/v2/projects'), /invalid or oversized JSON/);
  });
}
test('network failures sanitize diagnostics and Stripe encodes arrays with an idempotency key', async () => {
  const failed = providerApi('neon', {}, { NEON_API_KEY: 'private-token' }, async () => {
    throw new Error('private-token');
  });
  await assert.rejects(failed('/projects'), (error) => !error.message.includes('private-token'));
  const api = providerApi(
    'stripe',
    {},
    { STRIPE_SECRET_KEY: 'private-token' },
    async (url, options) => {
      assert.equal(new URL(url).origin, 'https://api.stripe.com');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers['Idempotency-Key'], 'operation-1');
      assert.equal(options.headers['Content-Type'], 'application/x-www-form-urlencoded');
      const form = new URLSearchParams(options.body);
      assert.deepEqual(form.getAll('enabled_events[]'), ['a.created', 'b.created']);
      assert.equal(form.get('url'), 'https://example.com/a?b=c&d=e');
      return new Response('{"id":"we_1"}');
    },
  );
  assert.deepEqual(
    await api(
      '/v1/webhook_endpoints',
      'POST',
      { url: 'https://example.com/a?b=c&d=e', enabled_events: ['a.created', 'b.created'] },
      'operation-1',
    ),
    { id: 'we_1' },
  );
});

for (const providers of [
  [],
  { neon: null },
  { neon: { config: 'hash', operations: [] } },
  { neon: { config: 'hash', operations: { op: { status: 'other' } } } },
  { unknown: { config: 'hash', operations: {} } },
]) {
  test(`journal rejects malformed provider state ${JSON.stringify(providers)}`, () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-state-boundary-'));
    try {
      writeFileSync(
        path.join(directory, 'providers.json'),
        JSON.stringify({ schemaVersion: 2, providers }),
        { mode: 0o600 },
      );
      assert.throws(() => new ProvisioningState(directory), /Invalid provider state/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
test('journal persists results across process instances and refuses changed configuration', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-state-boundary-'));
  try {
    const settings = { name: 'example' };
    const state = new ProvisioningState(directory);
    state.context('neon', settings);
    let calls = 0;
    const api = async () => {
      calls++;
      return { project: { id: 'proj_1' } };
    };
    await state.create('neon', 'project', api, '/projects', settings);
    const restored = new ProvisioningState(directory);
    restored.context('neon', settings);
    assert.deepEqual(await restored.create('neon', 'project', api, '/projects', settings), {
      project: { id: 'proj_1' },
    });
    assert.equal(calls, 1);
    const before = readFileSync(path.join(directory, 'providers.json'), 'utf8');
    assert.throws(() => restored.context('neon', { name: 'changed' }), /configuration changed/);
    assert.equal(readFileSync(path.join(directory, 'providers.json'), 'utf8'), before);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

const hash = 'a'.repeat(64);
for (const operation of [
  null,
  [],
  {},
  { status: 'other' },
  { status: 'pending', value: {} },
  { status: 'complete' },
  { status: 'complete', value: [] },
  { status: 'complete', value: {}, unexpected: true },
]) {
  test(`journal validates each operation independently: ${JSON.stringify(operation)}`, () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-state-boundary-'));
    try {
      writeFileSync(
        path.join(directory, 'providers.json'),
        JSON.stringify({
          schemaVersion: 2,
          providers: { neon: { config: hash, operations: { [hash]: operation } } },
        }),
        { mode: 0o600 },
      );
      assert.throws(() => new ProvisioningState(directory), /Invalid provider state/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
for (const rejected of [true, false]) {
  test(`journal ${rejected ? 'permits retry after definite rejection' : 'blocks replay after unknown failure'} across restarts`, async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-state-boundary-'));
    try {
      const state = new ProvisioningState(directory);
      const settings = { name: 'example' };
      state.context('neon', settings);
      await assert.rejects(
        state.create(
          'neon',
          'project',
          async () => {
            throw new ProviderRequestError('HTTP failure', rejected);
          },
          '/projects',
          settings,
        ),
        /HTTP failure/,
      );
      const restored = new ProvisioningState(directory);
      restored.context('neon', settings);
      let calls = 0;
      const retry = restored.create(
        'neon',
        'project',
        async () => {
          calls++;
          return { id: 'project-1' };
        },
        '/projects',
        settings,
      );
      if (rejected) assert.deepEqual(await retry, { id: 'project-1' });
      else await assert.rejects(retry, /unknown outcome/);
      assert.equal(calls, rejected ? 1 : 0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

const providerOrigins = {
  neon: ['NEON_API_KEY', 'https://console.neon.tech'],
  clerk: ['CLERK_PLATFORM_API_KEY', 'https://api.clerk.com'],
  resend: ['RESEND_API_KEY', 'https://api.resend.com'],
  stripe: ['STRIPE_SECRET_KEY', 'https://api.stripe.com'],
  revenuecat: ['RC_API_KEY', 'https://api.revenuecat.com'],
  sentry: ['SENTRY_AUTH_TOKEN', 'https://sentry.io'],
  posthog: ['POSTHOG_PERSONAL_API_KEY', 'https://us.posthog.com'],
  openai: ['OPENAI_ADMIN_KEY', 'https://api.openai.com'],
};
for (const [provider, [credential, origin]] of Object.entries(providerOrigins)) {
  test(`${provider}: uses the fixed management origin and requires its own credential`, async () => {
    assert.throws(() => providerApi(provider, {}, {}, async () => {}), new RegExp(credential));
    assert.throws(
      () => providerApi(provider, {}, { [credential]: 'bad\nheader' }, async () => {}),
      new RegExp(credential),
    );
    const api = providerApi(
      provider,
      {},
      { [credential]: 'private-token' },
      async (url, options) => {
        assert.equal(new URL(url).origin, origin);
        assert.equal(options.headers.Authorization, 'Bearer private-token');
        assert.equal(
          options.headers['Idempotency-Key'],
          ['stripe', 'resend'].includes(provider) ? 'operation-1' : undefined,
        );
        assert.equal(options.signal instanceof AbortSignal, true);
        return new Response('{"id":"resource-1"}');
      },
    );
    assert.deepEqual(await api('/resources', 'POST', { name: 'example' }, 'operation-1'), {
      id: 'resource-1',
    });
  });
}
