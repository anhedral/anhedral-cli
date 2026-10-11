import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  registerManagedApplication,
  stageManagedVersion,
  saveManagedVersion,
  deployManagedVersion,
  managedApplicationStatus,
} from '../dist/managed-hosting.js';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-managed-'));
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'customer-app' }));
  writeFileSync(path.join(root, '.gitignore'), 'build/\n');
  mkdirSync(path.join(root, 'build/server'), { recursive: true });
  writeFileSync(
    path.join(root, 'build/server/worker.js'),
    'export default {fetch(){return new Response("hello")}}',
  );
  mkdirSync(path.join(root, 'build/client'), { recursive: true });
  writeFileSync(path.join(root, 'build/client/style.css'), 'body{color:black}');
  const project = registerManagedApplication(root);
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.com',
      'commit',
      '-qm',
      'application',
    ],
    { cwd: root },
  );
  return { root, project };
}
function backend(project, options = {}) {
  const calls = [];
  let metadata;
  const identity = {
    projectId: 'project-1',
    clientProjectId: project.id,
    ownerId: options.wrongOwner ? 'other-owner' : 'owner-1',
    audience: 'private',
  };
  const send = async (url, init) => {
    calls.push({ url, method: init.method, key: init.headers['Idempotency-Key'] });
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, 'Bearer fixture-token');
    const route = new URL(url).pathname;
    let result;
    if (route === '/v1/session') result = { ownerId: 'owner-1' };
    else if (route === '/v1/projects' || route === '/v1/projects/project-1')
      result = { ...identity, state: 'registered' };
    else if (route.endsWith('/versions') && init.method === 'POST') {
      metadata = JSON.parse(init.body);
      result = { ...identity, versionId: 'version-1' };
    } else if (init.method === 'PUT')
      result = {
        ...identity,
        versionId: 'version-1',
        sha256: options.wrongHash ? 'bad-hash' : hash(Buffer.from(init.body)),
        bytes: init.body.length,
      };
    else if (route.endsWith('/versions/version-1'))
      result = { ...identity, ...metadata, versionId: 'version-1', state: 'saved' };
    else if (route.endsWith('/deployments') && init.method === 'POST')
      result = { deploymentId: 'deployment-1' };
    else if (route.endsWith('/deployments/deployment-1'))
      result = {
        ...identity,
        ...metadata,
        versionId: 'version-1',
        deploymentId: 'deployment-1',
        state: options.queued ? 'queued' : 'deployed',
        url: 'https://customer.example.test/',
        token: 'must-not-return-token',
      };
    else throw new Error(`Unexpected route ${route}`);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { send, calls };
}
async function environment(operation) {
  const previousOrigin = process.env.ANHEDRAL_HOSTING_ORIGIN;
  const previousToken = process.env.ANHEDRAL_HOSTING_TOKEN;
  process.env.ANHEDRAL_HOSTING_ORIGIN = 'https://hosting.example.test';
  process.env.ANHEDRAL_HOSTING_TOKEN = 'fixture-token';
  try {
    await operation();
  } finally {
    if (previousOrigin === undefined) delete process.env.ANHEDRAL_HOSTING_ORIGIN;
    else process.env.ANHEDRAL_HOSTING_ORIGIN = previousOrigin;
    if (previousToken === undefined) delete process.env.ANHEDRAL_HOSTING_TOKEN;
    else process.env.ANHEDRAL_HOSTING_TOKEN = previousToken;
  }
}
test('managed stage archives exact source and complete regular build tree, then saves and independently confirms deployment', async () =>
  environment(async () => {
    const { root, project } = fixture();
    try {
      const stage = await stageManagedVersion(root, 'build');
      assert.equal(stage.state, 'staged');
      const listing = execFileSync('tar', [
        '-tf',
        path.join(root, '.anhedral/managed', stage.stageId, 'artifact.tar'),
      ]).toString();
      assert.ok(listing.includes('server/worker.js'));
      assert.ok(listing.includes('client/style.css'));
      const api = backend(project);
      const saved = await saveManagedVersion(root, stage.stageId, api.send);
      assert.equal(saved.state, 'saved');
      const again = await saveManagedVersion(root, stage.stageId, api.send);
      assert.equal(again.versionId, saved.versionId);
      const keys = api.calls
        .filter((call) => call.url.endsWith('/versions'))
        .map((call) => call.key);
      assert.equal(keys[0], keys[1]);
      const result = await deployManagedVersion(root, stage.stageId, api.send);
      assert.equal(result.state, 'deployed');
      assert.equal(result.productVerification, 'required');
      assert.equal(JSON.stringify(result).includes('must-not-return-token'), false);
      assert.equal(JSON.stringify(result).includes('fixture-token'), false);
      assert.equal(
        (await managedApplicationStatus(root, api.send)).productVerification,
        'unverified',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }));
test('managed save rejects foreign ownership, altered archives and mismatched upload hashes', async () =>
  environment(async () => {
    for (const failure of ['owner', 'hash', 'tamper']) {
      const { root, project } = fixture();
      try {
        const stage = await stageManagedVersion(root, 'build');
        if (failure === 'tamper')
          writeFileSync(
            path.join(root, '.anhedral/managed', stage.stageId, 'artifact.tar'),
            'changed',
          );
        const api = backend(project, {
          wrongOwner: failure === 'owner',
          wrongHash: failure === 'hash',
        });
        await assert.rejects(
          saveManagedVersion(root, stage.stageId, api.send),
          /ownership|archive changed|upload receipt/,
        );
        assert.equal(
          JSON.parse(
            readFileSync(path.join(root, '.anhedral/managed', stage.stageId, 'version.json')),
          ).state,
          'staged',
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  }));
test('queued deployments never return a live URL and origin changes fail before backend requests', async () =>
  environment(async () => {
    const { root, project } = fixture();
    try {
      const stage = await stageManagedVersion(root, 'build');
      const api = backend(project, { queued: true });
      await saveManagedVersion(root, stage.stageId, api.send);
      const result = await deployManagedVersion(root, stage.stageId, api.send);
      assert.equal(result.state, 'queued');
      assert.equal(result.url, undefined);
      process.env.ANHEDRAL_HOSTING_ORIGIN = 'https://different.example.test';
      await assert.rejects(managedApplicationStatus(root, api.send), /origin differs/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }));
test('staging rejects dirty source, secret artifacts and symbolic links', async () => {
  const { root } = fixture();
  try {
    writeFileSync(path.join(root, 'changed.txt'), 'source edit');
    await assert.rejects(stageManagedVersion(root, 'build'), /clean application/);
    rmSync(path.join(root, 'changed.txt'));
    writeFileSync(path.join(root, 'build/.env'), 'credential');
    await assert.rejects(stageManagedVersion(root, 'build'), /credentials/);
    rmSync(path.join(root, 'build/.env'));
    symlinkSync(path.join(root, 'package.json'), path.join(root, 'build/link'));
    await assert.rejects(stageManagedVersion(root, 'build'), /regular files/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
