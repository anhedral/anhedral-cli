import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, realpath, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runProductionCommand, validateProductionArguments } from '../dist/platform-production.js';
import { commandHelp } from '../dist/registry/usage.js';
import { writePrivate } from '../dist/platform-state.js';
import { validateCommand } from '../dist/cli-arguments.js';
const context = {
  origin: 'https://platform.anhedral.com',
  principalId: crypto.randomUUID(),
  projectId: crypto.randomUUID(),
  teamId: crypto.randomUUID(),
};
const candidateId = crypto.randomUUID(),
  deploymentId = crypto.randomUUID();
const args = ['deploy', '--candidate', candidateId, '--name', 'workflow-prototype'];
function capture(human = false) {
  let out = '';
  return {
    output: {
      json: !human,
      human,
      io: {
        out: {
          write: (v) => {
            out += v;
          },
        },
        err: { write() {} },
        stdinTTY: false,
        stdoutTTY: human,
        stderrTTY: human,
      },
    },
    read: () => (human ? out : JSON.parse(out.trim())),
  };
}
const state = (generation = 3) => ({
  enabled: true,
  canDeploy: true,
  requiresIndependentApproval: false,
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
    environment: 'production',
  },
});
async function fixture(t) {
  const previous = process.cwd(),
    root = await realpath(await mkdtemp(join(tmpdir(), 'anhedral-production-cli-')));
  process.chdir(root);
  t.after(async () => {
    process.chdir(previous);
    await rm(root, { recursive: true, force: true });
  });
  return root;
}
test('production exposes explicit candidate/name intent and rejects invalid or status-only options', () => {
  validateCommand('production', args);
  assert.match(commandHelp('production deploy'), /--candidate/);
  assert.match(commandHelp('production deploy'), /--name/);
  assert.throws(() => validateProductionArguments(['deploy', '--candidate', candidateId]));
  assert.throws(() => validateProductionArguments(['status', '--name', 'workflow-prototype']));
  assert.throws(() =>
    validateProductionArguments(['deploy', '--candidate', candidateId, '--name', '../escape']),
  );
});
test('production safely resumes a lost acknowledgement with the same request and configuration fence', async (t) => {
  const root = await fixture(t),
    requests = [];
  let acknowledged = false,
    reads = 0,
    saved;
  const request = async (_path, method, input) => {
    if (method === 'GET') {
      reads++;
      return state();
    }
    requests.push(input);
    saved ??= receipt(input);
    if (!acknowledged) throw Error('acknowledgement interrupted');
    return saved;
  };
  await assert.rejects(
    runProductionCommand(args, capture().output, context, request),
    /interrupted/,
  );
  acknowledged = true;
  const output = capture();
  await runProductionCommand(args, output.output, context, request);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(reads, 1);
  assert.equal(output.read().deployment.id, deploymentId);
  const local = JSON.parse(
    await readFile(join(root, '.anhedral/platform/production.json'), 'utf8'),
  );
  assert.deepEqual(local.receipt, saved);
  await assert.rejects(
    runProductionCommand(
      args,
      capture().output,
      { ...context, teamId: crypto.randomUUID() },
      request,
    ),
    /different identity, team or project/,
  );
  await assert.rejects(
    runProductionCommand(
      ['deploy', '--candidate', candidateId, '--name', 'other-name'],
      capture().output,
      context,
      request,
    ),
    /candidate or name differs/,
  );
  const replay = capture();
  await runProductionCommand(args, replay.output, context, request);
  assert.equal(replay.read().status, 'already_requested');
  assert.equal(requests.length, 2);
});
test('production refuses independent-review policy or missing authority before sending a deployment', async (t) => {
  await fixture(t);
  for (const change of [
    { requiresIndependentApproval: true },
    { canDeploy: false },
    { enabled: false },
  ]) {
    let writes = 0;
    await assert.rejects(
      runProductionCommand(args, capture().output, context, async (_path, method) => {
        if (method !== 'GET') writes++;
        return { ...state(), ...change };
      }),
      /independent production approver|production permission/,
    );
    assert.equal(writes, 0);
  }
});
test('production rejects another-project history and receipts while retaining pending state', async (t) => {
  const root = await fixture(t);
  const request = async (_path, method, input) =>
    method === 'GET' ? state() : { ...receipt(input), developmentId: crypto.randomUUID() };
  await assert.rejects(
    runProductionCommand(args, capture().output, context, request),
    /receipt differs/,
  );
  const local = JSON.parse(
    await readFile(join(root, '.anhedral/platform/production.json'), 'utf8'),
  );
  assert.equal(local.receipt, undefined);
  local.receipt = { ...receipt(local.input), generation: 30 };
  await writePrivate(join(root, '.anhedral/platform/production.json'), local);
  await assert.rejects(
    runProductionCommand([...args, '--new'], capture().output, context, request),
    /Saved production receipt differs/,
  );
});
test('production status retains explicit policy feedback and validates project identity', async (t) => {
  await fixture(t);
  const output = capture(true);
  await runProductionCommand(['status'], output.output, context, async () => ({
    ...state(),
    requiresIndependentApproval: true,
  }));
  assert.match(output.read(), /independent production approver/);
  const entry = {
    id: deploymentId,
    developmentId: crypto.randomUUID(),
    candidateId,
    requestId: crypto.randomUUID(),
    generation: 2,
    status: 'published',
    sourceRevision: 'b'.repeat(64),
    createdAt: '2026-11-05T00:00:00Z',
    updatedAt: '2026-11-05T00:00:00Z',
  };
  await assert.rejects(
    runProductionCommand(['status'], capture().output, context, async () => ({
      ...state(),
      deployments: [entry],
    })),
    /another project/,
  );
});

test('production command authenticates through the CLI router and binds the selected team', async (t) => {
  await fixture(t);
  const { runPlatformCommand } = await import('../dist/platform-command.js');
  await writePrivate(join(process.cwd(), '.anhedral/platform/project.json'), {
    protocol: 1,
    ...context,
    name: 'Workflow Prototype',
  });
  const token = 'acl_' + 'a'.repeat(64),
    calls = [];
  const output = capture();
  await runPlatformCommand('production', ['status', '--api-url', context.origin], output.output, {
    store: {
      read: async () => ({
        protocol: 1,
        origin: context.origin,
        token,
        expiresAt: '2099-01-01T00:00:00Z',
      }),
      write: async () => {},
      clear: async () => {},
    },
    fetch: async (url, init) => {
      calls.push([new URL(url).pathname, init]);
      if (url.endsWith('/actor'))
        return Response.json({
          protocol: 1,
          principalId: context.principalId,
          name: 'Fixture owner',
          teamId: context.teamId,
        });
      return Response.json(state());
    },
  });
  assert.equal(output.read().projectId, context.projectId);
  assert.deepEqual(
    calls.map(([path]) => path),
    ['/api/cli/v1/actor', `/api/cli/v1/projects/${context.projectId}/production`],
  );
  assert.equal(calls[1][1].headers.authorization, `Bearer ${token}`);
  assert.equal(calls[1][1].headers['x-anhedral-team'], context.teamId);
});

test('deploy preserves bounded compatibility errors from the server instead of requiring another plan', async (t) => {
  await fixture(t);
  const { runPlatformCommand } = await import('../dist/platform-command.js');
  const { canonicalCliJson } = await import('../dist/contracts/cli-transport.js');
  const { createHash } = await import('node:crypto');
  const { readFileSync } = await import('node:fs');
  const manifest = JSON.parse(
    readFileSync(new URL('./fixtures/deployment-contract/fixtures.json', import.meta.url)),
  ).manifest;
  const input = {
    protocol: 1,
    requestId: crypto.randomUUID(),
    uploadId: crypto.randomUUID(),
    manifest,
  };
  const unsigned = {
    protocol: 1,
    id: crypto.randomUUID(),
    requestId: input.requestId,
    projectId: context.projectId,
    uploadId: input.uploadId,
    manifest,
    sourceRevision: 'b'.repeat(64),
    inventoryDigest: 'c'.repeat(64),
    lockDigest: 'd'.repeat(64),
    routing: { generation: 0, activeReleaseId: null, desiredReleaseId: null },
    routingRevision: 'e'.repeat(64),
    expectedGeneration: 0,
    policyDigest: 'f'.repeat(64),
    migrationDigests: [],
    expiresAt: '2099-01-01T00:00:00Z',
    runtimeImage: null,
    configurationRevision: null,
    artifactVerified: false,
    hostedAdmission: false,
    identityAction: 'preserve',
    blockers: ['HOSTED_ADMISSION_DISABLED', 'ARTIFACT_UNREVIEWED', 'CONFIGURATION_UNVERIFIED'],
  };
  const plan = {
    ...unsigned,
    digest: createHash('sha256').update(canonicalCliJson(unsigned)).digest('hex'),
  };
  await writePrivate(join(process.cwd(), '.anhedral/platform/project.json'), {
    protocol: 1,
    ...context,
    name: 'Workflow Prototype',
  });
  await writePrivate(join(process.cwd(), '.anhedral/platform/deployment.json'), {
    origin: context.origin,
    principalId: context.principalId,
    projectId: context.projectId,
    planInput: input,
    plan,
  });
  const dependencies = {
    store: {
      read: async () => ({
        protocol: 1,
        origin: context.origin,
        token: 'acl_' + 'a'.repeat(64),
        expiresAt: '2099-01-01T00:00:00Z',
      }),
      write: async () => {},
      clear: async () => {},
    },
    fetch: async (url) =>
      url.endsWith('/actor')
        ? Response.json({
            protocol: 1,
            principalId: context.principalId,
            name: 'Fixture owner',
            teamId: context.teamId,
          })
        : Response.json(
            {
              error:
                '[DEPENDENCY_LOCK_MISMATCH] Use the supported dependency composition while preserving authored source.',
            },
            { status: 409 },
          ),
  };
  await assert.rejects(
    runPlatformCommand(
      'deploy',
      ['prepare', '--api-url', context.origin],
      capture().output,
      dependencies,
    ),
    (error) => {
      assert.match(error.message, /DEPENDENCY_LOCK_MISMATCH/);
      assert.doesNotMatch(error.message, /plan is stale/);
      return true;
    },
  );
});

test('concurrent production commands cannot create competing local deployment identities', async (t) => {
  await fixture(t);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let entered;
  const ready = new Promise((resolve) => {
    entered = resolve;
  });
  let writes = 0;
  const request = async (_path, method, input) => {
    if (method === 'GET') {
      entered();
      await gate;
      return state();
    }
    writes++;
    return receipt(input);
  };
  const first = runProductionCommand(args, capture().output, context, request);
  await ready;
  try {
    await assert.rejects(
      runProductionCommand(args, capture().output, context, request),
      /workspace lock/,
    );
  } finally {
    release();
  }
  await first;
  assert.equal(writes, 1);
});

test('new signed plans render actionable diagnostics and do not retry an incompatible preparation', async (t) => {
  await fixture(t);
  const { runPlatformCommand } = await import('../dist/platform-command.js');
  const { canonicalCliJson } = await import('../dist/contracts/cli-transport.js');
  const { createHash } = await import('node:crypto');
  const { readFileSync } = await import('node:fs');
  const manifest = JSON.parse(
    readFileSync(new URL('./fixtures/deployment-contract/fixtures.json', import.meta.url)),
  ).manifest;
  const input = {
    protocol: 1,
    requestId: crypto.randomUUID(),
    uploadId: crypto.randomUUID(),
    manifest,
  };
  const diagnostic = {
    code: 'SOURCE_VERSION_MISMATCH',
    message: 'Source generator differs from this runtime.',
    action:
      'Adopt the supported composition while preserving authored files, then upload the changed source.',
  };
  const unsigned = {
    protocol: 1,
    id: crypto.randomUUID(),
    requestId: input.requestId,
    projectId: context.projectId,
    uploadId: input.uploadId,
    manifest,
    sourceRevision: 'b'.repeat(64),
    inventoryDigest: 'c'.repeat(64),
    lockDigest: 'd'.repeat(64),
    routing: { generation: 0, activeReleaseId: null, desiredReleaseId: null },
    routingRevision: 'e'.repeat(64),
    expectedGeneration: 0,
    policyDigest: 'f'.repeat(64),
    migrationDigests: [],
    expiresAt: '2099-01-01T00:00:00Z',
    runtimeImage: null,
    configurationRevision: null,
    artifactVerified: false,
    hostedAdmission: false,
    identityAction: 'preserve',
    blockers: [diagnostic.code],
    admission: {
      version: 1,
      expectedCliArtifact: manifest.cliArtifact,
      supportedCompositions: [],
      diagnostics: [diagnostic],
    },
  };
  const plan = {
    ...unsigned,
    digest: createHash('sha256').update(canonicalCliJson(unsigned)).digest('hex'),
  };
  await writePrivate(join(process.cwd(), '.anhedral/platform/project.json'), {
    protocol: 1,
    ...context,
    name: 'Workflow Prototype',
  });
  await writePrivate(join(process.cwd(), '.anhedral/platform/deployment.json'), {
    origin: context.origin,
    principalId: context.principalId,
    projectId: context.projectId,
    planInput: input,
    plan,
  });
  const calls = [];
  const dependencies = {
    store: {
      read: async () => ({
        protocol: 1,
        origin: context.origin,
        token: 'acl_' + 'a'.repeat(64),
        expiresAt: '2099-01-01T00:00:00Z',
      }),
      write: async () => {},
      clear: async () => {},
    },
    fetch: async (url) => {
      calls.push(url);
      return Response.json(
        url.endsWith('/actor')
          ? {
              protocol: 1,
              principalId: context.principalId,
              name: 'Fixture owner',
              teamId: context.teamId,
            }
          : plan,
      );
    },
  };
  const output = capture(true);
  await runPlatformCommand(
    'deploy',
    ['status', '--api-url', context.origin],
    output.output,
    dependencies,
  );
  assert.match(output.read(), /SOURCE_VERSION_MISMATCH/);
  assert.match(output.read(), /preserving authored files/);
  await assert.rejects(
    runPlatformCommand(
      'deploy',
      ['prepare', '--api-url', context.origin],
      capture().output,
      dependencies,
    ),
    (error) => {
      assert.match(error.message, /SOURCE_VERSION_MISMATCH/);
      assert.match(error.nextAction, /preserving authored files/);
      return true;
    },
  );
  assert.equal(
    calls.some((url) => url.endsWith('/candidates')),
    false,
  );
});

test('production permission revocation during POST names the deployment policy instead of build access', async (t) => {
  await fixture(t);
  const { runPlatformCommand } = await import('../dist/platform-command.js');
  await writePrivate(join(process.cwd(), '.anhedral/platform/project.json'), {
    protocol: 1,
    ...context,
    name: 'Workflow Prototype',
  });
  const dependencies = {
    store: {
      read: async () => ({
        protocol: 1,
        origin: context.origin,
        token: 'acl_' + 'a'.repeat(64),
        expiresAt: '2099-01-01T00:00:00Z',
      }),
      write: async () => {},
      clear: async () => {},
    },
    fetch: async (url, init) => {
      if (url.endsWith('/actor'))
        return Response.json({
          protocol: 1,
          principalId: context.principalId,
          name: 'Fixture owner',
          teamId: context.teamId,
        });
      if (init.method === 'GET') return Response.json(state());
      return Response.json({ error: 'Production permission changed.' }, { status: 403 });
    },
  };
  await assert.rejects(
    runPlatformCommand(
      'production',
      [...args, '--api-url', context.origin],
      capture().output,
      dependencies,
    ),
    (error) => {
      assert.match(error.message, /production permission or team approval policy/);
      assert.doesNotMatch(error.message, /build access/);
      assert.match(error.nextAction, /production status/);
      assert.equal(error.category, 'permission');
      return true;
    },
  );
});
