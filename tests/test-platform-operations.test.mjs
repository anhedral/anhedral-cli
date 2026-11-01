import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, realpath, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runStagingCommand, runLogsCommand } from '../dist/platform-operations.js';
import { commandHelp } from '../dist/registry/usage.js';
import { validateCommand } from '../dist/cli-arguments.js';
const context = {
  origin: 'https://platform.anhedral.com',
  principalId: crypto.randomUUID(),
  projectId: crypto.randomUUID(),
  teamId: crypto.randomUUID(),
};
const candidateId = crypto.randomUUID(),
  deploymentId = crypto.randomUUID();
function capture(human = false) {
  let out = '';
  return {
    output: {
      json: !human,
      human,
      io: {
        out: {
          write: (value) => {
            out += value;
          },
        },
        err: { write: () => {} },
        stdinTTY: false,
        stdoutTTY: human,
        stderrTTY: human,
      },
    },
    read: () => (human ? out : JSON.parse(out.trim())),
  };
}
const state = (generation) => ({
  enabled: true,
  canDeploy: true,
  generation,
  activeDeploymentId: null,
  desiredDeploymentId: null,
  deployments: [],
});
const receipt = (input) => ({
  id: deploymentId,
  developmentId: context.projectId,
  candidateId: input.candidateId,
  requestId: input.requestId,
  generation: input.expectedGeneration + 1,
  configuration: {
    snapshotId: crypto.randomUUID(),
    digest: 'a'.repeat(64),
    environment: 'staging',
  },
});

test('staging and log commands expose bounded explicit filters and no production approval command', () => {
  validateCommand('staging', ['deploy', '--candidate', candidateId]);
  validateCommand('logs', ['--environment', 'staging', '--level', 'error', '--range', '1h']);
  assert.match(commandHelp('staging deploy'), /--candidate/);
  assert.match(commandHelp('logs'), /--cursor/);
  assert.throws(() => validateCommand('staging', ['approve']));
  assert.throws(() => validateCommand('logs', ['--environment', 'preview']));
});
test('staging retries retain candidate, identity and generation after a lost acknowledgement', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'anhedral-staging-cli-'))),
    previous = process.cwd();
  process.chdir(root);
  try {
    const requests = [];
    let reads = 0,
      acknowledge = false,
      saved;
    const request = async (path, method, body) => {
      if (method === 'GET') {
        reads++;
        return state(4);
      }
      requests.push(body);
      saved ??= receipt(body);
      if (!acknowledge) throw Error('acknowledgement interrupted');
      return saved;
    };
    await assert.rejects(
      runStagingCommand(['deploy', '--candidate', candidateId], capture().output, context, request),
      /interrupted/,
    );
    acknowledge = true;
    const output = capture();
    await runStagingCommand(
      ['deploy', '--candidate', candidateId],
      output.output,
      context,
      request,
    );
    assert.deepEqual(requests[0], requests[1]);
    assert.equal(reads, 1);
    assert.equal(output.read().deployment.id, deploymentId);
    const local = JSON.parse(await readFile(join(root, '.anhedral/platform/staging.json'), 'utf8'));
    assert.deepEqual(local.receipt, saved);
    assert.equal(local.teamId, context.teamId);
    await assert.rejects(
      runStagingCommand(
        ['deploy', '--candidate', candidateId],
        capture().output,
        { ...context, teamId: crypto.randomUUID() },
        request,
      ),
      /different identity, team or project/,
    );
    await assert.rejects(
      runStagingCommand(
        ['deploy', '--candidate', crypto.randomUUID()],
        capture().output,
        context,
        request,
      ),
      /candidate differs/,
    );
    const historical = capture();
    await runStagingCommand(
      ['deploy', '--candidate', candidateId],
      historical.output,
      context,
      request,
    );
    assert.equal(historical.read().status, 'already_requested');
    assert.equal(requests.length, 2);
  } finally {
    process.chdir(previous);
    await rm(root, { recursive: true, force: true });
  }
});
test('staging rejects a receipt for another project and preserves the pending request', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'anhedral-staging-receipt-'))),
    previous = process.cwd();
  process.chdir(root);
  try {
    await assert.rejects(
      runStagingCommand(
        ['deploy', '--candidate', candidateId],
        capture().output,
        context,
        async (_path, method, input) =>
          method === 'GET' ? state(1) : { ...receipt(input), developmentId: crypto.randomUUID() },
      ),
      /receipt differs/,
    );
    const local = JSON.parse(await readFile(join(root, '.anhedral/platform/staging.json'), 'utf8'));
    assert.equal(local.receipt, undefined);
    assert.equal(local.input.expectedGeneration, 1);
  } finally {
    process.chdir(previous);
    await rm(root, { recursive: true, force: true });
  }
});
test('runtime logs default to staging, preserve filters and neutralize terminal controls in human output', async () => {
  const now = new Date().toISOString();
  let requested;
  const page = {
    state: 'ready',
    reason: null,
    environment: 'staging',
    coverage: 'dynamic-workers',
    retentionDays: 7,
    from: now,
    to: now,
    entries: [
      {
        id: crypto.randomUUID(),
        requestId: crypto.randomUUID(),
        occurredAt: now,
        deploymentId,
        artifactId: candidateId,
        environment: 'staging',
        component: 'api',
        kind: 'exception',
        level: 'error',
        message: '\u001b[31mredacted failure\u001b[0m\nnext',
        method: null,
        status: null,
        outcome: null,
        durationMs: null,
        truncated: false,
      },
    ],
    nextCursor: null,
    dropped: 1,
    lastReceivedAt: now,
  };
  const request = async (path) => {
    requested = path;
    return page;
  };
  const output = capture(true);
  await runLogsCommand(['--level', 'error', '--range', '1h'], output.output, context, request);
  const url = new URL(requested, context.origin);
  assert.equal(url.searchParams.get('environment'), 'staging');
  assert.equal(url.searchParams.get('level'), 'error');
  assert.equal(url.searchParams.get('range'), '1h');
  assert.ok(!output.read().includes('\u001b'));
  assert.match(output.read(), /redacted failure next/);
  assert.match(output.read(), /1 entries were dropped/);
  const json = capture();
  await runLogsCommand(['--environment', 'production'], json.output, context, async (path) => ({
    ...page,
    environment: 'production',
    entries: [],
  }));
  assert.equal(json.read().logs.environment, 'production');
});
