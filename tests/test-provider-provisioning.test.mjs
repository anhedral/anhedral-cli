import { readProjectConfig, writeProjectSection } from '../dist/project-config.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  statSync,
  symlinkSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { parseStandardOptions } from '../dist/standard.js';
import { createSetupPlan } from '../dist/capabilities.js';
import { authenticateProviders } from '../dist/provider-auth.js';
import { providerConfigurationTemplate } from '../dist/providers/config.js';
import {
  planProviderProvisioning,
  provisionSelectedProviders,
} from '../dist/providers/provision.js';
import { configuredRuntime, configureRuntime } from '../dist/providers/runtime.js';
import { providerApi } from '../dist/providers/api.js';

const secret = 'fixture-runtime-only-value';
const connection = new URL('postgresql://example.neon.tech/app');
connection.username = 'app_owner';
connection.password = secret;
const scenarios = {
  stripe: {
    settings: {
      accountId: 'acct_1',
      mode: 'test',
      webhookUrl: 'https://example.com/api/stripe',
      webhookEvents: ['checkout.session.completed'],
    },
    routes: {
      'GET /v1/account': { id: 'acct_1', charges_enabled: false },
      'POST /v1/webhook_endpoints': { id: 'we_1', secret },
      'GET /v1/webhook_endpoints/we_1': {
        id: 'we_1',
        url: 'https://example.com/api/stripe',
        livemode: false,
        status: 'enabled',
        enabled_events: ['checkout.session.completed'],
      },
    },
    keys: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'BILLING_ENVIRONMENT'],
    mutations: 1,
  },
  revenuecat: {
    settings: { name: 'example', bundleId: 'com.example.app', packageName: 'com.example.app' },
    routes: {
      'POST /v2/projects': { id: 'proj1' },
      'GET /v2/projects/proj1': { id: 'proj1' },
      'POST /v2/projects/proj1/apps': (body) => ({
        id: body.type === 'app_store' ? 'app1' : 'app2',
      }),
      'GET /v2/projects/proj1/apps/app1': {
        type: 'app_store',
        app_store: { bundle_id: 'com.example.app' },
      },
      'GET /v2/projects/proj1/apps/app2': {
        type: 'play_store',
        play_store: { package_name: 'com.example.app' },
      },
      'GET /v2/projects/proj1/apps/app1/public_api_keys': {
        items: [{ app_id: 'app1', environment: 'production', key: 'appl_public' }],
      },
      'GET /v2/projects/proj1/apps/app2/public_api_keys': {
        items: [{ app_id: 'app2', environment: 'production', key: 'goog_public' }],
      },
    },
    keys: [
      'REVENUECAT_PROJECT_ID',
      'REVENUECAT_APP_IDS_JSON',
      'BILLING_ENVIRONMENT',
      'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
      'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
      'STRIPE_SECRET_KEY',
    ],
    mutations: 3,
  },
};
const credentials = {
  NEON_API_KEY: 'management',
  CLERK_PLATFORM_API_KEY: 'management',
  RESEND_API_KEY: 'management',
  STRIPE_SECRET_KEY: 'sk_test_fixture',
  RC_API_KEY: 'management',
  SENTRY_AUTH_TOKEN: 'management',
  POSTHOG_PERSONAL_API_KEY: 'management',
  OPENAI_ADMIN_KEY: 'management',
};
function fixture(provider) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-provider-test-'));
  const flags = [`--${provider}`, ...(provider === 'revenuecat' ? ['--stripe'] : [])];
  const setup = createSetupPlan(parseStandardOptions([root, '--skip-install', ...flags]));
  writeProjectSection(root, 'setup', setup);
  const configuration = {
    schemaVersion: 1,
    providers: {
      [provider]: scenarios[provider].settings,
      ...(provider === 'revenuecat' ? { stripe: { accountId: 'acct_1', mode: 'test' } } : {}),
    },
  };
  writeProjectSection(root, 'providers', configuration);
  for (const directory of ['apps/api', 'apps/web', 'apps/mobile', 'packages/db'])
    mkdirSync(path.join(root, directory), { recursive: true });
  return root;
}
function runner(root, tracked = '') {
  return async (_command, args) => {
    if (args.includes('--show-toplevel')) return root;
    if (args.includes('ls-files')) return tracked;
    if (args.includes('check-ignore')) return args.at(-1);
    return JSON.stringify({ loggedIn: true, accounts: [{ id: 'a'.repeat(32) }] });
  };
}
function transport(provider, calls, override = {}) {
  return async (input, options) => {
    const url = new URL(input);
    const route = `${options.method ?? 'GET'} ${url.pathname}`;
    const routes = {
      ...scenarios[provider].routes,
      ...(provider === 'revenuecat' ? scenarios.stripe.routes : {}),
      ...override,
    };
    calls.push({ url, route, options });
    assert.equal(options.redirect, 'error');
    assert.ok(routes[route], `Unexpected API route: ${route}`);
    const entry = routes[route];
    const body =
      options.body &&
      (options.headers['Content-Type'] === 'application/json'
        ? JSON.parse(options.body)
        : Object.fromEntries(new URLSearchParams(options.body)));
    return new Response(JSON.stringify(typeof entry === 'function' ? entry(body) : entry));
  };
}

for (const provider of Object.keys(scenarios)) {
  test(`${provider}: provisions selected resources, configures runtime, verifies identities and reuses one-time credentials on retry`, async () => {
    const root = fixture(provider);
    const calls = [];
    const send = transport(provider, calls);
    try {
      const preview = await provisionSelectedProviders(root, true, runner(root), send, {});
      assert.equal(preview.mutation, false);
      assert.equal(calls.length, 0);
      assert.equal(existsSync(path.join(root, '.anhedral')), false);
      const response = await provisionSelectedProviders(
        root,
        false,
        runner(root),
        send,
        credentials,
      );
      assert.equal(response.ready, true);
      assert.doesNotMatch(JSON.stringify(response), new RegExp(secret));
      const values = configuredRuntime(root);
      assert.deepEqual(Object.keys(values).sort(), [...scenarios[provider].keys].sort());
      const retry = await provisionSelectedProviders(root, false, runner(root), send, credentials);
      assert.deepEqual(retry.results, response.results);
      assert.equal(
        calls.filter((call) => call.options.method === 'POST').length,
        scenarios[provider].mutations,
      );
      if (process.platform !== 'win32')
        assert.equal(statSync(path.join(root, '.anhedral/runtime.json')).mode & 0o777, 0o600);
      if (provider === 'revenuecat') {
        const mobile = readFileSync(path.join(root, 'apps/mobile/.env.local'), 'utf8');
        assert.match(mobile, /EXPO_PUBLIC_REVENUECAT_IOS/);
        assert.doesNotMatch(mobile, /STRIPE_SECRET|management/);
      }
      if (provider === 'resend') {
        const body = JSON.parse(
          calls.find((call) => call.url.pathname === '/api-keys').options.body,
        );
        assert.equal(body.permission, 'sending_access');
        assert.equal(body.domain_id, 'domain-1');
      }
      if (provider === 'posthog')
        assert.ok(calls.every((call) => call.url.origin === 'https://eu.posthog.com'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('preflight rejects credentials in tracked configuration, missing credentials and unselected providers before any mutation', async () => {
  const root = fixture('stripe');
  let calls = 0;
  const send = async () => {
    calls++;
    throw new Error('unexpected network');
  };
  try {
    await assert.rejects(
      provisionSelectedProviders(root, false, runner(root), send, {}),
      /STRIPE_SECRET_KEY/,
    );
    writeProjectSection(root, 'providers', {
      schemaVersion: 1,
      providers: { stripe: { STRIPE_SECRET_KEY: secret } },
    });
    assert.throws(() => planProviderProvisioning(root), /Credentials belong/);
    writeProjectSection(root, 'providers', {
      schemaVersion: 1,
      providers: { revenuecat: scenarios.revenuecat.settings },
    });
    assert.throws(() => planProviderProvisioning(root), /unselected/);
    assert.equal(calls, 0);
    assert.equal(existsSync(path.join(root, '.anhedral')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('private configuration refuses tracked files, symlinks and conflicting values without overwriting user configuration', async () => {
  const root = fixture('stripe');
  const outside = mkdtempSync(path.join(tmpdir(), 'anhedral-provider-outside-'));
  try {
    await assert.rejects(
      provisionSelectedProviders(
        root,
        false,
        runner(root, '.anhedral/providers.json'),
        transport('stripe', []),
        credentials,
      ),
      /not be tracked/,
    );
    symlinkSync(outside, path.join(root, '.anhedral'));
    await assert.rejects(
      provisionSelectedProviders(root, false, runner(root), transport('stripe', []), credentials),
      /regular directory/,
    );
    rmSync(path.join(root, '.anhedral'));
    mkdirSync(path.join(root, '.anhedral'));
    writeFileSync(path.join(root, 'apps/api/.dev.vars'), 'STRIPE_SECRET_KEY="user-owned"\n');
    await assert.rejects(
      configureRuntime(root, { STRIPE_SECRET_KEY: secret }, runner(root)),
      /differs/,
    );
    assert.equal(
      readFileSync(path.join(root, 'apps/api/.dev.vars'), 'utf8'),
      'STRIPE_SECRET_KEY="user-owned"\n',
    );
    assert.equal(existsSync(path.join(root, 'packages/db/.env')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('provider API bounds response sizes and rejects redirect paths without exposing credentials', async () => {
  const api = providerApi(
    'revenuecat',
    {},
    credentials,
    async () => new Response(JSON.stringify({ text: 'x'.repeat(2 * 1024 * 1024) })),
  );
  await assert.rejects(api('//untrusted.example/path'), /Invalid provider/);
  await assert.rejects(api('/api/v2/projects'), /oversized JSON/);
});

test('init templates enumerate only the chosen integrations and contain no credentials', () => {
  const template = providerConfigurationTemplate(['stripe', 'revenuecat'], 'example');
  assert.deepEqual(Object.keys(template.providers), ['stripe', 'revenuecat']);
  assert.doesNotMatch(JSON.stringify(template), /API_KEY|SECRET|management/);
});

const invalidResources = [
  ['stripe', 'GET /v1/account', { id: 'acct_foreign' }, /account/],
  [
    'stripe',
    'GET /v1/webhook_endpoints/we_1',
    {
      id: 'we_1',
      url: 'https://foreign.example/',
      livemode: false,
      status: 'enabled',
      enabled_events: ['checkout.session.completed'],
    },
    /webhook/,
  ],
  [
    'stripe',
    'GET /v1/webhook_endpoints/we_1',
    {
      id: 'we_1',
      url: 'https://example.com/api/stripe',
      livemode: true,
      status: 'enabled',
      enabled_events: ['checkout.session.completed'],
    },
    /mode/,
  ],
  ['revenuecat', 'GET /v2/projects/proj1', { id: 'foreign' }, /project/],
  ['revenuecat', 'GET /v2/projects/proj1/apps/app1', { type: 'play_store' }, /platform/],
  ['revenuecat', 'GET /v2/projects/proj1/apps/app1/public_api_keys', { items: [] }, /exactly one/],
];
for (const [provider, route, response, expected] of invalidResources) {
  test(`${provider}: rejects mismatched or unusable resource at ${route}: ${JSON.stringify(response)}`, async () => {
    const root = fixture(provider);
    try {
      await assert.rejects(
        provisionSelectedProviders(
          root,
          false,
          runner(root),
          transport(provider, [], { [route]: response }),
          credentials,
        ),
        expected,
      );
      assert.equal(existsSync(path.join(root, '.anhedral/runtime.json')), false);
      assert.equal(existsSync(path.join(root, 'apps/api/.dev.vars')), false);
      assert.equal(existsSync(path.join(root, 'apps/mobile/.env.local')), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

for (const values of [
  { UNKNOWN_SECRET: secret },
  { STRIPE_SECRET_KEY: '' },
  { STRIPE_SECRET_KEY: 'line\nbreak' },
  { STRIPE_SECRET_KEY: '\0' },
  { STRIPE_SECRET_KEY: 'x'.repeat(16385) },
]) {
  test(`runtime rejects invalid values before any file write: ${Object.keys(values)}/${String(Object.values(values)[0]).length}`, async () => {
    const root = fixture('stripe');
    try {
      await assert.rejects(
        configureRuntime(root, values, runner(root)),
        /Invalid provider runtime configuration/,
      );
      assert.equal(existsSync(path.join(root, 'apps/api/.dev.vars')), false);
      assert.equal(existsSync(path.join(root, 'packages/db/.env')), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('runtime detects duplicate keys and refuses tracked environment destinations before writing', async () => {
  const root = fixture('stripe');
  try {
    writeFileSync(
      path.join(root, 'apps/api/.dev.vars'),
      'STRIPE_SECRET_KEY="same"\nexport STRIPE_SECRET_KEY="same"\n',
    );
    await assert.rejects(
      configureRuntime(root, { STRIPE_SECRET_KEY: 'same' }, runner(root)),
      /Duplicate/,
    );
    rmSync(path.join(root, 'apps/api/.dev.vars'));
    const run = async (command, args) =>
      args.includes('ls-files') && args.at(-1) === 'apps/api/.dev.vars'
        ? 'apps/api/.dev.vars'
        : runner(root)(command, args);
    await assert.rejects(
      configureRuntime(root, { STRIPE_SECRET_KEY: secret }, run),
      /not be tracked/,
    );
    assert.equal(existsSync(path.join(root, 'apps/api/.dev.vars')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const configuration of [
  null,
  { schemaVersion: 2, providers: {} },
  { schemaVersion: 1, providers: [] },
  { schemaVersion: 1, providers: {}, secret: 'private' },
]) {
  test(`provider configuration fails closed: ${JSON.stringify(configuration)}`, () => {
    const root = fixture('stripe');
    try {
      writeFileSync(
        path.join(root, 'anhedral.json'),
        JSON.stringify({ ...readProjectConfig(root), providers: configuration }),
      );
      assert.throws(() => planProviderProvisioning(root), /Invalid|Unsupported/);
      assert.equal(existsSync(path.join(root, '.anhedral')), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
for (const webhookUrl of [
  'http://example.com/hook',
  'https://user:password@example.com/hook',
  'https://example.com/hook?secret=value',
  'https://example.com/hook#fragment',
  'not-a-url',
]) {
  test(`Stripe webhook configuration rejects unsafe URL ${webhookUrl}`, () => {
    const root = fixture('stripe');
    try {
      writeProjectSection(root, 'providers', {
        schemaVersion: 1,
        providers: {
          stripe: {
            accountId: 'acct_1',
            mode: 'test',
            webhookUrl,
            webhookEvents: ['checkout.session.completed'],
          },
        },
      });
      assert.throws(() => planProviderProvisioning(root), /Webhook URL/);
      assert.equal(existsSync(path.join(root, '.anhedral')), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
