import { writeProjectSection, readProjectSection } from '../dist/project-config.js';
import assert from 'node:assert/strict';
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
import { registerVercelApplication } from '../dist/vercel.js';
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
    createSetupPlan(parseStandardOptions([root, '--hono', '--d1', '--skip-install'])),
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

test('selected-stack ship provisions Neon, configures ignored credentials and deploys code with secrets in one checked operation', async () => {
  const root = await fixture();
  const files = [];
  let projects = 0;
  const commit = 'b'.repeat(40);
  const connection = new URL('postgresql://example.neon.tech/app');
  connection.username = 'app';
  connection.password = 'runtime-password';
  const value = connection.href;
  const run = async (command, args, cwd, environment) => {
    if (command === 'git') {
      if (args.includes('--show-toplevel')) return root;
      if (args.includes('--porcelain') || args.includes('ls-files')) return '';
      if (args.includes('check-ignore')) return args.at(-1);
      if (args[0] === 'show')
        return readFileSync(path.join(root, args[1].slice('HEAD:'.length)), 'utf8');
      return commit;
    }
    if (args.includes('whoami'))
      return JSON.stringify({ loggedIn: true, accounts: [{ id: account }] });
    if (args.join(' ') === 'run check') return '';
    if (args[0] === 'run' && args[1] === 'deploy') {
      assert.equal(args[2], '--secrets-file');
      const file = args[3];
      files.push(file);
      assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { DATABASE_URL: value });
      assert.doesNotMatch(readFileSync(file, 'utf8'), /management-key/);
      assert.equal(cwd, realpathSync(path.join(root, 'apps/api')));
      writeFileSync(
        environment.WRANGLER_OUTPUT_FILE_PATH,
        JSON.stringify({
          type: 'deploy',
          version: 1,
          worker_name: 'example-api',
          version_id: 'version-api',
          targets: ['https://example-api.customer.workers.dev'],
        }) + '\n',
      );
      return '';
    }
    if (args.includes('status'))
      return JSON.stringify({ versions: [{ version_id: 'version-api', percentage: 100 }] });
    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
  };
  const send = async (input, options) => {
    const url = new URL(input);
    assert.equal(options.headers.Authorization, 'Bearer management-key');
    if (options.method === 'POST') {
      projects++;
      return new Response(JSON.stringify({ project: { id: 'neon-project' } }));
    }
    const payload = url.pathname.endsWith('operations')
      ? { operations: [] }
      : url.pathname.endsWith('connection_uri')
        ? { uri: value }
        : { project: { id: 'neon-project', org_id: 'org-1' } };
    return new Response(JSON.stringify(payload));
  };
  try {
    writeProjectSection(
      root,
      'setup',
      createSetupPlan(parseStandardOptions([root, '--hono', '--neon', '--skip-install'])),
    );
    writeFileSync(
      path.join(root, 'apps/api/wrangler.jsonc'),
      JSON.stringify({ name: 'example-api' }),
    );
    writeProjectSection(root, 'providers', {
      schemaVersion: 1,
      providers: {
        neon: {
          name: 'example',
          organizationId: 'org-1',
          region: 'aws-us-east-1',
          database: 'app',
          role: 'app',
        },
      },
    });
    const result = await shipCloudflareApplication(
      root,
      false,
      run,
      async () => ({ result: [] }),
      send,
      { NEON_API_KEY: 'management-key' },
    );
    assert.equal(result.release.state, 'deployed');
    assert.equal(result.productVerification, 'required');
    assert.equal(projects, 1);
    assert.equal(files.length, 1);
    assert.equal(existsSync(files[0]), false);
    assert.doesNotMatch(JSON.stringify(result), /runtime-password|management-key/);
    assert.match(readFileSync(path.join(root, 'apps/api/.dev.vars'), 'utf8'), /DATABASE_URL=/);
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
      createSetupPlan(
        parseStandardOptions([root, '--hono', '--d1', '--better-auth', '--skip-install']),
      ),
    );
    writeFileSync(
      path.join(root, 'apps/api/wrangler.jsonc'),
      JSON.stringify({ name: 'example-api' }),
    );
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

async function mixedFixture() {
  const root = await fixture();
  mkdirSync(path.join(root, 'apps/web'), { recursive: true });
  writeFileSync(
    path.join(root, 'apps/web/package.json'),
    JSON.stringify({ scripts: { build: 'next build' } }),
  );
  writeProjectSection(
    root,
    'setup',
    createSetupPlan(parseStandardOptions([root, '--next', '--hono', '--d1', '--skip-install'])),
  );
  const web = registerVercelApplication(root);
  writeProjectSection(root, 'vercel', {
    ...web,
    teamId: 'team_Customer',
    projectId: 'prj_Application',
    scope: 'customer',
    audience: 'public',
    use: 'personal',
  });
  return root;
}

test('mixed stack preview orders dependencies without provider calls and blocks missing accounts before mutations', async () => {
  const root = await mixedFixture();
  let calls = 0;
  const run = async () => {
    calls++;
    throw new Error('unexpected command');
  };
  try {
    const plan = await shipSelectedStack(root, true, run);
    assert.deepEqual(plan.dependencies, [
      { target: 'cloudflare', after: [] },
      { target: 'vercel', after: ['cloudflare'] },
    ]);
    assert.equal(plan.mutation, false);
    assert.equal(calls, 0);
    const web = readProjectSection(root, 'vercel');
    writeProjectSection(root, 'vercel', { ...web, teamId: null });
    await assert.rejects(shipSelectedStack(root, false, run), /Connect both/);
    assert.equal(calls, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('mixed delivery retains completed Cloudflare evidence when later Vercel checks fail', async () => {
  const root = await mixedFixture();
  let checks = 0;
  let deployed = 0;
  try {
    writeFileSync(
      path.join(root, 'apps/api/wrangler.jsonc'),
      JSON.stringify({ name: 'example-api' }),
    );
    const result = await shipSelectedStack(
      root,
      false,
      async (command, args, cwd, env) => {
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
          if (++checks === 3) throw new Error('private-provider-diagnostic');
          return '';
        }
        if (args.join(' ') === 'run deploy') {
          deployed++;
          writeFileSync(
            env.WRANGLER_OUTPUT_FILE_PATH,
            JSON.stringify({
              type: 'deploy',
              version: 1,
              worker_name: 'example-api',
              version_id: 'version-mixed',
              targets: ['https://example-api.customer.workers.dev'],
            }) + '\n',
          );
          return '';
        }
        if (args.includes('status'))
          return JSON.stringify({ versions: [{ version_id: 'version-mixed', percentage: 100 }] });
        throw new Error('Unexpected fixture command');
      },
      async () => ({ result: [] }),
    );
    assert.equal(result.state, 'partial');
    assert.equal(result.deployed, false);
    assert.equal(result.operation.state, 'failed');
    assert.equal(result.targets[0].result.release.state, 'deployed');
    assert.equal(deployed, 1);
    assert.equal(result.targets[1].state, 'failed');
    assert.doesNotMatch(JSON.stringify(result), /private-provider-diagnostic/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('mixed stack verifies Cloudflare before deploying Vercel and retains both release receipts', async () => {
  const root = await mixedFixture();
  let servicesVerified = false;
  let webDeployed = false;
  const web = readProjectSection(root, 'vercel');
  try {
    writeFileSync(
      path.join(root, 'apps/api/wrangler.jsonc'),
      JSON.stringify({ name: 'example-api' }),
    );
    mkdirSync(path.join(root, '.vercel'));
    writeFileSync(
      path.join(root, '.vercel/project.json'),
      JSON.stringify({ orgId: web.teamId, projectId: web.projectId }),
    );
    const run = async (command, args, _cwd, env) => {
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
      if (args.join(' ') === 'run check') return '';
      if (args.join(' ') === 'run deploy') {
        writeFileSync(
          env.WRANGLER_OUTPUT_FILE_PATH,
          JSON.stringify({
            type: 'deploy',
            version: 1,
            worker_name: 'example-api',
            version_id: 'version-mixed-success',
            targets: ['https://example-api.customer.workers.dev'],
          }) + '\n',
        );
        return '';
      }
      if (args.includes('status')) {
        servicesVerified = true;
        return JSON.stringify({
          versions: [{ version_id: 'version-mixed-success', percentage: 100 }],
        });
      }
      const project = {
        id: web.projectId,
        accountId: web.teamId,
        name: web.name,
        framework: 'nextjs',
        rootDirectory: 'apps/web',
        sourceFilesOutsideRootDirectory: true,
        ssoProtection: null,
        targets: { production: { id: webDeployed ? 'dpl_New' : 'dpl_Old' } },
      };
      if (args[2] === 'project' && args[3] === 'inspect')
        return JSON.stringify({ ...project, owner: { slug: 'customer' } });
      if (args[2] === 'api') {
        if (args[3].startsWith('/v2/teams/'))
          return JSON.stringify({ id: web.teamId, slug: 'customer', billing: { plan: 'pro' } });
        if (args[3].startsWith('/v9/projects/')) return JSON.stringify(project);
        if (args[3].startsWith('/v13/deployments/'))
          return JSON.stringify({
            id: 'dpl_New',
            projectId: web.projectId,
            ownerId: web.teamId,
            readyState: 'READY',
            target: 'production',
            url: 'example-deployment.vercel.app',
            alias: ['example.vercel.app'],
            meta: { anhedralProject: web.id, anhedralCommit: 'b'.repeat(40) },
          });
      }
      if (args[2] === 'deploy') {
        assert.equal(servicesVerified, true);
        webDeployed = true;
        return JSON.stringify({
          status: 'ok',
          deployment: {
            id: 'dpl_New',
            readyState: 'READY',
            target: 'production',
            url: 'https://example-deployment.vercel.app',
            productionUrl: 'https://example.vercel.app',
          },
        });
      }
      throw new Error('Unexpected fixture command: ' + args.slice(0, 4).join(' '));
    };
    const result = await shipSelectedStack(root, false, run, async () => ({ result: [] }));
    assert.equal(result.state, 'deployed');
    assert.equal(result.operation.target, 'mixed');
    assert.equal(result.operation.state, 'completed');
    assert.equal(webDeployed, true);
    assert.equal(result.targets.length, 2);
    assert.ok(result.targets.every((target) => target.result.release.state === 'deployed'));
    assert.equal(result.productVerification, 'required');
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
    createSetupPlan(
      parseStandardOptions([root, '--hono', '--d1', '--better-auth', '--skip-install']),
    ),
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

test('Void full shipping preserves stdin secrets and commits first-lock handoff after provider confirmation', async () => {
  const f = await voidFixture({ firstLock: true, lockBeforeSecrets: true });
  try {
    const result = await shipCloudflareApplication(
      f.root,
      false,
      f.run,
      f.request,
      undefined,
      {},
      { voidLogsDirectory: f.logs },
    );
    assert.equal(result.release.state, 'configuration-required');
    assert.equal(result.state, 'configuration-required');
    assert.equal(result.activated, true);
    assert.equal(result.deployed, false);
    assert.equal(result.release.targets[0].providerConfirmed, true);
    assert.deepEqual(result.release.configurationChanges, ['apps/api/void.lock.json']);
    const puts = f.calls.filter(({ args }) => args.includes('put'));
    assert.equal(puts.length, 2);
    assert.equal(puts.find(({ args }) => args.at(-1) === 'BETTER_AUTH_SECRET').input, f.secret);
    assert.ok(!JSON.stringify(f.calls.map(({ args }) => args)).includes(f.secret));
    assert.equal(
      f.calls.some(({ args }) => args.join(' ') === 'run deploy'),
      false,
    );
    assert.equal(
      f.requests.every(({ method }) => method === 'GET'),
      true,
    );
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('Void full shipping rejects provider version mismatch and records failure', async () => {
  const f = await voidFixture({ mismatch: true });
  try {
    await assert.rejects(
      shipCloudflareApplication(
        f.root,
        false,
        f.run,
        f.request,
        undefined,
        {},
        { voidLogsDirectory: f.logs },
      ),
      /active version differs/,
    );
    const record = JSON.parse(
      readFileSync(path.join(f.root, '.anhedral/releases.json'), 'utf8'),
    ).releases.at(-1);
    assert.equal(record.state, 'failed');
    assert.equal(record.targets[0].providerConfirmed, false);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('Void full shipping checks source before secret mutation', async () => {
  const f = await voidFixture({ sourceChange: true });
  try {
    await assert.rejects(
      shipCloudflareApplication(
        f.root,
        false,
        f.run,
        f.request,
        undefined,
        {},
        { voidLogsDirectory: f.logs },
      ),
      /Source changed before Void secret upload/,
    );
    assert.equal(
      f.calls.some(({ args }) => args.includes('put') || args.includes('deploy')),
      false,
    );
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('Void fresh checkout without Cloudflare credentials stops before secret or deployment mutation', async () => {
  const f = await voidFixture({ unauthenticated: true });
  try {
    await assert.rejects(
      shipCloudflareApplication(
        f.root,
        false,
        f.run,
        f.request,
        undefined,
        {},
        { voidLogsDirectory: f.logs },
      ),
      /cannot access the registered Cloudflare account/,
    );
    assert.equal(
      f.calls.some(({ args }) => args.includes('put') || args.includes('deploy')),
      false,
    );
    assert.equal(f.requests.length, 0);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
