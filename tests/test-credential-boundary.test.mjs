import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sourceContainsCredential } from '../dist/contracts/cli-transport.js';
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
