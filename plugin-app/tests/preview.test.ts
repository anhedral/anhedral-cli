import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { request as httpRequest } from 'node:http';
import { once } from 'node:events';
import { ProjectStore } from '../server/store.ts';
import { createPreviewServer } from '../server/preview.ts';
test('preview is same-origin only, validates input, and uses hash-constrained scripts', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-ui-http-'));
  const store = new ProjectStore(directory);
  writeFileSync(path.join(directory, 'package.json'), '{"name":"test-site"}');
  store.register(directory);
  const server = createPreviewServer(store, '<html><script>console.log("test")</script></html>');
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    const page = await fetch(url);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy')!, /script-src 'sha256-/);
    assert.match(page.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
    const call = (body: unknown, origin = url) =>
      fetch(url + '/api/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify(body),
      });
    assert.equal(
      (await call({ name: 'list_projects', args: {} }, 'https://evil.example')).status,
      403,
    );
    assert.equal((await call({ name: 'get_project', args: { id: '../../etc' } })).status, 400);
    assert.equal((await call({ name: 'list_projects', args: { root: '/etc' } })).status, 400);
    const result = await call({ name: 'list_projects', args: {} });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).projects.length, 1);
    const forged = await new Promise<number>((resolve) => {
      const request = httpRequest(url, { headers: { Host: 'evil.example' } }, (response) => {
        response.resume();
        resolve(response.statusCode!);
      });
      request.end();
    });
    assert.equal(forged, 403);
    assert.equal(
      (await call({ name: 'list_projects', args: {}, padding: 'x'.repeat(17000) })).status,
      400,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
