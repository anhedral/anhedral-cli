import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPlatformCommand } from '../dist/platform-command.js';
import { platformOrigin, readPrivate, writePrivate } from '../dist/platform-state.js';

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
