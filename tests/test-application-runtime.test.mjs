import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
  readFileSync,
  chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSetupPlan } from '../dist/capabilities.js';
import { parseStandardOptions } from '../dist/standard.js';
import { applicationRuntime, runtimeTargets } from '../dist/providers/runtime.js';
const secret = randomBytes(32).toString('hex');
function fixture(flags = ['--vinext', '--better-auth']) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-app-runtime-'));
  writeFileSync(
    path.join(root, 'anhedral.setup.json'),
    JSON.stringify(
      createSetupPlan(parseStandardOptions('new', [root, '--skip-install', ...flags])),
    ),
  );
  mkdirSync(path.join(root, 'apps/web'), { recursive: true });
  mkdirSync(path.join(root, 'apps/api'), { recursive: true });
  return root;
}
const run = async (_command, args) => (args.includes('check-ignore') ? args.at(-1) : '');
function write(
  root,
  relative = 'apps/web/.dev.vars',
  entries = `BETTER_AUTH_SECRET="${secret}"\nBETTER_AUTH_URL="https://app.customer.com"\n`,
) {
  writeFileSync(path.join(root, relative), entries, { mode: 0o600 });
}
test('Void runtime uses the app .env while legacy and native consumers retain their own conventions', async () => {
  const root = fixture(['--vinext', '--hono', '--better-auth']);
  try {
    writeFileSync(path.join(root, 'apps/api/void.config.ts'), 'export default {};\n');
    write(root, 'apps/api/.env');
    const values = await applicationRuntime(root, run);
    assert.deepEqual(Object.keys(values), ['apps/api/.env']);
    assert.equal(values['apps/api/.env'].BETTER_AUTH_SECRET, secret);
    const targets = runtimeTargets(root, { OPENAI_API_KEY: 'runtime-key' });
    assert.equal(targets['apps/api/.env'].OPENAI_API_KEY, 'runtime-key');
    assert.equal(targets['apps/api/.dev.vars'], undefined);
    assert.equal(targets['apps/web/.env'], undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
for (const [flags, relative] of [
  [['--vinext', '--better-auth'], 'apps/web/.dev.vars'],
  [['--next', '--hosting=vercel', '--better-auth', '--neon'], 'apps/web/.env.local'],
  [['--next', '--hono', '--better-auth'], 'apps/api/.dev.vars'],
]) {
  test(`application auth targets only ${relative}`, async () => {
    const root = fixture(flags);
    try {
      write(
        root,
        relative,
        `export BETTER_AUTH_SECRET='${secret}'\nBETTER_AUTH_URL=https://app.customer.com # production\nUNRELATED_SECRET=not-deployed\n`,
      );
      const before = readFileSync(path.join(root, relative), 'utf8');
      const values = await applicationRuntime(root, run);
      assert.deepEqual(values, {
        [relative]: { BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: 'https://app.customer.com' },
      });
      assert.equal(readFileSync(path.join(root, relative), 'utf8'), before);
      assert.equal(JSON.stringify(values).includes('not-deployed'), false);
      const provider = runtimeTargets(root, { OPENAI_API_KEY: 'provider-runtime-key' });
      assert.equal(provider[relative].OPENAI_API_KEY, 'provider-runtime-key');
      assert.equal(values[relative].OPENAI_API_KEY, undefined);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
test('unselected application auth performs no private file or git reads', async () => {
  const root = fixture(['--vinext']);
  try {
    assert.deepEqual(
      await applicationRuntime(root, async () => {
        throw new Error('unexpected git');
      }),
      {},
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
for (const entries of [
  `BETTER_AUTH_SECRET=short\nBETTER_AUTH_URL=https://app.customer.com\n`,
  `BETTER_AUTH_SECRET=${'change-me-'.repeat(8)}\nBETTER_AUTH_URL=https://app.customer.com\n`,
  `BETTER_AUTH_SECRET=${'a'.repeat(64)}\nBETTER_AUTH_URL=https://app.customer.com\n`,
  `BETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=https://app.customer.com\n`,
  `BETTER_AUTH_SECRET="invalid quote\nBETTER_AUTH_URL=https://app.customer.com\n`,
  `BETTER_AUTH_SECRET=${secret}\n`,
  `BETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=http://localhost:3000\n`,
  `BETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=https://127.0.0.1\n`,
  `BETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=https://[::1]\n`,
  `BETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=https://app.local\n`,
  `BETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=https://user:private@app.example.com/path\n`,
  `BETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=https://app.customer.com?secret=private\n`,
]) {
  test(`invalid application auth rejected without exposing values: ${entries.length}`, async () => {
    const root = fixture();
    try {
      write(root, undefined, entries);
      await assert.rejects(applicationRuntime(root, run), (error) => {
        assert.equal(error.message.includes(secret), false);
        assert.equal(error.message.includes('private'), error.message.includes('private runtime'));
        return /BETTER_AUTH|quoted value/.test(error.message);
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
for (const state of ['missing', 'tracked', 'not-ignored', 'symlink']) {
  test(`application auth rejects ${state} private runtime source`, async () => {
    const root = fixture();
    try {
      if (state !== 'missing') write(root);
      if (state === 'symlink') {
        rmSync(path.join(root, 'apps/web/.dev.vars'));
        writeFileSync(path.join(root, 'outside-env'), `BETTER_AUTH_SECRET=${secret}`);
        symlinkSync(path.join(root, 'outside-env'), path.join(root, 'apps/web/.dev.vars'));
      }
      const runner =
        state === 'tracked'
          ? async () => 'apps/web/.dev.vars'
          : state === 'not-ignored'
            ? async () => ''
            : run;
      await assert.rejects(applicationRuntime(root, runner), /Configure|tracked|Ignore|symbolic/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('legacy tracked Wrangler auth vars are blocked before deployment configuration', async () => {
  const root = fixture();
  try {
    write(root);
    writeFileSync(
      path.join(root, 'apps/web/wrangler.jsonc'),
      JSON.stringify({ vars: { BETTER_AUTH_URL: 'http://localhost:3000' } }),
    );
    await assert.rejects(
      applicationRuntime(root, run),
      /Remove Better Auth values from tracked Wrangler vars/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('mixed Clerk distributes its server key to web middleware without exposing other API secrets or mobile server keys', () => {
  const root = fixture(['--next', '--hono', '--clerk', '--neon', '--expo']);
  try {
    const values = {
      CLERK_SECRET_KEY: 'clerk-server-runtime',
      CLERK_PUBLISHABLE_KEY: 'pk_test_public',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_public',
      DATABASE_URL: 'database-server-runtime',
      OPENAI_API_KEY: 'ai-server-runtime',
    };
    const targets = runtimeTargets(root, values);
    assert.deepEqual(targets['apps/web/.env.local'], {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_public',
      CLERK_SECRET_KEY: 'clerk-server-runtime',
    });
    assert.equal(targets['apps/api/.dev.vars'].DATABASE_URL, values.DATABASE_URL);
    assert.deepEqual(targets['apps/mobile/.env.local'], {
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_public',
    });
    assert.equal(
      JSON.stringify(targets['apps/mobile/.env.local']).includes('server-runtime'),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('broad private runtime permissions stop before git checks and leave file unchanged', async () => {
  if (process.platform === 'win32') return;
  const root = fixture();
  try {
    write(root);
    const file = path.join(root, 'apps/web/.dev.vars');
    chmodSync(file, 0o644);
    const before = readFileSync(file, 'utf8');
    let gitCalls = 0;
    await assert.rejects(
      applicationRuntime(root, async () => {
        gitCalls++;
        throw new Error('must not inspect git');
      }),
      /permissions must be 0600/,
    );
    assert.equal(gitCalls, 0);
    assert.equal(readFileSync(file, 'utf8'), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
