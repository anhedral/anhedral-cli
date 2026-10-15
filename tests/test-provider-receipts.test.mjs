import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  chmodSync,
  symlinkSync,
  existsSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ProvisioningState } from '../dist/providers/state.js';
import { splitReceipt } from '../dist/providers/receipts.js';
import { digest } from '../dist/providers/api.js';
import { atomicJson } from '../dist/project-state.js';
const secret = 'fixture-one-time-private-value';
const settings = { name: 'example' };
const body = { name: 'runtime' };
const route = '/api-keys';
const operation = digest({ key: 'sending-key', route, body });
function fixture() {
  return mkdtempSync(path.join(tmpdir(), 'anhedral-minimal-receipts-'));
}
function legacy(directory) {
  atomicJson(path.join(directory, 'providers.json'), {
    schemaVersion: 1,
    providers: {
      resend: {
        config: digest(settings),
        operations: {
          [operation]: {
            status: 'complete',
            value: {
              id: 'key_1',
              token: secret,
              internal_diagnostics: secret,
              account: { secret },
            },
          },
        },
      },
    },
  });
}
for (const [provider, value, expected] of [
  [
    'neon',
    { project: { id: 'project_1', connection_uri: secret }, password: secret },
    { project: { id: 'project_1' } },
  ],
  [
    'clerk',
    { application_id: 'app_1', secret_key: secret, instances: [{ secret_key: secret }] },
    { application_id: 'app_1' },
  ],
  ['posthog', { id: 42, api_token: secret }, { id: 42 }],
  ['revenuecat', { id: 'proj1', secret_api_key: secret }, { id: 'proj1' }],
  ['sentry', { id: '123', secret: secret, dsn: { secret } }, { id: '123' }],
]) {
  test(`${provider}: receipts retain identities and discard unrelated payloads`, () => {
    const { receipt, credentials } = splitReceipt(provider, value);
    assert.deepEqual(receipt, expected);
    assert.deepEqual(credentials, {});
    assert.equal(JSON.stringify(receipt).includes(secret), false);
  });
}
for (const [provider, key, value, expected] of [
  [
    'resend',
    'sending-key',
    { id: 'key_1', token: secret, diagnostics: secret },
    { id: 'key_1', token: secret },
  ],
  ['stripe', 'webhook', { id: 'we_1', secret, diagnostics: secret }, { id: 'we_1', secret }],
  [
    'openai',
    'service-account',
    { id: 'user_1', api_key: { value: secret, diagnostics: secret }, diagnostics: secret },
    { id: 'user_1', api_key: { value: secret } },
  ],
]) {
  test(`${provider}: credentials survive restart without appearing in receipts or status`, async () => {
    const directory = fixture();
    try {
      const state = new ProvisioningState(directory);
      state.context(provider, settings);
      assert.deepEqual(await state.create(provider, key, async () => value, route, body), expected);
      const receipts = JSON.parse(readFileSync(path.join(directory, 'providers.json')));
      assert.equal(receipts.schemaVersion, 2);
      assert.equal(JSON.stringify(receipts).includes(secret), false);
      assert.equal(JSON.stringify(state.status()).includes(secret), false);
      assert.equal(JSON.stringify(state.status()).includes('diagnostics'), false);
      const restored = new ProvisioningState(directory);
      restored.context(provider, settings);
      assert.deepEqual(
        await restored.create(
          provider,
          key,
          async () => {
            throw new Error('must not replay');
          },
          route,
          body,
        ),
        expected,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
test('legacy migration writes private credentials first and remains restartable after receipt write failure', async () => {
  const directory = fixture();
  try {
    legacy(directory);
    assert.throws(
      () =>
        new ProvisioningState(directory, (file, value) => {
          if (file.endsWith('/providers.json')) throw new Error('injected write failure');
          atomicJson(file, value);
        }),
      /injected/,
    );
    assert.equal(JSON.parse(readFileSync(path.join(directory, 'providers.json'))).schemaVersion, 1);
    assert.equal(existsSync(path.join(directory, 'provider-credentials.json')), true);
    const restored = new ProvisioningState(directory);
    restored.context('resend', settings);
    assert.equal(JSON.parse(readFileSync(path.join(directory, 'providers.json'))).schemaVersion, 2);
    assert.deepEqual(
      await restored.create(
        'resend',
        'sending-key',
        async () => {
          throw new Error('must not replay');
        },
        route,
        body,
      ),
      { id: 'key_1', token: secret },
    );
    assert.equal(
      readFileSync(path.join(directory, 'providers.json'), 'utf8').includes(secret),
      false,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test('legacy migration rejects conflicting private credentials without changing either file', () => {
  const directory = fixture();
  try {
    legacy(directory);
    const file = path.join(directory, 'provider-credentials.json');
    const conflicting = 'different-private-creation-value';
    atomicJson(file, {
      schemaVersion: 1,
      providers: { resend: { [operation]: { token: conflicting } } },
    });
    const before = readFileSync(file, 'utf8');
    const receiptFile = path.join(directory, 'providers.json');
    const receiptsBefore = readFileSync(receiptFile, 'utf8');
    assert.throws(
      () => new ProvisioningState(directory),
      (error) => {
        assert.match(error.message, /credential state conflicts/);
        assert.equal(error.message.includes(secret), false);
        assert.equal(error.message.includes(conflicting), false);
        return true;
      },
    );
    assert.equal(readFileSync(file, 'utf8'), before);
    assert.equal(readFileSync(receiptFile, 'utf8'), receiptsBefore);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test('credential loss blocks replay and fails with redacted actionable error', async () => {
  const directory = fixture();
  try {
    legacy(directory);
    new ProvisioningState(directory);
    rmSync(path.join(directory, 'provider-credentials.json'));
    assert.throws(() => new ProvisioningState(directory), /credentials are missing/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test('receipt write failure keeps unknown outcome pending even in the current instance', async () => {
  const directory = fixture();
  try {
    const state = new ProvisioningState(directory, (file, value) => {
      if (
        file.endsWith('/providers.json') &&
        value.providers.resend.operations[operation]?.status === 'complete'
      )
        throw new Error('receipt write interrupted');
      atomicJson(file, value);
    });
    state.context('resend', settings);
    await assert.rejects(
      state.create(
        'resend',
        'sending-key',
        async () => ({ id: 'key_1', token: secret }),
        route,
        body,
      ),
      /interrupted/,
    );
    for (const restored of [state, new ProvisioningState(directory)]) {
      restored.context('resend', settings);
      await assert.rejects(
        restored.create(
          'resend',
          'sending-key',
          async () => {
            throw new Error('must not replay');
          },
          route,
          body,
        ),
        /unknown outcome/,
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
for (const value of [
  { diagnostics: secret },
  { id: 'key_1' },
  { id: 'key_1', token: ['invalid'] },
]) {
  test('unexpected provider creation response stays pending without replay', async () => {
    const directory = fixture();
    try {
      const state = new ProvisioningState(directory);
      state.context('resend', settings);
      await assert.rejects(
        state.create('resend', 'sending-key', async () => value, route, body),
        /identity|credential|invalid/,
      );
      const restored = new ProvisioningState(directory);
      restored.context('resend', settings);
      await assert.rejects(
        restored.create('resend', 'sending-key', async () => value, route, body),
        /unknown outcome/,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
for (const issue of ['permissions', 'symlink', 'unexpected-field', 'receipt-secret']) {
  test(`private receipts and credentials reject ${issue}`, () => {
    const directory = fixture();
    try {
      legacy(directory);
      new ProvisioningState(directory);
      const file = path.join(directory, 'provider-credentials.json');
      if (issue === 'permissions') chmodSync(file, 0o644);
      if (issue === 'symlink') {
        const target = path.join(directory, 'credentials-backup');
        writeFileSync(target, readFileSync(file), { mode: 0o600 });
        rmSync(file);
        symlinkSync(target, file);
      }
      if (issue === 'unexpected-field')
        atomicJson(file, {
          schemaVersion: 1,
          providers: { resend: { [operation]: { token: secret, leaked: secret } } },
        });
      if (issue === 'receipt-secret') {
        const file = path.join(directory, 'providers.json');
        const data = JSON.parse(readFileSync(file));
        data.providers.resend.operations[operation].value.token = secret;
        atomicJson(file, data);
      }
      assert.throws(() => new ProvisioningState(directory), /0600|regular|Invalid provider/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
