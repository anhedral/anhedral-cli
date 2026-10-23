import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { parseStandardOptions, scaffoldStandardProject, createSetupPlan } from '../dist/index.js';
import { bootstrap } from './support/workspace-bootstrap.mjs';

const runner = (_command, args, cwd) => {
  if (args[0] === 'dlx')
    bootstrap(path.join(args[args.indexOf('--cwd') + 1], args[args.indexOf('--name') + 1]));
  else if (args.includes('--lockfile-only'))
    writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
  else throw new Error(`Unexpected command ${args}`);
};
const load = (root, file, dependencies = {}) => {
  const result = {};
  const code = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('require', 'exports', code)((name) => {
    assert.ok(Object.hasOwn(dependencies, name), name);
    return dependencies[name];
  }, result);
  return result;
};

test('portal preset selects the requested managed stack extends the connected CLI default with managed email', () => {
  assert.deepEqual(parseStandardOptions(['app']).products, [
    'anhedral-ui',
    'better-auth',
    'd1',
    'expo',
    'hono',
    'r2',
  ]);
  const options = parseStandardOptions(['app', '--preset=portal-full-stack']);
  assert.deepEqual(options.products, [
    'anhedral-ui',
    'better-auth',
    'd1',
    'expo',
    'hono',
    'managed-email',
    'r2',
  ]);
  for (const alternative of ['--next', '--vinext', '--neon', '--clerk', '--resend'])
    assert.throws(() => parseStandardOptions(['app', '--preset=portal-full-stack', alternative]));
  const plan = createSetupPlan(options);
  assert.ok(!JSON.stringify(plan.setup).includes('RESEND_API_KEY'));
  assert.ok(
    plan.registry.items
      .find((value) => value.name === 'managed-email')
      .bindings.services.some((value) => value.binding === 'ANHEDRAL_EMAIL'),
  );
});

test('generated auth routes require managed verification and reset delivery with stable, scoped receipts', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-managed-email-'));
  const root = path.join(temp, 'app');
  try {
    await scaffoldStandardProject(
      parseStandardOptions([root, '--preset=portal-full-stack', '--skip-install', '--no-git']),
      runner,
      { quiet: true },
    );
    const { createManagedEmail } = load(root, 'packages/managed-email/src/index.ts');
    const calls = [];
    const env = {
      ANHEDRAL_EMAIL_SCOPE: crypto.randomUUID(),
      ANHEDRAL_EMAIL_CAPABILITY: 'a'.repeat(72),
      ANHEDRAL_EMAIL: {
        fetch: async (request) => {
          calls.push({
            url: request.url,
            authorization: request.headers.get('authorization'),
            body: await request.json(),
          });
          return Response.json({}, { status: 202 });
        },
      },
    };
    const send = createManagedEmail(env);
    const url = 'https://app.example/api/auth/verify-email?token=secret';
    await send('verify-email', 'user@example.com', url);
    await send('verify-email', 'user@example.com', url);
    assert.equal(calls[0].body.id, calls[1].body.id);
    assert.match(calls[0].url, new RegExp(env.ANHEDRAL_EMAIL_SCOPE));
    assert.equal(calls[0].authorization, `Bearer ${env.ANHEDRAL_EMAIL_CAPABILITY}`);
    assert.equal(calls[0].body.from, undefined);
    await assert.rejects(
      createManagedEmail({})('verify-email', 'user@example.com', url),
      /not provisioned/,
    );
    const { createAuth } = load(root, 'packages/auth/src/index.ts', {
      '@better-auth/expo': { expo: () => ({}) },
      'better-auth': { betterAuth: (options) => options },
      '@better-auth/drizzle-adapter': { drizzleAdapter: () => ({}) },
    });
    const auth = createAuth({}, 'secret', 'https://app.example', undefined, send);
    assert.equal(auth.emailAndPassword.requireEmailVerification, true);
    assert.equal(auth.emailAndPassword.revokeSessionsOnPasswordReset, true);
    await auth.emailVerification.sendVerificationEmail({
      user: { email: 'user@example.com' },
      url,
    });
    await auth.emailAndPassword.sendResetPassword({
      user: { email: 'user@example.com' },
      url: 'https://app.example/api/auth/reset-password/secret',
    });
    assert.equal(calls.at(-1).body.template, 'reset-password');
    const api = readFileSync(path.join(root, 'apps/api/src/index.ts'), 'utf8');
    assert.equal((api.match(/createManagedEmail\(env\)/g) ?? []).length, 2);
    assert.ok(!api.includes('RESEND_API_KEY'));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
