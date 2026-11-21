import { createRequire } from 'node:module';

import { STACK_DEPENDENCIES } from '../dependencies.js';
import { json, launchTemplate, put, stackTemplate } from './files.js';

/** Generate CSS from the same tokens the styling package exports. */
export function scaffoldStyling(root: string): void {
  json(root, 'packages/styling/package.json', {
    name: '@workspace/styling',
    private: true,
    type: 'module',
    exports: { '.': './src/index.ts', './globals.css': './globals.css' },
    scripts: { typecheck: 'tsc --noEmit', lint: 'eslint . --max-warnings 0' },
    dependencies: {},
    devDependencies: {
      typescript: STACK_DEPENDENCIES.typescript,
      '@types/node': STACK_DEPENDENCIES['@types/node'],
      eslint: STACK_DEPENDENCIES.eslint,
      '@workspace/eslint-config': 'workspace:*',
    },
  });
  json(root, 'packages/styling/tsconfig.json', {
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
      allowJs: true,
    },
    include: ['src/**/*.ts', 'src/**/*.cjs'],
  });
  put(root, 'packages/styling/eslint.config.mjs', stackTemplate('shared-eslint.config.mjs.txt'));
  put(
    root,
    'packages/styling/src/index.ts',
    "export { light, dark, spacing } from './tokens.cjs';\n",
  );
  put(root, 'packages/styling/src/tokens.cjs', launchTemplate('styling-tokens.cjs'));
  const tokens = createRequire(import.meta.url)('../../assets/launch/styling-tokens.cjs') as {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  const theme = (values: Record<string, string>, indent = '') =>
    [
      indent + ':root {',
      ...Object.entries(values).map(([key, value]) => `${indent}  ${key}: ${value};`),
      indent + '}',
    ].join('\n');
  put(
    root,
    'packages/styling/globals.css',
    [
      theme(tokens.light),
      '@media (prefers-color-scheme: dark) {',
      theme(tokens.dark, '  '),
      '}',
      '',
    ].join('\n'),
  );
  put(
    root,
    'packages/styling/src/tokens.d.cts',
    'export const light: Record<string, string>;\nexport const dark: Record<string, string>;\nexport const spacing: { small: number; medium: number; large: number };\n',
  );
}
