import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm, realpath, chmod, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { trustedLinuxCredentialHelper } from '../dist/credential-helper.js';
import { sourceContainsCredential } from '../assets/security/credential-patterns.mjs';
import * as transport from '../dist/contracts/cli-transport.js';
import { packageSource } from '../dist/platform-source.js';
import { scanText } from '../scripts/secret-scanner.mjs';

const examples = [
  ['cli-session-token', ['acl_', 'a'.repeat(64)].join('')],
  [
    'device-code',
    JSON.stringify({ device_code: ['device', 'approval', 'synthetic', 'code'].join('-') }),
  ],
  ...['p', 'o', 'u', 's', 'r'].map((kind) => [
    'github-token',
    ['gh', kind, '_', 'b'.repeat(40)].join(''),
  ]),
  ['github-token', ['github', '_pat_', 'c'.repeat(45)].join('')],
  [
    'credentialed-database-uri',
    ['postgresql', '://user:', 'd'.repeat(32), '@db.example.com/app'].join(''),
  ],
  [
    'credentialed-database-uri',
    ['mongodb+srv', '://user:', 'e'.repeat(32), '@db.example.com/app'].join(''),
  ],
  ['credential-assignment', JSON.stringify({ token: 'f'.repeat(40) })],
  ['credential-assignment', JSON.stringify({ access_token: 'z'.repeat(40) })],
  ['credential-assignment', JSON.stringify({ api_key: 'g'.repeat(40) })],
  ['credential-assignment', JSON.stringify({ clientSecret: 'h'.repeat(40) })],
  ['credential-assignment', `const password =\n  '${'i'.repeat(40)}';`],
];

test('release and upload checks reject the same credential families without logging values', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'anhedral-credential-boundary-')));
  try {
    await writeFile(
      join(root, 'anhedral.json'),
      JSON.stringify({ setup: { cliVersion: '0.18.0' } }),
    );
    await writeFile(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    for (const [id, material] of examples) {
      assert.ok(
        scanText('source.json', Buffer.from(material)).some((f) => f.pattern === id),
        id,
      );
      // Repeated calls must not inherit RegExp.lastIndex from another caller.
      assert.equal(sourceContainsCredential(Buffer.from(material)), true, id);
      assert.equal(sourceContainsCredential(Buffer.from(material)), true, id);
      await writeFile(join(root, 'source.json'), material);
      await assert.rejects(packageSource(root), (error) => {
        assert.match(error.message, /credential material/);
        assert.equal(error.message.includes(material), false);
        return true;
      });
    }
    await writeFile(join(root, 'source.json'), JSON.stringify({ publicLabel: 'hello' }));
    assert.equal(sourceContainsCredential(Buffer.from('export const hello = 1;')), false);
    assert.ok((await packageSource(root)).files >= 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('public transport omits private builder policy and evidence schemas', () => {
  assert.equal(transport.cliBuildPolicySchema, undefined);
  assert.equal(transport.cliBuildEvidenceSchema, undefined);
});

test('Linux credential helpers reject relative, project-owned and writable paths', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'anhedral-untrusted-helper-')));
  try {
    const helper = join(root, 'secret-tool');
    await writeFile(helper, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    await assert.rejects(trustedLinuxCredentialHelper('secret-tool'), /trusted Linux/);
    await assert.rejects(trustedLinuxCredentialHelper(helper), /trusted Linux/);
    await chmod(helper, 0o777);
    await assert.rejects(trustedLinuxCredentialHelper(helper), /trusted Linux/);
    if (process.platform !== 'win32') {
      const redirect = join(root, 'redirect');
      await symlink('/usr/bin/true', redirect);
      await assert.rejects(trustedLinuxCredentialHelper(redirect), /trusted Linux/);
      assert.equal(
        await trustedLinuxCredentialHelper('/usr/bin/true'),
        await realpath('/usr/bin/true'),
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test(
  'npm exec project bins cannot receive Linux credential helper input',
  { skip: process.platform === 'win32' },
  async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'anhedral-npm-helper-')));
    try {
      await mkdir(join(root, 'node_modules', '.bin'), { recursive: true });
      await writeFile(
        join(root, 'package.json'),
        JSON.stringify({ name: 'credential-boundary-fixture', version: '1.0.0', private: true }),
      );
      const helper = join(root, 'node_modules', '.bin', 'secret-tool');
      await writeFile(helper, '#!/bin/sh\ncat > "' + join(root, 'captured') + '"\n', {
        mode: 0o755,
      });
      const module = new URL('../dist/platform-state.js', import.meta.url).href;
      await writeFile(
        join(root, 'probe.mjs'),
        `
      import assert from 'node:assert/strict';
      import { access } from 'node:fs/promises';
      import { secretStore } from ${JSON.stringify(module)};
      assert.ok(process.env.PATH.split(':').includes(${JSON.stringify(join(root, 'node_modules', '.bin'))}));
      const store = secretStore('https://credential-fixture.invalid', undefined, undefined, 'linux');
      await store.write({ token: 'synthetic-' + crypto.randomUUID() });
      assert.equal(await store.read(), null);
      await store.clear();
      await assert.rejects(access(${JSON.stringify(join(root, 'captured'))}));
    `,
      );
      const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
      await promisify(execFile)(
        'npm',
        [
          'exec',
          '--offline',
          '--call',
          quote(process.execPath) + ' ' + quote(join(root, 'probe.mjs')),
        ],
        {
          cwd: root,
          env: {
            ...process.env,
            ANHEDRAL_CLI_SECRET_TOOL_PATH: '/usr/bin/true',
            npm_config_update_notifier: 'false',
          },
          timeout: 30000,
        },
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
