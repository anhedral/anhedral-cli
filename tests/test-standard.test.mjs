import {
  readProjectSection,
  hasProjectSection,
  readProjectConfig,
} from '../dist/project-config.js';
import { STACK_DEPENDENCIES, WORKER_DEV_PORTS } from '../dist/dependencies.js';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import ts from 'typescript';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
import { CAPABILITIES, CAPABILITY_REGISTRY, createSetupPlan } from '../dist/capabilities.js';
import { STANDARD_PRODUCTS } from '../dist/stack-registry.js';

const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-standard-test-'));
const calls = [];
function seed(root) {
  mkdirSync(path.join(root, 'apps/web'), { recursive: true });
  mkdirSync(path.join(root, 'packages/ui'), { recursive: true });
  mkdirSync(path.join(root, 'packages/eslint-config'), { recursive: true });
  mkdirSync(path.join(root, 'packages/typescript-config'), { recursive: true });
  writeFileSync(
    path.join(root, 'packages/eslint-config/package.json'),
    JSON.stringify({ name: '@workspace/eslint-config' }),
  );
  writeFileSync(
    path.join(root, 'packages/typescript-config/package.json'),
    JSON.stringify({ name: '@workspace/typescript-config' }),
  );
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      packageManager: 'pnpm@11.0.0',
      devDependencies: { turbo: '^2' },
      scripts: {},
    }),
  );
  writeFileSync(
    path.join(root, 'apps/web/package.json'),
    JSON.stringify({
      name: 'web',
      scripts: { build: 'next build' },
      dependencies: { next: '16.3.6' },
    }),
  );
  writeFileSync(
    path.join(root, 'apps/web/next.config.ts'),
    'export default { transpilePackages: ["@workspace/ui"] };\n',
  );
  mkdirSync(path.join(root, 'apps/web/app'), { recursive: true });
  writeFileSync(
    path.join(root, 'apps/web/app/layout.tsx'),
    'export default function Layout({ children }: { children: React.ReactNode }) { return <html><body className="antialiased">{children}</body></html>; }\n',
  );
  writeFileSync(
    path.join(root, 'packages/ui/package.json'),
    JSON.stringify({ name: '@workspace/ui', dependencies: { shadcn: '4.21.1' } }),
  );
  writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    'packages:\n  - "apps/*"\n  - "packages/*"\nallowBuilds:\n  esbuild: true\n',
  );
  writeFileSync(
    path.join(root, 'turbo.json'),
    JSON.stringify({ tasks: { build: {}, dev: { persistent: true } } }),
  );
  writeFileSync(path.join(root, 'apps/web/package-lock.json'), '{}\n');
  writeFileSync(path.join(root, 'packages/ui/pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n');
}
function runner(command, args, cwd) {
  calls.push({ command, args, cwd });
  if (args[0] === 'dlx')
    seed(path.join(args[args.indexOf('--cwd') + 1], args[args.indexOf('--name') + 1]));
  if (args.includes('--lockfile-only'))
    writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
}
function options(name, products = []) {
  return parseStandardOptions([path.join(temp, name), '--skip-install', '--no-git', ...products]);
}
function read(root, file) {
  return JSON.parse(readFileSync(path.join(root, file), 'utf8'));
}
mock.method(console, 'log', () => {});
try {
  assert.deepEqual(Object.keys(CAPABILITIES).sort(), [...STANDARD_PRODUCTS].sort());
  const pluginRegistry = read(
    process.cwd(),
    'plugins/codex/distribution/references/capabilities.json',
  );
  assert.deepEqual(pluginRegistry, CAPABILITY_REGISTRY);
  assert.equal(
    readFileSync('plugins/codex/distribution/references/stack-standard.md', 'utf8'),
    readFileSync('docs/stack-standard.md', 'utf8'),
  );
  const mobilePlan = createSetupPlan(options('mobile-plan', ['--expo']));
  assert.equal(mobilePlan.setup.tools.includes('Wrangler'), true);
  assert.equal(
    mobilePlan.setup.capabilities.some(({ id }) => id === 'stripe'),
    false,
  );
  const vercelPlan = createSetupPlan(options('vercel-plan', ['--next', '--hosting=vercel']));
  assert.equal(vercelPlan.setup.tools.includes('Wrangler'), false);
  assert.ok(vercelPlan.setup.tools.includes('Vercel integration or CLI'));
  assert.ok(
    createSetupPlan({ ...options('planned'), dryRun: true }).setup.capabilities.every(
      ({ status }) => status === 'planned',
    ),
  );
  assert.deepEqual(options('default').products, ['expo']);
  assert.deepEqual(options('explicit-vercel', ['--next']).products, ['next']);
  assert.equal(options('explicit-vercel', ['--next']).hosting, 'vercel');
  assert.equal(options('supported-default', ['--hosting=cloudflare']).hosting, 'cloudflare');
  assert.deepEqual(options('mobile', ['--expo']).products, ['expo']);
  assert.deepEqual(options('auth', ['--clerk']).products, ['clerk', 'expo', 'hono']);
  for (const flags of [
    ['--all'],
    ['--neon', '--d1'],
    ['--clerk', '--better-auth'],
    ['--hono', '--hosting=vercel'],
    ['--expo', '--hosting=vercel'],
  ]) {
    assert.throws(() => options('invalid', flags));
  }
  const dry = { ...options('dry', ['--expo']), dryRun: true, json: true };
  await scaffoldStandardProject(dry, runner);
  assert.equal(existsSync(dry.root), false);
  assert.equal(calls.length, 0);
  assert.throws(() => options('unsupported-static', ['--static']));
  await test('the explicit connected universal stack deploys its static Expo gateway after Hono and preserves native entry points', async () => {
    const universal = options('universal-default', [
      '--expo',
      '--hono',
      '--better-auth',
      '--d1',
      '--r2',
    ]);
    await scaffoldStandardProject(universal, runner);
    assert.deepEqual(universal.products, ['better-auth', 'd1', 'expo', 'hono', 'r2']);
    assert.equal(universal.hosting, 'cloudflare');
    const delivery = readProjectSection(universal.root, 'cloudflare');
    assert.equal(delivery.deliveryEngine, 'wrangler');
    assert.deepEqual(
      delivery.targets.map(({ id }) => id),
      ['api', 'mobile'],
    );
    assert.equal(readProjectSection(universal.root, 'standard').hosting, 'cloudflare');
    assert.equal(existsSync(path.join(universal.root, 'apps/web')), false);
    for (const app of ['api', 'mobile']) {
      assert.equal(existsSync(path.join(universal.root, `apps/${app}/wrangler.jsonc`)), true);
      assert.equal(existsSync(path.join(universal.root, `apps/${app}/void.config.ts`)), false);
    }
    const mobile = read(universal.root, 'apps/mobile/package.json');
    assert.equal(mobile.scripts.start, 'expo start -c');
    assert.equal(mobile.scripts.ios, 'expo start -c --ios');
    assert.equal(mobile.scripts.android, 'expo start -c --android');
    assert.equal(mobile.scripts['build:web'], 'expo export --platform web');
    assert.match(mobile.scripts.deploy, /build:web.*wrangler deploy/);
    assert.equal(read(universal.root, 'apps/mobile/app.json').expo.web.output, 'static');
    const gateway = read(universal.root, 'apps/mobile/wrangler.jsonc');
    assert.deepEqual(gateway.services, [{ binding: 'API', service: 'universal-default-api' }]);
    assert.equal(gateway.assets.directory, './dist');
    assert.deepEqual(gateway.assets.run_worker_first, ['/api', '/api/*']);
    assert.equal(gateway.assets.not_found_handling, '404-page');
    const publicEnvironment = readFileSync(
      path.join(universal.root, 'apps/mobile/.env.example'),
      'utf8',
    );
    assert.match(publicEnvironment, /^EXPO_PUBLIC_API_URL=$/m);
    assert.doesNotMatch(publicEnvironment, /BETTER_AUTH_SECRET|DATABASE_URL|STRIPE_SECRET_KEY/);
    const compiled = path.join(universal.root, 'gateway-test.mjs');
    writeFileSync(
      compiled,
      ts.transpileModule(
        readFileSync(path.join(universal.root, 'apps/mobile/worker/index.ts'), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
      ).outputText,
    );
    const worker = (await import('file://' + compiled)).default;
    const env = {
      ASSETS: { fetch: async () => new Response('exported page') },
      API: {
        fetch: async (request) => {
          assert.equal(new URL(request.url).pathname, '/api/missing');
          assert.equal(request.headers.get('cookie'), 'session=private');
          assert.equal(request.headers.get('cf-access-authenticated-user-email'), null);
          return Response.json({ error: 'Not found' }, { status: 404 });
        },
      },
    };
    assert.equal(
      await (await worker.fetch(new Request('https://product.example/route'), env)).text(),
      'exported page',
    );
    const denied = await worker.fetch(
      new Request('https://product.example/api/missing', {
        headers: {
          cookie: 'session=private',
          'cf-access-authenticated-user-email': 'forged@example.com',
        },
      }),
      env,
    );
    assert.equal(denied.status, 404);
    assert.deepEqual(await denied.json(), { error: 'Not found' });
    assert.equal(denied.headers.get('cache-control'), 'private, no-store');
    env.API.fetch = async () => {
      throw new Error('provider unavailable');
    };
    const unavailable = await worker.fetch(new Request('https://product.example/api/missing'), env);
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { error: 'API unavailable' });
  });
  await test('Expo identity shares the API auth server while native sessions read current secure cookies', async () => {
    const authenticated = options('universal-auth', ['--better-auth']);
    const plan = createSetupPlan(authenticated);
    const ordered = plan.registry.items.map(({ name }) => name);
    assert.ok(ordered.includes('expo'));
    assert.ok(ordered.includes('better-auth'));
    assert.ok(ordered.indexOf('expo') < ordered.indexOf('better-auth'));
    await scaffoldStandardProject(authenticated, runner);
    const source = (file) => readFileSync(path.join(authenticated.root, file), 'utf8');
    const load = (file, dependencies) => {
      const output = {};
      const code = ts.transpileModule(source(file), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      new Function('require', 'exports', code)((name) => {
        assert.ok(Object.hasOwn(dependencies, name), `Unexpected runtime import: ${name}`);
        return dependencies[name];
      }, output);
      return output;
    };
    const config = read(authenticated.root, 'apps/mobile/app.json').expo;
    assert.ok(
      config.plugins.some(
        (plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-secure-store',
      ),
    );
    const expoPlugin = {};
    const server = load('packages/auth/src/index.ts', {
      '@better-auth/expo': { expo: () => expoPlugin },
      'better-auth': { betterAuth: (options) => options },
      '@better-auth/drizzle-adapter': { drizzleAdapter: (database) => database },
    });
    const database = {};
    const serverOptions = server.createAuth(
      database,
      'private-server-secret',
      'https://product.example.com',
    );
    assert.equal(serverOptions.database, database);
    assert.deepEqual(serverOptions.plugins, [expoPlugin]);
    assert.deepEqual(serverOptions.trustedOrigins, [
      'https://product.example.com',
      `${config.scheme}://`,
    ]);
    assert.ok(!serverOptions.trustedOrigins.some((origin) => origin.includes('*')));

    let browserOptions;
    const browser = load('apps/mobile/lib/auth-client.ts', {
      'better-auth/react': {
        createAuthClient: (options) => {
          browserOptions = options;
          return {};
        },
      },
    });
    assert.equal(browser.getAuthClient(), browser.getAuthClient());
    assert.equal(browserOptions, undefined, 'Browser auth uses the current same-origin gateway');
    assert.doesNotMatch(
      source('apps/mobile/lib/auth-client.ts'),
      /SecureStore|@better-auth\/expo|auth-client\.native/,
    );
    assert.doesNotMatch(
      source('apps/mobile/lib/session-api.ts'),
      /SecureStore|@better-auth\/expo|auth-client\.native/,
    );

    const secureStore = {};
    let currentCookie = 'session=first';
    let nativeOptions;
    const native = load('apps/mobile/lib/auth-client.native.ts', {
      'better-auth/react': {
        createAuthClient: (options) => {
          nativeOptions = options;
          return { getCookie: async () => currentCookie };
        },
      },
      '@better-auth/expo/client': { expoClient: (options) => options },
      'expo-secure-store': secureStore,
      './api-client': { nativeApiOrigin: () => 'https://product.example.com' },
    });
    assert.equal(native.getAuthClient(), native.getAuthClient());
    assert.equal(nativeOptions.baseURL, 'https://product.example.com');
    assert.equal(nativeOptions.plugins[0].scheme, config.scheme);
    assert.equal(nativeOptions.plugins[0].storage, secureStore);
    let nativeHeaders;
    load('apps/mobile/lib/session-api.native.ts', {
      './api-client': {
        createApplicationApiClient: (options) => {
          nativeHeaders = options.headers;
          return {};
        },
      },
      './auth-client.native': native,
    });
    assert.equal((await nativeHeaders()).get('cookie'), 'session=first');
    currentCookie = 'session=rotated';
    assert.equal((await nativeHeaders()).get('cookie'), 'session=rotated');
    currentCookie = '';
    assert.equal(
      (await nativeHeaders()).has('cookie'),
      false,
      'Signed-out requests retain no cached session',
    );
    for (const file of [
      'apps/mobile/lib/auth-client.ts',
      'apps/mobile/lib/auth-client.native.ts',
      'apps/mobile/lib/session-api.native.ts',
      'apps/mobile/.env.example',
    ]) {
      assert.doesNotMatch(
        source(file),
        /BETTER_AUTH_SECRET|DATABASE_URL|STRIPE_SECRET_KEY|@workspace\/db/,
      );
    }
    assert.equal(
      read(authenticated.root, 'apps/mobile/package.json').dependencies['@workspace/auth'],
      undefined,
    );
  });
  const vinext = options('vinext-default', ['--vinext', '--hono']);
  await scaffoldStandardProject(vinext, runner);
  assert.equal(
    read(vinext.root, 'apps/web/package.json').devDependencies['@cloudflare/vite-plugin'],
    undefined,
  );
  await test('Vinext font caches stay out of Git without hiding application fonts', () => {
    const cached = [
      'apps/web/.vinext/fonts/geist/font.woff2',
      'apps/web/.vinext/fonts/geist/style.css',
    ];
    const source = 'apps/web/public/fonts/product.woff2';
    for (const file of [...cached, source]) {
      mkdirSync(path.dirname(path.join(vinext.root, file)), { recursive: true });
      writeFileSync(path.join(vinext.root, file), 'font fixture');
    }
    const git = (...args) => {
      const result = spawnSync('git', args, { cwd: vinext.root, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout;
    };
    git('init', '--quiet');
    git('add', '--all');
    const tracked = git('ls-files').split('\n');
    for (const file of cached) assert.ok(!tracked.includes(file), `${file} must remain ignored`);
    assert.ok(tracked.includes(source), 'Application font assets must remain trackable');
  });
  await test('web proxy uses a fixed API upstream, filters headers and preserves sessions', async () => {
    const file = path.join(vinext.root, 'apps/web/lib/api-proxy.mjs');
    writeFileSync(
      file,
      ts.transpileModule(
        readFileSync(path.join(vinext.root, 'apps/web/lib/api-proxy.ts'), 'utf8'),
        {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        },
      ).outputText,
    );
    const { createApiProxy } = await import('file://' + file);
    for (const origin of [
      'http://external.example',
      'https://user:password@example.com',
      'https://example.com/path',
    ]) {
      assert.throws(() => createApiProxy(fetch, origin), /trusted HTTPS API origin/);
    }
    let forwarded;
    const proxy = createApiProxy(async (request) => {
      forwarded = request;
      assert.equal(await request.text(), '{"email":"test@example.com"}');
      return new Response('ok', {
        headers: {
          'set-cookie': 'session=opaque; HttpOnly; Path=/',
          'cache-control': 'public',
          'access-control-allow-origin': '*',
        },
      });
    }, 'https://api.internal');
    const response = await proxy(
      new Request('https://web.example/api/auth/sign-in/email?next=account', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://web.example',
          cookie: 'session=old',
          'cf-access-authenticated-user-email': 'spoof@example.com',
          'cf-access-client-secret': 'browser-spoof',
        },
        body: '{"email":"test@example.com"}',
      }),
    );
    assert.equal(forwarded.url, 'https://api.internal/api/auth/sign-in/email?next=account');
    assert.equal(forwarded.headers.get('cookie'), 'session=old');
    assert.equal(forwarded.headers.get('origin'), 'https://web.example');
    assert.equal(forwarded.headers.get('cf-access-authenticated-user-email'), null);
    assert.equal(forwarded.headers.get('cf-access-client-secret'), null);
    assert.equal(forwarded.redirect, 'manual');
    assert.equal(response.headers.get('set-cookie'), 'session=opaque; HttpOnly; Path=/');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal((await proxy(new Request('https://web.example/other'))).status, 404);
    const unavailable = createApiProxy(async () => {
      throw new Error('provider details');
    }, 'http://127.0.0.1:8787');
    const failed = await unavailable(new Request('https://web.example/api/health'));
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'API unavailable' });
    assert.equal(
      read(vinext.root, 'apps/web/anhedral.cloudflare.json').services.find(
        ({ binding }) => binding === 'API',
      ).service,
      'vinext-default-api',
    );
    assert.equal(
      read(vinext.root, 'apps/api/package.json').dependencies['@workspace/contracts'],
      'workspace:*',
    );
    assert.equal(
      read(vinext.root, 'apps/web/package.json').dependencies['@workspace/db'],
      undefined,
    );
  });
  await test('shared HTTP client merges session headers and rejects invalid API responses', async () => {
    const file = path.join(vinext.root, 'contracts-test.mjs');
    const source = readFileSync(path.join(vinext.root, 'packages/contracts/src/index.ts'), 'utf8')
      .replace("'zod'", JSON.stringify(import.meta.resolve('zod')))
      .replace("'./http'", "'./contracts-http-test.mjs'");
    writeFileSync(
      path.join(vinext.root, 'contracts-http-test.mjs'),
      ts.transpileModule(
        readFileSync(path.join(vinext.root, 'packages/contracts/src/http.ts'), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
      ).outputText,
    );
    writeFileSync(
      file,
      ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    );
    const { createApiClient } = await import('file://' + file);
    const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ ok: true }));
    try {
      const api = createApiClient('https://api.example/api/', {
        headers: async () => ({ cookie: 'session=test' }),
        credentials: 'omit',
      });
      assert.deepEqual(await api.health({ headers: { 'x-request-id': 'test' } }), { ok: true });
      const [url, init] = fetchMock.mock.calls[0].arguments;
      assert.equal(url, 'https://api.example/api/health');
      assert.equal(init.credentials, 'omit');
      assert.equal(init.headers.get('cookie'), 'session=test');
      assert.equal(init.headers.get('x-request-id'), 'test');
      fetchMock.mock.mockImplementation(async () => Response.json({ ok: false }));
      await assert.rejects(api.health());
      fetchMock.mock.mockImplementation(
        async () => new Response('private provider details', { status: 401 }),
      );
      await assert.rejects(api.session(), /^Error: API request failed \(401\)\.$/);
    } finally {
      fetchMock.mock.restore();
    }
  });
  const rootManifest = read(vinext.root, 'package.json');
  assert.equal(rootManifest.pnpm.overrides['void@0.27.0>@cloudflare/vite-plugin'], '1.63.1');
  assert.equal(rootManifest.devDependencies.turbo, STACK_DEPENDENCIES.turbo);
  assert.match(
    readFileSync(path.join(vinext.root, 'pnpm-workspace.yaml'), 'utf8'),
    /sharedWorkspaceLockfile: true/,
  );
  assert.equal(existsSync(path.join(vinext.root, 'apps/web/package-lock.json')), false);
  assert.equal(existsSync(path.join(vinext.root, 'packages/ui/pnpm-lock.yaml')), false);
  for (const task of ['db:generate', 'db:migrate']) {
    assert.equal(read(vinext.root, 'turbo.json').tasks[task].cache, false);
    assert.equal(read(vinext.root, 'turbo.json').tasks[task].dependsOn, undefined);
  }
  assert.equal(vinext.hosting, 'cloudflare');
  assert.equal(read(vinext.root, 'apps/web/package.json').devDependencies.void, '0.27.0');
  assert.equal(
    read(vinext.root, 'apps/web/package.json').scripts.deploy,
    'node ../../scripts/prepare-void-migrations.mjs && void deploy --platform cloudflare',
  );
  assert.equal(existsSync(path.join(vinext.root, 'apps/web/void.config.ts')), true);
  assert.equal(existsSync(path.join(vinext.root, 'apps/web/wrangler.jsonc')), false);
  assert.equal(existsSync(path.join(vinext.root, 'apps/web/.env.example')), false);
  assert.equal(existsSync(path.join(vinext.root, 'apps/web/env.example')), true);
  assert.equal(read(vinext.root, 'package.json').engines.node, '>=24.21.0');
  assert.equal(read(vinext.root, 'apps/web/package.json').dependencies.vinext, '1.1.0');
  assert.equal(read(vinext.root, 'apps/web/package.json').scripts.build, 'vite build');
  assert.equal(
    read(vinext.root, 'apps/web/anhedral.cloudflare.json').main,
    'vinext/server/fetch-handler',
  );
  assert.match(
    readFileSync(path.join(vinext.root, 'apps/web/vite.config.ts'), 'utf8'),
    /voidPlugin\(\)/,
  );
  assert.equal(
    read(vinext.root, 'apps/web/anhedral.cloudflare.json').d1_databases,
    undefined,
    'Static product needs no durable database',
  );
  assert.equal(
    read(vinext.root, 'apps/web/package.json').dependencies['@opennextjs/cloudflare'],
    undefined,
  );
  assert.equal(existsSync(path.join(vinext.root, 'apps/web/open-next.config.ts')), false);
  assert.equal(readProjectSection(vinext.root, 'cloudflare').targets[0].id, 'api');
  assert.equal(readProjectConfig(vinext.root).schemaVersion, 1);
  assert.deepEqual(
    readdirSync(vinext.root).filter((name) => /^anhedral(?:\..+)?\.json$/.test(name)),
    ['anhedral.json'],
  );
  assert.equal(hasProjectSection(vinext.root, 'vercel'), false);
  const vinextAuth = options('vinext-auth', ['--vinext', '--better-auth']);
  await scaffoldStandardProject(vinextAuth, runner);
  assert.ok(vinextAuth.products.includes('d1'));
  const authEnvironment = readFileSync(path.join(vinextAuth.root, 'apps/api/env.ts'), 'utf8');
  assert.match(authEnvironment, /BETTER_AUTH_SECRET: string\(\)/);
  assert.match(authEnvironment, /BETTER_AUTH_URL: string\(\)/);
  assert.equal(existsSync(path.join(vinextAuth.root, 'apps/web/.dev.vars.example')), false);
  assert.match(
    readFileSync(path.join(vinextAuth.root, 'packages/db/src/migrate.ts'), 'utf8'),
    /anhedral\.cloudflare\.json/,
  );
  assert.equal(existsSync(path.join(vinextAuth.root, 'apps/api')), true);
  assert.match(
    readFileSync(path.join(vinextAuth.root, 'apps/web/app/api/[...path]/route.ts'), 'utf8'),
    /cloudflare:workers/,
  );
  assert.doesNotMatch(
    readFileSync(path.join(vinextAuth.root, 'apps/web/app/api/[...path]/route.ts'), 'utf8'),
    /getCloudflareContext|@opennextjs/,
  );
  assert.equal(
    read(vinextAuth.root, 'apps/api/anhedral.cloudflare.json').d1_databases[0].binding,
    'DB',
  );
  const preparation = spawnSync(process.execPath, ['../../scripts/prepare-void-migrations.mjs'], {
    cwd: path.join(vinextAuth.root, 'apps/api'),
    encoding: 'utf8',
  });
  assert.equal(preparation.status, 0, preparation.stderr);
  assert.equal(
    readFileSync(path.join(vinextAuth.root, 'apps/api/db/migrations/0000_better_auth.sql'), 'utf8'),
    readFileSync(path.join(vinextAuth.root, 'packages/db/drizzle/0000_better_auth.sql'), 'utf8'),
  );
  const authSchema = readFileSync(path.join(vinextAuth.root, 'packages/db/src/schema.ts'), 'utf8');
  const authMigration = readFileSync(
    path.join(vinextAuth.root, 'packages/db/drizzle/0000_better_auth.sql'),
    'utf8',
  );
  for (const table of ['user', 'session', 'account', 'verification']) {
    assert.match(authSchema, new RegExp('export const ' + table + ' = sqliteTable'));
    assert.ok(authMigration.includes('CREATE TABLE `' + table + '`'));
  }
  assert.match(authMigration, /CREATE UNIQUE INDEX `session_token_unique`/);
  assert.match(authMigration, /ON DELETE cascade/);
  assert.equal(
    read(vinextAuth.root, 'packages/db/drizzle/meta/_journal.json').entries[0].tag,
    '0000_better_auth',
  );
  assert.deepEqual(
    Object.keys(read(vinextAuth.root, 'packages/db/drizzle/meta/0000_snapshot.json').tables).sort(),
    ['account', 'session', 'user', 'verification'],
  );
  assert.equal(
    read(vinextAuth.root, 'packages/auth/package.json').dependencies['better-auth'],
    '1.7.7',
  );
  assert.equal(
    read(vinextAuth.root, 'apps/web/package.json').dependencies['react-server-dom-webpack'],
    '19.2.8',
  );
  const native = parseStandardOptions([
    path.join(temp, 'native'),
    '--next',
    '--hono',
    '--skip-install',
    '--no-git',
  ]);
  assert.equal(native.hosting, 'vercel');
  await scaffoldStandardProject(native, runner);
  await test('Vercel transport adds only configured server Access credentials', async () => {
    const file = path.join(native.root, 'transport-test.mjs');
    writeFileSync(
      file,
      ts.transpileModule(
        readFileSync(path.join(native.root, 'apps/web/lib/api-transport.ts'), 'utf8'),
        {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        },
      ).outputText,
    );
    const { apiTransport } = await import('file://' + file);
    const keys = ['API_ACCESS_CLIENT_ID', 'API_ACCESS_CLIENT_SECRET'];
    const previous = keys.map((key) => process.env[key]);
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('ok'));
    try {
      process.env.API_ACCESS_CLIENT_ID = 'synthetic-service-id';
      process.env.API_ACCESS_CLIENT_SECRET = 'synthetic-service-secret';
      await apiTransport(new Request('https://api.example/api/health'));
      const [, init] = fetchMock.mock.calls[0].arguments;
      assert.equal(init.headers.get('CF-Access-Client-Id'), 'synthetic-service-id');
      assert.equal(init.headers.get('CF-Access-Client-Secret'), 'synthetic-service-secret');
      assert.equal(init.redirect, 'manual');
      delete process.env.API_ACCESS_CLIENT_SECRET;
      assert.throws(
        () => apiTransport(new Request('https://api.example/api/health')),
        /both API Access credentials/,
      );
      assert.ok(read(native.root, 'turbo.json').globalEnv.includes('API_URL'));
    } finally {
      fetchMock.mock.restore();
      keys.forEach((key, index) => {
        if (previous[index] === undefined) delete process.env[key];
        else process.env[key] = previous[index];
      });
    }
  });
  assert.equal(read(native.root, 'apps/web/package.json').dependencies.next, '16.4.0');
  assert.equal(
    read(native.root, 'package.json').pnpm.overrides['void@0.27.0>@cloudflare/vite-plugin'],
    '1.63.1',
  );
  assert.match(
    readFileSync(path.join(native.root, 'apps/web/next.config.ts'), 'utf8'),
    /cacheComponents: true, partialPrefetching: true/,
  );
  assert.equal(existsSync(path.join(native.root, 'apps/web/wrangler.jsonc')), false);
  assert.equal(readProjectSection(native.root, 'vercel').provider, 'vercel');
  const nativeAuth = parseStandardOptions([
    path.join(temp, 'native-auth'),
    '--next',
    '--neon',
    '--better-auth',
    '--skip-install',
    '--no-git',
  ]);
  await scaffoldStandardProject(nativeAuth, runner);
  assert.equal(existsSync(path.join(nativeAuth.root, 'apps/api')), true);
  assert.doesNotMatch(
    readFileSync(path.join(nativeAuth.root, 'apps/web/app/api/[...path]/route.ts'), 'utf8'),
    /getCloudflareContext|env.HYPERDRIVE/,
  );
  assert.match(
    readFileSync(path.join(nativeAuth.root, 'apps/web/app/api/[...path]/route.ts'), 'utf8'),
    /process.env.API_URL/,
  );
  const mixed = parseStandardOptions([
    path.join(temp, 'mixed'),
    '--next',
    '--d1',
    '--skip-install',
    '--no-git',
  ]);
  assert.ok(mixed.products.includes('hono'));
  await scaffoldStandardProject(mixed, runner);
  assert.equal(readProjectSection(mixed.root, 'cloudflare').targets[0].id, 'api');
  assert.equal(readProjectSection(mixed.root, 'vercel').provider, 'vercel');
  const web = options('web', ['--next', '--hosting=cloudflare']);
  await scaffoldStandardProject(web, runner);
  assert.equal(readProjectSection(web.root, 'setup').root, web.root);
  assert.equal(readProjectSection(web.root, 'setup').setup.resourcesProvisioned, false);
  assert.deepEqual(readProjectSection(web.root, 'providers'), { schemaVersion: 1, providers: {} });
  assert.deepEqual(
    readProjectSection(web.root, 'setup').setup.capabilities.map(({ status }) => status),
    ['starter'],
  );
  assert.equal(read(web.root, 'apps/web/package.json').dependencies.next, '16.3.8');
  assert.equal(read(web.root, 'apps/web/wrangler.jsonc').main, '.open-next/worker.js');
  assert.ok(
    read(web.root, 'apps/web/wrangler.jsonc').compatibility_flags.includes(
      'global_fetch_strictly_public',
    ),
  );
  assert.match(
    readFileSync(path.join(web.root, 'apps/web/next.config.ts'), 'utf8'),
    /initOpenNextCloudflareForDev\(\);/,
  );
  assert.equal(existsSync(path.join(web.root, 'apps/api')), false);
  assert.equal(read(web.root, 'package.json').scripts.audit, 'node scripts/audit.mjs');
  assert.equal(read(web.root, 'packages/ui/package.json').dependencies.shadcn, undefined);
  assert.equal(read(web.root, 'packages/ui/package.json').devDependencies.shadcn, '4.21.1');
  assert.match(read(web.root, 'package.json').scripts.check, /audit:deps/);
  assert.equal(read(web.root, 'package.json').scripts['audit:deps'], 'node scripts/audit-deps.mjs');
  assert.equal(existsSync(path.join(web.root, 'scripts/security')), false);
  assert.ok(read(web.root, '.fallowrc.json').ignorePatterns.includes('**/next-env.d.ts'));
  const auditConfig = read(web.root, '.fallowrc.json');
  assert.ok(auditConfig.entry.includes('apps/*/void.config.ts'));
  assert.ok(auditConfig.entry.includes('apps/*/env.ts'));
  assert.ok(auditConfig.entry.includes('apps/*/src/void-entry.ts'));
  assert.ok(auditConfig.entry.includes('apps/*/crons/**/*.{ts,mts,js,mjs}'));
  for (const helper of ['audit', 'audit-deps', 'void-migrations', 'prepare-void-migrations']) {
    assert.ok(auditConfig.ignorePatterns.includes(`scripts/${helper}.mjs`));
  }
  assert.equal(auditConfig.ignorePatterns.includes('scripts/**'), false);
  assert.equal(
    auditConfig.ignorePatterns.some((pattern) => pattern.startsWith('apps/')),
    false,
  );
  assert.equal(existsSync(path.join(web.root, 'pnpm-lock.yaml')), true);
  assert.match(
    readFileSync(path.join(web.root, 'AGENTS.md'), 'utf8'),
    /cloudflare\/security-audit-skill/,
  );
  assert.match(
    readFileSync(path.join(web.root, 'pnpm-workspace.yaml'), 'utf8'),
    /onlyBuiltDependencies/,
  );
  assert.ok(calls.find((call) => call.args[0] === 'dlx').args.includes('--monorepo'));
  assert.equal(calls.filter((call) => call.command === 'git').length, 0);
  const clerk = options('clerk', ['--vinext', '--clerk']);
  await scaffoldStandardProject(clerk, runner);
  const layout = readFileSync(path.join(clerk.root, 'apps/web/app/layout.tsx'), 'utf8');
  assert.deepEqual(Object.keys(readProjectSection(clerk.root, 'providers').providers), ['clerk']);
  assert.equal(readProjectSection(clerk.root, 'providers').providers.clerk.workspaceId, '');
  const compiledLayout = ts.transpileModule(layout, {
    fileName: 'layout.tsx',
    compilerOptions: { jsx: ts.JsxEmit.Preserve },
    reportDiagnostics: true,
  });
  assert.deepEqual(compiledLayout.diagnostics, [], 'Clerk setup must generate valid TSX');
  assert.match(
    layout,
    /<body className="antialiased"><ClerkProvider>\{children\}<\/ClerkProvider><\/body>/,
  );
  for (const route of ['sign-in', 'sign-up']) {
    const source = readFileSync(
      path.join(clerk.root, `apps/web/app/${route}/[[...${route}]]/page.tsx`),
      'utf8',
    );
    assert.match(source, /<Suspense fallback=/, 'Clerk route data must stream behind Suspense');
  }
  const invalidLayout = options('invalid-layout', ['--vinext', '--clerk']);
  await assert.rejects(
    scaffoldStandardProject(invalidLayout, (command, args, cwd) => {
      runner(command, args, cwd);
      if (args[0] === 'dlx')
        writeFileSync(
          path.join(
            args[args.indexOf('--cwd') + 1],
            args[args.indexOf('--name') + 1],
            'apps/web/app/layout.tsx',
          ),
          'export default function Layout() { return <main />; }\n',
        );
    }),
    /must contain a body element/,
  );
  assert.equal(existsSync(invalidLayout.root), false, 'invalid auth overlay must roll back');
  const extension = options('extension', ['--wxt']);
  await scaffoldStandardProject(extension, runner);
  assert.equal(existsSync(path.join(extension.root, 'apps/web')), false);
  assert.equal(existsSync(path.join(extension.root, 'packages/ui')), false);
  assert.equal(
    existsSync(path.join(extension.root, 'apps/extension/src/entrypoints/sidepanel/index.html')),
    true,
  );
  for (const product of ['expo', 'electron']) {
    const native = options(product, [`--${product}`]);
    await scaffoldStandardProject(native, runner);
    const app = product === 'expo' ? 'mobile' : 'desktop';
    assert.equal(existsSync(path.join(native.root, 'apps/web')), false);
    const manifest = read(native.root, `apps/${app}/package.json`);
    assert.ok(manifest.scripts.build || manifest.scripts.start);
    if (product === 'electron') assert.equal(manifest.devDependencies.vite, '7.3.7');
    assert.equal(manifest.dependencies['@shared/api-client'], undefined);
    assert.equal(manifest.dependencies['@shared/realtime'], undefined);
  }
  const voidServices = options('void-services', [
    '--hono',
    '--d1',
    '--r2',
    '--kv',
    '--cron',
    '--workflows',
    '--realtime',
  ]);
  await scaffoldStandardProject(voidServices, runner);
  for (const app of ['api', 'scheduled', 'realtime', 'workflows']) {
    assert.equal(
      read(voidServices.root, `apps/${app}/package.json`).scripts.deploy,
      'node ../../scripts/prepare-void-migrations.mjs && void deploy --platform cloudflare',
    );
    assert.equal(
      existsSync(path.join(voidServices.root, `apps/${app}/anhedral.cloudflare.json`)),
      true,
    );
    assert.match(
      readFileSync(path.join(voidServices.root, `apps/${app}/vite.config.ts`), 'utf8'),
      /VOID_CLOUDFLARE_DEPLOY_BUILD/,
    );
    const vite = readFileSync(path.join(voidServices.root, `apps/${app}/vite.config.ts`), 'utf8');
    assert.match(vite, new RegExp(`inspectorPort: ${WORKER_DEV_PORTS[app].inspector}\\b`));
    assert.match(vite, new RegExp(`port: ${WORKER_DEV_PORTS[app].http}, strictPort: true`));
    assert.match(
      readFileSync(path.join(voidServices.root, `apps/${app}/routes/README.md`), 'utf8'),
      /builds src\/void-entry\.ts/,
    );
  }
  assert.match(
    readFileSync(path.join(voidServices.root, 'apps/scheduled/crons/scheduled.ts'), 'utf8'),
    /0 \* \* \* \*/,
  );
  const workerSource = path.join(voidServices.root, 'apps/scheduled/src');
  for (const filename of ['index', 'void-entry']) {
    const source = readFileSync(path.join(workerSource, `${filename}.ts`), 'utf8').replaceAll(
      "'./index'",
      "'./index.mjs'",
    );
    writeFileSync(
      path.join(workerSource, `${filename}.mjs`),
      ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    );
  }
  const adapted = (await import('file://' + path.join(workerSource, 'void-entry.mjs'))).default;
  const original = (await import('file://' + path.join(workerSource, 'index.mjs'))).default;
  assert.equal(adapted.scheduled, original.scheduled);
  const ready = await adapted.fetch(
    new Request('https://example.com/__void/ready'),
    { __VOID_VERSION_METADATA: { id: 'version-test' } },
    {},
  );
  assert.deepEqual(await ready.json(), { ready: true, versionId: 'version-test' });
  assert.equal(ready.headers.get('cache-control'), 'no-store');
  const services = options('services', [
    '--hono',
    '--neon',
    '--r2',
    '--kv',
    '--basin',
    '--queues',
    '--cron',
    '--workflows',
    '--realtime',
    '--stripe',
  ]);
  await scaffoldStandardProject(services, runner);
  assert.equal(existsSync(path.join(services.root, 'apps/web')), false);
  const config = read(services.root, 'apps/api/wrangler.jsonc');
  assert.equal(existsSync(path.join(services.root, 'apps/api/void.config.ts')), false);
  assert.ok(config.r2_buckets && config.kv_namespaces && config.pipelines);
  assert.equal(
    read(services.root, 'package.json').scripts['db:migrate'],
    'turbo run db:migrate --filter=@workspace/db',
  );
  assert.equal(
    read(services.root, 'apps/api/package.json').dependencies['@workspace/db'],
    'workspace:*',
  );
  assert.equal(config.hyperdrive, undefined);
  assert.match(
    readFileSync(path.join(services.root, 'packages/db/src/index.ts'), 'utf8'),
    /drizzle-orm\/neon-http/,
  );
  assert.equal(config.analytics_engine_datasets, undefined);
  assert.deepEqual(readdirSync(path.join(services.root, 'apps')).sort(), [
    'api',
    'jobs',
    'realtime',
    'scheduled',
    'workflows',
  ]);
  assert.ok(read(services.root, 'apps/api/package.json').dependencies['@hono/zod-openapi']);
  assert.equal(
    read(services.root, 'packages/billing/package.json').dependencies.stripe,
    STACK_DEPENDENCIES.stripe,
  );
  const auth = options('better-auth', ['--hono', '--better-auth', '--d1']);
  await scaffoldStandardProject(auth, runner);
  assert.match(
    readFileSync(path.join(auth.root, 'apps/api/src/index.ts'), 'utf8'),
    /\/api\/auth\/\*/,
  );
  const occupied = options('occupied');
  mkdirSync(occupied.root);
  writeFileSync(path.join(occupied.root, 'keep.txt'), 'keep');
  await assert.rejects(scaffoldStandardProject(occupied, runner), /must be empty/);
  assert.equal(readFileSync(path.join(occupied.root, 'keep.txt'), 'utf8'), 'keep');
  const blockedParent = path.join(temp, 'blocked-parent');
  writeFileSync(blockedParent, 'keep');
  const previousQuiet = process.env.ANHEDRAL_QUIET;
  process.env.ANHEDRAL_QUIET = 'previous';
  try {
    await assert.rejects(
      scaffoldStandardProject(
        { ...options('blocked'), root: path.join(blockedParent, 'child'), json: true },
        runner,
      ),
    );
    assert.equal(
      process.env.ANHEDRAL_QUIET,
      'previous',
      'failed destination creation must restore process state',
    );
  } finally {
    if (previousQuiet === undefined) delete process.env.ANHEDRAL_QUIET;
    else process.env.ANHEDRAL_QUIET = previousQuiet;
  }
  const rollback = options('rollback');
  mkdirSync(rollback.root);
  writeFileSync(path.join(rollback.root, '.gitignore'), 'client-secret\n');
  await assert.rejects(
    scaffoldStandardProject(rollback, () => {
      throw new Error('bootstrap failed');
    }),
    /bootstrap failed/,
  );
  assert.deepEqual(readdirSync(rollback.root), ['.gitignore']);
  const preserved = options('preserved');
  mkdirSync(preserved.root);
  writeFileSync(path.join(preserved.root, '.gitignore'), 'client-secret\n');
  await scaffoldStandardProject(preserved, runner);
  assert.match(readFileSync(path.join(preserved.root, '.gitignore'), 'utf8'), /client-secret/);
  const cli = spawnSync(
    process.execPath,
    ['dist/bin.js', 'init', path.join(temp, 'cli'), '--dry-run', '--json'],
    { encoding: 'utf8' },
  );
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout).products, ['expo']);
  assert.equal(existsSync(path.join(temp, 'cli')), false);
  const invalid = spawnSync(process.execPath, ['dist/bin.js', 'init', '--all', '--json'], {
    encoding: 'utf8',
  });
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(invalid.stderr).code, 'INVALID_ARGUMENT');
  console.log(
    'Standard generation, selections, dry-run, destination preservation and rollback tests passed',
  );
  assert.equal(spawnSync('git', ['init', temp], { stdio: 'ignore' }).status, 0);
  const nested = { ...options('nested-new-repository'), initializeGit: true };
  await scaffoldStandardProject(nested, runner);
  assert.ok(
    calls.some(
      (call) => call.command === 'git' && call.args[0] === 'init' && call.cwd === nested.root,
    ),
    'A new app inside a parent checkout needs its own Git repository',
  );
} finally {
  mock.restoreAll();
  rmSync(temp, { recursive: true, force: true });
}
