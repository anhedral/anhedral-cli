import { writeProjectSection } from '../dist/project-config.js';
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
function fixture(flags = []) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-app-runtime-'));
  const options = parseStandardOptions([
    root,
    '--skip-install',
    ...flags.filter((flag) => ['--stripe', '--revenuecat'].includes(flag)),
  ]);
  writeProjectSection(root, 'setup', createSetupPlan(options));
  mkdirSync(path.join(root, 'apps/web'), { recursive: true });
  mkdirSync(path.join(root, 'apps/api'), { recursive: true });
  return root;
}
const run = async (_command, args) => (args.includes('check-ignore') ? args.at(-1) : '');
function write(
  root,
  relative = 'apps/api/.dev.vars',
  entries = `BETTER_AUTH_SECRET="${secret}"\nBETTER_AUTH_URL="https://app.customer.com"\n`,
) {
  writeFileSync(path.join(root, relative), entries, { mode: 0o600 });
}
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
        rmSync(path.join(root, 'apps/api/.dev.vars'));
        writeFileSync(path.join(root, 'outside-env'), `BETTER_AUTH_SECRET=${secret}`);
        symlinkSync(path.join(root, 'outside-env'), path.join(root, 'apps/api/.dev.vars'));
      }
      const runner =
        state === 'tracked'
          ? async () => 'apps/api/.dev.vars'
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
      path.join(root, 'apps/api/wrangler.jsonc'),
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

test('broad private runtime permissions stop before git checks and leave file unchanged', async () => {
  if (process.platform === 'win32') return;
  const root = fixture();
  try {
    write(root);
    const file = path.join(root, 'apps/api/.dev.vars');
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

test('new defaults send auth credentials only to the API', () => {
  const root = fixture();
  try {
    writeProjectSection(root, 'setup', createSetupPlan(parseStandardOptions([root])));
    assert.deepEqual(runtimeTargets(root, { BETTER_AUTH_SECRET: secret }), {
      'apps/api/.dev.vars': { BETTER_AUTH_SECRET: secret },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('billing credentials and catalog stay on Hono while only platform SDK keys reach Expo', () => {
  const root = fixture(['--hono', '--expo', '--better-auth', '--stripe', '--revenuecat']);
  try {
    const values = {
      STRIPE_SECRET_KEY: 'stripe-private-runtime',
      STRIPE_WEBHOOK_SECRET: 'stripe-webhook-runtime',
      BILLING_ORIGIN: 'https://example.com',
      BILLING_ENVIRONMENT: 'sandbox',
      BILLING_PLANS_JSON: JSON.stringify({
        premium: { label: 'Premium', stripePriceId: 'price_fixture', entitlement: 'premium' },
      }),
      BILLING_ENTITLEMENTS_JSON: '["premium"]',
      BILLING_PREMIUM_ENTITLEMENT: 'premium',
      REVENUECAT_SECRET_KEY: 'revenuecat-private-runtime',
      REVENUECAT_WEBHOOK_AUTHORIZATION: 'revenuecat-webhook-runtime',
      REVENUECAT_WEBHOOK_SIGNING_SECRET: 'revenuecat-signing-runtime',
      REVENUECAT_PROJECT_ID: 'proj_fixture',
      REVENUECAT_APP_IDS_JSON: '["app_ios","app_android"]',
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_public',
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_public',
    };
    const targets = runtimeTargets(root, values);
    assert.deepEqual(targets['apps/mobile/.env.local'], {
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_public',
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: 'goog_public',
    });
    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith('EXPO_PUBLIC_'))
        assert.equal(targets['apps/api/.dev.vars'][key], undefined);
      else assert.equal(targets['apps/api/.dev.vars'][key], value);
    }
    assert.doesNotMatch(
      JSON.stringify(targets['apps/mobile/.env.local']),
      /private|webhook|signing|price_fixture/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
