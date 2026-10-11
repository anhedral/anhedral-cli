import { STACK_DEPENDENCIES } from '../dependencies.js';
import { setPnpmPolicy } from '../pnpm-policy.js';
import { writeSecurityBackports } from '../security-backports.js';
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
import { writeEnvironmentExample } from './environment.js';
export function writeStandardRoot(
  root: string,
  options: StandardOptions,
  registry: ResolvedStackRegistry,
  updating = false,
): void {
  const has = (value: StandardProduct) => options.products.includes(value);
  const existing = readJson<PackageManifest>(root, 'package.json');
  const securityOverrides = {
    ...(has('wxt') ? { '@wxt-dev/module-react>@vitejs/plugin-react': '5.2.0' } : {}),
    ...(has('next') || has('vinext') ? { 'sharp@<0.35.5': '0.35.5' } : {}),
    'source-map-js@<1.2.2': '1.2.2',
    ...(has('next') && options.hosting === 'cloudflare'
      ? { 'glob@>=10.2.0 <10.5.0': '10.5.0', 'glob@>=11.0.0 <11.1.0': '11.1.0' }
      : {}),
    ...(has('wxt')
      ? { 'shell-quote@<1.12.0': '1.12.0', 'tmp@<0.2.7': '0.2.7', 'adm-zip@<0.6.1': '0.6.1' }
      : {}),
    'baseline-browser-mapping@<2.11.0': '2.11.27',
    'browserslist@<4.28.7': '4.29.3',
    ...(((has('next') || has('vinext')) && options.hosting === 'cloudflare') ||
    has('hono') ||
    has('electron') ||
    has('wxt')
      ? { 'esbuild@<0.25.0': '0.25.12' }
      : {}),
    'brace-expansion@<2': '1.1.21',
    'brace-expansion@>=2 <3': '2.1.7',
    'brace-expansion@>=3 <4': '3.0.9',
    'brace-expansion@>=4 <5.0.12': '5.0.12',
  };
  patchPackage(root, 'package.json', {
    name: options.name,
    private: true,
    packageManager: PACKAGE_MANAGER,
    engines: { node: '>=22.13.0' },
    scripts: {
      dev: 'turbo dev',
      build: 'turbo build',
      ...((has('next') || has('vinext')) && options.hosting === 'cloudflare'
        ? { 'build:worker': 'pnpm --dir apps/web run build:worker' }
        : {}),
      lint: 'turbo lint',
      typecheck: 'turbo typecheck',
      test: 'turbo test',
      audit: 'node scripts/audit.mjs',
      'audit:full': 'fallow --fail-on-issues',
      'audit:deps': 'node scripts/security/audit-deps.mjs',
      check: `pnpm lint && pnpm typecheck && pnpm run audit && pnpm audit:deps && pnpm test && pnpm build${workerBuildSuffix(options)}`,
    },
    devDependencies: { fallow: STACK_DEPENDENCIES['fallow'] },
    // Upstream starter lockfiles can retain vulnerable transitive versions. Keep fixes within compatible majors.
    pnpm: { ...existing.pnpm, overrides: { ...existing.pnpm?.overrides, ...securityOverrides } },
  });
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
    ...(has('electron') ? { entry: ['apps/desktop/src/main/preload.cts'] } : {}),
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
      '**/next-env.d.ts',
      '**/.next/**',
      '**/.open-next/**',
      '**/.wrangler/**',
      '**/dist/**',
      '**/worker-configuration.d.ts',
      '**/cloudflare-env.d.ts',
    ],
  });
  const turbo = readJson<TurboConfig>(root, 'turbo.json');
  turbo.globalEnv = [...new Set(registry.items.flatMap((item) => item.environment))].sort();
  turbo.tasks = {
    ...turbo.tasks,
    dev: { ...turbo.tasks.dev, cache: false, persistent: true },
    lint: { ...turbo.tasks.lint, dependsOn: ['^lint'] },
    typecheck: { ...turbo.tasks.typecheck, dependsOn: ['^typecheck'] },
    test: { dependsOn: ['^build'], outputs: ['coverage/**'] },
    build: {
      ...turbo.tasks.build,
      dependsOn: [...new Set(['^build', ...(turbo.tasks.build?.dependsOn ?? [])])],
      outputs: ['.next/**', '!.next/cache/**', '.open-next/**', 'dist/**', '.output/**'],
    },
  };
  json(root, 'turbo.json', turbo);
  setPnpmPolicy(root, {
    allowBuilds: undefined,
    onlyBuiltDependencies: [
      'esbuild',
      'sharp',
      'unrs-resolver',
      'workerd',
      ...(has('electron') ? ['electron'] : []),
    ],
  });
  writeSecurityBackports(root);
  appendGitignore(root, [
    'node_modules/',
    '.open-next/',
    '.wrangler/',
    '.dev.vars',
    '.dev.vars.*',
    '!.dev.vars.example',
    '.env',
    '.env.*',
    '!.env.example',
    '.fallow/',
    '.anhedral/',
  ]);
  writeEnvironmentExample(root, registry);
  json(root, 'anhedral.standard.json', {
    schemaVersion: 1,
    standard: 'anhedral-application-stack',
    products: options.products,
    hosting: has('next') || has('vinext') ? options.hosting : null,
    bootstrap: updating
      ? readJson(root, 'anhedral.standard.json').bootstrap
      : {
          command: BOOTSTRAP_COMMAND.join(' '),
          upstreamPackageManager: existing.packageManager,
        },
    status: 'starter',
    resourcesProvisioned: false,
  });
  json(root, 'anhedral.setup.json', createSetupPlan({ ...options, dryRun: false }, registry));
  if (!updating) writeSetupDocumentation(root, options);
}
