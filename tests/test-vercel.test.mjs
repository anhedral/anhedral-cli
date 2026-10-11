import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  registerVercelApplication,
  connectVercelApplication,
  planVercelDelivery,
  shipVercelApplication,
  vercelApplicationStatus,
  verifyVercelApplication,
  rollbackVercelApplication,
  adoptVercelApplication,
  recoverVercelApplication,
  writeVercelOverview,
} from '../dist/vercel.js';
const team = 'team_Customer',
  projectId = 'prj_Application',
  commit = 'b'.repeat(40);
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-vercel-test-'));
  mkdirSync(path.join(root, 'apps/web'), { recursive: true });
  writeFileSync(path.join(root, 'anhedral.setup.json'), JSON.stringify({ hosting: 'vercel' }));
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'customer-app', scripts: { 'test:live': 'node tests/live.mjs' } }),
  );
  writeFileSync(
    path.join(root, 'apps/web/package.json'),
    JSON.stringify({ scripts: { build: 'next build' } }),
  );
  registerVercelApplication(root);
  return root;
}
function provider(root, options = {}) {
  const calls = [];
  let created = 0;
  let active = 'dpl_First';
  let gitLinked = false;
  let privateCreated = false;
  const value = () => ({
    id: projectId,
    accountId: options.wrongAccount ? 'team_Other' : team,
    name: 'customer-app',
    framework: 'nextjs',
    rootDirectory: 'apps/web',
    sourceFilesOutsideRootDirectory: true,
    link:
      gitLinked || options.existingGit
        ? {
            type: 'github',
            org: 'customer',
            repo: 'customer-app',
            repoId: options.wrongGitId ? 456 : 123,
            productionBranch: options.branchDrift ? 'other' : 'main',
          }
        : undefined,
    ssoProtection: options.protected || privateCreated ? { deploymentType: 'all' } : null,
    targets: { production: { id: options.drift ? 'dpl_Other' : active } },
  });
  const run = async (command, args, cwd, env) => {
    calls.push({ command, args, cwd, env });
    if (command === 'gh' && args[0] === 'api') return '123';
    if (command === 'gh')
      return JSON.stringify({
        nameWithOwner: 'customer/customer-app',
        url: 'https://github.com/customer/customer-app',
        isPrivate: true,
        owner: { login: 'customer' },
        viewerPermission: 'ADMIN',
      });
    if (command === 'git' && args[0] === 'remote')
      return ['git', 'github.com:customer/customer-app.git'].join('@');
    if (command === 'git') {
      if (args[0] === 'show')
        return options.uncommittedManifest
          ? '{}'
          : readFileSync(path.join(root, 'anhedral.web.json'), 'utf8');
      if (args[0] === 'ls-remote')
        return `${options.remoteDrift ? 'c'.repeat(40) : commit}\trefs/heads/main`;
      if (args.includes('--show-toplevel')) return root;
      if (args.includes('--porcelain')) return options.dirty ? ' M app.ts' : '';
      return commit;
    }
    if (args[0] === 'run') {
      if (args[1] === 'check' && options.failCheck) throw new Error('check failed');
      if (args[1] === 'test:live' && options.failLive) throw new Error('product failed');
      return '';
    }
    assert.equal(args[1], 'vercel@62.7.0');
    if (args[2] === 'api') {
      const endpoint = args[3];
      if (endpoint.startsWith('/v2/teams?'))
        return JSON.stringify({
          teams: options.ambiguous
            ? [
                { id: team, slug: 'customer' },
                { id: 'team_Another', slug: 'another' },
              ]
            : [{ id: team, slug: 'customer' }],
          pagination: { next: null },
        });
      if (endpoint.startsWith('/v2/teams/'))
        return JSON.stringify({
          id: team,
          slug: 'customer',
          billing: { plan: options.hobby ? 'hobby' : 'pro' },
        });
      if (endpoint.startsWith('/v9/projects?'))
        return JSON.stringify({
          projects: options.existing ? [value()] : [],
          pagination: { next: null },
        });
      if (endpoint.startsWith('/v11/projects?')) {
        created++;
        const body = JSON.parse(readFileSync(args[args.indexOf('--input') + 1], 'utf8'));
        assert.equal(body.rootDirectory, 'apps/web');
        assert.equal(body.framework, 'nextjs');
        return JSON.stringify(value());
      }
      if (endpoint.startsWith('/v9/projects/')) {
        if (args.includes('--input')) {
          const body = JSON.parse(readFileSync(args[args.indexOf('--input') + 1], 'utf8'));
          privateCreated = body.ssoProtection?.deploymentType === 'all';
        }
        return JSON.stringify(value());
      }
      if (endpoint.startsWith('/v13/deployments/'))
        return JSON.stringify({
          id: 'dpl_First',
          projectId,
          ownerId: team,
          readyState: options.notReady ? 'BUILDING' : 'READY',
          target: 'production',
          url: 'customer-deployment.vercel.app',
          alias: ['customer-app.vercel.app'],
          gitSource: options.gitDeployment
            ? {
                type: 'github',
                repoId: options.gitNoId ? undefined : options.gitRepoDrift ? '456' : '123',
                org: 'customer',
                repo: 'customer-app',
                ref: options.gitBranchDrift ? 'other' : 'main',
                sha: options.gitCommitDrift ? 'c'.repeat(40) : commit,
                prId: options.pullRequest ? 10 : null,
              }
            : undefined,
          meta: {
            anhedralProject: JSON.parse(readFileSync(path.join(root, 'anhedral.web.json'), 'utf8'))
              .id,
            anhedralCommit: options.wrongCommit ? 'c'.repeat(40) : commit,
          },
        });
    }
    if (args[2] === 'git' && args[3] === 'connect') {
      gitLinked = !options.gitFailure;
      return '';
    }
    if (args[2] === 'link') {
      mkdirSync(path.join(root, '.vercel'), { recursive: true });
      writeFileSync(
        path.join(root, '.vercel/project.json'),
        JSON.stringify({ orgId: team, projectId }),
      );
      return '';
    }
    if (args[2] === 'project' && args[3] === 'inspect')
      return JSON.stringify({ ...value(), owner: { slug: 'customer' } });
    if (args[2] === 'deploy')
      return options.badUrl
        ? 'Done at a guessed URL'
        : JSON.stringify({
            status: 'ok',
            deployment: {
              id: options.wrongReceipt ? 'dpl_Other' : 'dpl_First',
              url: 'https://customer-deployment.vercel.app',
              productionUrl: options.wrongAlias
                ? 'https://unrelated.vercel.app'
                : 'https://customer-app.vercel.app',
              readyState: 'READY',
              target: 'production',
            },
          });
    if (args[2] === 'rollback') {
      active = 'dpl_First';
      return '';
    }
    throw new Error('Unexpected provider command');
  };
  return { run, calls, created: () => created };
}
const connect = (root, run, overrides = {}) =>
  connectVercelApplication(
    root,
    { scope: 'customer', audience: 'public', use: 'commercial', create: true, ...overrides },
    run,
  );
test('Vercel registration and dry-run preserve identity without provider operations', () => {
  const root = fixture();
  try {
    const first = registerVercelApplication(root);
    assert.equal(registerVercelApplication(root).id, first.id);
    assert.equal(planVercelDelivery(root).mutation, false);
    assert.equal(first.projectId, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('Vercel connects the explicit customer team and configures the monorepo project', async () => {
  const root = fixture();
  try {
    const mock = provider(root);
    const result = await connect(root, mock.run);
    assert.equal(result.project.teamId, team);
    assert.equal(result.planActivated, false);
    assert.equal(mock.created(), 1);
    assert.equal(
      mock.calls.find((call) => call.args[2] === 'link').env.VERCEL_PROJECT_ID,
      undefined,
    );
    assert.equal(
      mock.calls.find((call) => call.args[2] === 'project').env.VERCEL_PROJECT_ID,
      projectId,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('commercial Hobby and ambiguous scopes fail before provider mutations', async () => {
  const root = fixture();
  try {
    const hobby = provider(root, { hobby: true });
    await assert.rejects(connect(root, hobby.run), /personal non-commercial/);
    assert.equal(hobby.created(), 0);
    const ambiguous = provider(root, { ambiguous: true });
    await assert.rejects(
      connectVercelApplication(
        root,
        { audience: 'public', use: 'personal', create: true },
        ambiguous.run,
      ),
      /ambiguous/,
    );
    assert.equal(ambiguous.created(), 0);
    await connect(root, hobby.run, { use: 'personal' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('Vercel refuses wrong accounts, existing links and unprotected private production', async () => {
  const root = fixture();
  try {
    await assert.rejects(
      connect(root, provider(root, { existing: true, wrongAccount: true }).run),
      /account/,
    );
    await assert.rejects(
      connect(root, provider(root, { existing: true }).run, { audience: 'private' }),
      /all deployments/,
    );
    const protectedMock = provider(root, { existing: true, protected: true });
    await connect(root, protectedMock.run, { audience: 'private' });
    writeFileSync(
      path.join(root, '.vercel/project.json'),
      JSON.stringify({ orgId: 'team_Other', projectId }),
    );
    await assert.rejects(shipVercelApplication(root, protectedMock.run), /Local Vercel link/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('Vercel checks, receipts and product verification are independently recorded', async () => {
  const root = fixture();
  try {
    const mock = provider(root);
    await connect(root, mock.run);
    const result = await shipVercelApplication(root, mock.run);
    assert.equal(result.release.url, 'https://customer-app.vercel.app');
    assert.equal(result.productVerification, 'required');
    assert.match(
      readFileSync(path.join(root, '.anhedral/web-overview.html'), 'utf8'),
      /Customer-owned Vercel/,
    );
    assert.equal((await vercelApplicationStatus(root, true, mock.run)).activeRecordedVersion, true);
    const verified = await verifyVercelApplication(root, mock.run);
    assert.equal(verified.verification.state, 'passed');
    assert.equal(
      mock.calls.find((call) => call.args.includes('test:live')).env.ANHEDRAL_APP_URL,
      result.release.url,
    );
    const file = writeVercelOverview(root, await vercelApplicationStatus(root));
    assert.match(readFileSync(file, 'utf8'), /Customer-owned Vercel/);
    await assert.rejects(
      verifyVercelApplication(root, provider(root, { failLive: true }).run),
      /product failed/,
    );
    const latest = (await vercelApplicationStatus(root)).releases.at(-1);
    assert.equal(latest.state, 'deployed');
    assert.equal(latest.verification.state, 'failed');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('Vercel rejects check failures, source dirtiness, invented URLs and provider drift', async () => {
  for (const options of [
    { failCheck: true },
    { dirty: true },
    { badUrl: true },
    { wrongCommit: true },
    { notReady: true },
    { drift: true },
    { wrongReceipt: true },
    { wrongAlias: true },
  ]) {
    const root = fixture();
    try {
      const mock = provider(root, options);
      await connect(root, mock.run);
      await assert.rejects(shipVercelApplication(root, mock.run));
      if (options.failCheck || options.dirty)
        assert.equal(
          mock.calls.some((call) => call.args[2] === 'deploy'),
          false,
        );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
test('Vercel rollback requires compatibility review and confirms the recorded production version', async () => {
  const root = fixture();
  try {
    const mock = provider(root);
    await connect(root, mock.run);
    const initial = await shipVercelApplication(root, mock.run);
    await assert.rejects(
      rollbackVercelApplication(root, initial.release.id, false, mock.run),
      /data-compatible/,
    );
    const restored = await rollbackVercelApplication(root, initial.release.id, true, mock.run);
    assert.equal(restored.release.operation, 'rollback');
    assert.equal(restored.release.state, 'deployed');
    assert.equal(restored.dataRestored, false);
    assert.equal(restored.productVerification, 'required');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Vercel Git connection verifies the remote provider link and keeps account connection recoverable', async () => {
  for (const failure of [false, true]) {
    const root = fixture();
    try {
      const mock = provider(root, { gitFailure: failure });
      if (failure) {
        await assert.rejects(
          connect(root, mock.run, { git: true }),
          /GitHub repository connection/,
        );
        assert.equal(
          JSON.parse(readFileSync(path.join(root, 'anhedral.web.json'), 'utf8')).projectId,
          projectId,
        );
      } else {
        await connect(root, mock.run, { git: true });
        assert.ok(
          mock.calls.some(
            (call) =>
              call.args[2] === 'git' &&
              call.args.includes('https://github.com/customer/customer-app'),
          ),
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('Vercel preserves a different existing Git repository identity', async () => {
  const root = fixture();
  try {
    const mock = provider(root, { existing: true, existingGit: true, wrongGitId: true });
    await assert.rejects(connect(root, mock.run, { git: true }), /different Git repository/);
    assert.equal(
      mock.calls.some((call) => call.args[2] === 'git'),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Vercel retains Git identity and rejects later provider or origin drift before deployment', async () => {
  const root = fixture();
  try {
    const options = {};
    const mock = provider(root, options);
    await connect(root, mock.run, { git: true });
    assert.deepEqual(
      JSON.parse(readFileSync(path.join(root, 'anhedral.web.json'), 'utf8')).repository,
      { repoId: 123, nameWithOwner: 'customer/customer-app', productionBranch: 'main' },
    );
    await shipVercelApplication(root, mock.run);
    await verifyVercelApplication(root, mock.run);
    options.drift = true;
    assert.equal(
      (await vercelApplicationStatus(root, true, mock.run)).productVerification,
      'stale',
    );
    options.drift = false;
    options.wrongGitId = true;
    await assert.rejects(
      vercelApplicationStatus(root, true, mock.run),
      /recorded source repository/,
    );
    await assert.rejects(shipVercelApplication(root, mock.run), /recorded source repository/);
    options.wrongGitId = false;
    const changedOrigin = (command, args, cwd, env) =>
      command === 'gh' && args[0] === 'api'
        ? Promise.resolve('456')
        : mock.run(command, args, cwd, env);
    const deployments = mock.calls.filter((call) => call.args[2] === 'deploy').length;
    await assert.rejects(shipVercelApplication(root, changedOrigin), /GitHub origin differs/);
    await assert.rejects(connect(root, changedOrigin, { git: true }), /GitHub origin differs/);
    assert.equal(mock.calls.filter((call) => call.args[2] === 'deploy').length, deployments);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Vercel private creation enables all-deployment authentication before linking without buying a plan', async () => {
  const root = fixture();
  try {
    const mock = provider(root, { hobby: true });
    const result = await connect(root, mock.run, { audience: 'private', use: 'personal' });
    assert.equal(result.planActivated, false);
    assert.equal(result.project.audience, 'private');
    const patch = mock.calls.find((call) => call.args[2] === 'api' && call.args.includes('PATCH'));
    assert.deepEqual(
      JSON.parse(readFileSync(path.join(root, 'anhedral.web.json'), 'utf8')).audience,
      'private',
    );
    assert.ok(patch);
    assert.ok(mock.calls.indexOf(patch) < mock.calls.findIndex((call) => call.args[2] === 'link'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('Git adoption validates exact production source, is idempotent, and separately verifies the product', async () => {
  const root = fixture();
  try {
    const mock = provider(root, { gitDeployment: true });
    await connect(root, mock.run, { git: true });
    const adopted = await adoptVercelApplication(root, mock.run);
    assert.equal(adopted.release.provenance, 'git');
    assert.equal(adopted.release.branch, 'main');
    assert.equal(adopted.release.operation, 'adopt');
    assert.equal(adopted.productVerification, 'required');
    assert.equal(adopted.release.verification, undefined);
    assert.equal(adopted.release.url, 'https://customer-deployment.vercel.app');
    assert.equal((await adoptVercelApplication(root, mock.run)).adopted, false);
    assert.equal((await vercelApplicationStatus(root, true, mock.run)).releases.length, 1);
    assert.equal((await verifyVercelApplication(root, mock.run)).verification.state, 'passed');
    assert.equal(
      mock.calls.some((call) => call.args[2] === 'deploy'),
      false,
    );
    const rollback = await rollbackVercelApplication(root, adopted.release.id, true, mock.run);
    assert.equal(rollback.release.provenance, 'git');
    assert.equal(rollback.release.branch, 'main');
    assert.equal(rollback.automaticProductionUpdates, 'paused-by-provider-rollback');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('Git adoption refuses foreign repository, branch, commit, unpushed source, PR, unready and stale production', async () => {
  for (const failure of [
    'gitNoId',
    'gitRepoDrift',
    'gitBranchDrift',
    'gitCommitDrift',
    'remoteDrift',
    'pullRequest',
    'notReady',
    'drift',
    'uncommittedManifest',
    'failCheck',
  ]) {
    const root = fixture();
    try {
      const options = { gitDeployment: true };
      const mock = provider(root, options);
      await connect(root, mock.run, { git: true });
      options[failure] = true;
      await assert.rejects(adoptVercelApplication(root, mock.run));
      assert.equal((await vercelApplicationStatus(root)).releases.length, 0);
      assert.equal(
        mock.calls.some((call) => call.args[2] === 'deploy'),
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
test('Fresh clone recovery restores only active confirmed provenance and no inherited product checks', async () => {
  for (const gitDeployment of [false, true]) {
    const root = fixture();
    try {
      const mock = provider(root, { gitDeployment });
      await connect(root, mock.run, { git: gitDeployment });
      if (gitDeployment) await adoptVercelApplication(root, mock.run);
      else await shipVercelApplication(root, mock.run);
      await verifyVercelApplication(root, mock.run);
      rmSync(path.join(root, '.anhedral'), { recursive: true });
      rmSync(path.join(root, '.vercel'), { recursive: true });
      const recovered = await recoverVercelApplication(root, mock.run);
      assert.equal(recovered.release.operation, 'recover');
      assert.equal(recovered.release.provenance, gitDeployment ? 'git' : 'cli');
      assert.equal(recovered.release.verification, undefined);
      assert.equal(recovered.productVerification, 'required');
      assert.equal(
        (await vercelApplicationStatus(root, true, mock.run)).activeRecordedVersion,
        true,
      );
      assert.equal((await recoverVercelApplication(root, mock.run)).adopted, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
test('Recovery rejects conflicting local/project identity and production branch drift', async () => {
  const root = fixture();
  try {
    const options = { gitDeployment: true };
    const mock = provider(root, options);
    await connect(root, mock.run, { git: true });
    options.branchDrift = true;
    await assert.rejects(recoverVercelApplication(root, mock.run), /recorded source repository/);
    options.branchDrift = false;
    writeFileSync(
      path.join(root, '.vercel/project.json'),
      JSON.stringify({ orgId: 'team_Other', projectId }),
    );
    await assert.rejects(recoverVercelApplication(root, mock.run), /Local Vercel link/);
    assert.equal(
      mock.calls.some((call) => call.args[2] === 'deploy'),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Idempotent adoption refuses a production change during its refresh', async () => {
  const root = fixture();
  try {
    const options = { gitDeployment: true };
    const mock = provider(root, options);
    await connect(root, mock.run, { git: true });
    await adoptVercelApplication(root, mock.run);
    await verifyVercelApplication(root, mock.run);
    let inspections = 0;
    const changing = (command, args, cwd, env) => {
      if (command === 'pnpm' && args[2] === 'api' && args[3].startsWith('/v9/projects/')) {
        inspections++;
        if (inspections === 2) options.drift = true;
      }
      return mock.run(command, args, cwd, env);
    };
    await assert.rejects(adoptVercelApplication(root, changing), /production changed/);
    assert.equal(
      (await vercelApplicationStatus(root, true, mock.run)).productVerification,
      'stale',
    );
    assert.equal((await vercelApplicationStatus(root)).releases.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
