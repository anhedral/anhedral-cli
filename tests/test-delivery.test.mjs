import {
  readProjectSection,
  writeProjectSection,
  hasProjectSection,
} from '../dist/project-config.js';
import { createSetupPlan } from '../dist/capabilities.js';
import { parseStandardOptions } from '../dist/registry/options.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  registerApplication,
  connectApplication,
  shipApplication,
  applicationStatus,
  parseDeploymentOutput,
  planDelivery,
  verifyApplication,
  rollbackApplication,
  recoverApplication,
} from '../dist/delivery.js';
import { writeManagementOverview } from '../dist/management.js';
const account = 'a'.repeat(32),
  commit = 'b'.repeat(40);
function fixture(targets = ['api', 'web']) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-delivery-test-'));
  writeProjectSection(
    root,
    'setup',
    createSetupPlan(parseStandardOptions([root, '--hono', '--vinext'])),
  );
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'test-app' }));
  for (const id of targets) {
    mkdirSync(path.join(root, 'apps', id), { recursive: true });
    writeFileSync(
      path.join(root, 'apps', id, 'wrangler.jsonc'),
      `// Worker configuration\n${JSON.stringify({ name: `test-${id}`, main: 'src/index.ts' })}\n`,
    );
    writeFileSync(
      path.join(root, 'apps', id, 'package.json'),
      JSON.stringify({ scripts: { deploy: 'wrangler deploy' } }),
    );
  }
  registerApplication(root);
  return root;
}
function runner(root, options = {}) {
  const calls = [];
  const run = async (command, args, cwd, env) => {
    calls.push({ command, args, cwd, env });
    if (args.includes('whoami'))
      return JSON.stringify({
        loggedIn: true,
        accounts: [{ id: options.wrongAccount ? 'c'.repeat(32) : account }],
      });
    if (command === 'git') {
      if (args[0] === 'show')
        return readFileSync(path.join(root, args[1].slice('HEAD:'.length)), 'utf8');
      if (args.includes('--show-toplevel')) return root;
      if (args.includes('--porcelain')) return options.dirty ? ' M app.ts' : '';
      return commit;
    }
    if (args.includes('check')) {
      if (options.failCheck) throw new Error('check failed');
      return '';
    }
    const id = path.basename(cwd);
    if (args[0] === 'run' && args[1] === 'deploy') {
      if (options.failTarget === id) throw new Error('deploy failed');
      writeFileSync(
        env.WRANGLER_OUTPUT_FILE_PATH,
        JSON.stringify({
          type: 'deploy',
          version: 1,
          worker_name: `test-${id}`,
          version_id: `version-${id}`,
          targets: [`https://test-${id}.customer.workers.dev`],
        }) + '\n',
      );
      return '';
    }
    if (args.includes('test:live')) {
      if (options.failLive) throw new Error('live failed');
      return '';
    }
    if (args.includes('view')) return JSON.stringify({ id: args[4] });
    if (args.includes('rollback')) return '';
    if (args.includes('status'))
      return JSON.stringify(
        options.providerStatus ?? {
          versions: [
            {
              version_id: options.staleProvider ? 'different-version' : `version-${id}`,
              percentage: 100,
            },
          ],
        },
      );
    throw new Error(`Unexpected command ${command} ${args}`);
  };
  return { run, calls };
}
async function connected(root, run) {
  return connectApplication(root, account, 'public', run);
}
function records(root) {
  return JSON.parse(readFileSync(path.join(root, '.anhedral/releases.json'), 'utf8')).releases;
}

test('identity is stable, JSONC is supported, and delivery planning is read-only', () => {
  const root = fixture();
  try {
    const first = registerApplication(root);
    assert.equal(registerApplication(root).id, first.id);
    assert.deepEqual(
      first.targets.map((x) => x.id),
      ['api', 'web'],
    );
    assert.equal(first.deliveryEngine, 'wrangler');
    assert.equal(first.accountId, null);
    assert.equal(first.audience, 'unconfigured');
    const before = readFileSync(path.join(root, 'anhedral.json'), 'utf8');
    assert.equal(planDelivery(root).resourcesProvisioned, false);
    assert.equal(readFileSync(path.join(root, 'anhedral.json'), 'utf8'), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('delivery requires an explicit recognized engine in the current application manifest', () => {
  const root = fixture();
  try {
    const project = readProjectSection(root, 'cloudflare');
    for (const engine of [undefined, 'unknown']) {
      writeProjectSection(root, 'cloudflare', { ...project, deliveryEngine: engine });
      assert.throws(() => planDelivery(root), /Invalid application manifest/);
      assert.equal(readProjectSection(root, 'cloudflare').deliveryEngine, engine);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('wrong account fails before changing project configuration', async () => {
  const root = fixture();
  try {
    const { run } = runner(root, { wrongAccount: true });
    await assert.rejects(connected(root, run), /cannot access/);
    assert.equal(registerApplication(root).accountId, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('delivery requires explicit audience and source provenance', async () => {
  const root = fixture();
  try {
    const { run, calls } = runner(root, { dirty: true });
    await connectApplication(root, account, undefined, run);
    await assert.rejects(shipApplication(root, run), /explicit audience/);
    await connected(root, run);
    await assert.rejects(shipApplication(root, run), /Commit/);
    assert.equal(
      calls.some((c) => c.args[0] === 'run' && c.args[1] === 'deploy'),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('failed checks prevent every deployment and persist truthful failure', async () => {
  const root = fixture();
  try {
    const { run, calls } = runner(root, { failCheck: true });
    await connected(root, run);
    await assert.rejects(shipApplication(root, run), /check failed/);
    assert.equal(records(root)[0].state, 'failed');
    assert.equal(
      calls.some((c) => c.args[1] === 'deploy'),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('partial deployment remains recorded and is not marked complete', async () => {
  const root = fixture();
  try {
    const { run } = runner(root, { failTarget: 'web' });
    await connected(root, run);
    await assert.rejects(shipApplication(root, run), /deploy failed/);
    const release = records(root)[0];
    assert.equal(release.state, 'failed');
    assert.deepEqual(
      release.targets.map((t) => t.target),
      ['api'],
    );
    assert.equal(release.targets[0].providerConfirmed, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('successful delivery records provider versions and returned URLs, with separate product evidence', async () => {
  const root = fixture();
  try {
    const { run, calls } = runner(root);
    await connected(root, run);
    const result = await shipApplication(root, run);
    assert.equal(result.release.state, 'deployed');
    assert.equal(result.release.commit, commit);
    assert.equal(result.productVerification, 'required');
    assert.equal(result.release.targets[1].urls[0], 'https://test-web.customer.workers.dev');
    assert.ok(
      calls
        .filter((c) => c.args[1] === 'deploy')
        .every((c) => c.env.CLOUDFLARE_ACCOUNT_ID === account),
    );
    const local = await applicationStatus(root);
    assert.equal(local.evidence, 'local-history');
    const refreshed = await applicationStatus(root, true, run);
    assert.ok(refreshed.provider.every((t) => t.activeRecordedVersion));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('provider drift is detected independently of successful upload', async () => {
  const root = fixture();
  try {
    const { run } = runner(root, { staleProvider: true });
    await connected(root, run);
    await assert.rejects(shipApplication(root, run), /active version/);
    assert.equal(records(root)[0].targets[0].providerConfirmed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('placeholder resources, account conflicts and concurrent deliveries fail closed', async () => {
  const root = fixture();
  try {
    const { run } = runner(root);
    await connected(root, run);
    const config = path.join(root, 'apps/api/wrangler.jsonc');
    writeFileSync(config, JSON.stringify({ name: 'test-api', account_id: 'c'.repeat(32) }));
    await assert.rejects(shipApplication(root, run), /conflicts/);
    writeFileSync(
      config,
      JSON.stringify({ name: 'test-api', d1_databases: [{ database_id: 'REPLACE_WITH_ID' }] }),
    );
    assert.throws(() => planDelivery(root), /placeholder/);
    writeFileSync(config, JSON.stringify({ name: 'test-api' }));
    mkdirSync(path.join(root, '.anhedral/ship.lock'), { recursive: true });
    await assert.rejects(shipApplication(root, run), /Another delivery/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('receipts reject unmatched Workers and never substitute an invented URL', () => {
  assert.throws(
    () =>
      parseDeploymentOutput(
        JSON.stringify({ type: 'deploy', version: 1, worker_name: 'other', version_id: 'v' }),
        { id: 'web', workerName: 'test-web' },
      ),
    /matching/,
  );
  const receipt = parseDeploymentOutput(
    JSON.stringify({
      type: 'deploy',
      version: 1,
      worker_name: 'test-web',
      version_id: 'v',
      targets: ['http://unsafe', 'not-a-url'],
    }),
    { id: 'web', workerName: 'test-web' },
  );
  assert.deepEqual(receipt.urls, []);
});

test('split traffic and historical version IDs cannot satisfy completed delivery', async () => {
  for (const providerStatus of [
    {
      versions: [
        { version_id: 'version-web', percentage: 10 },
        { version_id: 'older', percentage: 90 },
      ],
    },
    { historical: { version_id: 'version-web', percentage: 100 } },
    {
      versions: [
        { version_id: 'version-web', percentage: 100 },
        { version_id: 'older', percentage: 100 },
      ],
    },
  ]) {
    const root = fixture(['web']);
    try {
      const { run } = runner(root, { providerStatus });
      await connected(root, run);
      await assert.rejects(
        shipApplication(root, run),
        /active version|active versions|traffic allocation/,
      );
      assert.equal(records(root)[0].state, 'failed');
      assert.equal(records(root)[0].targets[0].providerConfirmed, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
test('management describes configured bindings and schedules without exposing variables', async () => {
  const root = fixture(['web']);
  try {
    writeFileSync(
      path.join(root, 'apps/web/wrangler.jsonc'),
      JSON.stringify({
        name: 'test-web',
        vars: { PRIVATE_DATA: 'sensitive-value' },
        d1_databases: [{ binding: 'DB', database_id: 'resource-id' }],
        triggers: { crons: ['0 * * * *'] },
      }),
    );
    const result = await applicationStatus(root);
    assert.deepEqual(result.architecture[0].bindings, [{ kind: 'd1_databases', binding: 'DB' }]);
    assert.deepEqual(result.architecture[0].scheduled, ['0 * * * *']);
    assert.equal(JSON.stringify(result).includes('sensitive-value'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('connection discovers a single account and rejects ambiguous account access', async () => {
  const root = fixture(['web']);
  try {
    const { run } = runner(root);
    const discovery = async (...args) =>
      args[1].includes('whoami')
        ? JSON.stringify({ loggedIn: true, accounts: [{ id: account }, { id: 'c'.repeat(32) }] })
        : run(...args);
    if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
      await assert.rejects(connectApplication(root, undefined, 'public', discovery), /exactly one/);
      assert.equal(registerApplication(root).accountId, null);
      assert.equal((await connectApplication(root, undefined, 'public', run)).accountId, account);
    }
    assert.equal((await connectApplication(root, account, 'public', run)).accountId, account);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('live tests are tied to the active source and preserve failed product evidence', async () => {
  const root = fixture(['web']);
  try {
    const { run, calls } = runner(root);
    await connected(root, run);
    await shipApplication(root, run);
    await assert.rejects(verifyApplication(root, run), /test:live script/);
    writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'test-app', scripts: { 'test:live': 'node tests/live.mjs' } }),
    );
    const result = await verifyApplication(root, run);
    assert.equal(result.verification.state, 'passed');
    assert.equal(
      calls.find((call) => call.args.includes('test:live')).env.ANHEDRAL_APP_URL,
      'https://test-web.customer.workers.dev',
    );
    const failed = runner(root, { failLive: true });
    await assert.rejects(verifyApplication(root, failed.run), /live failed/);
    assert.equal(records(root).at(-1).state, 'deployed');
    assert.equal(records(root).at(-1).verification.state, 'failed');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('rollback requires compatibility review and records restored provider versions', async () => {
  const root = fixture();
  try {
    const { run, calls } = runner(root);
    await connected(root, run);
    const shipped = await shipApplication(root, run);
    await assert.rejects(
      rollbackApplication(root, shipped.release.id, false, run),
      /data-compatible/,
    );
    const restored = await rollbackApplication(root, shipped.release.id, true, run);
    assert.equal(restored.release.operation, 'rollback');
    assert.equal(restored.release.restoredReleaseId, shipped.release.id);
    assert.equal(restored.dataRestored, false);
    assert.equal(restored.release.state, 'deployed');
    assert.deepEqual(
      calls.filter((call) => call.args.includes('rollback')).map((call) => path.basename(call.cwd)),
      ['web', 'api'],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('management overview escapes app data and refuses executable URLs', async () => {
  const root = fixture(['web']);
  try {
    const snapshot = await applicationStatus(root);
    snapshot.project.name = '<script>alert(1)</script>';
    snapshot.management = 'javascript:alert(1)';
    const file = writeManagementOverview(root, snapshot);
    const html = readFileSync(file, 'utf8');
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('href="javascript:'));
    assert.ok(html.includes("default-src 'none'"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('private delivery refuses product deployment when Access cannot be established', async () => {
  const root = fixture(['web']);
  try {
    const { run, calls } = runner(root);
    await connectApplication(root, account, 'private', run, [['member', 'example.test'].join('@')]);
    await assert.rejects(
      shipApplication(root, run, async () => {
        throw new Error('Access permission denied');
      }),
      /Access permission denied/,
    );
    assert.equal(
      calls.filter((call) => call.args[0] === 'run' && call.args[1] === 'deploy').length,
      0,
    );
    assert.equal(records(root).at(-1).state, 'failed');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fresh-clone recovery records provider evidence without inventing releases or mutating providers', async () => {
  const root = fixture(['web']);
  try {
    const { run, calls } = runner(root);
    await connected(root, run);
    const before = readFileSync(path.join(root, 'anhedral.json'), 'utf8');
    const request = async (method, endpoint) => {
      assert.equal(method, 'GET');
      assert.equal(endpoint, '/workers/scripts/test-web/settings');
      return { result: { bindings: [] } };
    };
    const snapshot = await recoverApplication(root, run, request);
    assert.equal(snapshot.evidence, 'current-provider-snapshot');
    assert.equal(snapshot.sourceProvenance, 'unavailable');
    assert.equal(snapshot.replayableReleaseId, null);
    assert.equal(snapshot.productVerification, 'unverified');
    assert.deepEqual(snapshot.provider[0].versions, [
      { versionId: 'version-web', percentage: 100 },
    ]);
    assert.equal(readFileSync(path.join(root, 'anhedral.json'), 'utf8'), before);
    assert.equal((await applicationStatus(root)).releases.length, 0);
    assert.equal(
      calls.some((call) => call.args.includes('deploy') || call.args.includes('rollback')),
      false,
    );
    assert.equal(
      JSON.parse(readFileSync(path.join(root, '.anhedral/cloudflare-recovery.json'))).localCommit,
      commit,
    );
    await assert.rejects(verifyApplication(root, run), /recorded release/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('recovery rejects binding drift and dirty source before accepting a snapshot', async () => {
  const root = fixture(['web']);
  try {
    const { run } = runner(root);
    await connected(root, run);
    writeFileSync(
      path.join(root, 'apps/web/wrangler.jsonc'),
      JSON.stringify({ name: 'test-web', services: [{ binding: 'API', service: 'expected-api' }] }),
    );
    const request = async () => ({
      result: { bindings: [{ name: 'API', type: 'service', service: 'other-api' }] },
    });
    await assert.rejects(recoverApplication(root, run, request), /binding differs/);
    await assert.rejects(
      recoverApplication(root, runner(root, { dirty: true }).run, request),
      /clean committed/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('recovery preserves existing provenance and marks accepted tests stale after provider drift', async () => {
  const root = fixture(['web']);
  try {
    const { run } = runner(root);
    await connected(root, run);
    const shipped = await shipApplication(root, run);
    const snapshot = await recoverApplication(root, run, async () => ({
      result: { bindings: [] },
    }));
    assert.equal(snapshot.replayableReleaseId, shipped.release.id);
    assert.equal(snapshot.productVerification, 'unverified');
    const historyFile = path.join(root, '.anhedral/releases.json');
    const value = JSON.parse(readFileSync(historyFile));
    value.releases[0].verification = {
      state: 'passed',
      checkedAt: new Date().toISOString(),
      command: 'pnpm run test:live',
    };
    writeFileSync(historyFile, JSON.stringify(value));
    assert.equal(
      (await applicationStatus(root, true, runner(root, { staleProvider: true }).run))
        .productVerification,
      'stale-live-tests',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('private recovery cannot create missing Access protection', async () => {
  const root = fixture(['web']);
  try {
    const { run } = runner(root);
    await connectApplication(root, account, 'private', run, [['owner', 'example.test'].join('@')]);
    const calls = [];
    const request = async (method, endpoint) => {
      calls.push(method);
      assert.equal(method, 'GET');
      return endpoint.includes('/settings')
        ? { result: { bindings: [] } }
        : { result: [], result_info: { total_pages: 1 } };
    };
    await assert.rejects(recoverApplication(root, run, request), /immutable Worker ID/);
    assert.ok(calls.every((method) => method === 'GET'));
    assert.equal((await applicationStatus(root)).releases.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('registration rejects incomplete or inconsistent setup before writing application state', () => {
  const root = fixture();
  const file = path.join(root, 'anhedral.json');
  try {
    rmSync(file);
    const setup = createSetupPlan(parseStandardOptions([root, '--hono']));
    for (const invalid of [{ hosting: 'cloudflare' }, { ...setup, products: ['unknown'] }]) {
      writeProjectSection(root, 'setup', invalid);
      const before = readFileSync(path.join(root, '.gitignore'), 'utf8');
      assert.throws(
        () => registerApplication(root),
        /Unsupported setup plan|Unknown setup capabilities/,
      );
      assert.equal(readFileSync(path.join(root, '.gitignore'), 'utf8'), before);
      assert.equal(hasProjectSection(root, 'cloudflare'), false);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
