import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { canonicalCliJson } from '../dist/contracts/cli-transport.js';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPlatformCommand } from '../dist/platform-command.js';
import {
  platformOrigin,
  readPrivate,
  writePrivate,
  runCredentialProcess,
  secretStore,
} from '../dist/platform-state.js';

const origin = 'https://platform.example';
const principalId = 'a0b9d370-073d-4cf3-ab6c-4aaa03726b91';
const projectId = '54fa830a-bb84-42e4-aefc-39469e6ffbb5';
const teamId = '184ac54c-75c2-4716-bc98-fb467fe0779f';
const token = 'acl_' + 'a'.repeat(64);
const expiresAt = '2099-01-01T00:00:00.000Z';
const actor = { protocol: 1, principalId, name: 'Fixture developer', teamId };
const credentials = { protocol: 1, token, expiresAt, origin };
const device = {
  device_code: ['fixture', 'private', 'device', 'secret'].join('-'),
  user_code: 'ABCD-EFGH',
  verification_uri: origin + '/connect',
  verification_uri_complete: origin + '/connect?code=ABCD-EFGH',
  expires_in: 300,
  interval: 1,
};
const args = (...values) => [...values, '--api-url', origin];
const store = (value = credentials) => ({
  read: async () => value,
  write: async () => {},
  clear: async () => {},
});
const capture = (capabilities = {}) => {
  const result = { out: '', err: '' };
  result.io = {
    out: {
      write: (text) => {
        result.out += text;
      },
    },
    err: {
      write: (text) => {
        result.err += text;
      },
    },
    stdinTTY: false,
    stdoutTTY: false,
    stderrTTY: false,
    ci: false,
    ...capabilities,
  };
  return result;
};
async function fixture(t) {
  const old = process.cwd();
  const root = await realpath(await mkdtemp(join(tmpdir(), 'anhedral-platform-ux-')));
  process.chdir(root);
  t.after(async () => {
    process.chdir(old);
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

test('Platform retains compact default JSON and existing whoami shape, with opt-in human output', async () => {
  for (const mode of [{}, { json: true }, { human: true }]) {
    const output = capture();
    await runPlatformCommand(
      'whoami',
      args(),
      { ...mode, io: output.io },
      {
        store: store(),
        fetch: async () => Response.json({ ...actor, ignoredSecret: token }),
      },
    );
    if (mode.human) {
      assert.match(output.out, /Signed in as Fixture developer/);
      assert.match(output.out, /API origin: https:\/\/platform.example/);
    } else assert.equal(output.out, JSON.stringify({ ...actor, origin, expiresAt }) + '\n');
    assert.equal(output.err, '');
    assert.ok(!output.out.includes(token));
    assert.ok(!output.out.includes('ignoredSecret'));
  }
});

test('quiet suppresses implicit Platform output while explicit JSON survives', async (t) => {
  await fixture(t);
  for (const mode of [{ quiet: true }, { quiet: true, human: true }, { quiet: true, json: true }]) {
    const output = capture();
    await runPlatformCommand('unlink', [], { ...mode, io: output.io });
    assert.equal(output.out, mode.json ? '{"status":"unlinked"}\n' : '');
    assert.equal(output.err, '');
  }
});

test('noninteractive login returns approval instructions without polling or leaking device secrets', async () => {
  for (const mode of [
    { capabilities: {} },
    { capabilities: { stdinTTY: true, stdoutTTY: false } },
    { capabilities: { stdinTTY: false, stdoutTTY: true } },
    { capabilities: { stdinTTY: true, stdoutTTY: true, ci: true } },
    { capabilities: { stdinTTY: true, stdoutTTY: true }, options: { nonInteractive: true } },
    { capabilities: { stdinTTY: true, stdoutTTY: true }, options: { json: true } },
  ]) {
    const output = capture(mode.capabilities);
    let calls = 0;
    await runPlatformCommand(
      'login',
      args(),
      { ...mode.options, io: output.io },
      {
        store: store(null),
        fetch: async () => {
          calls++;
          return Response.json(device);
        },
        sleep: async () => {
          throw Error('must not poll');
        },
      },
    );
    assert.equal(calls, 1);
    assert.equal(JSON.parse(output.out).status, 'authorization_required');
    assert.equal(JSON.parse(output.out).verificationUrl, device.verification_uri_complete);
    assert.ok(!output.out.includes(device.device_code));
    assert.equal(output.err, '');
  }
});

test('interactive default login retains stderr approval guidance and final JSON; resume works headlessly', async () => {
  for (const resume of [false, true]) {
    const output = capture({ stdinTTY: !resume, stdoutTTY: !resume });
    const pending = { origin, device, expiresAt: Date.now() + 300000 };
    let calls = 0;
    await runPlatformCommand(
      'login',
      args(...(resume ? ['--resume'] : [])),
      { json: resume, io: output.io },
      {
        store: store(resume ? pending : null),
        sleep: async () => {},
        fetch: async (url) => {
          calls++;
          return Response.json(url.endsWith('/code') ? device : { protocol: 1, token, expiresAt });
        },
      },
    );
    assert.equal(calls, resume ? 1 : 2);
    assert.equal(JSON.parse(output.out).status, 'authenticated');
    assert.equal(output.err.includes(device.verification_uri_complete), !resume);
    assert.ok(!output.out.includes(token));
    assert.ok(!output.err.includes(device.device_code));
  }
});

test('invalid API origins and link selectors are usage errors before credentials or network', async () => {
  for (const value of [
    'invalid',
    'http://example.com',
    'https://user:secret@example.com',
    'https://example.com/path',
  ])
    assert.throws(
      () => platformOrigin(value),
      (error) => error.code === 'INVALID_ARGUMENT' && !error.message.includes('secret'),
    );
  let accessed = false;
  await assert.rejects(
    runPlatformCommand(
      'link',
      args('--project', 'typo', '--team', teamId),
      {},
      {
        store: {
          ...store(),
          read: async () => {
            accessed = true;
            return credentials;
          },
        },
        fetch: async () => {
          accessed = true;
          throw Error('unexpected network');
        },
      },
    ),
    (error) => error.code === 'INVALID_ARGUMENT',
  );
  assert.equal(accessed, false);
});

test('network, auth, permission and conflict errors retain legacy code with typed recovery', async () => {
  for (const [status, category, retryable] of [
    [401, 'auth', false],
    [403, 'permission', false],
    [409, 'conflict', false],
    [429, 'network', true],
    [503, 'network', true],
  ]) {
    await assert.rejects(
      runPlatformCommand(
        'whoami',
        args(),
        {},
        {
          store: store(),
          fetch: async () => Response.json({ error: token }, { status }),
        },
      ),
      (error) =>
        error.code === 'PLATFORM_ACCESS_FAILED' &&
        error.category === category &&
        error.retryable === retryable &&
        !error.message.includes(token),
    );
  }
  await assert.rejects(
    runPlatformCommand(
      'whoami',
      args(),
      {},
      {
        store: store(),
        fetch: async () => {
          throw Error(token);
        },
      },
    ),
    (error) =>
      error.code === 'PLATFORM_ACCESS_FAILED' &&
      error.category === 'network' &&
      error.retryable &&
      !error.message.includes(token),
  );
});

test('invalid protocol payloads and malformed private state produce safe errors', async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    runPlatformCommand(
      'whoami',
      args(),
      {},
      {
        store: store(),
        fetch: async () => Response.json({ protocol: 2, token }),
      },
    ),
    (error) =>
      error.code === 'PLATFORM_ACCESS_FAILED' &&
      !error.message.includes(token) &&
      !error.message.includes('expected'),
  );
  await writePrivate(join(root, 'state.json'), {});
  await writeFile(join(root, 'state.json'), '{"secret":' + token);
  await assert.rejects(
    readPrivate(join(root, 'state.json')),
    (error) => error.category === 'context' && !error.message.includes(token),
  );
});

test('whoami context labels live identity and saved project provenance without changing default shape', async (t) => {
  const root = await fixture(t);
  const project = { protocol: 1, projectId, principalId, teamId, name: 'Fixture project', origin };
  await writePrivate(join(root, '.anhedral/platform/project.json'), project);
  const output = capture();
  await runPlatformCommand(
    'whoami',
    args('--context'),
    { json: true, io: output.io },
    {
      store: store(),
      fetch: async () => Response.json(actor),
    },
  );
  const result = JSON.parse(output.out);
  assert.equal(result.context.identityVerification, 'live-platform');
  assert.deepEqual(result.context.apiOrigin, { value: origin, source: 'flag' });
  assert.equal(result.context.credential.kind, 'injected');
  assert.equal(result.context.project.projectId, projectId);
  assert.equal(result.context.project.verification, 'saved-local-link');
  assert.equal(result.context.project.access, 'not-verified');
  assert.ok(!output.out.includes(token));
  assert.equal(output.err, '');
});

test('whoami context fails closed on a saved link for a different identity or API origin', async (t) => {
  const root = await fixture(t);
  for (const mismatch of [{ principalId: projectId }, { origin: 'https://other.example' }]) {
    await writePrivate(join(root, '.anhedral/platform/project.json'), {
      protocol: 1,
      projectId,
      principalId,
      teamId,
      name: 'Other project',
      origin,
      ...mismatch,
    });
    const output = capture();
    await assert.rejects(
      runPlatformCommand(
        'whoami',
        args('--context'),
        { json: true, io: output.io },
        {
          store: store(),
          fetch: async () => Response.json(actor),
        },
      ),
      (error) => error.code === 'PLATFORM_ACCESS_FAILED' && error.category === 'context',
    );
    assert.equal(output.out, '');
  }
});

test('environment, staging and log selectors fail before credentials, input or network', async () => {
  for (const [command, values] of [
    ['staging', ['deploy', '--candidate', 'typo']],
    ['staging', ['deploy']],
    ['staging', ['status', '--new']],
    ['logs', ['--deployment', 'typo']],
    ['logs', ['--cursor', 'x'.repeat(513)]],
    ['env', ['import', '--file', '/missing-private-file']],
    ['env', ['import', '--environment', 'staging']],
    ['env', ['set', 'invalid-name', '--environment', 'staging', '--stdin']],
    ['env', ['list', '--file', '/missing-private-file']],
  ]) {
    let accessed = false;
    await assert.rejects(
      runPlatformCommand(
        command,
        args(...values),
        {},
        {
          store: {
            ...store(),
            read: async () => {
              accessed = true;
              return credentials;
            },
          },
          fetch: async () => {
            accessed = true;
            throw Error('unexpected network');
          },
        },
      ),
      (error) => error.code === 'INVALID_ARGUMENT',
    );
    assert.equal(accessed, false, command + ' ' + values.join(' '));
  }
});

test('logout reports revoked access separately when local credential removal fails', async () => {
  const output = capture();
  let revoked = false;
  await assert.rejects(
    runPlatformCommand(
      'logout',
      args(),
      { json: true, io: output.io },
      {
        store: {
          ...store(),
          clear: async () => {
            throw Error('private backend details');
          },
        },
        fetch: async (url) => {
          assert.ok(url.endsWith('/auth/logout'));
          revoked = true;
          return Response.json({ revoked: true });
        },
      },
    ),
    (error) =>
      error.code === 'PLATFORM_ACCESS_FAILED' &&
      /revoked.*could not be removed/.test(error.message) &&
      !error.message.includes('private backend'),
  );
  assert.equal(revoked, true);
  assert.equal(output.out, '');
});

test('credential helper bounds stalled processes and preserves ordinary completion', async () => {
  assert.equal(
    await runCredentialProcess(
      process.execPath,
      ['-e', 'process.stdout.write("safe result")'],
      '',
      5000,
    ),
    'safe result',
  );
  await assert.rejects(
    runCredentialProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], '', 50),
    /timed out/,
  );
  await assert.rejects(
    runCredentialProcess(process.execPath, ['-e', 'process.exit(2)'], '', 5000),
    /could not be accessed/,
  );
  await assert.rejects(
    runCredentialProcess('/nonexistent-anhedral-credential-helper', [], '', 5000),
    /unavailable/,
  );
  await assert.rejects(
    runCredentialProcess(
      process.execPath,
      ['-e', 'process.stdout.write("x".repeat(65537))'],
      '',
      5000,
    ),
    /too much data/,
  );
});

test('OS credential clear propagates backend failures and accepts successful deletion', async () => {
  if (!['darwin', 'linux'].includes(process.platform)) return;
  const commands = [];
  const success = secretStore(origin, undefined, async (binary, values) => {
    commands.push([binary, values]);
    return '';
  });
  await success.clear();
  assert.equal(commands.length, 1);
  assert.ok(
    commands[0][1].includes(process.platform === 'darwin' ? 'delete-generic-password' : 'clear'),
  );
  const failure = secretStore(origin, undefined, async () => {
    throw Error('simulated credential service failure');
  });
  await assert.rejects(failure.clear(), /simulated credential service failure/);
});

test('prepare and status accept a ready server candidate without activating deployment', async (t) => {
  await fixture(t);
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
    projectId,
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
    expiresAt,
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
  const receipt = {
    protocol: 1,
    planId: plan.id,
    planDigest: plan.digest,
    candidateId: crypto.randomUUID(),
    sourceRevision: plan.sourceRevision,
    state: 'ready',
    hostedAdmission: true,
    identityAction: 'preserve',
  };
  await writePrivate(join(process.cwd(), '.anhedral/platform/project.json'), {
    protocol: 1,
    origin,
    principalId,
    projectId,
    teamId,
    name: 'Fixture project',
  });
  await writePrivate(join(process.cwd(), '.anhedral/platform/deployment.json'), {
    origin,
    principalId,
    projectId,
    planInput: input,
    plan,
  });
  const calls = [];
  const fetch = async (url, init) => {
    calls.push([url, init.method]);
    if (url.endsWith('/actor')) return Response.json(actor);
    if (url.endsWith('/candidates') || url.endsWith('/candidates/' + receipt.candidateId))
      return Response.json(receipt);
    throw Error('unexpected endpoint');
  };
  for (const operation of ['prepare', 'status']) {
    const output = capture();
    await runPlatformCommand(
      'deploy',
      args(operation),
      { json: true, io: output.io },
      { store: store(), fetch },
    );
    assert.deepEqual(JSON.parse(output.out), receipt);
  }
  assert.deepEqual(
    calls.map(([url]) => new URL(url).pathname),
    [
      '/api/cli/v1/actor',
      '/api/cli/v1/candidates',
      '/api/cli/v1/actor',
      '/api/cli/v1/candidates/' + receipt.candidateId,
    ],
  );
});
