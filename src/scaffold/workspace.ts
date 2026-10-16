import { readProjectSection, writeProjectSection, hasProjectSection } from '../project-config.js';
import {
  STACK_DEPENDENCIES,
  WORKSPACE_NODE_ENGINE,
  SECURITY_OVERRIDE_DEPENDENCIES,
  GLOB_10_OVERRIDE_VERSION,
  GLOB_11_OVERRIDE_VERSION,
  BRACE_EXPANSION_1_OVERRIDE_VERSION,
  BRACE_EXPANSION_2_OVERRIDE_VERSION,
  BRACE_EXPANSION_5_OVERRIDE_VERSION,
} from '../dependencies.js';
import { writeDependencyAudit } from '../dependency-patches.js';
import { usesVoidSelection } from '../runtime-policy.js';
import { VOID_NODE_ENGINE } from '../void.js';
import { setPnpmPolicy } from '../pnpm-policy.js';
import type { ResolvedStackRegistry } from '../registry/resolve.js';
import { BOOTSTRAP_COMMAND } from '../registry/bootstrap.js';
import { appendGitignore } from '../util.js';
import { PACKAGE_MANAGER } from '../dependencies.js';
import { createSetupPlan } from '../capabilities.js';
import type { StandardOptions, StandardProduct } from '../registry/types.js';
import {
  json,
  put,
  readJson,
  patchPackage,
  type PackageManifest,
  type TurboConfig,
} from './files.js';
import { writeSetupDocumentation, workerBuildSuffix } from './documentation.js';
import { writeStackDocumentation } from './stack-documentation.js';
import { writeEnvironmentExample } from './environment.js';
import { providerConfigurationTemplate, type ProviderConfiguration } from '../providers/config.js';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
function securityOverrides(options: StandardOptions): Record<string, string> {
  const has = (value: StandardProduct) => options.products.includes(value);
  return {
    ...(has('wxt')
      ? {
          '@wxt-dev/module-react>@vitejs/plugin-react':
            SECURITY_OVERRIDE_DEPENDENCIES['@vitejs/plugin-react'],
        }
      : {}),
    ...(has('next') || has('vinext')
      ? { 'sharp@<0.35.5': SECURITY_OVERRIDE_DEPENDENCIES.sharp }
      : {}),
    ...(options.products.some((product) =>
      ['vinext', 'next', 'expo', 'electron', 'wxt', 'neon', 'd1'].includes(product),
    )
      ? { 'source-map-js@<1.2.2': SECURITY_OVERRIDE_DEPENDENCIES['source-map-js'] }
      : {}),
    ...(has('next') && options.hosting === 'cloudflare'
      ? {
          'glob@>=10.2.0 <10.5.0': GLOB_10_OVERRIDE_VERSION,
          'glob@>=11.0.0 <11.1.0': GLOB_11_OVERRIDE_VERSION,
        }
      : {}),
    ...(has('wxt')
      ? {
          'shell-quote@<1.12.0': SECURITY_OVERRIDE_DEPENDENCIES['shell-quote'],
          'tmp@<0.2.7': SECURITY_OVERRIDE_DEPENDENCIES.tmp,
          'adm-zip@<0.6.1': SECURITY_OVERRIDE_DEPENDENCIES['adm-zip'],
        }
      : {}),
    'baseline-browser-mapping@<2.11.0': SECURITY_OVERRIDE_DEPENDENCIES['baseline-browser-mapping'],
    'browserslist@<4.28.7': SECURITY_OVERRIDE_DEPENDENCIES.browserslist,
    ...(((has('next') || has('vinext')) && options.hosting === 'cloudflare') ||
    has('hono') ||
    has('electron') ||
    has('wxt')
      ? { 'esbuild@<0.25.0': SECURITY_OVERRIDE_DEPENDENCIES.esbuild }
      : {}),
    'brace-expansion@<2': BRACE_EXPANSION_1_OVERRIDE_VERSION,
    'brace-expansion@>=2 <3': BRACE_EXPANSION_2_OVERRIDE_VERSION,
    'brace-expansion@>=4 <5.0.12': BRACE_EXPANSION_5_OVERRIDE_VERSION,
  };
}

function writeTurboConfiguration(root: string, registry: ResolvedStackRegistry): void {
  const turbo = existsSync(path.join(root, 'turbo.json'))
    ? readJson<TurboConfig>(root, 'turbo.json')
    : ({ tasks: {} } as TurboConfig);
  turbo.$schema = 'https://turbo.build/schema.json';
  turbo.globalDependencies = [
    ...new Set([
      ...((turbo.globalDependencies as string[] | undefined) ?? []),
      '**/.env',
      '**/.env.*',
      '**/.dev.vars',
      '**/.dev.vars.*',
    ]),
  ];
  turbo.globalEnv = [
    ...new Set([
      ...(turbo.globalEnv ?? []),
      'VOID_CLOUDFLARE_DEPLOY_BUILD',
      'npm_execpath',
      ...registry.items.flatMap((item) => item.environment),
    ]),
  ].sort();
  turbo.tasks = {
    ...turbo.tasks,
    dev: { ...turbo.tasks.dev, cache: false, persistent: true },
    lint: { ...turbo.tasks.lint, dependsOn: ['^lint'] },
    typecheck: { ...turbo.tasks.typecheck, dependsOn: ['^typecheck'] },
    test: { dependsOn: ['^build'], outputs: ['coverage/**'] },
    'db:generate': { cache: false },
    'db:migrate': {
      cache: false,
      passThroughEnv: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    },
    build: {
      ...turbo.tasks.build,
      dependsOn: [...new Set(['^build', ...(turbo.tasks.build?.dependsOn ?? [])])],
      outputs: [
        '.next/**',
        '!.next/cache/**',
        '!.next/dev/**',
        '.open-next/**',
        'dist/**',
        '.output/**',
      ],
    },
  };
  json(root, 'turbo.json', turbo);
}

export function writeStandardRoot(
  root: string,
  options: StandardOptions,
  registry: ResolvedStackRegistry,
  updating = false,
): void {
  const has = (value: StandardProduct) => options.products.includes(value);
  const existing = readJson<PackageManifest>(root, 'package.json');
  patchPackage(root, 'package.json', {
    name: options.name,
    private: true,
    packageManager: PACKAGE_MANAGER,
    engines: {
      node: usesVoidSelection(options.products, options.hosting)
        ? VOID_NODE_ENGINE
        : WORKSPACE_NODE_ENGINE,
    },
    scripts: {
      dev: 'turbo dev',
      build: 'turbo build',
      ...((has('next') || has('vinext')) && options.hosting === 'cloudflare'
        ? { 'build:worker': 'pnpm --dir apps/web run build:worker' }
        : {}),
      lint: 'turbo lint',
      typecheck: 'turbo typecheck',
      test: 'turbo test',
      ...(has('neon') || has('d1')
        ? {
            'db:generate': 'turbo run db:generate --filter=@workspace/db',
            'db:migrate': 'turbo run db:migrate --filter=@workspace/db',
          }
        : {}),
      audit: 'node scripts/audit.mjs',
      'audit:full': 'fallow --fail-on-issues',
      'audit:deps': 'node scripts/audit-deps.mjs',
      check: `pnpm lint && pnpm typecheck && pnpm run audit && pnpm audit:deps && pnpm test && pnpm build${workerBuildSuffix(options)}`,
    },
    devDependencies: { turbo: STACK_DEPENDENCIES['turbo'], fallow: STACK_DEPENDENCIES['fallow'] },
    // Upstream starter lockfiles can retain vulnerable transitive versions. Keep fixes within compatible majors.
    pnpm: {
      ...existing.pnpm,
      overrides: { ...existing.pnpm?.overrides, ...securityOverrides(options) },
    },
  });
  writeDependencyAudit(root, updating);
  put(
    root,
    'scripts/audit.mjs',
    `import { spawnSync } from 'node:child_process';
const base = process.env.AUDIT_BASE;
const hasBase = base || ['origin/main', 'main'].find((ref) => spawnSync('git', ['rev-parse', '--verify', ref], { stdio: 'ignore' }).status === 0);
const args = hasBase ? ['exec', 'fallow', 'audit', '--base', hasBase] : ['exec', 'fallow', '--fail-on-issues'];
const entry = process.env.npm_execpath;
if (!entry) throw new Error('Run this check through pnpm run audit.');
const result = spawnSync(process.execPath, [entry, ...args], { stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
`,
  );
  json(root, '.fallowrc.json', {
    // Void loads these contracts outside the JavaScript import graph. Declare
    // them as roots so their application dependencies remain fully audited.
    entry: [
      'apps/*/void.config.ts',
      'apps/*/env.ts',
      'apps/*/src/void-entry.ts',
      'apps/*/crons/**/*.{ts,mts,js,mjs}',
      ...(has('electron') ? ['apps/desktop/src/main/preload.cts'] : []),
    ],
    // Expo web export and NativeWind load these runtime dependencies dynamically.
    ...(has('expo')
      ? {
          ignoreDependencies: [
            'react-native-web',
            'react-native-css-interop',
            'react-native-reanimated',
            'react-native-worklets',
          ],
        }
      : {}),
    ignorePatterns: [
      // Maintained bundled tooling is regression-tested in the CLI repository;
      // app audits cover customer code without re-auditing vendored CLI helpers.
      'scripts/audit.mjs',
      'scripts/audit-deps.mjs',
      'scripts/void-migrations.mjs',
      'scripts/prepare-void-migrations.mjs',
      '**/next-env.d.ts',
      '**/.next/**',
      '**/.open-next/**',
      '**/.vinext/**',
      '**/.wrangler/**',
      '**/dist/**',
      '**/worker-configuration.d.ts',
      '**/cloudflare-env.d.ts',
    ],
  });
  writeTurboConfiguration(root, registry);
  setPnpmPolicy(root, {
    ...(!updating ? { packages: ['apps/*', 'packages/*'] } : {}),
    sharedWorkspaceLockfile: true,
    allowBuilds: undefined,
    onlyBuiltDependencies: [
      'esbuild',
      'sharp',
      'unrs-resolver',
      'workerd',
      ...(has('electron') ? ['electron'] : []),
    ],
  });
  // Upstream app/package lockfiles would create competing dependency authorities.
  if (!updating) {
    for (const parent of ['apps', 'packages']) {
      const directory = path.join(root, parent);
      if (!existsSync(directory)) continue;
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        for (const lock of ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'])
          rmSync(path.join(directory, entry.name, lock), { force: true });
      }
    }
    for (const lock of ['package-lock.json', 'yarn.lock'])
      rmSync(path.join(root, lock), { force: true });
  }
  appendGitignore(root, [
    'node_modules/',
    '.open-next/',
    '.vinext/',
    '.wrangler/',
    '.void/',
    '.void-wrangler.jsonc',
    '/apps/*/db/migrations/',
    '.dev.vars',
    '.dev.vars.*',
    '!.dev.vars.example',
    '.env',
    '.env.*',
    '!.env.example',
    '.fallow/',
    '.anhedral/',
    '.anhedral-audit-report.json',
  ]);
  writeEnvironmentExample(root, registry);
  writeStackDocumentation(root, registry);
  writeProjectSection(root, 'standard', {
    schemaVersion: 1,
    standard: 'anhedral-application-stack',
    products: options.products,
    hosting: has('next') || has('vinext') ? options.hosting : null,
    bootstrap: updating
      ? readProjectSection(root, 'standard').bootstrap
      : {
          command: BOOTSTRAP_COMMAND.join(' '),
          upstreamPackageManager: existing.packageManager,
        },
    status: 'starter',
    resourcesProvisioned: false,
  });
  writeProjectSection(root, 'setup', createSetupPlan({ ...options, dryRun: false }, registry));
  const providers = providerConfigurationTemplate(options.products, options.name);
  const prior =
    updating && hasProjectSection(root, 'providers')
      ? (readProjectSection(root, 'providers') as unknown as ProviderConfiguration)
      : undefined;
  writeProjectSection(root, 'providers', {
    ...providers,
    providers: { ...providers.providers, ...prior?.providers },
  });
  if (!updating) writeSetupDocumentation(root, options);
}
