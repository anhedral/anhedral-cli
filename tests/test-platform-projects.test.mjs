import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, realpath, rm, readdir, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runPlatformCommand } from '../dist/platform/command.js';
import { readPrivate, writePrivate } from '../dist/platform/state.js';
import { commandHelp } from '../dist/registry/usage.js';
import { validateCommand } from '../dist/cli-arguments.js';
const origin = 'https://platform.anhedral.com';
const principalId = '11111111-1111-4111-8111-111111111111';
const teamId = '22222222-2222-4222-8222-222222222222';
const otherId = '33333333-3333-4333-8333-333333333333';
const credential = {
  protocol: 1,
  origin,
  token: 'acl_' + 'a'.repeat(64),
  expiresAt: '2030-01-01T00:00:00Z',
};
async function fixture(run) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'anhedral-projects-')));
  const previous = process.cwd();
  process.chdir(root);
  try {
    await run(root);
  } finally {
    process.chdir(previous);
    await rm(root, { recursive: true, force: true });
  }
}
async function capture(run, json = true) {
  const original = console.log,
    lines = [];
  console.log = (line) => lines.push(line);
  try {
    await run();
  } finally {
    console.log = original;
  }
  return json ? lines.map((line) => JSON.parse(line)) : lines;
}
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
function server({
  actorTeam = teamId,
  principal = principalId,
  lose = false,
  corrupt = false,
  status = 200,
} = {}) {
  const calls = [];
  const fetch = async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ url, options, body });
    if (url.endsWith('/actor'))
      return response({ protocol: 1, principalId: principal, name: 'Person', teamId: actorTeam });
    if (url.includes('/projects?'))
      return response({
        protocol: 1,
        principalId: principal,
        team: actorTeam ? { id: options.headers['x-anhedral-team'] ?? teamId, name: 'Team' } : null,
        availableTeams: [{ id: teamId, name: 'Team' }],
        teamsTruncated: false,
        projects: actorTeam
          ? [
              {
                projectId: otherId,
                teamId: options.headers['x-anhedral-team'] ?? teamId,
                name: 'App',
                slug: 'app',
                canLink: true,
              },
            ]
          : [],
        nextCursor: actorTeam ? otherId : null,
      });
    if (url.endsWith('/link'))
      return response({
        protocol: 1,
        principalId: principal,
        projectId: body.projectId,
        teamId: body.teamId,
        name: 'App',
      });
    if (url.endsWith('/projects')) {
      if (lose) {
        lose = false;
        throw Error('lost response after server commit');
      }
      if (status !== 200) return response({ error: 'fixture' }, status);
      return response({
        protocol: 1,
        requestId: body.requestId,
        projectId: corrupt ? otherId : body.requestId,
        principalId: principal,
        teamId: options.headers['x-anhedral-team'] ?? teamId,
        name: body.name,
        slug: 'app',
        summary: body.summary,
        canLink: true,
        initialization: 'source-upload',
      });
    }
    throw Error('Unexpected path');
  };
  return { calls, fetch, store: { read: async () => credential } };
}
const run = (args, dependencies, output = { json: true }) =>
  runPlatformCommand('projects', args, output, dependencies);

test('projects help and parser expose current operations', () => {
  assert.match(commandHelp('projects create'), /--name/);
  assert.match(commandHelp('projects list'), /--cursor/);
  validateCommand('projects', ['create', '--name', 'App', '--link']);
  assert.throws(() => validateCommand('projects', ['delete']));
});
test('invalid project arguments and dry-run are offline and never save state', async () =>
  fixture(async (root) => {
    const dependencies = {
      store: {
        read: async () => {
          throw Error('credential read');
        },
      },
      fetch: async () => {
        throw Error('network');
      },
    };
    for (const args of [
      ['create'],
      ['create', '--name', '   '],
      ['create', '--name', 'x'.repeat(161)],
      ['create', '--name', 'App', '--summary', 'x'.repeat(2001)],
      ['create', '--name', 'App', '--limit', '1'],
      ['list', '--limit', '0'],
      ['list', '--limit', '101'],
      ['list', '--limit', '1.5'],
      ['list', '--cursor', 'bad'],
      ['list', '--team', 'bad'],
      ['list', '--name', 'App'],
      ['list', '--new'],
    ])
      await assert.rejects(run(args, dependencies), /Supply|Use|apply/);
    const [result] = await capture(() =>
      run(
        ['create', '--name', ' App ', '--summary', ' Summary ', '--dry-run', '--link'],
        dependencies,
      ),
    );
    assert.deepEqual(result, {
      status: 'dry_run',
      name: 'App',
      summary: 'Summary',
      teamId: null,
      link: true,
      initialization: 'source-upload',
    });
    assert.deepEqual(await readdir(root), []);
  }));
test('project listing binds pagination, selected team and response identity', async () =>
  fixture(async () => {
    const api = server();
    const [result] = await capture(() =>
      run(['list', '--team', otherId, '--limit', '2', '--cursor', otherId], api),
    );
    assert.equal(result.team.id, otherId);
    const call = api.calls.at(-1);
    assert.equal(call.options.headers['x-anhedral-team'], otherId);
    assert.match(call.url, new RegExp(`projects\\?limit=2&cursor=${otherId}$`));
    const original = api.fetch;
    api.fetch = async (...args) => {
      const res = await original(...args);
      if (args[0].includes('/projects?')) {
        const body = await res.json();
        body.principalId = otherId;
        return response(body);
      }
      return res;
    };
    await assert.rejects(run(['list'], api), /identity differs/);
    const noTeam = server({ actorTeam: null });
    const [discovery] = await capture(() => run(['list'], noTeam));
    assert.equal(discovery.team, null);
    assert.equal(discovery.availableTeams[0].id, teamId);
    await assert.rejects(run(['create', '--name', 'App'], noTeam), /No team is selected/);
  }));
test('create retries durable exact identity after lost response, rejects changed inputs/context, and supports explicit new', async () =>
  fixture(async (root) => {
    const api = server({ lose: true });
    await assert.rejects(run(['create', '--name', 'App'], api), /interrupted/);
    const path = join(root, '.anhedral/platform/project-create.json');
    const saved = await readPrivate(path);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    const [created] = await capture(() => run(['create', '--name', 'App'], api));
    assert.equal(created.requestId, saved.input.requestId);
    const [retry] = await capture(() => run(['create', '--name', ' App '], api));
    assert.equal(retry.projectId, created.projectId);
    for (const args of [
      ['create', '--name', 'Other'],
      ['create', '--name', 'App', '--summary', 'changed'],
      ['create', '--name', 'App', '--team', otherId],
    ])
      await assert.rejects(run(args, api), /different input or context/);
    await assert.rejects(
      run(['create', '--name', 'App'], server({ principal: otherId })),
      /different input or context/,
    );
    await assert.rejects(
      run(['create', '--name', 'App', '--api-url', 'https://other.example.com'], {
        ...api,
        store: { read: async () => ({ ...credential, origin: 'https://other.example.com' }) },
      }),
      /different input or context/,
    );
    const [next] = await capture(() => run(['create', '--name', 'Other', '--new'], api));
    assert.notEqual(next.projectId, created.projectId);
    assert.equal(await readPrivate(join(root, '.anhedral/platform/project.json')), null);
  }));
test('optional linking checks existing link before creation, verifies server authority and preserves local init identity', async () =>
  fixture(async (root) => {
    const api = server();
    const state = join(root, '.anhedral/platform/project.json');
    await writePrivate(join(root, '.anhedral/init.json'), { identity: 'local-source-identity' });
    await writePrivate(state, {
      protocol: 1,
      origin,
      principalId,
      teamId,
      projectId: otherId,
      name: 'Existing',
    });
    await assert.rejects(
      run(['create', '--name', 'App', '--link'], api),
      /different local project link/,
    );
    assert.equal(
      api.calls.some((call) => call.url.endsWith('/projects')),
      false,
    );
    assert.equal(await readPrivate(join(root, '.anhedral/platform/project-create.json')), null);
    await rm(state);
    const [created] = await capture(() => run(['create', '--name', 'App', '--link'], api));
    assert.equal(created.linked, true);
    assert.equal((await readPrivate(state)).projectId, created.projectId);
    assert.equal(api.calls.at(-1).url, origin + '/api/cli/v1/link');
    const before = await readFile(state, 'utf8');
    await assert.rejects(
      run(['create', '--name', 'App', '--link', '--new'], api),
      /different local project link/,
    );
    assert.equal(await readFile(state, 'utf8'), before);
    assert.deepEqual(await readPrivate(join(root, '.anhedral/init.json')), {
      identity: 'local-source-identity',
    });
    await capture(() => run(['create', '--name', 'App', '--link'], api));
  }));
test('create rejects incorrect receipts and preserves journal on server conflicts', async () =>
  fixture(async (root) => {
    await assert.rejects(
      run(['create', '--name', 'App'], server({ corrupt: true })),
      /identity or input differs|supported protocol/,
    );
    await assert.rejects(
      run(['create', '--name', 'App'], server({ status: 409 })),
      /creation conflicts/,
    );
    assert.ok(
      (await readPrivate(join(root, '.anhedral/platform/project-create.json'))).input.requestId,
    );
  }));
test('human project output sanitizes terminal controls', async () =>
  fixture(async () => {
    const api = server();
    const lines = await capture(
      () => run(['create', '--name', 'App\u001b[31m\nTitle'], api, { human: true }),
      false,
    );
    assert.ok(!lines.join('').includes('\u001b'));
    assert.match(lines.join(''), /No source was generated/);
  }));

test('concurrent creation and link mutations fail closed while one request owns the lock', async () =>
  fixture(async (root) => {
    const api = server();
    let entered;
    const reached = new Promise((resolve) => {
      entered = resolve;
    });
    let release;
    const blocked = new Promise((resolve) => {
      release = resolve;
    });
    const fetch = api.fetch;
    api.fetch = async (...args) => {
      if (args[0].endsWith('/projects')) {
        entered();
        await blocked;
      }
      return fetch(...args);
    };
    const first = capture(() => run(['create', '--name', 'App', '--link'], api));
    await reached;
    try {
      await assert.rejects(run(['create', '--name', 'App'], api), /workspace lock/);
      await assert.rejects(run(['create', '--name', 'Other', '--new'], api), /workspace lock/);
      await capture(() => runPlatformCommand('unlink', [], { json: true }, api));
      await assert.rejects(
        runPlatformCommand('link', ['--team', teamId, '--project', otherId], { json: true }, api),
        /workspace lock/,
      );
      assert.equal(api.calls.filter((call) => call.url.endsWith('/projects')).length, 0);
    } finally {
      release();
    }
    const [created] = await first;
    assert.equal(api.calls.filter((call) => call.url.endsWith('/projects')).length, 1);
    assert.equal(
      (await readPrivate(join(root, '.anhedral/platform/project.json'))).projectId,
      created.projectId,
    );
    assert.ok(
      !(await readdir(join(root, '.anhedral/platform'))).includes('project-operation.lock'),
    );
  }));

test('a lost response to --new recovers without --new and reuses the committed request', async () =>
  fixture(async (root) => {
    const api = server({ lose: true });
    await assert.rejects(run(['create', '--name', 'App', '--new'], api), (error) => {
      assert.match(error.message, /without --new/);
      assert.match(error.nextAction, /omitting --new/);
      return true;
    });
    const saved = await readPrivate(join(root, '.anhedral/platform/project-create.json'));
    const [result] = await capture(() => run(['create', '--name', 'App'], api));
    assert.equal(result.projectId, saved.input.requestId);
    assert.equal(api.calls.filter((call) => call.url.endsWith('/projects')).length, 2);
  }));

test('unlink without a saved link is a no-op without creating local state', async () =>
  fixture(async (root) => {
    const [result] = await capture(() => runPlatformCommand('unlink', [], { json: true }, {}));
    assert.equal(result.status, 'unlinked');
    assert.deepEqual(await readdir(root), []);
  }));
