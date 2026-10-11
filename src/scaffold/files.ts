import { STACK_DEPENDENCIES, WORKER_DEV_PORTS } from '../dependencies.js';
import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from '../bounded-file.js';
import path from 'node:path';
import { writeFile } from '../util.js';
export type Json = Record<string, unknown>;
export interface PackageManifest extends Json {
  name?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  pnpm?: { overrides?: Record<string, string> };
}
export interface TurboConfig extends Json {
  globalEnv?: string[];
  tasks: Record<string, { dependsOn?: string[]; outputs?: string[]; [key: string]: unknown }>;
}
export function readJson<T extends Json = Json>(root: string, file: string): T {
  let value: unknown;
  try {
    value = JSON.parse(
      readBoundedFile(path.join(root, file), MAX_PROJECT_JSON_BYTES).toString('utf8'),
    );
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in ${file}.`);
    throw error;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Expected a JSON object: ${file}.`);
  return value as T;
}
export function json(root: string, file: string, value: unknown): void {
  writeFile(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
}
export function put(root: string, file: string, value: string): void {
  writeFile(path.join(root, file), value);
}
export function patchPackage(root: string, file: string, patch: PackageManifest): void {
  const current = readJson<PackageManifest>(root, file);
  const merged = { ...current, ...patch };
  for (const key of ['scripts', 'dependencies', 'devDependencies'] as const) {
    if (patch[key]) merged[key] = { ...current[key], ...patch[key] };
  }
  json(root, file, merged);
}
export function workerConfig(name: string): Json {
  return {
    $schema: 'node_modules/wrangler/config-schema.json',
    name,
    main: 'src/index.ts',
    compatibility_date: '2026-10-05',
    compatibility_flags: ['nodejs_compat'],
    observability: { enabled: true },
  };
}
export function worker(
  root: string,
  app: string,
  config: Json,
  source: string,
  dependencies: Record<string, string> = {},
): void {
  const ports = WORKER_DEV_PORTS[app as keyof typeof WORKER_DEV_PORTS];
  if (!ports) throw new Error(`Unknown Worker application: ${app}.`);
  json(root, `apps/${app}/package.json`, {
    name: `@workspace/${app}`,
    private: true,
    type: 'module',
    scripts: {
      dev: `wrangler dev --port ${ports.http} --inspector-port ${ports.inspector}`,
      build: 'wrangler deploy --dry-run --outdir dist',
      deploy: 'wrangler deploy',
      typecheck: 'wrangler types && tsc --noEmit',
      lint: 'eslint . --max-warnings 0',
    },
    dependencies,
    devDependencies: {
      wrangler: STACK_DEPENDENCIES['wrangler'],
      typescript: STACK_DEPENDENCIES['typescript'],
      '@types/node': STACK_DEPENDENCIES['@types/node'],
      eslint: STACK_DEPENDENCIES['eslint'],
      '@workspace/eslint-config': 'workspace:*',
    },
  });
  json(root, `apps/${app}/wrangler.jsonc`, config);
  json(root, `apps/${app}/tsconfig.json`, {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      skipLibCheck: true,
      noEmit: true,
      types: ['node'],
    },
    include: ['src/**/*.ts', 'worker-configuration.d.ts'],
  });
  put(
    root,
    `apps/${app}/eslint.config.mjs`,
    'import { config } from "@workspace/eslint-config/base";\nexport default [...config, { ignores: ["dist/**", ".wrangler/**", "worker-configuration.d.ts"] }, { files: ["**/*.ts"], rules: { "no-undef": "off", "no-unused-vars": "off" } }];\n',
  );
  put(root, `apps/${app}/src/index.ts`, source);
}
export function sharedPackage(
  root: string,
  name: string,
  source: string,
  dependencies: Record<string, string>,
): void {
  json(root, `packages/${name}/package.json`, {
    name: `@workspace/${name}`,
    private: true,
    type: 'module',
    exports: { '.': './src/index.ts' },
    scripts: { typecheck: 'tsc --noEmit', lint: 'eslint . --max-warnings 0' },
    dependencies,
    devDependencies: {
      typescript: STACK_DEPENDENCIES['typescript'],
      '@types/node': STACK_DEPENDENCIES['@types/node'],
      eslint: STACK_DEPENDENCIES['eslint'],
      '@workspace/eslint-config': 'workspace:*',
    },
  });
  json(root, `packages/${name}/tsconfig.json`, {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      skipLibCheck: true,
      noEmit: true,
      types: ['node'],
    },
    include: ['src/**/*.ts'],
  });
  put(
    root,
    `packages/${name}/eslint.config.mjs`,
    'import { config } from "@workspace/eslint-config/base";\nexport default [...config, { ignores: ["dist/**", ".wrangler/**", "worker-configuration.d.ts"] }, { files: ["**/*.ts"], rules: { "no-undef": "off", "no-unused-vars": "off" } }];\n',
  );
  put(root, `packages/${name}/src/index.ts`, source);
}
