import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { transpileModule, ModuleKind } from 'typescript';
import { MANAGED_EMAIL_SOURCE } from '../dist/scaffold/managed-email.js';
import { scaffoldStandardProject, parseStandardOptions } from '../dist/standard.js';

const compiled = transpileModule(MANAGED_EMAIL_SOURCE, {
  compilerOptions: { module: ModuleKind.ESNext },
}).outputText;
const { createManagedEmail } = await import(
  'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')
);
const scope = '00000000-0000-4000-8000-000000000001';
const capability = 'a'.repeat(72);
const address = ['person', 'example.invalid'].join('@');

test('managed email is opt-in, but every partial or malformed configuration fails closed', () => {
  assert.equal(createManagedEmail({}), undefined);
  assert.equal(
    createManagedEmail({ ANHEDRAL_EMAIL_SCOPE: '', ANHEDRAL_EMAIL_CAPABILITY: '' }),
    undefined,
  );
  for (const env of [
    { ANHEDRAL_EMAIL_SCOPE: scope },
    { ANHEDRAL_EMAIL: { fetch() {} } },
    { ANHEDRAL_EMAIL_SCOPE: scope, ANHEDRAL_EMAIL_CAPABILITY: capability },
    {
      ANHEDRAL_EMAIL: { fetch() {} },
      ANHEDRAL_EMAIL_SCOPE: '../foreign',
      ANHEDRAL_EMAIL_CAPABILITY: capability,
    },
    {
      ANHEDRAL_EMAIL: { fetch() {} },
      ANHEDRAL_EMAIL_SCOPE: scope,
      ANHEDRAL_EMAIL_CAPABILITY: 'bad',
    },
  ])
    assert.throws(() => createManagedEmail(env), /configuration is incomplete/);
});

test('broker requests are scoped, bounded and deterministic without leaking failure details', async () => {
  const requests = [];
  let status = 202;
  let fail = false;
  const send = createManagedEmail({
    ANHEDRAL_EMAIL_SCOPE: scope,
    ANHEDRAL_EMAIL_CAPABILITY: capability,
    ANHEDRAL_EMAIL: {
      async fetch(request) {
        requests.push({
          url: request.url,
          headers: request.headers,
          signal: request.signal,
          redirect: request.redirect,
          data: await request.json(),
        });
        if (fail) throw Error('private capability and token');
        return new Response('private provider failure', { status });
      },
    },
  });
  const url = 'https://app.example.test/api/auth/verify-email?token=synthetic';
  await send('verify-email', address, url);
  await send('verify-email', address, url);
  await send('verify-email', address, url + '2');
  assert.equal(requests[0].url, `https://email.internal/scopes/${scope}/send`);
  assert.equal(requests[0].headers.get('authorization'), 'Bearer ' + capability);
  assert.equal(requests[0].redirect, 'error');
  assert.ok(requests[0].signal instanceof AbortSignal);
  assert.match(requests[0].data.id, /^[a-f0-9]{64}$/);
  assert.equal(requests[0].data.id, requests[1].data.id);
  assert.notEqual(requests[0].data.id, requests[2].data.id);
  assert.deepEqual(Object.keys(requests[0].data).sort(), ['id', 'template', 'to', 'url']);
  status = 503;
  await assert.rejects(
    send('verify-email', address, url),
    /^Error: Application email could not be accepted\. Please try again\.$/,
  );
  fail = true;
  await assert.rejects(
    send('verify-email', address, url),
    /^Error: Application email could not be accepted\. Please try again\.$/,
  );
});

test('fresh core and payment apps wire server email and both clients without broker secrets in clients', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-managed-email-'));
  try {
    for (const flags of [[], ['--stripe', '--revenuecat']]) {
      const root = path.join(temporary, flags.length ? 'billing' : 'core');
      await scaffoldStandardProject(
        parseStandardOptions([root, ...flags, '--skip-install', '--no-git']),
        () => {
          throw Error('offline');
        },
        { quiet: true },
      );
      const read = (file) => readFileSync(path.join(root, file), 'utf8');
      assert.match(
        read('packages/auth/src/index.ts'),
        /requireEmailVerification: Boolean\(sendEmail\)/,
      );
      assert.match(read('packages/auth/src/index.ts'), /revokeSessionsOnPasswordReset: true/);
      for (const file of [
        'apps/api/src/index.ts',
        'apps/api/src/private-files.ts',
        ...(flags.length ? ['apps/api/src/billing.ts'] : []),
      ])
        assert.match(read(file), /BETTER_AUTH_URL, (?:c\.)?env\)/);
      for (const file of ['apps/web/app/sign-in/page.tsx', 'apps/mobile/app/sign-in.tsx']) {
        assert.match(read(file), /verificationPending\(create, signedIn\)/);
        assert.match(read(file), /sendVerificationEmail/);
        assert.doesNotMatch(read(file), /ANHEDRAL_EMAIL|CAPABILITY/);
      }
      assert.match(read('apps/web/app/reset-password/page.tsx'), /await searchParams/);
      assert.match(read('apps/web/components/password-reset.tsx'), /submitPasswordReset/);
      assert.match(
        read('apps/mobile/app/reset-password.tsx'),
        /Linking.createURL\('reset-password'\)/,
      );
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
