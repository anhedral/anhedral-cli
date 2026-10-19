import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createSetupPlan } from '../dist/capabilities.js';
import { writeProjectSection } from '../dist/project-config.js';
import { parseStandardOptions } from '../dist/standard.js';
import { applicationRuntime, RUNTIME_KEYS, runtimeTargets } from '../dist/providers/runtime.js';

const secret = randomBytes(32).toString('base64url');
const authSecret = randomBytes(32).toString('hex');
function fixture(flags, relative, content) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-neon-realtime-runtime-'));
  writeProjectSection(root, 'setup', createSetupPlan(parseStandardOptions([root, ...flags])));
  for (const app of ['api', 'web', 'mobile', 'realtime'])
    mkdirSync(path.join(root, 'apps', app), { recursive: true });
  if (relative) writeFileSync(path.join(root, relative), content, { mode: 0o600 });
  return root;
}
const run = async (_command, args) => (args.includes('check-ignore') ? args.at(-1) : '');

for (const [flags, relative, voidApp] of [
  [['--hono', '--neon', '--neon-realtime', '--electron'], 'apps/api/.env', 'api'],
  [['--hono', '--queues', '--neon', '--neon-realtime'], 'apps/api/.dev.vars'],
  [['--next', '--neon', '--neon-realtime'], 'apps/api/.env', 'api'],
]) {
  test(`Neon Realtime credentials target only ${relative}`, async () => {
    const content = `NEON_REALTIME_SECRET=${JSON.stringify(secret)}\nNEON_REALTIME_URL=https://unrelated.customer.com\nBETTER_AUTH_SECRET=invalid-unselected-secret\nOTHER_SECRET=private-unrelated-value\n`;
    const root = fixture(flags, relative, content);
    try {
      if (voidApp)
        writeFileSync(path.join(root, `apps/${voidApp}/void.config.ts`), 'export default {};\n');
      const calls = [];
      const values = await applicationRuntime(root, async (command, args) => {
        calls.push(args.at(-1));
        return run(command, args);
      });
      assert.deepEqual(values, { [relative]: { NEON_REALTIME_SECRET: secret } });
      assert.deepEqual(runtimeTargets(root, { NEON_REALTIME_SECRET: secret }), {
        [relative]: { NEON_REALTIME_SECRET: secret },
      });
      assert.deepEqual(calls, [relative, relative]);
      assert.equal(readFileSync(path.join(root, relative), 'utf8'), content);
      assert.ok(RUNTIME_KEYS.includes('NEON_REALTIME_SECRET'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('unselected Neon Realtime credentials are never read or forwarded', async () => {
  const root = fixture(
    ['--hono', '--neon'],
    'apps/api/.dev.vars',
    'NEON_REALTIME_SECRET=malformed\n',
  );
  try {
    assert.deepEqual(
      await applicationRuntime(root, async () =>
        assert.fail('No credential checks for unselected products'),
      ),
      {},
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('selected Neon Realtime requires an explicit private credential', async () => {
  const root = fixture(['--hono', '--neon', '--neon-realtime']);
  try {
    await assert.rejects(
      applicationRuntime(root, run),
      /Configure NEON_REALTIME_SECRET in ignored apps\/api\/\.dev\.vars/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Better Auth and Neon Realtime retain separate validations in one private backend file', async () => {
  const root = fixture(
    ['--hono', '--neon', '--better-auth', '--neon-realtime'],
    'apps/api/.dev.vars',
    `BETTER_AUTH_SECRET=${authSecret}\nBETTER_AUTH_URL=https://app.customer.com\nNEON_REALTIME_SECRET=${secret}\n`,
  );
  try {
    assert.deepEqual(await applicationRuntime(root, run), {
      'apps/api/.dev.vars': {
        BETTER_AUTH_SECRET: authSecret,
        BETTER_AUTH_URL: 'https://app.customer.com',
        NEON_REALTIME_SECRET: secret,
      },
    });
    writeFileSync(
      path.join(root, 'apps/api/.dev.vars'),
      `BETTER_AUTH_SECRET=placeholder\nBETTER_AUTH_URL=https://app.customer.com\nNEON_REALTIME_SECRET=${secret}\n`,
    );
    await assert.rejects(applicationRuntime(root, run), /BETTER_AUTH_SECRET requires/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const value of ['""', 'REPLACE_ME', '"line\\nbreak"', JSON.stringify('x'.repeat(16385))]) {
  test(`invalid Neon Realtime credentials fail without exposing their value (${value.length} bytes)`, async () => {
    const root = fixture(
      ['--hono', '--neon', '--neon-realtime'],
      'apps/api/.dev.vars',
      `NEON_REALTIME_SECRET=${value}\n`,
    );
    try {
      await assert.rejects(applicationRuntime(root, run), (error) => {
        assert.match(error.message, /NEON_REALTIME_SECRET/);
        assert.ok(!error.message.includes(value));
        return true;
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('tracked Neon Realtime vars are rejected before shipping', async () => {
  const root = fixture(
    ['--hono', '--neon', '--neon-realtime'],
    'apps/api/.dev.vars',
    `NEON_REALTIME_SECRET=${secret}\n`,
  );
  try {
    writeFileSync(
      path.join(root, 'apps/api/wrangler.jsonc'),
      JSON.stringify({ vars: { NEON_REALTIME_SECRET: secret } }),
    );
    await assert.rejects(
      applicationRuntime(root, run),
      /Remove application runtime values from tracked Wrangler vars/,
    );
    await assert.rejects(
      applicationRuntime(root, async (_command, args) =>
        args.includes('ls-files') ? 'apps/api/.dev.vars' : '',
      ),
      /must not be tracked/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
