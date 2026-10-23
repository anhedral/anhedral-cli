import { readProjectSection, writeProjectSection, hasProjectSection } from '../project-config.js';
import {
  OPENNEXT_GLOB_VERSION,
  STACK_DEPENDENCIES,
  WORKSPACE_NODE_ENGINE,
  PACKAGE_MANAGER,
} from '../dependencies.js';
import { writeDependencyAudit } from '../dependency-patches.js';
import { setPnpmPolicy } from '../pnpm-policy.js';
import type { ResolvedStackRegistry } from '../registry/resolve.js';
import { appendGitignore } from '../util.js';
import { createSetupPlan } from '../capabilities.js';
import type { StandardOptions } from '../registry/types.js';
import { json, put, patchPackage } from './files.js';
import { writeSetupDocumentation } from './documentation.js';
import { writeStackDocumentation } from './stack-documentation.js';
import { writeEnvironmentExample } from './environment.js';
import { providerConfigurationTemplate, type ProviderConfiguration } from '../providers/config.js';

export function writeStandardRoot(
  root: string,
  options: StandardOptions,
  registry: ResolvedStackRegistry,
  updating = false,
): void {
  patchPackage(root, 'package.json', {
    name: options.name,
    private: true,
    packageManager: PACKAGE_MANAGER,
    engines: { node: WORKSPACE_NODE_ENGINE },
    scripts: {
      dev: 'turbo dev',
      build: 'turbo build --concurrency=1',
      lint: 'turbo lint',
      typecheck: 'turbo typecheck',
      test: 'turbo test',
      'db:generate': 'turbo run db:generate --filter=@workspace/db',
      'db:migrate': 'turbo run db:migrate --filter=@workspace/db',
      audit: 'node scripts/audit.mjs',
      'audit:full': 'fallow --fail-on-issues',
      'audit:deps': 'node scripts/audit-deps.mjs',
      check:
        'pnpm lint && pnpm typecheck && pnpm run audit && pnpm audit:deps && pnpm test && pnpm build',
    },
    devDependencies: { turbo: STACK_DEPENDENCIES.turbo, fallow: STACK_DEPENDENCIES.fallow },
  });
  writeDependencyAudit(root, updating);
  put(
    root,
    'scripts/audit.mjs',
    `import { spawnSync } from 'node:child_process';
const entry = process.env.npm_execpath;
if (!entry) throw new Error('Run this check through pnpm run audit.');
const result = spawnSync(process.execPath, [entry, 'exec', 'fallow', '--fail-on-issues'], { stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
`,
  );
  json(root, '.fallowrc.json', {
    publicPackages: ['@workspace/native-ui'],
    ignoreDependencies: ['react-native-reanimated', 'react-native-worklets'],
    ignorePatterns: [
      'scripts/audit.mjs',
      'scripts/audit-deps.mjs',
      '**/.wrangler/**',
      '**/dist/**',
      '**/.next/**',
      '**/.open-next/**',
      '**/worker-configuration.d.ts',
    ],
  });
  json(root, 'turbo.json', {
    $schema: 'https://turbo.build/schema.json',
    globalDependencies: ['**/.env', '**/.env.*', '**/.dev.vars', '**/.dev.vars.*'],
    globalEnv: [
      ...new Set(['npm_execpath', ...registry.items.flatMap((item) => item.environment)]),
    ].sort(),
    tasks: {
      dev: { cache: false, persistent: true },
      lint: { dependsOn: ['^lint'] },
      typecheck: { dependsOn: ['^typecheck'] },
      test: { dependsOn: ['^build'], outputs: ['coverage/**'] },
      'db:generate': { cache: false },
      'db:migrate': {
        cache: false,
        passThroughEnv: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
      },
      build: {
        dependsOn: ['^build'],
        outputs: ['dist/**', '.open-next/**', '.next/**', '!.next/cache/**'],
      },
    },
  });
  setPnpmPolicy(root, {
    ...(!updating ? { packages: ['apps/*', 'packages/*'] } : {}),
    // OpenNext's node-minify dependency pins the vulnerable glob CLI.
    overrides: { '@node-minify/core>glob': OPENNEXT_GLOB_VERSION },
    sharedWorkspaceLockfile: true,
    allowBuilds: undefined,
    onlyBuiltDependencies: ['esbuild', 'sharp', 'unrs-resolver', 'workerd'],
  });
  appendGitignore(root, [
    'node_modules/',
    'dist/',
    '.output/',
    '.next/',
    '.open-next/',
    '*.tsbuildinfo',
    '.turbo/',
    '.expo/',
    '.wrangler/',
    '.dev.vars',
    '.dev.vars.*',
    '!.dev.vars.example',
    '.env',
    '.env.*',
    '!.env.example',
    '.fallow/',
    '.anhedral/',
    '.anhedral-audit-report.json',
    'worker-configuration.d.ts',
  ]);
  writeEnvironmentExample(root, registry);
  writeStackDocumentation(root, registry);
  writeProjectSection(root, 'standard', {
    schemaVersion: 1,
    standard: 'anhedral-application-stack',
    products: options.products,
    hosting: 'cloudflare',
    bootstrap: { command: 'anhedral init', source: 'bundled' },
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
