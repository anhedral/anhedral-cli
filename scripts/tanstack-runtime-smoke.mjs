// Explicit opt-in: installs a disposable generated app and exercises local workerd only.
// No configured database is migrated, no provider is contacted, and no deployment occurs.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { measureConfiguredWorker, measureWorker } from './measure-worker.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(repository, '.artifacts/anhedral-stack-runtime');
await mkdir(output, { recursive: true });
await Promise.all(
  ['summary.json', 'measurements.json'].map((file) => rm(path.join(output, file), { force: true })),
);
const scratch = await mkdtemp(path.join(tmpdir(), 'anhedral-tanstack-smoke-'));
const app = path.join(scratch, 'application');
const active = new Set();
const controller = new AbortController();
const privateValues = [randomBytes(32).toString('hex'), randomBytes(24).toString('hex')];
const [secret, password] = privateValues;
for (const [key, value] of Object.entries(process.env))
  if (/TOKEN|SECRET|PASSWORD|API_KEY/i.test(key) && typeof value === 'string' && value.length >= 6)
    privateValues.push(value);
const env = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !/^(?:CLOUDFLARE_|CF_|ANHEDRAL_|BETTER_AUTH_|PUBLIC_APP_URL|STRIPE_|REVENUECAT_)/.test(key),
    ),
  ),
  CI: '1',
  NO_COLOR: '1',
  WRANGLER_SEND_METRICS: 'false',
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
  MINIFLARE_REGISTRY_PATH: path.join(scratch, 'registry'),
};
let phase = 'generation-install';
let preview;
let failure;
const interrupt = () => controller.abort(new Error('Runtime proof interrupted.'));
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

function redact(value) {
  let result = stripVTControlCharacters(String(value));
  for (const privateValue of privateValues) result = result.replaceAll(privateValue, '[redacted]');
  return result
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@')
    .replace(/(authorization\s*[:=]\s*)(?:bearer\s+)?[^\s,;]+/gi, '$1[redacted]')
    .replace(/(set-cookie\s*:\s*|cookie\s*:\s*)[^\r\n]+/gi, '$1[redacted]')
    .replace(
      /\b(?:sk_(?:live|test)_[A-Za-z0-9]+|gh[pousr]_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+)\b/g,
      '[redacted]',
    );
}
function start(command, args, cwd, timeoutMs) {
  controller.signal.throwIfAborted();
  const child = spawn(command, args, {
    cwd,
    env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let finished = false;
  const item = {
    child,
    get output() {
      return output;
    },
    get finished() {
      return finished;
    },
  };
  active.add(item);
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      output = (output + chunk).slice(-64 * 1024);
    });
  }
  item.closed = new Promise((resolve) => {
    child.once('error', (error) => {
      item.error = error;
    });
    child.once('close', (code, signal) => {
      finished = true;
      active.delete(item);
      clearTimeout(item.timer);
      resolve({ code, signal });
    });
  });
  item.timer = setTimeout(() => {
    item.error = new Error('Command exceeded its bounded runtime.');
    void stop(item);
  }, timeoutMs);
  return item;
}
function kill(item, signal) {
  if (!item.child.pid || item.finished) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(item.child.pid), '/t', '/f'], {
      stdio: 'ignore',
    });
    killer.once('error', () => {});
  } else {
    try {
      process.kill(-item.child.pid, signal);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
}
async function stop(item) {
  if (item.finished) return;
  kill(item, 'SIGTERM');
  if (await Promise.race([item.closed.then(() => true), delay(2000).then(() => false)])) return;
  kill(item, 'SIGKILL');
  if (!(await Promise.race([item.closed.then(() => true), delay(2000).then(() => false)])))
    throw new Error('Child process failed to stop.');
}
const abortChildren = () => {
  for (const item of active) void stop(item);
};
controller.signal.addEventListener('abort', abortChildren);
async function run(command, args, cwd = app, timeoutMs = 600000) {
  const item = start(command, args, cwd, timeoutMs);
  const result = await item.closed;
  controller.signal.throwIfAborted();
  if (item.error || result.code !== 0)
    throw new Error(
      `${item.error?.message ?? `Command exited ${result.code ?? result.signal}.`}\n${redact(item.output).slice(-12000)}`,
    );
}
async function port() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, 'localhost', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}
function cookies(response) {
  const values = response.headers.getSetCookie().map((value) => value.split(';', 1)[0]);
  for (const value of values) privateValues.push(value);
  assert.ok(values.length > 0, 'Authentication did not return session cookies.');
  return values.join('; ');
}

try {
  console.log('TanStack proof: generate and install the launch application.');
  await run(
    process.execPath,
    [path.join(repository, 'dist/bin.js'), 'init', app, '--no-git', '--json'],
    scratch,
  );
  const localPort = await port();
  const origin = `http://localhost:${localPort}`;
  const web = path.join(app, 'apps/web');
  const request = (route, init = {}) =>
    fetch(new URL(route, origin), {
      ...init,
      redirect: 'manual',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    });
  await run(process.execPath, [path.join(repository, 'tests/test-generated-config-lint.mjs'), app]);
  await run(process.execPath, [path.join(repository, 'tests/test-generated-router.mjs'), app]);
  phase = 'minimal-web-runtime';
  console.log('TanStack proof: verify the minimal web foundation before adding services.');
  preview = start(
    process.execPath,
    [path.join(app, 'scripts/oj.mjs'), 'dev', '.', '--host=localhost', '--port', String(localPort)],
    web,
    120000,
  );
  const minimalDeadline = Date.now() + 45000;
  let minimalMarkup;
  while (Date.now() < minimalDeadline) {
    controller.signal.throwIfAborted();
    if (preview.finished || preview.error)
      throw new Error('Minimal web server exited before readiness.');
    try {
      const response = await request('/');
      const text = await response.text();
      if (response.status === 200) {
        minimalMarkup = text;
        break;
      }
    } catch {
      /* The Vite worker can take time to initialize. */
    }
    await delay(100);
  }
  assert.ok(minimalMarkup, 'The minimal web foundation must render without an API.');
  assert.match(minimalMarkup, /data-rendering="server"/);
  const noBackend = await request('/api/health');
  assert.equal(noBackend.status, 404, 'Minimal init must not install an API.');
  await noBackend.body?.cancel();
  await stop(preview);
  preview = undefined;

  phase = 'progressive-source-additions';
  console.log('TanStack proof: add the backend and private storage progressively.');
  for (const capability of ['backend', 'r2']) {
    await run(process.execPath, [
      path.join(repository, 'dist/bin.js'),
      'add',
      capability,
      '--cwd',
      app,
      '--json',
    ]);
  }
  await writeFile(
    path.join(app, 'apps/api/.dev.vars'),
    `PUBLIC_APP_URL=${origin}\nBETTER_AUTH_SECRET=${secret}\n`,
    { mode: 0o600 },
  );
  const features = path.join(app, 'apps/api/src/auth-features.ts');
  const featureSource = await readFile(features, 'utf8');
  assert.match(
    featureSource,
    /emailPassword:\s*false/,
    'The shipped auth default must remain disabled.',
  );
  await writeFile(features, featureSource.replace(/emailPassword:\s*false/, 'emailPassword: true'));

  phase = 'local-migration';
  console.log('TanStack proof: migrate only the disposable local D1 database.');
  await run('pnpm', ['db:migrate', '--local']);
  phase = 'compile';
  console.log('TanStack proof: lint, typecheck and build web/API artifacts.');
  await run(process.execPath, [path.join(repository, 'tests/test-generated-config-lint.mjs'), app]);
  await run('pnpm', ['--filter', '@workspace/web', 'typecheck']);
  await run('pnpm', ['build']);
  phase = 'runtime-start';
  preview = start(
    process.execPath,
    [
      path.join(web, 'node_modules/wrangler/bin/wrangler.js'),
      'dev',
      '--config',
      'dist/ssr/wrangler.json',
      '--config',
      '../api/wrangler.jsonc',
      '--local',
      '--persist-to',
      path.join(app, 'apps/api/.wrangler/state'),
      '--port',
      String(localPort),
    ],
    web,
    180000,
  );
  const deadline = Date.now() + 45000;
  let ready = false;
  while (Date.now() < deadline) {
    controller.signal.throwIfAborted();
    if (preview.finished || preview.error) throw new Error('Preview exited before becoming ready.');
    try {
      const response = await request('/api/health');
      const body = await response.json();
      if (response.status === 200 && body?.ok === true) {
        ready = true;
        break;
      }
    } catch {
      /* Initial binding startup can precede health readiness. */
    }
    await delay(100);
  }
  assert.ok(ready, 'Local API failed readiness checks.');

  phase = 'ssr-and-api';
  console.log('TanStack proof: exercise SSR, server function and same-origin API.');
  const home = await request('/');
  assert.equal(home.status, 200, 'Homepage must render.');
  const markup = await home.text();
  assert.match(markup, /data-rendering="server"/, 'Server-rendered application marker is missing.');
  assert.match(
    markup,
    /API:\s*(?:<!--[^>]*-->\s*)*connected/,
    `Server function did not reach Hono: ${markup.match(/<p data-rendering="server">.*?<\/p>/s)?.[0] ?? 'missing rendered status'}`,
  );
  const account = await request('/sign-in');
  assert.equal(account.status, 200, 'Account route must render.');
  await account.body?.cancel();

  phase = 'authentication';
  console.log('TanStack proof: create isolated accounts and verify session cookies.');
  async function signUp(email) {
    const response = await request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ name: 'Runtime fixture', email, password }),
    });
    assert.equal(response.status, 200, 'Local signup must succeed.');
    const cookie = cookies(response);
    await response.body?.cancel();
    return cookie;
  }
  const first = await signUp('first@example.com');
  const second = await signUp('second@example.com');
  const session = await request('/api/session', { headers: { cookie: first } });
  assert.equal(session.status, 200, 'Session cookie must authenticate an API request.');
  const sessionBody = await session.json();
  assert.ok(typeof sessionBody.userId === 'string' && sessionBody.userId.length > 0);

  phase = 'storage-isolation';
  console.log('TanStack proof: verify private R2 ownership and denied anonymous access.');
  const anonymous = await request('/api/files/proof.txt');
  assert.equal(anonymous.status, 401, 'Anonymous file access must be denied.');
  await anonymous.body?.cancel();
  const payload = 'Private runtime proof';
  const stored = await request('/api/files/proof.txt', {
    method: 'PUT',
    headers: { cookie: first, origin, 'content-type': 'application/octet-stream' },
    body: payload,
  });
  assert.equal(stored.status, 201, 'Authenticated file upload must succeed.');
  await stored.body?.cancel();
  const ownFile = await request('/api/files/proof.txt', { headers: { cookie: first } });
  assert.equal(ownFile.status, 200);
  assert.equal(await ownFile.text(), payload);
  const otherFile = await request('/api/files/proof.txt', { headers: { cookie: second } });
  assert.equal(otherFile.status, 404, 'Another account must not access the first account file.');
  await otherFile.body?.cancel();

  phase = 'session-revocation';
  const signedOut = await request('/api/auth/sign-out', {
    method: 'POST',
    headers: { cookie: first, origin, 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(signedOut.status, 200, 'Signout must succeed.');
  await signedOut.body?.cancel();
  const revoked = await request('/api/session', { headers: { cookie: first } });
  assert.equal(revoked.status, 401, 'The original cookie must fail after signout.');
  await revoked.body?.cancel();

  phase = 'stripe-source-addition';
  console.log('TanStack proof: compile optional Stripe source without activating payments.');
  await stop(preview);
  preview = undefined;
  await run(process.execPath, [
    path.join(repository, 'dist/bin.js'),
    'add',
    'stripe',
    '--cwd',
    app,
    '--json',
  ]);
  const localVariables = await readFile(path.join(app, 'apps/api/.dev.vars'), 'utf8');
  assert.doesNotMatch(
    localVariables,
    /(?:^|\n)\s*(?:STRIPE_[A-Z_]*|BILLING_ENVIRONMENT)\s*=/,
    'The proof must not configure Stripe credentials or payment activation.',
  );
  phase = 'stripe-migration-generation';
  const migrationDirectory = path.join(app, 'packages/db/drizzle');
  const priorMigrations = new Set(await readdir(migrationDirectory));
  await run('pnpm', ['db:generate']);
  const newMigrations = (await readdir(migrationDirectory)).filter(
    (file) => file.endsWith('.sql') && !priorMigrations.has(file),
  );
  assert.ok(newMigrations.length > 0, 'Stripe must generate a new SQL migration.');
  const migrationSql = (
    await Promise.all(
      newMigrations.map((file) => readFile(path.join(migrationDirectory, file), 'utf8')),
    )
  ).join('\n');
  assert.match(
    migrationSql,
    /CREATE TABLE\s+[`"]?billing_receipt[`"]?\s*\(/i,
    'The Stripe migration must create the durable billing receipt table.',
  );
  // Review the generated SQL above, but never apply billing migrations or call Stripe here.
  phase = 'stripe-compile';
  await run('pnpm', ['lint']);
  await run('pnpm', ['typecheck']);
  await run('pnpm', ['build']);
  const measurements = {
    schemaVersion: 1,
    web: measureConfiguredWorker(path.join(web, 'dist/ssr/wrangler.json'), 4 * 1024 * 1024),
    api: measureWorker(path.join(app, 'apps/api/dist'), 4 * 1024 * 1024, 'index.js'),
  };
  await writeFile(
    path.join(output, 'measurements.json'),
    JSON.stringify(measurements, null, 2) + '\n',
  );
  assert.ok(
    measurements.web.passed && measurements.api.passed,
    'Compiled Worker exceeds the reviewed 4MiB gzip budget.',
  );
  const summary = {
    schemaVersion: 1,
    stack: 'anhedral-stack',
    node: process.version,
    generatorVersion: JSON.parse(await readFile(path.join(repository, 'package.json'), 'utf8'))
      .version,
    sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repository,
      encoding: 'utf8',
    }).trim(),
    sourceDirty: !!execFileSync('git', ['status', '--porcelain'], {
      cwd: repository,
      encoding: 'utf8',
    }).trim(),
    passed: true,
    runtime: 'compiled TanStack Start/Hono on local workerd',
    minimalWeb: true,
    progressiveBackend: true,
    ssr: true,
    serverFunction: true,
    sameOriginApi: true,
    cookieSession: true,
    privateR2: true,
    accountIsolation: true,
    signOutRevocation: true,
    stripeCompiled: true,
    stripeMigrationGenerated: true,
    providerAcceptance: false,
    bundleBudgetPassed: true,
  };
  await writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
} catch (error) {
  failure = new Error(
    `TanStack runtime proof failed [${phase}]: ${redact(error instanceof Error ? error.message : error)}${preview ? `\n${redact(preview.output).slice(-12000)}` : ''}`,
  );
} finally {
  for (const item of [...active]) {
    try {
      await stop(item);
    } catch (error) {
      failure ??= new Error(`TanStack runtime proof failed [cleanup]: ${redact(error.message)}`);
    }
  }
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
  controller.signal.removeEventListener('abort', abortChildren);
  await rm(scratch, { recursive: true, force: true });
}
if (failure) {
  console.error(failure.message);
  process.exitCode = 1;
}
