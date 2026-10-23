import { supportsWorkspaceRuntime } from '../runtime-policy.js';
import { execFile } from '../util.js';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import type { StandardRunner } from '../registry/types.js';
import { json, put } from './files.js';

export function assertWorkspaceRuntime(run: StandardRunner, version = process.versions.node): void {
  if (run === execFile && !supportsWorkspaceRuntime(version))
    throw new Error('Generated workspaces require Node.js 22.13+ on the 22.x line or Node.js 24+.');
}
/** No downloaded template, disposable Next app or initialization-time cloud operation. */
export function bootstrapWorkspace(root: string, name: string, run: StandardRunner): void {
  assertWorkspaceRuntime(run);
  json(root, 'package.json', { name, private: true });
  put(root, 'pnpm-workspace.yaml', 'packages:\n  - apps/*\n  - packages/*\n');
  json(root, 'packages/typescript-config/package.json', {
    name: '@workspace/typescript-config',
    private: true,
    exports: { './base.json': './base.json' },
  });
  json(root, 'packages/typescript-config/base.json', {
    compilerOptions: {
      strict: true,
      skipLibCheck: true,
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
    },
  });
  json(root, 'packages/eslint-config/package.json', {
    name: '@workspace/eslint-config',
    private: true,
    type: 'module',
    exports: { './base': './base.js', './react-internal': './react-internal.js' },
    dependencies: {
      typescript: STACK_DEPENDENCIES.typescript,
      eslint: STACK_DEPENDENCIES.eslint,
      '@typescript-eslint/parser': STACK_DEPENDENCIES['@typescript-eslint/parser'],
      '@typescript-eslint/eslint-plugin': STACK_DEPENDENCIES['@typescript-eslint/eslint-plugin'],
    },
  });
  put(
    root,
    'packages/eslint-config/base.js',
    "import parser from '@typescript-eslint/parser';\nimport plugin from '@typescript-eslint/eslint-plugin';\nexport const config = [{ ignores: ['dist/**', '.output/**', '.wrangler/**', 'worker-configuration.d.ts'] }, { files: ['**/*.{ts,tsx,cts,mts}'], languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } }, plugins: { '@typescript-eslint': plugin }, rules: { ...plugin.configs.recommended.rules, 'no-undef': 'off', 'no-unused-vars': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } }];\n",
  );
  put(root, 'packages/eslint-config/react-internal.js', "export { config } from './base.js';\n");
}
