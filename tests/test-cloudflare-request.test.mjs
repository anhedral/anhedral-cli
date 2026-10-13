import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudflareRequest, listCloudflare } from '../dist/cloudflare.js';
const accountId = 'a'.repeat(32);
const token = 'private-test-token';
const credentials = async () => JSON.stringify({ type: 'api_token', token });
const envelope = (result = []) => JSON.stringify({ success: true, result });

for (const credential of [
  null,
  [],
  { type: ['oauth'], token },
  { type: 'global_api_key', token },
  { type: 'oauth', token: 'bad\nheader' },
  { type: 'oauth', token: 'bad\x00header' },
  { type: 'oauth', token: '' },
])
  test(`Cloudflare rejects malformed credential shape ${JSON.stringify(credential?.type)}`, async () => {
    await assert.rejects(
      cloudflareRequest({ accountId }, '/tmp', async () => JSON.stringify(credential), {}),
      /scoped API-token/,
    );
  });

for (const endpoint of [
  '//evil.test/path',
  '/../outside',
  '/%2e%2e/outside',
  '/%252e%252e/outside',
  '/path%5c..%5cescape',
  '/path%0aheader',
  '/path#private',
  '/path\\escape',
  '/path\nheader',
  '/bad%ZZ',
  'https://evil.test',
])
  test(`Cloudflare rejects an unsafe account path ${JSON.stringify(endpoint)}`, async () => {
    let calls = 0;
    const request = await cloudflareRequest(
      { accountId },
      '/tmp',
      credentials,
      {},
      {
        send: async () => {
          calls++;
          return new Response(envelope());
        },
      },
    );
    await assert.rejects(request('GET', endpoint), /account-scoped/);
    assert.equal(calls, 0);
  });

test('Cloudflare account identity is captured and cannot change during a request session', async () => {
  const project = { accountId };
  const calls = [];
  const request = await cloudflareRequest(
    project,
    '/tmp',
    credentials,
    {},
    {
      send: async (url, options) => {
        calls.push({ url, options });
        return new Response(envelope([{ id: 'resource' }]));
      },
    },
  );
  project.accountId = 'b'.repeat(32);
  assert.deepEqual((await request('GET', '/subscriptions?state=active')).result, [
    { id: 'resource' },
  ]);
  assert.equal(
    calls[0].url,
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/subscriptions?state=active`,
  );
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${token}`);
  assert.equal(calls[0].options.redirect, 'error');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
});

for (const payload of [
  'null',
  '[]',
  '{bad private diagnostic',
  JSON.stringify({ success: false, errors: 'private diagnostic' }),
  JSON.stringify({ success: true }),
  'x'.repeat(2 * 1024 * 1024 + 1),
])
  test(`Cloudflare response is bounded and sanitized (${payload.length} bytes)`, async () => {
    const request = await cloudflareRequest(
      { accountId },
      '/tmp',
      credentials,
      {},
      { send: async () => new Response(payload) },
    );
    await assert.rejects(request('GET', '/resources'), (error) => {
      assert.doesNotMatch(error.message, /private diagnostic|private-test-token|TypeError/);
      return true;
    });
  });

for (const status of [403, 429, 503])
  test(`Cloudflare POST HTTP ${status} never retries or exposes provider error messages`, async () => {
    let calls = 0;
    const request = await cloudflareRequest(
      { accountId },
      '/tmp',
      credentials,
      {},
      {
        send: async () => {
          calls++;
          return new Response(
            JSON.stringify({
              success: false,
              errors: [null, { code: 1000, message: 'private diagnostic' }],
            }),
            { status },
          );
        },
      },
    );
    await assert.rejects(request('POST', '/resources', { name: 'example' }), (error) => {
      assert.match(error.message, new RegExp(`HTTP ${status}`));
      assert.doesNotMatch(error.message, /private diagnostic|private-test-token/);
      return true;
    });
    assert.equal(calls, 1);
  });

test('Cloudflare whole-request deadline bounds an uncooperative fetch and does not retry creation', async () => {
  let calls = 0;
  const request = await cloudflareRequest(
    { accountId },
    '/tmp',
    credentials,
    {},
    {
      timeoutMs: 15,
      send: async () => {
        calls++;
        return new Promise(() => {});
      },
    },
  );
  await assert.rejects(request('POST', '/resources', {}), /deadline exceeded/);
  assert.equal(calls, 1);
});

test('Cloudflare whole-request deadline also bounds a stalled response body', async () => {
  let canceled = false;
  const body = new ReadableStream({
    cancel() {
      canceled = true;
      throw new Error('private cancellation diagnostic');
    },
  });
  const request = await cloudflareRequest(
    { accountId },
    '/tmp',
    credentials,
    {},
    { timeoutMs: 15, send: async () => new Response(body) },
  );
  await assert.rejects(request('GET', '/resources'), /deadline exceeded/);
  assert.equal(canceled, true);
});

for (const result of [[[]], [null], [{ id: 1 }]])
  test(`Cloudflare list rejects malformed resources or pagination ${JSON.stringify(result)}`, async () => {
    await assert.rejects(
      listCloudflare(async () => ({ result, result_info: { total_pages: 'bad' } }), '/resources'),
      /Unsupported provider resource list|unsupported pagination/,
    );
  });

test('Cloudflare pagination bounds the total collected payload', async () => {
  let calls = 0;
  await assert.rejects(
    listCloudflare(async () => {
      calls++;
      return {
        result: [{ payload: 'x'.repeat(2 * 1024 * 1024) }],
        result_info: { total_pages: 100 },
      };
    }, '/resources'),
    /collection limit/,
  );
  assert.equal(calls, 5);
});
