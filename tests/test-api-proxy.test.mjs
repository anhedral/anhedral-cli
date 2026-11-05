import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { WEB_API_PROXY } from '../dist/api-proxy.js';
const javascript = ts.transpileModule(WEB_API_PROXY, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { proxyApi } = await import(
  'data:text/javascript;base64,' + Buffer.from(javascript).toString('base64')
);

test('API proxy requires a production binding and cannot use configured remote/local URLs in production', async () => {
  let sends = 0;
  const binding = {
    fetch: async () => {
      sends++;
      return new Response('unexpected');
    },
  };
  for (const options of [
    { development: false },
    { development: false, binding, devOrigin: 'http://127.0.0.1:8787' },
    { development: false, binding, devOrigin: 'https://bypass.example' },
    ...[
      'https://127.0.0.1:8787',
      'http://api.example',
      'http://127.0.0.1.evil',
      'http://user@localhost:8787',
      'http://localhost:8787/path',
      'http://localhost:8787/?token=secret',
    ].map((devOrigin) => ({ development: true, devOrigin, send: binding.fetch })),
  ]) {
    const response = await proxyApi(new Request('https://app.example/api/session'), options);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  assert.equal(sends, 0);
});

test('API proxy streams exact bytes/cookies, preserves origin and idempotency, strips forged identities', async () => {
  const bytes = Uint8Array.from([0, 255, 128, 10, 13]);
  let observed;
  const response = await proxyApi(
    new Request('https://app.example/api/files?opaque=%2F', {
      method: 'POST',
      headers: {
        origin: 'https://attacker.example',
        cookie: 'session=private',
        'idempotency-key': 'intent',
        'cf-access-authenticated-user-email': 'owner@example.com',
        'x-user-id': 'forged',
        'x-anhedral-dispatch-secret': 'forged',
        'sec-fetch-site': 'cross-site',
      },
      body: bytes,
    }),
    {
      development: false,
      binding: {
        fetch: async (request) => {
          observed = request;
          assert.deepEqual(new Uint8Array(await request.arrayBuffer()), bytes);
          const headers = new Headers({
            'access-control-allow-origin': '*',
            'cache-control': 'public',
          });
          headers.append('set-cookie', 'one=1; HttpOnly; Path=/');
          headers.append('set-cookie', 'two=2; HttpOnly; Path=/');
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(bytes);
                controller.close();
              },
            }),
            { status: 201, headers },
          );
        },
      },
    },
  );
  assert.equal(observed.url, 'https://api.internal/api/files?opaque=%2F');
  for (const name of [
    'cf-access-authenticated-user-email',
    'x-user-id',
    'x-anhedral-dispatch-secret',
  ])
    assert.equal(observed.headers.get(name), null);
  assert.equal(observed.headers.get('cookie'), 'session=private');
  assert.equal(observed.headers.get('origin'), 'https://attacker.example');
  assert.equal(observed.headers.get('idempotency-key'), 'intent');
  assert.equal(observed.headers.get('sec-fetch-site'), 'cross-site');
  assert.equal(response.status, 201);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.deepEqual(response.headers.getSetCookie(), [
    'one=1; HttpOnly; Path=/',
    'two=2; HttpOnly; Path=/',
  ]);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('Development API proxy supports explicit loopback sidecar and production path remains bound', async () => {
  const response = await proxyApi(new Request('http://localhost:3000/api/health'), {
    development: true,
    devOrigin: 'http://127.0.0.1:3001',
    send: async (request) => {
      assert.equal(request.url, 'http://127.0.0.1:3001/api/health');
      return Response.json({ ok: true });
    },
  });
  assert.deepEqual(await response.json(), { ok: true });
});

test('Development API proxy removes stale wire headers after Node fetch decompresses the sidecar response', async () => {
  const compressed = gzipSync(JSON.stringify({ ok: true }));
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      'content-type': 'application/json',
      'content-encoding': 'gzip',
      'content-length': String(compressed.length),
    });
    response.end(compressed);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await proxyApi(new Request('http://localhost:3000/api/health'), {
      development: true,
      devOrigin: `http://127.0.0.1:${server.address().port}`,
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-encoding'), null);
    assert.equal(response.headers.get('content-length'), null);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
