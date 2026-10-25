// Isolated generated foundation, compiled OpenNext and local workerd; no provider calls.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { launchPreview } from '../tests/support/preview-process.mjs';
import { measureWorker } from './measure-worker.mjs';

const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-next-smoke-'));
const root = path.join(scratch, 'app');
const output = path.resolve('.artifacts/next-runtime');
const env = {
  ...process.env,
  CLOUDFLARE_API_TOKEN: '',
  CLOUDFLARE_ACCOUNT_ID: '',
  NEXT_TELEMETRY_DISABLED: '1',
  WRANGLER_SEND_METRICS: 'false',
  MINIFLARE_REGISTRY_PATH: path.join(scratch, 'registry'),
};
const run = (command, args, cwd = root) =>
  execFileSync(command, args, { cwd, env, stdio: 'inherit', timeout: 600000 });
let api, web;
rmSync(output, { recursive: true, force: true });
try {
  run(
    process.execPath,
    [path.resolve('dist/bin.js'), 'init', root, '--skip-install', '--no-git'],
    scratch,
  );
  // Exercise request rendering/actions without shipping synthetic features in the starter.
  mkdirSync(path.join(root, 'apps/web/app/runtime-proof'), { recursive: true });
  writeFileSync(
    path.join(root, 'apps/web/app/runtime-proof/page.tsx'),
    `import { headers, cookies } from 'next/headers';
export default async function Proof() {
  const host = (await headers()).get('host');
  const value = (await cookies()).get('runtime-proof')?.value ?? 'unset';
  async function update() { 'use server'; (await cookies()).set('runtime-proof', 'passed', { httpOnly: true, sameSite: 'lax', path: '/' }); }
  return <form action={update}><p data-runtime-host={host} data-preference={value}>Dynamic server proof</p><button>Update</button></form>;
}\n`,
  );
  run('pnpm', ['install', '--no-frozen-lockfile']);
  run('pnpm', ['--filter', './apps/web...', '--filter', './apps/api...', 'build']);
  mkdirSync(output, { recursive: true });
  const report = measureWorker(path.join(root, 'apps/web/dist'), 4 * 1024 * 1024);
  writeFileSync(path.join(output, 'bundle.json'), JSON.stringify(report, null, 2) + '\n');
  assert.ok(report.passed, `Worker gzip bytes ${report.gzipBytes} exceed ${report.maxGzipBytes}`);
  const prerender = JSON.parse(
    readFileSync(path.join(root, 'apps/web/.next/prerender-manifest.json'), 'utf8'),
  );
  assert.ok(prerender.routes['/'], 'Public homepage must be prerendered');
  assert.equal(prerender.routes['/runtime-proof'], undefined, 'Request data must stay dynamic');
  const start = (app) =>
    launchPreview(
      process.execPath,
      [
        path.join(root, `apps/${app}/node_modules/wrangler/bin/wrangler.js`),
        'dev',
        '--local',
        '--ip',
        '127.0.0.1',
        '--port',
        '0',
        '--inspector-port',
        '0',
        '--persist-to',
        path.join(scratch, app),
      ],
      { cwd: path.join(root, `apps/${app}`), env },
    );
  api = start('api');
  await api.address();
  web = start('web');
  const origin = await web.address();
  const get = (route, init) =>
    fetch(new URL(route, origin), { ...init, signal: AbortSignal.timeout(30000) });
  const home = await get('/');
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Next.js on Cloudflare/);
  const assetPath = html.match(/src="([^" ]+\.js(?:\?[^" ]*)?)"/)?.[1];
  assert.ok(assetPath);
  const asset = await get(assetPath);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('cache-control'), /max-age=31536000.*immutable/);
  await asset.body.cancel();
  const robots = await get('/robots.txt');
  assert.equal(robots.status, 200);
  assert.doesNotMatch(robots.headers.get('cache-control') ?? '', /immutable/);
  await robots.body.cancel();
  const health = await get('/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  assert.match(health.headers.get('cache-control'), /no-store/);
  const missing = await get('/api/absent');
  assert.equal(missing.status, 404);
  await missing.body.cancel();
  const dynamic = await get('/runtime-proof');
  const markup = await dynamic.text();
  assert.match(markup, /data-preference="unset"/);
  assert.ok(markup.includes(new URL(origin).host));
  const action = markup.match(/name="(\$ACTION_ID_[a-f0-9]+)"/);
  assert.ok(action);
  const form = new FormData();
  form.set(action[1], '');
  const submitted = await get('/runtime-proof', {
    method: 'POST',
    headers: { origin: new URL(origin).origin },
    body: form,
  });
  assert.equal(submitted.status, 200);
  assert.match(await submitted.text(), /data-preference="passed"/);
  const cookie = submitted.headers
    .getSetCookie()
    .find((value) => value.startsWith('runtime-proof='));
  assert.ok(cookie);
  const roundTrip = await get('/runtime-proof', { headers: { cookie: cookie.split(';')[0] } });
  assert.match(await roundTrip.text(), /data-preference="passed"/);
  const rsc = await get('/runtime-proof', { headers: { RSC: '1' } });
  assert.equal(rsc.status, 200);
  assert.match(rsc.headers.get('content-type'), /text\/x-component/);
  await rsc.body.cancel();
  writeFileSync(
    path.join(output, 'smoke.json'),
    JSON.stringify(
      {
        passed: true,
        runtime: 'compiled OpenNext/workerd',
        prerender: true,
        ssr: true,
        rsc: true,
        serverActions: true,
        cookieRoundTrip: true,
        apiBinding: true,
        assetHeaders: true,
        providerCalls: false,
      },
      null,
      2,
    ) + '\n',
  );
  console.log('PASS compiled Next/OpenNext foundation runtime and bundle budget');
} finally {
  await web?.stop();
  await api?.stop();
  rmSync(scratch, { recursive: true, force: true });
}
