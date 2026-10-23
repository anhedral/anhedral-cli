import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { PRIVATE_FILES_SOURCE } from '../dist/scaffold/private-files.js';

const require = createRequire(import.meta.url);
const hono = pathToFileURL(require.resolve('hono')).href;
// Inject identity only; exercise real generated routes and their bounded upload reader.
const source = PRIVATE_FILES_SOURCE.replace('const MAX_FILE_BYTES', 'export const MAX_FILE_BYTES')
  .replace('function createPrivateFileRoutes', 'export function createPrivateFileRoutes')
  .replace("from 'hono'", `from '${hono}'`)
  .replace(/^import .* from '@workspace\/[^']+';\n/gm, '')
  .replace(/async function authenticate[\s\S]*?\n}\n/, 'const authenticate = async () => null;\n');
const { createPrivateFileRoutes, MAX_FILE_BYTES } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(
      ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    ).toString('base64')
);
function fixture() {
  const objects = new Map();
  const env = {
    BETTER_AUTH_URL: 'https://app.example',
    FILES: {
      async put(key, value) {
        objects.set(key, value);
      },
      async get(key) {
        return objects.has(key) ? { body: objects.get(key) } : null;
      },
      async delete(key) {
        objects.delete(key);
      },
    },
  };
  const app = createPrivateFileRoutes(async (request) => request.headers.get('test-user'));
  const send = (route, init = {}, user = 'alice') =>
    app.request(
      'https://app.example' + route,
      { ...init, headers: { ...(user ? { 'test-user': user } : {}), ...init.headers } },
      env,
    );
  return { send, objects };
}
test('private file routes reject anonymous access before touching R2', async () => {
  const { send, objects } = fixture();
  for (const method of ['GET', 'POST', 'DELETE'])
    assert.equal(
      (await send('/', { method, ...(method === 'POST' ? { body: 'private' } : {}) }, null)).status,
      401,
    );
  assert.equal(objects.size, 0);
});
test('upload/download/delete remain in the authenticated owner namespace', async () => {
  const { send, objects } = fixture();
  const upload = await send('/', { method: 'POST', body: 'private payload' });
  assert.equal(upload.status, 201);
  const { id, size } = await upload.json();
  assert.equal(size, 15);
  assert.match([...objects.keys()][0], /^alice\//);
  const download = await send('/' + id);
  assert.equal(await download.text(), 'private payload');
  assert.equal(download.headers.get('cache-control'), 'private, no-store');
  assert.match(download.headers.get('content-disposition'), /^attachment/);
  assert.equal((await send('/' + id, {}, 'bob')).status, 404);
  assert.equal((await send('/' + id, { method: 'DELETE' }, 'bob')).status, 204);
  assert.equal((await send('/' + id)).status, 200);
  assert.equal((await send('/' + id, { method: 'DELETE' })).status, 204);
  assert.equal((await send('/' + id)).status, 404);
});
test('uploads enforce real byte limits including streams, reject empty data and cross-site writes', async () => {
  const { send, objects } = fixture();
  assert.equal((await send('/', { method: 'POST', body: '' })).status, 400);
  assert.equal(
    (await send('/', { method: 'POST', body: 'data', headers: { origin: 'https://evil.example' } }))
      .status,
    403,
  );
  assert.equal(
    (await send('/', { method: 'POST', body: 'data', headers: { 'sec-fetch-site': 'cross-site' } }))
      .status,
    403,
  );
  assert.equal(
    (await send('/', { method: 'POST', body: new Uint8Array(MAX_FILE_BYTES + 1) })).status,
    413,
  );
  assert.equal(
    (
      await send('/', {
        method: 'POST',
        body: new Uint8Array(MAX_FILE_BYTES + 1),
        headers: { 'content-length': '1' },
      })
    ).status,
    413,
  );
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_FILE_BYTES));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    },
  });
  assert.equal((await send('/', { method: 'POST', body, duplex: 'half' })).status, 413);
  assert.equal(objects.size, 0);
});
