import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { execFile, appendGitignore } from '../util.js';
import { bootstrapArguments } from '../registry/bootstrap.js';
import type { StandardRunner } from '../registry/types.js';
import { json, put } from './files.js';
import { STACK_DEPENDENCIES, PACKAGE_MANAGER, MOBILE_APP_DEPENDENCIES } from '../dependencies.js';
import { supportsWorkspaceRuntime } from '../runtime-policy.js';

export function assertBootstrapPlatform(run: StandardRunner, platform = process.platform): void {
  if (platform === 'win32' && run === execFile)
    throw new Error(
      'Native Windows initialization is blocked because the upstream shadcn monorepo bootstrap writes component files outside the project. Run Anhedral inside WSL. Planning and doctor remain available on Windows.',
    );
}

/** Planning and diagnostics support older Node releases; generated dependencies do not. */
export function assertWorkspaceRuntime(run: StandardRunner, version = process.versions.node): void {
  if (run !== execFile) return;
  if (!supportsWorkspaceRuntime(version))
    throw new Error(
      'Generated workspaces require Node.js 22.13+ on the 22.x line or Node.js 24+. Planning and doctor remain available on older CLI-supported versions.',
    );
}

export function bootstrapWorkspace(
  root: string,
  name: string,
  run: StandardRunner,
  webOnly = false,
): void {
  assertBootstrapPlatform(run);
  assertWorkspaceRuntime(run);
  const temporary = path.join(root, '.bootstrap');
  mkdirSync(temporary);
  try {
    run('pnpm', bootstrapArguments(name, temporary), root);
    const generated = path.join(temporary, name);
    if (
      !existsSync(path.join(generated, 'pnpm-workspace.yaml')) ||
      !existsSync(path.join(generated, 'apps/web/package.json'))
    )
      throw new Error('Official shadcn bootstrap did not produce the expected monorepo.');
    const ignored = ['.git', 'node_modules', '.next', '.turbo'];
    const seed =
      !webOnly && existsSync(path.join(root, '.gitignore'))
        ? readFileSync(path.join(root, '.gitignore'), 'utf8')
        : '';
    for (const entry of webOnly ? ['apps/web', 'packages/ui'] : readdirSync(generated)) {
      if (ignored.includes(entry)) continue;
      if (webOnly && existsSync(path.join(root, entry)))
        throw new Error(`Web foundation target already exists: ${entry}.`);
      cpSync(path.join(generated, entry), path.join(root, entry), {
        recursive: true,
        filter: (source) => !ignored.includes(path.basename(source)),
      });
    }
    if (seed) appendGitignore(root, seed.split(/\r?\n/));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

/** Native/server profiles have no dependency on a disposable Next.js application. */
export function bootstrapUniversalWorkspace(root: string, name: string): void {
  json(root, 'package.json', { name, private: true, packageManager: PACKAGE_MANAGER, scripts: {} });
  put(root, 'pnpm-workspace.yaml', 'packages:\n  - "apps/*"\n  - "packages/*"\n');
  json(root, 'packages/typescript-config/package.json', {
    name: '@workspace/typescript-config',
    private: true,
  });
  json(root, 'packages/typescript-config/base.json', {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    },
  });
  json(root, 'packages/eslint-config/package.json', {
    name: '@workspace/eslint-config',
    private: true,
    type: 'module',
    exports: { './base': './base.js', './react-internal': './react-internal.js' },
    devDependencies: {
      'eslint-plugin-react-hooks': STACK_DEPENDENCIES['eslint-plugin-react-hooks'],
      typescript: MOBILE_APP_DEPENDENCIES.devDependencies!.typescript,
      eslint: STACK_DEPENDENCIES.eslint,
      '@typescript-eslint/parser': STACK_DEPENDENCIES['@typescript-eslint/parser'],
      '@typescript-eslint/eslint-plugin': STACK_DEPENDENCIES['@typescript-eslint/eslint-plugin'],
    },
  });
  put(
    root,
    'packages/eslint-config/base.js',
    `import parser from '@typescript-eslint/parser';
import plugin from '@typescript-eslint/eslint-plugin';
export const config = [{ ignores: ['**/node_modules/**', '**/dist/**', '**/.expo/**', '**/.wrangler/**', '**/worker-configuration.d.ts'] }, {
  files: ['**/*.{ts,tsx,cts,mts}'], languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { '@typescript-eslint': plugin }, rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
}];
`,
  );
  put(
    root,
    'packages/eslint-config/react-internal.js',
    "import hooks from 'eslint-plugin-react-hooks';\nimport { config as base } from './base.js';\nexport const config = [...base, hooks.configs.flat.recommended];\n",
  );
}
