import { STACK_DEPENDENCIES } from '../dist/dependencies.js';
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
  return parseStandardOptions('new', [
    path.join(temp, name),
    '--skip-install',
    '--no-git',
    ...products,
  ]);
}
function read(root, file) {
  return JSON.parse(readFileSync(path.join(root, file), 'utf8'));
}
mock.method(console, 'log', () => {});
try {
  assert.deepEqual(Object.keys(CAPABILITIES).sort(), [...STANDARD_PRODUCTS].sort());
  const pluginRegistry = read(
    process.cwd(),
    'plugins/codex/distribution/skills/anhedral/references/capabilities.json',
  );
  assert.deepEqual(pluginRegistry, CAPABILITY_REGISTRY);
  assert.equal(
    readFileSync(
      'plugins/codex/distribution/skills/anhedral/references/application-stack-standard.md',
      'utf8',
    ),
    readFileSync('docs/stack-standard.md', 'utf8'),
  );
  const mobilePlan = createSetupPlan(options('mobile-plan', ['--expo']));
  assert.equal(mobilePlan.setup.tools.includes('Wrangler'), false);
  assert.equal(
    mobilePlan.setup.capabilities.some(({ id }) => id === 'stripe'),
    false,
  );
  const vercelPlan = createSetupPlan(options('vercel-plan', ['--hosting=vercel']));
  assert.equal(vercelPlan.setup.tools.includes('Wrangler'), false);
  assert.ok(vercelPlan.setup.tools.includes('Vercel integration or CLI'));
  assert.ok(
    createSetupPlan({ ...options('planned'), dryRun: true }).setup.capabilities.every(
      ({ status }) => status === 'planned',
    ),
  );
  assert.deepEqual(options('default').products, ['vinext']);
  assert.deepEqual(options('mobile', ['--expo']).products, ['expo']);
  assert.deepEqual(options('auth', ['--clerk']).products, ['clerk', 'vinext']);
  for (const flags of [
    ['--all'],
    ['--neon', '--d1'],
    ['--clerk', '--better-auth'],
    ['--revenuecat'],
    ['--wxt', '--r2'],
    ['--expo', '--clerk'],
    ['--hono', '--hosting=vercel'],
  ]) {
    assert.throws(() => options('invalid', flags));
  }
  const dry = { ...options('dry', ['--expo']), dryRun: true, json: true };
  await scaffoldStandardProject(dry, runner);
  assert.equal(existsSync(dry.root), false);
  assert.equal(calls.length, 0);
  assert.throws(() => options('unsupported-static', ['--static']));
  const vinext = options('vinext-default');
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
  const rootManifest = read(vinext.root, 'package.json');
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
  assert.equal(read(vinext.root, 'anhedral.project.json').targets[0].id, 'web');
  assert.equal(existsSync(path.join(vinext.root, 'anhedral.web.json')), false);
  const vinextAuth = options('vinext-auth', ['--better-auth']);
  await scaffoldStandardProject(vinextAuth, runner);
  assert.ok(vinextAuth.products.includes('d1'));
  const authEnvironment = readFileSync(path.join(vinextAuth.root, 'apps/web/env.ts'), 'utf8');
  assert.match(authEnvironment, /BETTER_AUTH_SECRET: string\(\)/);
  assert.match(authEnvironment, /BETTER_AUTH_URL: string\(\)/);
  assert.equal(existsSync(path.join(vinextAuth.root, 'apps/web/.dev.vars.example')), false);
  assert.match(
    readFileSync(path.join(vinextAuth.root, 'packages/db/src/migrate.ts'), 'utf8'),
    /anhedral\.cloudflare\.json/,
  );
  assert.equal(existsSync(path.join(vinextAuth.root, 'apps/api')), false);
  assert.match(
    readFileSync(path.join(vinextAuth.root, 'apps/web/app/api/auth/[...all]/route.ts'), 'utf8'),
    /cloudflare:workers/,
  );
  assert.doesNotMatch(
    readFileSync(path.join(vinextAuth.root, 'apps/web/app/api/auth/[...all]/route.ts'), 'utf8'),
    /getCloudflareContext|@opennextjs/,
  );
  assert.equal(
    read(vinextAuth.root, 'apps/web/anhedral.cloudflare.json').d1_databases[0].binding,
    'DB',
  );
  const preparation = spawnSync(process.execPath, ['../../scripts/prepare-void-migrations.mjs'], {
    cwd: path.join(vinextAuth.root, 'apps/web'),
    encoding: 'utf8',
  });
  assert.equal(preparation.status, 0, preparation.stderr);
  assert.equal(
    readFileSync(path.join(vinextAuth.root, 'apps/web/db/migrations/0000_better_auth.sql'), 'utf8'),
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
  const native = parseStandardOptions('new', [
    path.join(temp, 'native'),
    '--next',
    '--skip-install',
    '--no-git',
  ]);
  assert.equal(native.hosting, 'vercel');
  await scaffoldStandardProject(native, runner);
  assert.equal(read(native.root, 'apps/web/package.json').dependencies.next, '16.4.0');
  assert.match(
    readFileSync(path.join(native.root, 'apps/web/next.config.ts'), 'utf8'),
    /cacheComponents: true, partialPrefetching: true/,
  );
  assert.equal(existsSync(path.join(native.root, 'apps/web/wrangler.jsonc')), false);
  assert.equal(read(native.root, 'anhedral.web.json').provider, 'vercel');
  const nativeAuth = parseStandardOptions('new', [
    path.join(temp, 'native-auth'),
    '--next',
    '--neon',
    '--better-auth',
    '--skip-install',
    '--no-git',
  ]);
  await scaffoldStandardProject(nativeAuth, runner);
  assert.equal(existsSync(path.join(nativeAuth.root, 'apps/api')), false);
  assert.doesNotMatch(
    readFileSync(path.join(nativeAuth.root, 'apps/web/app/api/auth/[...all]/route.ts'), 'utf8'),
    /getCloudflareContext|env.HYPERDRIVE/,
  );
  assert.match(
    readFileSync(path.join(nativeAuth.root, 'apps/web/app/api/auth/[...all]/route.ts'), 'utf8'),
    /process.env.DATABASE_URL/,
  );
  const mixed = parseStandardOptions('new', [
    path.join(temp, 'mixed'),
    '--next',
    '--d1',
    '--skip-install',
    '--no-git',
  ]);
  assert.ok(mixed.products.includes('hono'));
  await scaffoldStandardProject(mixed, runner);
  assert.equal(read(mixed.root, 'anhedral.project.json').targets[0].id, 'api');
  assert.equal(read(mixed.root, 'anhedral.web.json').provider, 'vercel');
  const web = options('web', ['--next', '--hosting=cloudflare']);
  await scaffoldStandardProject(web, runner);
  assert.equal(read(web.root, 'anhedral.setup.json').root, web.root);
  assert.equal(read(web.root, 'anhedral.setup.json').setup.resourcesProvisioned, false);
  assert.deepEqual(read(web.root, 'anhedral.providers.json'), { schemaVersion: 1, providers: {} });
  assert.deepEqual(
    read(web.root, 'anhedral.setup.json').setup.capabilities.map(({ status }) => status),
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
  const clerk = options('clerk', ['--clerk']);
  await scaffoldStandardProject(clerk, runner);
  const layout = readFileSync(path.join(clerk.root, 'apps/web/app/layout.tsx'), 'utf8');
  assert.deepEqual(Object.keys(read(clerk.root, 'anhedral.providers.json').providers), ['clerk']);
  assert.equal(read(clerk.root, 'anhedral.providers.json').providers.clerk.workspaceId, '');
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
  const invalidLayout = options('invalid-layout', ['--clerk']);
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
    undefined,
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
    ['dist/bin.js', 'new', path.join(temp, 'cli'), '--dry-run', '--json'],
    { encoding: 'utf8' },
  );
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout).products, ['vinext']);
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
