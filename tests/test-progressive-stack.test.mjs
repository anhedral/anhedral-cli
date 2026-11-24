import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { runCapabilityCommand } from '../dist/composition/command.js';
import { scaffoldAnhedralStack, parseInitOptions } from '../dist/index.js';

const offline = () => {
  throw Error('unexpected external command');
};
async function workspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-progressive-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  await scaffoldAnhedralStack(
    {
      ...parseInitOptions([root, '--no-git', '--skip-install', '--catalog-pins']),
      name: 'fieldnotes',
    },
    offline,
    { quiet: true },
  );
  return root;
}
async function command(root, verb, args) {
  const cwd = process.cwd();
  let output = '';
  process.chdir(root);
  try {
    await runCapabilityCommand(
      verb,
      args,
      {
        json: true,
        io: {
          out: { write: (s) => (output += s) },
          err: { write: () => {} },
          stdinTTY: false,
          stdoutTTY: false,
          stderrTTY: false,
        },
      },
      offline,
    );
    return JSON.parse(output);
  } finally {
    process.chdir(cwd);
  }
}
const add = (root, ...args) => command(root, 'add', [...args, '--skip-install', '--catalog-pins']);
const read = (root, file) => readFileSync(path.join(root, file), 'utf8');
const json = (root, file) => JSON.parse(read(root, file));
test('blank workspace and client-only selections are independent of web and API', async (t) => {
  const root = await workspace(t);
  assert.equal(existsSync(path.join(root, 'apps')), false);
  assert.deepEqual(Object.keys(json(root, 'package.json').devDependencies), ['turbo']);
  assert.ok((await command(root, 'stack', ['doctor'])).sourceReady);
  await add(root, 'cli', 'mobile', 'desktop', 'web-extension');
  assert.equal(existsSync(path.join(root, 'packages')), false);
  assert.equal(existsSync(path.join(root, 'apps/api')), false);
  assert.equal(existsSync(path.join(root, 'apps/web')), false);
  const desktop = json(root, 'apps/desktop/package.json');
  assert.match(desktop.devDependencies.electron, /^\d+\.\d+\.\d+$/);
  assert.ok(desktop.dependencies.react);
  assert.ok(!existsSync(path.join(root, 'apps/desktop/src-tauri')));
  assert.equal((await command(root, 'stack', ['doctor'])).sourceReady, true);
  assert.deepEqual(Object.keys(json(root, 'apps/cli/package.json').dependencies), ['commander']);
  assert.deepEqual(json(root, 'apps/cli/package.json').bin, { fieldnotes: 'dist/index.js' });
});
test('API, database and authentication can arrive in separate transactions', async (t) => {
  const root = await workspace(t);
  await add(root, 'api');
  assert.equal(existsSync(path.join(root, 'packages/db')), false);
  await add(root, 'db');
  assert.equal(json(root, 'apps/api/package.json').dependencies['better-auth'], undefined);
  assert.ok(json(root, 'packages/db/package.json').dependencies.postgres);
  assert.equal(json(root, 'apps/api/wrangler.jsonc').d1_databases, undefined);
  assert.match(read(root, 'apps/api/.dev.vars.example'), /^DATABASE_URL=$/m);
  const file = path.join(root, 'packages/db/src/schema.ts');
  writeFileSync(file, 'export const customerSchema = 1;\n');
  await add(root, 'auth');
  assert.match(read(root, 'packages/db/src/schema.ts'), /export const customerSchema/);
  assert.equal(existsSync(path.join(root, 'packages/db/drizzle/0000_better_auth.sql')), false);
  await add(root, 'web');
  assert.equal(json(root, 'apps/web/wrangler.jsonc').services[0].binding, 'ANHEDRAL_API');
  assert.equal(existsSync(path.join(root, 'apps/web/src/routes/sign-in.tsx')), true);
});
test('clients-first and services-first produce the same integrations, support retries and preserve edits', async (t) => {
  const a = await workspace(t),
    b = await workspace(t);
  const clients = ['cli', 'web', 'mobile', 'desktop', 'web-extension'];
  const services = ['rtc', 'client-sync', 'in-app-purchases', 'payment', 'storage'];
  await add(a, ...clients);
  const preview = await add(a, ...services, '--with-dependencies', '--dry-run');
  assert.equal(preview.sourceInstalled, false);
  assert.equal(existsSync(path.join(a, 'apps/api')), false);
  await add(a, ...services, '--with-dependencies');
  await add(b, ...services, '--with-dependencies');
  await add(b, ...clients);
  const status = async (root) => command(root, 'stack', ['doctor']);
  assert.deepEqual((await status(a)).connections, (await status(b)).connections);
  for (const file of [
    'apps/api/src/capabilities.ts',
    'apps/api/src/environment.ts',
    'apps/api/src/billing-providers.ts',
    'apps/web/src/sync.js',
    'apps/mobile/src/sync.js',
    'apps/desktop/ui/sync.js',
    'apps/web-extension/src/sync.js',
    'apps/api/src/sync-worker.ts',
    'apps/api/src/features/file-events.ts',
    'packages/api-client/sync.js',
    'apps/web/src/components/Call.tsx',
    'apps/mobile/src/Call.tsx',
    'apps/mobile/src/session.js',
    'apps/desktop/ui/api.js',
    'apps/desktop/ui/main.tsx',
    'apps/cli/src/index.ts',
  ])
    assert.equal(read(a, file), read(b, file), file);
  for (const file of [
    'apps/mobile/app.json',
    'apps/web/package.json',
    'apps/api/wrangler.jsonc',
    'apps/cli/package.json',
    'packages/api-client/package.json',
  ])
    assert.deepEqual(json(a, file), json(b, file), file);
  assert.deepEqual((await add(a, ...clients, ...services)).files, []);
  assert.equal((await status(a)).sourceReady, true);
});

test('init all selects the canonical catalog once and previews without creating a directory', async (t) => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-full-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const root = path.join(scratch, 'fieldnotes');
  const options = parseInitOptions(['all', root, '--skip-install', '--catalog-pins', '--no-git']);
  assert.equal(options.all, true);
  assert.equal(parseInitOptions(['--', 'all']).all, undefined);
  await scaffoldAnhedralStack({ ...options, dryRun: true }, offline, { quiet: true });
  assert.equal(existsSync(root), false);
  await scaffoldAnhedralStack(options, offline, { quiet: true });
  const catalog = (await command(root, 'stack', ['list'])).stack.additions;
  const concrete = Object.keys(catalog).filter((id) => id !== 'backend');
  assert.deepEqual(
    (await command(root, 'stack', ['doctor'])).additions
      .filter((a) => a.sourceState === 'installed')
      .map((a) => a.id),
    concrete,
  );
  assert.deepEqual((await add(root, ...concrete)).files, []);
  await assert.rejects(scaffoldAnhedralStack(options, offline, { quiet: true }), /empty/);
});

test('account subscription refetches after reconnect and foreground and closes on sign-out', async (t) => {
  const root = await workspace(t);
  await add(root, 'client-sync', 'web', '--with-dependencies');
  const { subscribe } = await import(
    pathToFileURL(path.join(root, 'packages/api-client/sync.js')).href
  );
  const sockets = [];
  const events = [];
  let foreground;
  let stopped = false;
  const original = globalThis.WebSocket;
  globalThis.WebSocket = class {
    constructor(url, protocols) {
      assert.equal(url, 'wss://api.example.com/socket');
      assert.deepEqual(protocols, ['anhedral.sync.v1', 'ticket']);
      sockets.push(this);
      queueMicrotask(() => this.onopen?.());
    }
    close() {
      this.closed = true;
    }
  };
  t.after(() => {
    globalThis.WebSocket = original;
  });
  const controller = new AbortController();
  const request = async (path, opts) => {
    assert.equal(path, '/api/sync/ticket');
    assert.equal(opts.method, 'POST');
    return Response.json({ url: 'wss://api.example.com/socket', ticket: 'ticket' });
  };
  const run = subscribe(
    request,
    (e) => {
      events.push(e);
    },
    controller.signal,
    (wake) => {
      foreground = wake;
      return () => {
        stopped = true;
      };
    },
  );
  try {
    await waitFor(() => events.length === 1);
    const message = { type: 'file.stored', id: 'notes' };
    sockets[0].onmessage({ data: JSON.stringify(message) });
    await waitFor(() => events.length === 2);
    sockets[0].onclose();
    await waitFor(() => events.length === 3);
    foreground();
    await waitFor(() => sockets.length === 3 && events.length >= 5);
    assert.deepEqual(events.slice(0, 3), [undefined, message, undefined]);
  } finally {
    controller.abort();
    await run;
  }
  assert.ok(stopped);
  assert.ok(sockets.every((s) => s.closed));
  await assert.rejects(
    subscribe(
      async () => new Response(null, { status: 401 }),
      () => {},
      new AbortController().signal,
    ),
    /Sign in/,
  );
});
async function waitFor(condition) {
  for (let tries = 0; tries < 200; tries++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail('Subscription failed to reach the expected state');
}
