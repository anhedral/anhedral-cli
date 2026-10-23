import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
import { inspectProject } from '../dist/readiness.js';
import { readProjectProgress, updateProjectProgress, progressFreshness } from '../dist/progress.js';

// The bootstrap fixture avoids network/provider claims. Real shadcn/build coverage
// lives in test-generated-apps.mjs; this scenario proves plan/report/resume semantics.
function bootstrap(command, args, cwd) {
  if (args[0] === 'dlx') {
    const root = path.join(args[args.indexOf('--cwd') + 1], args[args.indexOf('--name') + 1]);
    for (const folder of ['apps/web/app', 'packages/ui']) mkdirSync(path.join(root, folder), { recursive: true });
    const json = (file, value) => writeFileSync(path.join(root, file), JSON.stringify(value));
    json('package.json', { name: 'reading-list', scripts: {}, devDependencies: { turbo: '^2' } });
    json('apps/web/package.json', { name: 'web', scripts: { build: 'next build' }, dependencies: { next: '16.3.6' } });
    json('packages/ui/package.json', { name: '@workspace/ui', dependencies: { shadcn: '4.21.1' } });
    json('turbo.json', { tasks: { build: {}, dev: { persistent: true } } });
    writeFileSync(path.join(root, 'apps/web/app/layout.tsx'), 'export default function Layout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }\n');
    writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - "apps/*"\n  - "packages/*"\n');
    writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n');
  }
  if (args.includes('--lockfile-only')) writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
}

test('web/database workflow preserves requirements and resumes independent observed facts', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-beginner-'));
  const root = path.join(temporary, 'reading-list');
  try {
    const options = parseStandardOptions('new', [root, '--next', '--neon', '--skip-install', '--no-git']);
    const dry = spawnSync(process.execPath, ['dist/bin.js', 'new', root, '--next', '--neon', '--dry-run', '--json'], { encoding: 'utf8' });
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(existsSync(root), false);
    assert.deepEqual(JSON.parse(dry.stdout).products, options.products);
    await scaffoldStandardProject(options, bootstrap);
    const route = readFileSync(path.join(root, 'apps/web/app/api/health/route.ts'), 'utf8');
    const compiled = ts.transpileModule(route, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    let executions = 0, closes = 0, failQuery = false, failContext = false;
    const exports = {};
    const connectionString = 'fixture-database-connection';
    runInNewContext(compiled, {
      exports, Response,
      require(name) {
        if (name === '@opennextjs/cloudflare') return { getCloudflareContext: async () => {
          if (failContext) throw new Error('private-provider-error');
          return { env: { HYPERDRIVE: { connectionString } } };
        } };
        if (name === '@workspace/db') return { createDatabase: (binding) => {
          assert.equal(binding, connectionString);
          return { db: { execute: async () => { executions++; if (failQuery) throw new Error('private-database-error'); } }, close: async () => { closes++; } };
        } };
        if (name === 'drizzle-orm') return { sql: (parts) => parts.join('') };
        throw new Error(`Unexpected generated route dependency: ${name}`);
      },
    });
    const healthy = await exports.GET();
    assert.equal(healthy.status, 200);
    assert.equal(healthy.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await healthy.json(), { ok: true });
    assert.equal(executions, 1); assert.equal(closes, 1);
    failQuery = true;
    const failed = await exports.GET();
    assert.equal(failed.status, 503);
    assert.equal(failed.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await failed.json(), { ok: false }, 'Query errors must not leak provider details');
    assert.equal(closes, 2, 'Failed queries must close the Neon connection');
    failContext = true;
    const unavailable = await exports.GET();
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { ok: false }, 'Missing runtime access must not leak provider details');
    assert.equal(closes, 2, 'No connection was opened without runtime bindings');
    const requirements = readFileSync(path.join(root, 'anhedral.setup.json'), 'utf8');
    assert.equal(JSON.parse(requirements).setup.resourcesProvisioned, false);
    assert.equal(existsSync(path.join(root, 'packages/db/src/index.ts')), true);
    const observedAt = new Date().toISOString();
    const identity = { gitRevision: 'fixture-revision', configDigest: 'fixture-config', accountId: 'client-account', resourceId: 'reading-list-preview' };
    const report = (capability, environment, milestone, status, summary) => ({ capability, environment, milestone, status, summary, observedAt, source: 'agent-reported', evidence: ['fixture: acceptance scenario only'], identity });
    let state = await updateProjectProgress(root, {
      expectedRevision: readProjectProgress(root)?.revision ?? 0, appName: 'Team reading list', selected: options.products, nextAction: 'Verify preview persistence',
      links: { preview: 'http://localhost:3000' },
      discoveries: [
        { kind: 'tool', name: 'Neon integration', status: 'available', scope: 'session', summary: 'Callable integration fixture', observedAt },
        { kind: 'account', name: 'Neon CLI', status: 'unavailable', scope: 'local CLI', summary: 'CLI account is unauthenticated', observedAt },
      ],
      observations: [report('next', 'preview', 'generated', 'succeeded', 'Web starter generated'), report('neon', 'preview', 'generated', 'succeeded', 'Database starter generated')],
    });
    state = await updateProjectProgress(root, {
      expectedRevision: state.revision, nextAction: 'Repair preview database connectivity',
      observations: [report('next', 'preview', 'deployed', 'succeeded', 'Provider accepted deployment fixture'), report('neon', 'preview', 'connected', 'failed', 'Reading-list persistence check failed'), report('neon', 'production', 'connected', 'blocked', 'Production access has not been observed')],
    });
    const cli = spawnSync(process.execPath, ['dist/bin.js', 'progress', root, '--json'], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr);
    assert.deepEqual(JSON.parse(cli.stdout), state, 'A new CLI process resumes the canonical record');
    assert.deepEqual(readProjectProgress(root), state);
    assert.equal(state.observations.find((item) => item.capability === 'next' && item.milestone === 'deployed').status, 'succeeded');
    assert.equal(state.observations.find((item) => item.capability === 'neon' && item.environment === 'preview' && item.milestone === 'connected').status, 'failed');
    assert.equal(state.observations.find((item) => item.environment === 'production').status, 'blocked');
    assert.equal(state.discoveries.find((item) => item.kind === 'account').status, 'unavailable');
    assert.equal(progressFreshness(state.observations[0], { identity: { configDigest: 'changed-config' } }), 'drifted');
    assert.equal(readFileSync(path.join(root, 'anhedral.setup.json'), 'utf8'), requirements);
    assert.equal(inspectProject(root).productionReady, false, 'Reported deployment never rewrites readiness requirements');
    await assert.rejects(updateProjectProgress(root, { expectedRevision: 0, nextAction: 'Stale reporter' }), /revision conflict/);
    await assert.rejects(updateProjectProgress(root, { expectedRevision: state.revision, nextAction: 'password=private-value' }), /non-secret/);
    assert.deepEqual(readProjectProgress(root), state, 'Rejected reports preserve the saved record');
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
