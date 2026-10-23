import { writeProjectSection, readProjectSection } from '../dist/project-config.js';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  realpathSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { registerApplication, connectApplication } from '../dist/delivery.js';
import { shipCloudflareApplication, shipSelectedStack } from '../dist/ship.js';
import { parseStandardOptions } from '../dist/standard.js';
import { createSetupPlan } from '../dist/capabilities.js';

const account = 'a'.repeat(32);
async function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-ship-test-'));
  mkdirSync(path.join(root, 'apps/api'), { recursive: true });
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'example' }));
  writeProjectSection(
    root,
    'setup',
    createSetupPlan(parseStandardOptions([root, '--skip-install'])),
  );
  writeFileSync(
    path.join(root, 'apps/api/package.json'),
    JSON.stringify({ scripts: { deploy: 'wrangler deploy' } }),
  );
  writeFileSync(
    path.join(root, 'apps/api/wrangler.jsonc'),
    JSON.stringify({
      name: 'example-api',
      d1_databases: [
        { binding: 'DB', database_name: 'example-db', database_id: 'REPLACE_WITH_D1_ID' },
      ],
    }),
  );
  writeFileSync(
    path.join(root, 'apps/api/.dev.vars'),
    `BETTER_AUTH_SECRET=${JSON.stringify(randomBytes(32).toString('hex'))}\nBETTER_AUTH_URL="https://api.customer.com"\n`,
    { mode: 0o600 },
  );
  registerApplication(root);
  await connectApplication(root, account, 'public', async () =>
    JSON.stringify({ loggedIn: true, accounts: [{ id: account }] }),
  );
  return root;
}

test('ship previews provisioning without writes and stops before deployment when binding IDs need a source commit', async () => {
  const root = await fixture();
  const commands = [];
  const requests = [];
  const run = async (command, args) => {
    commands.push(args);
    if (args.includes('whoami'))
      return JSON.stringify({ loggedIn: true, accounts: [{ id: account }] });
    if (args.includes('--show-toplevel')) return root;
    if (args.includes('HEAD')) return 'b'.repeat(40);
    if (args.includes('check-ignore')) return args.at(-1);
    if (args.includes('--porcelain'))
      return readFileSync(path.join(root, 'apps/api/wrangler.jsonc'), 'utf8').includes(
        'resolved-database',
      )
        ? ' M apps/api/wrangler.jsonc'
        : '';
    return '';
  };
  const request = async (method, endpoint) => {
    requests.push({ method, endpoint });
    return {
      result: method === 'GET' ? [] : { uuid: 'resolved-database' },
      result_info: { total_pages: 1 },
    };
  };
  try {
    const preview = await shipCloudflareApplication(root, true, run, request);
    assert.equal(preview.mutation, false);
    assert.equal(preview.resourcesProvisioned, false);
    assert.equal(preview.provisioning.resources.length, 1);
    assert.equal(commands.length, 0);
    assert.equal(requests.length, 0);
    const result = await shipCloudflareApplication(root, false, run, request);
    assert.equal(result.state, 'configuration-required');
    assert.equal(result.deployed, false);
    assert.equal(requests.filter((r) => r.method === 'POST').length, 1);
    assert.equal(
      commands.some((args) => args.includes('deploy') || args.includes('commit')),
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('failed checks prevent provisioning and deployment', async () => {
  const root = await fixture();
  let requests = 0;
  try {
    await assert.rejects(
      shipCloudflareApplication(
        root,
        false,
        async (_command, args) => {
          if (args.includes('check-ignore')) return args.at(-1);
          if (args.includes('ls-files')) return '';
          if (args.includes('check-ignore')) return args.at(-1);
          if (args.includes('ls-files')) return '';
          if (args.includes('--show-toplevel')) return root;
          if (args.includes('--porcelain')) return '';
          if (args.includes('HEAD')) return 'c'.repeat(40);
          throw new Error('Product checks failed');
        },
        async () => {
          requests++;
          return { result: [] };
        },
      ),
      /checks failed/,
    );
    assert.equal(requests, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('source revision changes during resource provisioning stop shipping before deployment', async () => {
  const root = await fixture();
  let changed = false;
  let deployed = false;
  try {
    // Existing bindings avoid the intentional review-and-commit pause.
    writeFileSync(
      path.join(root, 'apps/api/wrangler.jsonc'),
      JSON.stringify({ name: 'example-api' }),
    );
    await assert.rejects(
      shipCloudflareApplication(
        root,
        false,
        async (_command, args) => {
          if (args.includes('check-ignore')) return args.at(-1);
          if (args.includes('ls-files')) return '';
          if (args.includes('check-ignore')) return args.at(-1);
          if (args.includes('ls-files')) return '';
          if (args.includes('--show-toplevel')) return root;
          if (args.includes('--porcelain')) return '';
          if (args.includes('HEAD')) return (changed ? 'c' : 'b').repeat(40);
          if (args.includes('whoami')) {
            changed = true;
            return JSON.stringify({ loggedIn: true, accounts: [{ id: account }] });
          }
          if (args.includes('deploy')) deployed = true;
          return '';
        },
        async () => ({ result: [] }),
      ),
      /Source changed during provider configuration/,
    );
    assert.equal(deployed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Better Auth prerequisites stop before provider mutations and valid auth keys reach only the selected deployment', async () => {
  const root = await fixture();
  let requests = 0;
  const secret = '0123456789abcdef'.repeat(4);
  const calls = [];
  const run = async (command, args, cwd, env) => {
    calls.push({ command, args, cwd, env });
    assert.equal(env.NEON_API_KEY, undefined);
    assert.equal(env.OPENAI_ADMIN_KEY, undefined);
    assert.equal(env.OPENAI_API_KEY, undefined);
    assert.equal(env.DATABASE_URL, undefined);
    if (command === 'git') {
      if (args.includes('--show-toplevel')) return root;
      if (args.includes('check-ignore')) return args.at(-1);
      if (args.includes('--porcelain') || args.includes('ls-files')) return '';
      if (args[0] === 'show')
        return readFileSync(path.join(root, args[1].slice('HEAD:'.length)), 'utf8');
      return 'b'.repeat(40);
    }
    if (args.includes('whoami'))
      return JSON.stringify({ loggedIn: true, accounts: [{ id: account }] });
    if (args.join(' ') === 'run check') {
      assert.equal(env.BETTER_AUTH_SECRET, undefined);
      return '';
    }
    if (args[0] === 'run' && args[1] === 'deploy') {
      const values = JSON.parse(readFileSync(args[args.indexOf('--secrets-file') + 1]));
      assert.deepEqual(values, {
        BETTER_AUTH_SECRET: secret,
        BETTER_AUTH_URL: 'https://api.customer.com',
      });
      writeFileSync(
        env.WRANGLER_OUTPUT_FILE_PATH,
        JSON.stringify({
          type: 'deploy',
          version: 1,
          worker_name: 'example-api',
          version_id: 'version-auth',
          targets: ['https://example-api.customer.workers.dev'],
        }) + '\n',
      );
      return '';
    }
    if (args.includes('status'))
      return JSON.stringify({ versions: [{ version_id: 'version-auth', percentage: 100 }] });
    throw new Error('Unexpected fixture command');
  };
  const request = async () => {
    requests++;
    return { result: [] };
  };
  try {
    writeProjectSection(
      root,
      'setup',
      createSetupPlan(parseStandardOptions([root, '--skip-install'])),
    );
    writeFileSync(
      path.join(root, 'apps/api/wrangler.jsonc'),
      JSON.stringify({ name: 'example-api' }),
    );
    rmSync(path.join(root, 'apps/api/.dev.vars'));
    await assert.rejects(
      shipCloudflareApplication(root, false, run, request, undefined, {
        NEON_API_KEY: 'management',
        OPENAI_ADMIN_KEY: 'management',
      }),
      /Configure BETTER_AUTH/,
    );
    assert.equal(requests, 0);
    assert.equal(
      calls.some(({ args }) => args.includes('deploy')),
      false,
    );
    writeFileSync(
      path.join(root, 'apps/api/.dev.vars'),
      `BETTER_AUTH_SECRET="${secret}"\nBETTER_AUTH_URL="https://api.customer.com"\nUNRELATED_SECRET="must-stay-local"\n`,
      { mode: 0o600 },
    );
    const result = await shipCloudflareApplication(root, false, run, request, undefined, {
      NEON_API_KEY: 'management',
      OPENAI_ADMIN_KEY: 'management',
    });
    assert.equal(result.release.state, 'deployed');
    assert.equal(result.operation.state, 'completed');
    assert.doesNotMatch(
      JSON.stringify(result),
      /0123456789abcdef|must-stay-local|fixture-management-credential-value|inherited-runtime-secret|inherited-database-secret|inherited-auth-secret/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

async function voidFixture(options = {}) {
  const root = await fixture();
  const directory = path.join(root, 'apps/api');
  rmSync(path.join(directory, 'wrangler.jsonc'));
  const config = { name: 'example-api', main: 'src/index.ts' };
  writeFileSync(path.join(directory, 'anhedral.cloudflare.json'), JSON.stringify(config));
  writeFileSync(path.join(directory, 'void.config.ts'), 'export default {};\n');
  writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({
      devDependencies: { void: '0.27.0' },
      scripts: { deploy: 'void deploy --platform cloudflare' },
    }),
  );
  const manifest = readProjectSection(root, 'cloudflare');
  manifest.deliveryEngine = 'void';
  writeProjectSection(root, 'cloudflare', manifest);
  writeProjectSection(
    root,
    'setup',
    createSetupPlan(parseStandardOptions([root, '--skip-install'])),
  );
  const secret = '0123456789abcdef'.repeat(4);
  writeFileSync(
    path.join(directory, '.env'),
    `BETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=https://api.customer.com\n`,
    { mode: 0o600 },
  );
  const logs = path.join(root, 'void-logs');
  mkdirSync(logs);
  const calls = [];
  let deployed = false;
  const versionId = '12345678-1234-1234-1234-123456789abc';
  const run = async (command, args, cwd, env, input) => {
    calls.push({ command, args, cwd, env, input });
    if (args.includes('token')) return JSON.stringify({ type: 'oauth', token: 'test-oauth-token' });
    if (command === 'node') return '24.21.0';
    if (args.includes('--version')) return '0.27.0';
    if (args.includes('whoami'))
      return JSON.stringify({
        loggedIn: !options.unauthenticated,
        accounts: options.unauthenticated ? [] : [{ id: account }],
      });
    if (command === 'git') {
      if (args.includes('--show-toplevel')) return root;
      if (args.includes('check-ignore')) return args.at(-1);
      if (args.includes('ls-files')) return '';
      if (args.includes('--porcelain')) {
        if (options.sourceChange && calls.some(({ args }) => args.includes('--version')))
          return ' M src/index.ts';
        return (deployed && options.firstLock) ||
          (options.lockBeforeSecrets && calls.some(({ args }) => args.includes('--version')))
          ? '?? apps/api/void.lock.json'
          : '';
      }
      if (args[0] === 'show')
        return readFileSync(path.join(root, args[1].slice('HEAD:'.length)), 'utf8');
      return 'b'.repeat(40);
    }
    if (args.join(' ') === 'exec void deploy --platform cloudflare') {
      assert.equal(env.BETTER_AUTH_SECRET, secret);
      const timestamp = Date.now();
      writeFileSync(
        path.join(logs, 'deploy-fixture.jsonl'),
        [
          { ts: timestamp, msg: 'deploy_start', cwd: realpathSync(directory) },
          {
            ts: timestamp + 1,
            msg: 'cloudflare_deploy_end',
            ok: true,
            worker: 'example-api',
            versionId,
          },
          { ts: timestamp + 2, msg: 'deploy_end', ok: true },
        ]
          .map(JSON.stringify)
          .join('\n'),
      );
      if (options.firstLock)
        writeFileSync(
          path.join(directory, 'void.lock.json'),
          JSON.stringify({
            version: 1,
            source: config,
            resolved: config,
            text: JSON.stringify(config),
          }),
        );
      deployed = true;
    }
    return '';
  };
  const requests = [];
  const request = async (method, endpoint) => {
    requests.push({ method, endpoint });
    assert.equal(method, 'GET', 'Anhedral must never provision Void resources');
    if (endpoint.endsWith('/deployments'))
      return {
        result: {
          deployments: [
            {
              versions: [
                { version_id: options.mismatch ? 'different-version' : versionId, percentage: 100 },
              ],
            },
          ],
        },
      };
    if (endpoint.endsWith('/subdomain')) return { result: { enabled: false } };
    throw new Error(`Unexpected provider request: ${endpoint}`);
  };
  return { root, logs, calls, run, request, secret, requests };
}
