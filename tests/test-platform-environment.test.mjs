import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mkdtemp,
  realpath,
  writeFile,
  chmod,
  readFile,
  symlink,
  rm,
  readdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runEnvironmentCommand, readEnvironmentSecret } from '../dist/platform-environment.js';
import { runPlatformCommand } from '../dist/platform-command.js';
import { readPrivate, writePrivate } from '../dist/platform-state.js';
import { validateCommand } from '../dist/cli-arguments.js';
import { commandHelp } from '../dist/registry/usage.js';
import { validatePluginRemote } from '../scripts/plugin-remote.mjs';
const context = {
  origin: 'https://platform.anhedral.com',
  principalId: '11111111-1111-4111-8111-111111111111',
  projectId: '22222222-2222-4222-8222-222222222222',
  teamId: '33333333-3333-4333-8333-333333333333',
};
async function directory() {
  return realpath(await mkdtemp(join(tmpdir(), 'anhedral-env-')));
}
async function capture(run) {
  const original = console.log,
    output = [];
  console.log = (value) => output.push(value);
  try {
    await run();
    return output.map((value) => JSON.parse(value));
  } finally {
    console.log = original;
  }
}
const input = () =>
  Promise.resolve(
    new TextEncoder().encode('NEXT_PUBLIC_TITLE=Hello\nCUSTOM_SECRET=fixture_private_value\n'),
  );
const receipt = (body) => ({
  requestId: body.requestId,
  imported: body.variables.map((item) => ({
    name: item.name,
    kind: item.kind,
    environment: body.environment,
    version: item.expectedVersion + 1,
  })),
});

test('environment command help and validation never accept inline values', () => {
  assert.match(commandHelp('env import'), /--stdin/);
  assert.match(commandHelp('env set'), /--environment/);
  validateCommand('env', ['set', 'CUSTOM_KEY', '--environment', 'staging', '--stdin']);
  assert.throws(() =>
    validateCommand('env', [
      'set',
      'CUSTOM_KEY',
      'secret-value',
      '--environment',
      'staging',
      '--stdin',
    ]),
  );
  assert.throws(() => validateCommand('env', ['set', 'CUSTOM_KEY', '--value', 'secret-value']));
});
test('dry run validates private files locally and emits metadata without state or authentication', async () => {
  const root = await directory();
  const file = join(root, '.env.local');
  await writeFile(file, 'CUSTOM_SECRET=fixture_private_value\n', { mode: 0o600 });
  try {
    const output = await capture(() =>
      runPlatformCommand(
        'env',
        ['import', '--environment', 'staging', '--file', file, '--dry-run'],
        { json: true },
        {
          store: {
            read: async () => {
              throw Error('must not authenticate');
            },
          },
        },
      ),
    );
    assert.equal(output[0].status, 'dry_run');
    assert.ok(!JSON.stringify(output).includes('fixture_private_value'));
    assert.deepEqual(await readdir(root), ['.env.local']);
    await chmod(file, 0o644);
    await assert.rejects(
      runEnvironmentCommand(['import', '--environment', 'staging', '--file', file, '--dry-run'], {
        json: true,
      }),
      /owner-only/,
    );
    await chmod(file, 0o600);
    await symlink(file, join(root, 'alias'));
    assert.throws(() => readEnvironmentSecret(join(root, 'alias')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('imports retry the exact request and keep values out of disk and output; context and receipts are bound', async () => {
  const root = await directory(),
    old = process.cwd();
  process.chdir(root);
  const calls = [];
  let fail = true;
  const request = async (path, method, body) => {
    if (method === 'GET') return { variables: [] };
    calls.push(body);
    if (fail) {
      fail = false;
      throw Error('lost acknowledgement');
    }
    return receipt(body);
  };
  const args = ['import', '--environment', 'staging', '--stdin'];
  try {
    await assert.rejects(
      runEnvironmentCommand(args, { json: true }, context, request, input),
      /lost acknowledgement/,
    );
    const statePath = join(root, '.anhedral/platform/environment-staging.json');
    const saved = await readPrivate(statePath);
    assert.ok(!JSON.stringify(saved).includes('fixture_private_value'));
    assert.equal(saved.teamId, context.teamId);
    const output = await capture(() =>
      runEnvironmentCommand(args, { json: true }, context, request, input),
    );
    assert.equal(output[0].status, 'imported');
    assert.equal(calls[0].requestId, calls[1].requestId);
    assert.equal(calls[1].variables[0].kind, 'secret');
    assert.equal(calls[1].variables[1].kind, 'config');
    assert.ok(!JSON.stringify(output).includes('fixture_private_value'));
    assert.ok(!(await readFile(statePath, 'utf8')).includes('fixture_private_value'));
    const replay = await capture(() =>
      runEnvironmentCommand(args, { json: true }, context, request, input),
    );
    assert.equal(replay[0].status, 'already_imported');
    assert.equal(calls.length, 2);
    await assert.rejects(
      runEnvironmentCommand(
        args,
        { json: true },
        { ...context, teamId: crypto.randomUUID() },
        request,
        input,
      ),
      /different identity or project/,
    );
    await writePrivate(statePath, { ...(await readPrivate(statePath)), environment: 'production' });
    await assert.rejects(
      runEnvironmentCommand(args, { json: true }, context, request, input),
      /different identity or project/,
    );
  } finally {
    process.chdir(old);
    await rm(root, { recursive: true, force: true });
  }
});
test('replacement is explicit and receipts must advance each exact version', async () => {
  const root = await directory(),
    old = process.cwd();
  process.chdir(root);
  let posted = 0;
  const request = async (path, method, body) => {
    if (method === 'GET')
      return {
        variables: [
          {
            name: 'CUSTOM_SECRET',
            kind: 'secret',
            environment: 'production',
            version: 8,
            note: '',
          },
        ],
      };
    posted++;
    assert.equal(body.variables[0].expectedVersion, 8);
    const result = receipt(body);
    if (posted === 1) result.imported[0].version = 10;
    return result;
  };
  const args = ['set', 'CUSTOM_SECRET', '--environment', 'production', '--stdin'];
  const read = () => Promise.resolve(new TextEncoder().encode('fixture_private_value'));
  try {
    await assert.rejects(
      runEnvironmentCommand(args, { json: true }, context, request, read),
      /--replace/,
    );
    assert.equal(posted, 0);
    await assert.rejects(
      runEnvironmentCommand([...args, '--replace'], { json: true }, context, request, read),
      /receipt differs/,
    );
    const output = await capture(() =>
      runEnvironmentCommand([...args, '--replace'], { json: true }, context, request, read),
    );
    assert.equal(output[0].imported[0].version, 9);
  } finally {
    process.chdir(old);
    await rm(root, { recursive: true, force: true });
  }
});
test('remote plugin configuration admits only the reviewed HTTPS server without executable or credential fields', async () => {
  const config = JSON.parse(
    await readFile(new URL('../plugins/codex/distribution/mcp.json', import.meta.url), 'utf8'),
  );
  validatePluginRemote(config);
  for (const change of [
    { url: 'https://evil.invalid/mcp' },
    { headers: { Authorization: 'Bearer fixture' } },
    { command: 'node' },
  ])
    assert.throws(() =>
      validatePluginRemote({
        ...config,
        mcpServers: { anhedral: { ...config.mcpServers.anhedral, ...change } },
      }),
    );
});

test('new imports accept the monotonic version of a recreated deleted variable', async () => {
  const root = await directory(),
    old = process.cwd();
  process.chdir(root);
  try {
    const request = async (path, method, body) =>
      method === 'GET'
        ? { variables: [] }
        : {
            requestId: body.requestId,
            imported: [{ name: 'CUSTOM_KEY', kind: 'secret', environment: 'staging', version: 7 }],
          };
    const output = await capture(() =>
      runEnvironmentCommand(
        ['set', 'CUSTOM_KEY', '--environment', 'staging', '--stdin'],
        { json: true },
        context,
        request,
        () => Promise.resolve(new TextEncoder().encode('fixture_private_value')),
      ),
    );
    assert.equal(output[0].imported[0].version, 7);
  } finally {
    process.chdir(old);
    await rm(root, { recursive: true, force: true });
  }
});
