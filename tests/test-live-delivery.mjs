// Opt-in live test. Creates isolated Workers/D1 resources and deletes only its own receipts in finally.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
import {
  connectApplication,
  shipApplication,
  verifyApplication,
  rollbackApplication,
  applicationStatus,
  readApplication,
  defaultRunner,
  environment,
  targetDirectory,
} from '../dist/delivery.js';
import { provisionApplication } from '../dist/provision.js';
import { cloudflareRequest } from '../dist/cloudflare.js';
const accountId = process.argv[2];
assert.match(accountId ?? '', /^[a-f0-9]{32}$/i, 'Specify the intended account ID');
assert.ok(
  process.argv.includes('--allow-provider-mutations'),
  'Explicit opt-in is required for live test resources',
);
const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-live-'));
const name = `anhedral-qa-${randomBytes(5).toString('hex')}`;
const root = path.join(temporary, name);
const put = (file, source) => {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), source);
};
let resources;
let project;
let completed = false;
const run = async (command, args, cwd, env) => {
  if (command === 'pnpm' && args[0] === 'run' && ['check', 'test:live'].includes(args[1])) {
    try {
      return execFileSync('pnpm', args, { cwd, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    } catch (error) {
      console.log('Synthetic fixture check output:', error.stdout?.slice(-12000));
      throw new Error('Synthetic fixture checks failed');
    }
  }
  return defaultRunner(command, args, cwd, env);
};
const git = (...args) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Anhedral QA',
      GIT_AUTHOR_EMAIL: ['qa', 'example.invalid'].join('@'),
      GIT_COMMITTER_NAME: 'Anhedral QA',
      GIT_COMMITTER_EMAIL: ['qa', 'example.invalid'].join('@'),
    },
  }).trim();
try {
  console.log('Generating the real framework + D1 foundation');
  const options = parseStandardOptions('new', [root, '--d1', '--hosting=cloudflare']);
  await scaffoldStandardProject(options);
  put(
    'packages/db/src/schema.ts',
    `import { sqliteTable, text } from 'drizzle-orm/sqlite-core';\nexport const notes = sqliteTable('notes', { id: text('id').primaryKey(), body: text('body').notNull() });\n`,
  );
  put(
    'packages/db/src/index.ts',
    `import { drizzle } from 'drizzle-orm/d1';\nimport { eq } from 'drizzle-orm';\nimport { notes } from './schema';\nexport function createDatabase(binding: Parameters<typeof drizzle>[0]) {\n const db = drizzle(binding);\n return { list: () => db.select().from(notes), add: (id: string, body: string) => db.insert(notes).values({ id, body }), remove: (id: string) => db.delete(notes).where(eq(notes.id, id)) };\n}\n`,
  );
  put(
    'packages/db/migrations/0000_notes.sql',
    'CREATE TABLE notes (id TEXT PRIMARY KEY NOT NULL, body TEXT NOT NULL);\n',
  );
  put(
    'apps/web/app/api/notes/route.ts',
    `import { env as bindings } from 'cloudflare:workers';\nimport { createDatabase } from '@workspace/db';\nfunction database() { const env = bindings as unknown as { DB: Parameters<typeof createDatabase>[0] }; return createDatabase(env.DB); }\nexport async function GET() { return Response.json(await database().list()); }\nexport async function POST(request: Request) {\n const input = await request.json().catch(() => null);\n if (!input || typeof input.body !== 'string' || !input.body.trim() || input.body.length > 200) return Response.json({ error: 'Provide a note of 1–200 characters' }, { status: 400 });\n const id = crypto.randomUUID(); await database().add(id, input.body.trim()); return Response.json({ id }, { status: 201 });\n}\nexport async function DELETE(request: Request) { const id = new URL(request.url).searchParams.get('id'); if (!id) return new Response(null, { status: 400 }); await database().remove(id); return new Response(null, { status: 204 }); }\n`,
  );
  put(
    'apps/web/app/page.tsx',
    `export default function Page() { return <main><h1>Anhedral delivery verification</h1><p>Isolated QA notes application.</p><a href="/api/notes">View stored notes</a></main> }\n`,
  );
  put(
    'scripts/test-live.mjs',
    `import assert from 'node:assert/strict';\nconst url = process.env.ANHEDRAL_APP_URL;\nconst request = (route, options) => fetch(new URL(route, url), { ...options, signal: AbortSignal.timeout(15000) });\nlet home; for (let attempt = 0; attempt < 30; attempt++) { home = await request('/'); if (![404, 502, 503].includes(home.status)) break; await new Promise(resolve => setTimeout(resolve, 3000)); } assert.equal(home.status, 200, 'Deployment URL readiness: ' + (home.status === 200 ? '' : (await home.clone().text()).slice(0, 500)));  assert.match(await home.text(), /Anhedral delivery verification/);\nconst bad = await request('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: '' }) }); assert.equal(bad.status, 400);\nconst response = await request('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: 'Isolated live QA record' }) }); assert.equal(response.status, 201); const note = await response.json();\ntry { const list = await request('/api/notes'); assert.equal(list.status, 200); assert.ok((await list.json()).some(item => item.id === note.id && item.body === 'Isolated live QA record')); }\nfinally { const removed = await request('/api/notes?id=' + encodeURIComponent(note.id), { method: 'DELETE' }); assert.equal(removed.status, 204); }\nassert.equal((await (await request('/api/notes')).json()).some(item => item.id === note.id), false);\n`,
  );
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  pkg.scripts['test:live'] = 'node scripts/test-live.mjs';
  put('package.json', JSON.stringify(pkg, null, 2) + '\n');
  console.log('Connecting the explicit account and reconciling an isolated database');
  project = await connectApplication(root, accountId, 'public');
  resources = await provisionApplication(root);
  await defaultRunner(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'migrations', 'apply', 'DB', '--remote'],
    path.join(root, 'apps/web'),
    environment(project),
  );
  git('add', '.');
  git('commit', '-m', 'Build isolated live delivery QA app');
  const firstCommit = git('rev-parse', 'HEAD');
  console.log('Checking and shipping the actual application');
  const shipped = await shipApplication(root, run);
  console.log('Received deployment URL:', shipped.release.targets.at(-1).urls[0]);
  const tail = spawn('pnpm', ['exec', 'wrangler', 'tail', '--format', 'json'], {
    cwd: path.join(root, 'apps/web'),
    env: environment(project),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let runtimeLog = '';
  tail.stdout.on('data', (data) => {
    runtimeLog = (runtimeLog + data).slice(-16000);
  });
  tail.stderr.on('data', (data) => {
    runtimeLog = (runtimeLog + data).slice(-16000);
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await verifyApplication(root, run);
  } catch (error) {
    console.log('Isolated runtime diagnostics:', runtimeLog);
    throw error;
  } finally {
    tail.kill('SIGTERM');
  }
  console.log('Live create/read/delete and validation passed');
  put(
    'apps/web/app/page.tsx',
    readFileSync(path.join(root, 'apps/web/app/page.tsx'), 'utf8').replace(
      'Isolated QA notes application.',
      'Isolated QA notes application, revision two.',
    ),
  );
  git('add', '.');
  git('commit', '-m', 'Exercise a subsequent app release');
  await shipApplication(root, run);
  await rollbackApplication(root, shipped.release.id, true);
  git('checkout', '--detach', firstCommit);
  await verifyApplication(root, run);
  const status = await applicationStatus(root, true);
  assert.ok(status.provider.every((target) => target.activeRecordedVersion));
  console.log('Update, verified rollback and live re-verification passed');
  completed = true;
} finally {
  // Never delete by a broad prefix or operate on unrelated account resources.
  if (project) {
    console.log('Cleaning only isolated resources created for this test');
    const request = await cloudflareRequest(
      project,
      targetDirectory(root, project.targets[0]),
      defaultRunner,
      environment(project),
    );
    // Retrieve credentials within a closure; DELETE is intentionally absent from the production provisioning API.
    const auth = JSON.parse(
      await defaultRunner(
        'pnpm',
        ['exec', 'wrangler', 'auth', 'token', '--json'],
        path.join(root, 'apps/web'),
        environment(project),
      ),
    );
    const remove = async (endpoint) => {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}${endpoint}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${auth.token}` },
          redirect: 'error',
          signal: AbortSignal.timeout(30000),
        },
      );
      if (!response.ok && response.status !== 404)
        throw new Error(`Isolated QA cleanup failed (${response.status}); preserve ${root}`);
    };
    const scripts = (await request('GET', '/workers/scripts')).result;
    if (Array.isArray(scripts) && scripts.some((worker) => worker.id === `${name}-web`))
      await remove(`/workers/scripts/${name}-web`);
    const receipts =
      resources?.resources ??
      (() => {
        try {
          return JSON.parse(readFileSync(path.join(root, '.anhedral/resources.json'), 'utf8'))
            .resources;
        } catch {
          return [];
        }
      })();
    for (const resource of receipts)
      if (resource.kind === 'd1' && !resource.reused && resource.name === `${name}-db`)
        await remove(`/d1/database/${encodeURIComponent(resource.id)}`);
  }
  if (completed) rmSync(temporary, { recursive: true, force: true });
  else console.log('Preserved isolated local fixture for diagnosis:', root);
}
