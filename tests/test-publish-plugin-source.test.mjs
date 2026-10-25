import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  loadPluginRelease,
  publishPluginSource,
  readStoredArchive,
} from '../scripts/publish-plugin-source.mjs';

const hash = (bytes, algorithm = 'sha256', encoding = 'hex') =>
  createHash(algorithm).update(bytes).digest(encoding);
function crc32(contents) {
  let crc = 0xffffffff;
  for (const byte of contents) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const locals = [],
    directory = [];
  let offset = 0;
  for (const { name, contents } of files) {
    const filename = Buffer.from(name);
    const local = Buffer.alloc(30);
    const central = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc32(contents), 14);
    local.writeUInt32LE(contents.length, 18);
    local.writeUInt32LE(contents.length, 22);
    local.writeUInt16LE(filename.length, 26);
    central.writeUInt32LE(0x02014b50);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc32(contents), 16);
    central.writeUInt32LE(contents.length, 20);
    central.writeUInt32LE(contents.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(offset, 42);
    const entry = Buffer.concat([local, filename, contents]);
    locals.push(entry);
    directory.push(Buffer.concat([central, filename]));
    offset += entry.length;
  }
  const entries = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(entries.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, entries, end]);
}
function fixture() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-source-publisher-')));
  const version = '1.2.3';
  const files = Object.entries({
    'plugin.json': JSON.stringify({ name: 'anhedral', version }),
    'references/stack-registry.json': JSON.stringify({ cliVersion: version, items: [{ version }] }),
    'skills/anhedral-init/SKILL.md': 'Initialize the foundation.',
    'skills/anhedral-design/SKILL.md': 'Use shared tokens.',
    LICENSE: 'Apache-2.0',
  }).map(([name, contents]) => ({ name, contents: Buffer.from(contents) }));
  const metadataPath = path.join(root, 'metadata.json');
  function save(entries = files) {
    const bytes = zip(entries);
    writeFileSync(path.join(root, `anhedral-plugin-${version}.zip`), bytes);
    const metadata = {
      schemaVersion: 1,
      name: 'anhedral',
      version,
      plugin: {
        schemaVersion: 1,
        version,
        cliVersion: version,
        filename: `anhedral-plugin-${version}.zip`,
        integrity: `sha512-${hash(bytes, 'sha512', 'base64')}`,
        size: bytes.length,
      },
    };
    writeFileSync(metadataPath, JSON.stringify(metadata));
    return { bytes, metadata };
  }
  save();
  return {
    root,
    files,
    metadataPath,
    save,
    options: {
      metadataPath,
      repository: 'anhedral/anhedral-cli',
      releaseSha: 'a'.repeat(40),
      token: 'fixture-private-token',
    },
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}
function github(fixture) {
  const run = (args, input) => {
    const result = spawnSync('git', args, { cwd: fixture.root, input, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  run(['init', '--quiet']);
  const blob = (bytes) => run(['hash-object', '-w', '--stdin'], bytes);
  const tree = (entries) =>
    run(
      ['mktree'],
      entries.map((entry) => `${entry.mode} ${entry.type} ${entry.sha}\t${entry.path}\n`).join(''),
    );
  function nested(entries) {
    const direct = [],
      groups = new Map();
    for (const entry of entries) {
      const slash = entry.path.indexOf('/');
      if (slash < 0) direct.push(entry);
      else {
        const name = entry.path.slice(0, slash);
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push({ ...entry, path: entry.path.slice(slash + 1) });
      }
    }
    for (const [name, children] of groups)
      direct.push({ path: name, mode: '040000', type: 'tree', sha: nested(children) });
    return tree(direct);
  }
  const oldPlugin = tree([
    { path: 'old.txt', mode: '100644', type: 'blob', sha: blob('old source') },
  ]);
  const pluginEntries = [
    { path: 'anhedral', mode: '040000', type: 'tree', sha: oldPlugin },
    { path: 'other', mode: '100644', type: 'blob', sha: blob('other plugin') },
  ];
  const plugins = tree(pluginEntries);
  const rootEntries = [
    { path: 'plugins', mode: '040000', type: 'tree', sha: plugins },
    { path: 'README.md', mode: '100644', type: 'blob', sha: blob('release README') },
  ];
  const originalTree = tree(rootEntries);
  const state = { calls: [], ref: null, commit: null, createdTree: null, race: false };
  const send = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer fixture-private-token');
    assert.equal(options.redirect, 'error');
    const route = url.split('/repos/anhedral/anhedral-cli')[1];
    const body = options.body ? JSON.parse(options.body) : undefined;
    state.calls.push({ route, method: options.method, body });
    const respond = (data, status = 200) => new Response(JSON.stringify(data), { status });
    if (route === `/git/commits/${fixture.options.releaseSha}`)
      return respond({ tree: { sha: originalTree } });
    if (route === `/git/trees/${originalTree}`) return respond({ tree: rootEntries });
    if (route === `/git/trees/${plugins}`) return respond({ tree: pluginEntries });
    if (route === '/git/ref/tags/plugin-v1.2.3')
      return state.ref ? respond({ object: { type: 'commit', sha: state.ref } }) : respond({}, 404);
    if (route === `/git/commits/${state.ref}` && state.ref) return respond(state.commit);
    if (route === '/git/blobs')
      return respond({ sha: blob(Buffer.from(body.content, 'base64')) }, 201);
    if (route === '/git/trees') {
      state.createdTree = nested(body.tree);
      return respond({ sha: state.createdTree }, 201);
    }
    if (route === '/git/commits') {
      assert.deepEqual(body.parents, [fixture.options.releaseSha]);
      state.commit = { tree: { sha: body.tree }, parents: [{ sha: body.parents[0] }] };
      return respond({ sha: 'b'.repeat(40) }, 201);
    }
    if (route === '/git/refs') {
      assert.equal(body.ref, 'refs/tags/plugin-v1.2.3');
      state.ref = body.sha;
      return respond({}, state.race || 201);
    }
    throw new Error(`Unexpected mock route ${route}`);
  };
  return { send, state };
}

test('verified ZIP publishes exact bytes as regular blobs and an immutable release-parent tag', async () => {
  const f = fixture();
  try {
    const api = github(f);
    const result = await publishPluginSource(f.options, api.send);
    assert.equal(result.created, true);
    assert.equal(result.tag, 'plugin-v1.2.3');
    assert.equal(result.commitSha, 'b'.repeat(40));
    assert.equal(api.state.createdTree, result.treeSha);
    const blobs = api.state.calls.filter((call) => call.route === '/git/blobs');
    assert.deepEqual(
      blobs.map((call) => Buffer.from(call.body.content, 'base64')),
      f.files.map((file) => file.contents),
    );
    assert.ok(api.state.calls.every((call) => ['GET', 'POST'].includes(call.method)));
    assert.equal(api.state.calls.filter((call) => call.route === '/git/refs').length, 1);
    assert.doesNotMatch(JSON.stringify(result), /fixture-private-token/);
  } finally {
    f.close();
  }
});
test('an identical existing tag is a read-only retry with no blob, commit or ref writes', async () => {
  const f = fixture();
  try {
    const api = github(f);
    const first = await publishPluginSource(f.options, api.send);
    api.state.calls = [];
    const retry = await publishPluginSource(f.options, api.send);
    assert.equal(retry.created, false);
    assert.equal(retry.treeSha, first.treeSha);
    assert.ok(api.state.calls.every((call) => call.method === 'GET'));
  } finally {
    f.close();
  }
});
for (const mismatch of ['tree', 'parent'])
  test(`existing immutable tag with a different ${mismatch} is refused without overwrites`, async () => {
    const f = fixture();
    try {
      const api = github(f);
      await publishPluginSource(f.options, api.send);
      if (mismatch === 'tree') api.state.commit.tree.sha = 'c'.repeat(40);
      else api.state.commit.parents = [{ sha: 'c'.repeat(40) }];
      api.state.calls = [];
      await assert.rejects(
        publishPluginSource(f.options, api.send),
        /different source tree or release parent/,
      );
      assert.ok(api.state.calls.every((call) => call.method === 'GET'));
    } finally {
      f.close();
    }
  });
for (const raceStatus of [409, 422])
  test(`a concurrent identical create-ref HTTP ${raceStatus} winner is accepted without replacing its ref`, async () => {
    const f = fixture();
    try {
      const api = github(f);
      api.state.race = raceStatus;
      const result = await publishPluginSource(f.options, api.send);
      assert.equal(result.created, false);
      assert.equal(api.state.calls.filter((call) => call.route === '/git/refs').length, 1);
    } finally {
      f.close();
    }
  });
for (const unsafe of [
  '../escape',
  '/absolute',
  'runtime/../server.mjs',
  'runtime\\server.mjs',
  '.git/config',
  'runtime//server.mjs',
])
  test(`archive refuses unsafe path ${unsafe}`, () =>
    assert.throws(() => readStoredArchive(zip([{ name: unsafe, contents: Buffer.from('x') }]))));
test('archive rejects case collisions, file/directory collisions, CRC drift and unsupported compression', () => {
  for (const files of [
    [
      { name: 'A', contents: Buffer.from('x') },
      { name: 'a', contents: Buffer.from('y') },
    ],
    [
      { name: 'runtime', contents: Buffer.from('x') },
      { name: 'runtime/server.mjs', contents: Buffer.from('y') },
    ],
  ])
    assert.throws(() => readStoredArchive(zip(files)), /duplicate|conflict/);
  const contents = zip([{ name: 'safe', contents: Buffer.from('data') }]);
  const crc = Buffer.from(contents);
  crc[34] ^= 1;
  assert.throws(() => readStoredArchive(crc), /checksum/);
  const compression = Buffer.from(contents);
  compression.writeUInt16LE(8, 8);
  assert.throws(() => readStoredArchive(compression), /headers/);
  for (const truncated of [contents.subarray(0, 20), contents.subarray(0, -1)])
    assert.throws(() => readStoredArchive(truncated));
});
for (const drift of ['version', 'integrity', 'runtime'])
  test(`release ${drift} drift fails before network`, async () => {
    const f = fixture();
    try {
      if (drift === 'runtime')
        f.save([
          ...f.files,
          { name: 'runtime/server.mjs', contents: Buffer.from('unexpected runtime') },
        ]);
      else {
        const metadata = JSON.parse(readFileSync(f.metadataPath));
        if (drift === 'version') metadata.plugin.version = '9.9.9';
        else metadata.plugin.integrity = 'sha512-' + Buffer.alloc(64).toString('base64');
        writeFileSync(f.metadataPath, JSON.stringify(metadata));
      }
      let calls = 0;
      await assert.rejects(
        publishPluginSource(f.options, async () => {
          calls++;
          throw new Error('unexpected');
        }),
        /identity|integrity|runtime/,
      );
      assert.equal(calls, 0);
    } finally {
      f.close();
    }
  });
test('symlinked release archives and untrusted repository/SHA inputs are rejected', async () => {
  const f = fixture();
  try {
    for (const options of [{ repository: '../other' }, { releaseSha: 'main' }, { token: '' }])
      await assert.rejects(
        publishPluginSource({ ...f.options, ...options }, async () => {
          throw new Error('must not request');
        }),
        /required/,
      );
    const archive = path.join(f.root, 'anhedral-plugin-1.2.3.zip');
    const bytes = readFileSync(archive);
    rmSync(archive);
    writeFileSync(path.join(f.root, 'other.zip'), bytes);
    symlinkSync('other.zip', archive);
    assert.throws(() => loadPluginRelease(f.metadataPath), /regular file/);
  } finally {
    f.close();
  }
});
test('GitHub errors never expose authorization or provider response bodies', async () => {
  const f = fixture();
  try {
    await assert.rejects(
      publishPluginSource(
        f.options,
        async () => new Response('fixture-private-token', { status: 403 }),
      ),
      (error) => /HTTP 403/.test(error.message) && !error.message.includes('fixture-private-token'),
    );
    await assert.rejects(
      publishPluginSource(f.options, async () => {
        throw new Error('fixture-private-token');
      }),
      (error) =>
        /request failed/.test(error.message) && !error.message.includes('fixture-private-token'),
    );
  } finally {
    f.close();
  }
});
