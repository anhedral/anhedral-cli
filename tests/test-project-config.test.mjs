import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  readProjectConfig,
  readProjectSection,
  writeProjectSection,
  hasProjectSection,
  PROJECT_CONFIG_MAX_BYTES,
} from '../dist/project-config.js';
import { withSourceWriteLock } from '../dist/transaction.js';

function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-config-'));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('one configuration preserves unrelated sections and rejects invalid writes without partial updates', () =>
  fixture((root) => {
    assert.equal(hasProjectSection(root, 'cloudflare'), false);
    writeProjectSection(root, 'identity', { schemaVersion: 1, id: 'local-example' });
    writeProjectSection(root, 'providers', {
      schemaVersion: 1,
      providers: { resend: { domain: 'example.invalid' } },
    });
    writeProjectSection(root, 'cloudflare', { schemaVersion: 1, accountId: null });
    assert.equal(readProjectSection(root, 'identity').id, 'local-example');
    assert.equal(readProjectSection(root, 'providers').providers.resend.domain, 'example.invalid');
    const before = readFileSync(path.join(root, 'anhedral.json'));
    for (const value of [null, [], 'invalid', { big: 'x'.repeat(PROJECT_CONFIG_MAX_BYTES) }]) {
      assert.throws(() => writeProjectSection(root, 'setup', value));
      assert.deepEqual(readFileSync(path.join(root, 'anhedral.json')), before);
    }
    assert.throws(() => writeProjectSection(root, 'unknown', {}), /Unknown/);
    assert.deepEqual(readdirSync(root), ['anhedral.json']);
  }));

test('malformed sections remain isolated; invalid envelopes and JSON fail without echoing values', () =>
  fixture((root) => {
    writeFileSync(
      path.join(root, 'anhedral.json'),
      JSON.stringify({ schemaVersion: 1, setup: { cliVersion: 'current' }, providers: null }),
    );
    assert.equal(readProjectSection(root, 'setup').cliVersion, 'current');
    assert.throws(() => readProjectSection(root, 'providers'), /providers section/);
    for (const source of [
      '{"schemaVersion":2}',
      '{"schemaVersion":1,"unknown":{}}',
      '{"private":"do-not-echo" broken',
    ]) {
      writeFileSync(path.join(root, 'anhedral.json'), source);
      assert.throws(
        () => readProjectConfig(root),
        (error) => {
          assert.match(error.message, /Invalid anhedral.json/);
          assert.doesNotMatch(error.message, /do-not-echo/);
          return true;
        },
      );
      assert.throws(() => writeProjectSection(root, 'cloudflare', {}));
      assert.equal(readFileSync(path.join(root, 'anhedral.json'), 'utf8'), source);
    }
  }));

test('configuration writers share the source transaction lock across processes', () =>
  fixture((root) => {
    writeProjectSection(root, 'identity', { schemaVersion: 1, id: 'retained' });
    const module = pathToFileURL(path.resolve('dist/project-config.js')).href;
    const source = `import { writeProjectSection } from ${JSON.stringify(module)}; writeProjectSection(${JSON.stringify(root)}, 'cloudflare', { schemaVersion: 1, name: 'web' });`;
    const child = () =>
      spawnSync(process.execPath, ['--input-type=module', '-e', source], {
        encoding: 'utf8',
        timeout: 5000,
      });
    withSourceWriteLock(root, () => {
      const result = child();
      assert.equal(result.status, 1);
      assert.match(result.stderr, /lock|transaction/i);
      assert.equal(hasProjectSection(root, 'cloudflare'), false);
    });
    assert.equal(child().status, 0);
    assert.equal(readProjectSection(root, 'identity').id, 'retained');
    assert.equal(readProjectSection(root, 'cloudflare').name, 'web');
    assert.deepEqual(readdirSync(root), ['anhedral.json']);
  }));

test(
  'configuration symlinks are refused without modifying their target',
  { skip: process.platform === 'win32' },
  () =>
    fixture((root) => {
      const target = path.join(root, 'retained.json');
      const source = JSON.stringify({ schemaVersion: 1, identity: { id: 'retained' } });
      writeFileSync(target, source);
      symlinkSync(target, path.join(root, 'anhedral.json'));
      assert.throws(() => readProjectConfig(root), /regular file/);
      assert.throws(() => writeProjectSection(root, 'identity', {}), /regular file/);
      assert.equal(readFileSync(target, 'utf8'), source);
    }),
);
