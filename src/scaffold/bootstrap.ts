import type { CommandRunner } from '../command-types.js';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import { supportsWorkspaceRuntime } from '../runtime-policy.js';
import { execFile } from '../util.js';
import { json, put, stackTemplate } from './files.js';

export function assertWorkspaceRuntime(run: CommandRunner, version = process.versions.node): void {
  if (run === execFile && !supportsWorkspaceRuntime(version))
    throw new Error('Generated workspaces require Node.js 22.13+ on the 22.x line or Node.js 24+.');
}

export function bootstrapWorkspace(root: string): void {
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
  put(root, 'packages/eslint-config/base.js', stackTemplate('base-eslint.js.txt'));
  put(root, 'packages/eslint-config/react-internal.js', "export { config } from './base.js';\n");
}
