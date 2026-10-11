// Opt-in provider fixture. Its private GitHub repository is retained deliberately:
// the available GitHub credential need not grant destructive delete_repo access.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
import { setupRepository } from '../dist/repository.js';
import {
  connectVercelApplication,
  adoptVercelApplication,
  recoverVercelApplication,
  verifyVercelApplication,
  rollbackVercelApplication,
  vercelApplicationStatus,
} from '../dist/vercel.js';
import { defaultRunner } from '../dist/project-state.js';
const allowed = new Set(['--allow-provider-mutations', '--keep-repository']);
assert.ok(
  process.argv.slice(2).every((argument) => allowed.has(argument)),
  'Unknown live test argument',
);
assert.ok(
  process.argv.includes('--allow-provider-mutations'),
  'Explicit provider mutation opt-in required',
);
assert.ok(
  process.argv.includes('--keep-repository'),
  'Explicit consent to retain the private GitHub test repository required',
);
const owner = 'rswearin';
const scope = 'rsdev';
const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-vercel-git-live-'));
const name = `anhedral-git-qa-${randomBytes(6).toString('hex')}`;
const root = path.join(temporary, name);
const clone = path.join(temporary, 'recovered');
const environment = {
  ...process.env,
  CI: '1',
  NO_COLOR: '1',
  GH_HOST: 'github.com',
  GH_PROMPT_DISABLED: '1',
  GIT_TERMINAL_PROMPT: '0',
};
let project;
let account;
let repositoryCreated = false;
let stage = 'account preflight';
let failure = false;
const report = {
  schemaVersion: 1,
  test: 'vercel-git-private',
  githubOwner: owner,
  vercelScope: scope,
  phases: [],
  productBrowserMembership: 'not-tested',
  cleanup: 'pending',
};
const phase = (message) => {
  stage = message;
  console.log(`Live Git fixture: ${message}`);
};
const run = async (command, args, cwd, env) => {
  const output = await defaultRunner(command, args, cwd, env);
  if (command === 'gh' && args[0] === 'repo' && args[1] === 'create') repositoryCreated = true;
  return output;
};
const json = async (command, args, cwd = temporary) =>
  JSON.parse(await run(command, args, cwd, environment));
const api = (endpoint, cwd = root) =>
  json(
    'pnpm',
    ['dlx', 'vercel@62.7.0', 'api', endpoint, '--scope', account.id, '--raw', '--non-interactive'],
    cwd,
  );
const put = (file, contents) => {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
};
let gitEnvironment;
const git = (...args) => run('git', args, root, gitEnvironment);
const commit = async (message) => {
  await git('add', '.');
  await git('commit', '-m', message);
  return (await git('rev-parse', 'HEAD')).trim();
};
async function waitForGitProduction(sha) {
  const deadline = Date.now() + 20 * 60 * 1000;
  let announcements = 0;
  while (Date.now() < deadline) {
    const provider = await api(`/v9/projects/${project.projectId}?teamId=${account.id}`);
    assert.equal(provider.id, project.projectId);
    assert.equal(provider.accountId, account.id);
    const id = provider.targets?.production?.id;
    if (id) {
      const deployment = await api(`/v13/deployments/${id}?teamId=${account.id}`);
      if (
        deployment.readyState === 'READY' &&
        deployment.target === 'production' &&
        deployment.gitSource?.sha === sha
      ) {
        assert.equal(deployment.id, id);
        assert.equal(deployment.projectId, project.projectId);
        assert.equal(deployment.ownerId, account.id);
        assert.equal(deployment.gitSource.type, 'github');
        assert.equal(String(deployment.gitSource.repoId), String(project.repository.repoId));
        assert.equal(deployment.gitSource.ref, project.repository.productionBranch);
        return;
      }
    }
    if (announcements++ % 4 === 0)
      console.log('Waiting for the exact Git commit to become READY production');
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  throw new Error('Expected Git deployment did not become active within the fixture deadline');
}
try {
  const user = await json('gh', ['api', 'user']);
  assert.equal(user.login, owner);
  assert.ok(Number.isSafeInteger(user.id));
  if (process.env.VERCEL_PROJECT_ID || process.env.VERCEL_ORG_ID)
    throw new Error(
      'Remove conflicting Vercel account/project environment overrides before fixture execution',
    );
  const teams = await json('pnpm', [
    'dlx',
    'vercel@62.7.0',
    'api',
    '/v2/teams?limit=100',
    '--raw',
    '--non-interactive',
  ]);
  const candidates = teams.teams.filter((team) => team.slug === scope);
  assert.equal(candidates.length, 1);
  account = candidates[0];
  assert.match(account.id, /^team_[a-zA-Z0-9]+$/);
  const team = await api(`/v2/teams/${account.id}`, temporary);
  assert.equal(team.slug, scope);
  assert.equal(team.id, account.id);
  // Commit authorship must correspond to the authenticated GitHub account, not an invented QA author.
  gitEnvironment = {
    ...environment,
    GIT_AUTHOR_NAME: user.name || user.login,
    GIT_COMMITTER_NAME: user.name || user.login,
    GIT_AUTHOR_EMAIL: `${user.id}+${user.login}${String.fromCharCode(64)}users.noreply.github.com`,
    GIT_COMMITTER_EMAIL: `${user.id}+${user.login}${String.fromCharCode(64)}users.noreply.github.com`,
  };
  phase('scaffold and implement protected HTTP acceptance checks');
  await scaffoldStandardProject(parseStandardOptions('new', [root, '--next', '--no-git']));
  put(
    'apps/web/app/page.tsx',
    'import Link from "next/link";\nexport default function Page() { return <main><h1>Anhedral Git-owned application</h1><Link href="/about">About</Link></main>; }\n',
  );
  put(
    'apps/web/app/about/page.tsx',
    'export default function Page() { return <main><h1>Private customer-owned application</h1><p>First Git release</p></main>; }\n',
  );
  put(
    'tests/live.mjs',
    `import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const expectedVersion = readFileSync('apps/web/app/about/page.tsx', 'utf8').includes('Second Git release') ? 'Second Git release' : 'First Git release';
const origin = process.env.ANHEDRAL_APP_URL; assert.ok(origin);
for (const [pathname, expected] of [['/', 'Anhedral Git-owned application'], ['/about', 'Private customer-owned application']]) {
  const anonymous = await fetch(new URL(pathname, origin), { redirect: 'manual' });
  assert.ok([401, 403].includes(anonymous.status), 'Anonymous request must be denied by protection');
  let response;
  try { response = execFileSync('pnpm', ['dlx', 'vercel@62.7.0', 'curl', pathname, '--deployment', origin, '--scope', process.env.VERCEL_ORG_ID, '--non-interactive', '--', '--silent', '--show-error', '--fail', '--write-out', '\\n%{http_code}'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 * 1024 }); }
  catch { throw new Error('Authorized protected HTTP check failed; inspect project access locally'); }
  assert.equal(response.slice(response.lastIndexOf('\\n') + 1), '200'); assert.ok(response.includes(expected)); if (pathname === '/about') assert.ok(response.includes(expectedVersion), 'Exact source version must match served product content');
}
`,
  );
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  pkg.scripts['test:live'] = 'node tests/live.mjs';
  put('package.json', JSON.stringify(pkg, null, 2) + '\n');
  await git('init', '-b', 'main');
  await commit('Create private Git delivery acceptance fixture');
  phase('create explicitly retained private customer GitHub repository');
  const repository = await setupRepository(
    root,
    { owner, name, create: true, visibility: 'private' },
    run,
  );
  assert.equal(repository.repository.nameWithOwner, `${owner}/${name}`);
  assert.equal(repository.repository.isPrivate, true);
  report.retainedRepository = repository.repository.url;
  phase('connect isolated private Vercel project and exact Git source');
  project = (
    await connectVercelApplication(
      root,
      { scope, audience: 'private', use: 'personal', create: true, git: true },
      run,
    )
  ).project;
  assert.equal(project.teamId, account.id);
  assert.equal(project.repository.productionBranch, 'main');
  report.projectId = project.projectId;
  const firstCommit = await commit('Record private hosting and repository identity');
  await git('push', 'origin', 'HEAD:refs/heads/main');
  phase('wait for first Git production, adopt and verify private HTTP behavior');
  await waitForGitProduction(firstCommit);
  const first = await adoptVercelApplication(root, run);
  await verifyVercelApplication(root, run);
  report.phases.push(
    'first Git production adopted; anonymous denied; authenticated root/about content passed',
  );
  put(
    'apps/web/app/about/page.tsx',
    'export default function Page() { return <main><h1>Private customer-owned application</h1><p>Second Git release</p></main>; }\n',
  );
  const secondCommit = await commit('Validate a second Git production release');
  await git('push', 'origin', 'HEAD:refs/heads/main');
  phase('wait for second Git production, adopt and verify');
  await waitForGitProduction(secondCommit);
  await adoptVercelApplication(root, run);
  await verifyVercelApplication(root, run);
  report.phases.push('second Git production adopted and independently verified');
  phase('fresh clone exact source and recover active production without inherited test proof');
  await run(
    'git',
    ['clone', '--branch', 'main', '--single-branch', repository.repository.url, clone],
    temporary,
    environment,
  );
  await run('pnpm', ['install', '--frozen-lockfile'], clone, environment);
  const recovered = await recoverVercelApplication(clone, run);
  assert.equal(recovered.release.commit, secondCommit);
  assert.equal(recovered.release.verification, undefined);
  await verifyVercelApplication(clone, run);
  report.phases.push(
    'fresh clone recovered exact production; fresh protected product checks passed',
  );
  phase('restore first recorded Git deployment and verify restored clean source');
  const restored = await rollbackVercelApplication(root, first.release.id, true, run);
  assert.equal(restored.release.provenance, 'git');
  assert.equal(restored.automaticProductionUpdates, 'paused-by-provider-rollback');
  await git('checkout', firstCommit);
  await verifyVercelApplication(root, run);
  assert.equal((await vercelApplicationStatus(root, true, run)).activeRecordedVersion, true);
  report.phases.push(
    'Git rollback active; restored source independently verified; automatic production assignment remains paused',
  );
  report.result = 'passed';
} catch {
  failure = true;
  report.result = 'failed';
  report.failedPhase = stage;
  console.error(`Live Git fixture failed during ${stage}; no raw provider output was persisted.`);
} finally {
  phase(
    'clean up only the isolated Vercel project; retain explicitly authorized private source repository',
  );
  if (!project && existsSync(path.join(root, '.anhedral/vercel-creation.json')))
    project = JSON.parse(readFileSync(path.join(root, '.anhedral/vercel-creation.json'), 'utf8'));
  if (repositoryCreated && !report.retainedRepository)
    report.retainedRepository = `https://github.com/${owner}/${name}`;
  try {
    if (project?.projectId) {
      assert.equal(project.teamId, account.id);
      assert.equal(project.name, name);
      const provider = await api(`/v9/projects/${project.projectId}?teamId=${account.id}`);
      assert.equal(provider.id, project.projectId);
      assert.equal(provider.accountId, account.id);
      assert.equal(provider.name, name);
      execFileSync(
        'pnpm',
        ['dlx', 'vercel@62.7.0', 'project', 'remove', name, '--scope', account.id],
        { cwd: root, input: 'y\n', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 1024 * 1024 },
      );
      const listed = await api(
        `/v9/projects?teamId=${account.id}&search=${encodeURIComponent(name)}&limit=100`,
      );
      assert.equal(
        listed.projects.some((item) => item.id === project.projectId || item.name === name),
        false,
      );
    }
    report.cleanup = 'isolated Vercel project confirmed absent; temporary checkouts removed';
    rmSync(temporary, { recursive: true, force: true });
  } catch {
    failure = true;
    report.cleanup = 'failed: inspect isolated provider project; temporary checkout retained';
    report.temporaryCheckout = root;
    console.error('Isolated Vercel cleanup could not be confirmed; review the saved report.');
  }
  const destination = path.join(process.cwd(), '.artifacts/review/live-vercel-git.json');
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(`Sanitized fixture report: ${destination}`);
  if (report.retainedRepository)
    console.log(`Explicitly retained private test repository: ${report.retainedRepository}`);
}
if (failure) process.exitCode = 1;
