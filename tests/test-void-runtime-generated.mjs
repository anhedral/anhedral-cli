// Run against an installed, generated workspace. Builds and exercises real workerd previews.
// node tests/test-void-runtime-generated.mjs /absolute/workspace [node_modules]
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

assert.ok(process.argv[2], 'Specify an installed generated workspace');
const root = path.resolve(process.argv[2]);
const sharedModules = process.argv[3] ? path.resolve(process.argv[3]) : undefined;
const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-void-preview-'));
const env = {
  ...process.env,
  MINIFLARE_REGISTRY_PATH: path.join(scratch, 'registry'),
  WRANGLER_LOG_PATH: path.join(scratch, 'wrangler.log'),
};
try {
  let tested = 0;
  for (const name of readdirSync(path.join(root, 'apps'))) {
    const cwd = path.join(root, 'apps', name);
    if (!existsSync(path.join(cwd, 'void.config.ts'))) continue;
    const modules = sharedModules ?? path.join(cwd, 'node_modules');
    const pkg = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    assert.equal(pkg.devDependencies.void, '0.27.0');
    for (const dependency of [
      'void',
      'vinext',
      'vite',
      '@cloudflare/vite-plugin',
      '@vitejs/plugin-rsc',
      'react',
      'react-dom',
      'hono',
      '@hono/zod-openapi',
    ]) {
      const pinned = pkg.dependencies?.[dependency] ?? pkg.devDependencies?.[dependency];
      if (!pinned) continue;
      const installed = JSON.parse(
        readFileSync(path.join(modules, dependency, 'package.json'), 'utf8'),
      );
      assert.equal(installed.version, pinned, `${dependency} must match the generated exact pin`);
    }
    execFileSync(process.execPath, [path.join(modules, 'vite/bin/vite.js'), 'build'], {
      cwd,
      env,
      stdio: 'pipe',
      maxBuffer: 16 * 1024 * 1024,
    });
    const child = spawn(
      process.execPath,
      [path.join(modules, 'vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '0'],
      { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    try {
      const deadline = Date.now() + 30000;
      let address;
      while (!address && Date.now() < deadline) {
        assert.equal(child.exitCode, null, `Preview exited: ${output}`);
        address = output.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
        if (!address) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.ok(address, `Preview did not start: ${output}`);
      const route = name === 'api' ? '/health' : name === 'web' ? '/' : '/__void/ready';
      const response = await fetch(new URL(route, address), {
        signal: AbortSignal.timeout(30000),
      });
      assert.equal(response.status, 200, `${name}: ${await response.clone().text()}`);
      if (name === 'api') {
        assert.deepEqual(await response.json(), { ok: true });
        const openapi = await fetch(new URL('/openapi.json', address));
        assert.equal(openapi.status, 200);
        assert.ok((await openapi.json()).paths['/health']);
      } else if (name === 'web') {
        const html = await response.text();
        assert.match(html, /<html/);
        const script = html.match(/src="([^"]+\.js)"/);
        assert.ok(script, 'Rendered page includes a client script');
        assert.equal((await fetch(new URL(script[1], address))).status, 200);
      } else {
        const readiness = await response.json();
        assert.equal(readiness.ready, true);
        assert.match(readiness.versionId, /^[a-f0-9-]{36}$/i);
      }
      console.log(`PASS: generated ${name} fresh build and workerd preview response.`);
      tested++;
    } finally {
      const closed = once(child, 'close');
      child.kill('SIGTERM');
      await closed;
    }
  }
  assert.ok(tested, 'No Void applications found');
  console.log(
    'Provider provisioning, remote secrets, protected access and rollback require live acceptance.',
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
