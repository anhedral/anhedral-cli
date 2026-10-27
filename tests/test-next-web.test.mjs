import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { WEB_API_PROXY } from '../dist/platforms/web.js';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
const javascript = ts.transpileModule(WEB_API_PROXY, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { proxyApi } = await import(
  'data:text/javascript;base64,' + Buffer.from(javascript).toString('base64')
);

test('Next proxy requires a production binding and cannot use configured remote/local URLs in production', async () => {
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

test('Next proxy streams exact bytes/cookies, preserves origin and idempotency, strips forged identities', async () => {
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

test('Next development proxy supports explicit loopback sidecar and production path remains bound', async () => {
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

test('Next development proxy removes stale wire headers after Node fetch decompresses the sidecar response', async () => {
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

test('explicit legacy workspace separates full Next web, native owned UI and privileged Hono runtime', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-next-contract-'));
  const root = path.join(temporary, 'product');
  const read = (file) => readFileSync(path.join(root, file), 'utf8');
  try {
    await scaffoldStandardProject(
      {
        ...parseStandardOptions([root, '--skip-install', '--no-git']),
        products: ['d1', 'expo', 'hono', 'next', 'r2', 'styling'],
      },
      () => {
        throw Error('offline generation');
      },
      { quiet: true },
    );
    const web = JSON.parse(read('apps/web/package.json'));
    const native = JSON.parse(read('apps/mobile/package.json'));
    assert.equal(JSON.parse(read('apps/web/components.json')).style, 'base-nova');
    assert.match(read('pnpm-workspace.yaml'), /@node-minify\/core>glob.*10\.5\.0/);
    assert.match(read('pnpm-workspace.yaml'), /@expo\/cli>zod.*4\.6\.6/);
    assert.match(read('pnpm-workspace.yaml'), /miniflare>undici.*7\.30\.1/);
    assert.equal(web.dependencies.next, '16.4.2');
    assert.equal(web.dependencies['@opennextjs/cloudflare'], '1.20.12');
    assert.equal(web.devDependencies.wrangler, '4.151.0');
    for (const name of ['react-native', 'react-native-web', 'expo', '@workspace/native-ui'])
      assert.equal(web.dependencies[name], undefined);
    assert.equal(native.dependencies['react-native-web'], undefined);
    assert.equal(native.dependencies.nativewind, undefined);
    assert.deepEqual(JSON.parse(read('apps/mobile/app.json')).expo.platforms, ['ios', 'android']);
    assert.equal(existsSync(path.join(root, 'apps/mobile/wrangler.jsonc')), false);
    assert.equal(
      native.scripts.dev,
      undefined,
      'Metro is explicit, not started in ordinary web development',
    );
    assert.match(native.scripts.start, /expo start/);
    assert.match(web.scripts.dev, /^next dev/);
    assert.match(web.scripts.build, /opennextjs-cloudflare build/);
    assert.doesNotMatch(read('apps/web/next.config.ts'), /output:.*export/);
    assert.doesNotMatch(read('apps/web/app/page.tsx'), /headers\(|cookies\(|force-dynamic/);
    assert.match(read('apps/web/public/_headers'), /max-age=31536000, immutable/);
    assert.equal(existsSync(path.join(root, 'apps/web/app/account/page.tsx')), false);
    assert.match(read('apps/web/components/ui/button.tsx'), /@base-ui\/react\/button/);
    assert.match(read('apps/web/components/ui/input.tsx'), /@base-ui\/react\/input/);
    assert.doesNotMatch(read('apps/web/components/ui/input.tsx'), /focus-visible:(?:ring|border)/);
    assert.equal(existsSync(path.join(root, 'apps/web/app/sign-in/page.tsx')), false);
    assert.match(read('apps/web/UPSTREAM.json'), /shadcn/);
    assert.match(read('packages/native-ui/src/native/button.tsx'), /Pressable/);
    // Native dialog behavior is exercised by the real generated-source native suite.
    assert.match(read('packages/native-ui/src/theme.tsx'), /@workspace\/styling/);
    const worker = JSON.parse(read('apps/web/wrangler.jsonc'));
    assert.equal(worker.main, '.open-next/worker.js');
    assert.equal(worker.assets.binding, 'ASSETS');
    assert.ok(worker.services.some((item) => item.binding === 'ANHEDRAL_API'));
    assert.equal(worker.d1_databases, undefined);
    assert.equal(worker.r2_buckets, undefined);
    assert.doesNotMatch(
      read('apps/web/lib/server-api.ts'),
      /BETTER_AUTH_SECRET|STRIPE_SECRET|REVENUECAT_SECRET/,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
