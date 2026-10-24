import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  NATIVE_ESLINT_VERSION,
  NATIVE_UI_DEPENDENCIES,
  MOBILE_APP_DEPENDENCIES,
} from '../dependencies.js';
import { json, put } from './files.js';
import { writeReactLintConfig } from '../platforms/lint.js';

/** Anhedral-maintained native shadcn port. Never imported by the DOM application. */
export function scaffoldNativeUI(root: string): void {
  const assets = fileURLToPath(new URL('../../assets/ui/', import.meta.url));
  const registry = JSON.parse(readFileSync(assets + 'native/registry.json', 'utf8')) as {
    components: { id: string; file: string }[];
    supportFiles: string[];
    supportModules?: { file: string; exports: string[] }[];
  };
  const components = [
    ...registry.components.map((item) => item.id),
    'layout',
    'text',
    'theme-switcher',
    ...(registry.supportModules ?? []).map((item) => item.file),
  ];
  const nativeFiles = [...registry.components.map((item) => item.file), ...registry.supportFiles];
  for (const file of [
    'theme.tsx',
    'theme-storage.ts',
    'LICENSE.shadcn',
    'UPSTREAM.json',
    ...nativeFiles.map((name) => `native/${name}`),
  ]) {
    const source = readFileSync(
      fileURLToPath(new URL(`../../assets/ui/${file}`, import.meta.url)),
      'utf8',
    );
    put(
      root,
      `packages/native-ui/${file.endsWith('.tsx') || file.endsWith('.ts') ? 'src/' : ''}${file}`,
      source,
    );
  }
  put(
    root,
    'packages/native-ui/README.md',
    readFileSync(fileURLToPath(new URL('../../docs/native-ui.md', import.meta.url)), 'utf8'),
  );
  put(
    root,
    'packages/native-ui/native-registry.md',
    readFileSync(fileURLToPath(new URL('../../docs/native-registry.md', import.meta.url)), 'utf8'),
  );
  put(
    root,
    'packages/native-ui/NATIVE_COMPONENTS.json',
    readFileSync(assets + 'native/registry.json', 'utf8'),
  );
  put(
    root,
    'packages/native-ui/src/index.ts',
    `export * from './theme';\n` +
      components.map((name) => `export * from './native/${name}';\n`).join(''),
  );
  json(root, 'packages/native-ui/package.json', {
    name: '@workspace/native-ui',
    private: true,
    type: 'module',
    exports: {
      '.': './src/index.ts',
      './components/*': './src/native/*.tsx',
      './theme': './src/theme.tsx',
      './hooks/*': './src/native/*.tsx',
      './lib/*': './src/native/*.tsx',
    },
    scripts: { typecheck: 'tsc --noEmit', lint: 'eslint . --max-warnings 0' },
    dependencies: {
      ...NATIVE_UI_DEPENDENCIES.dependencies,
      'react-native-safe-area-context':
        MOBILE_APP_DEPENDENCIES.dependencies!['react-native-safe-area-context'],
      '@workspace/styling': 'workspace:*',
    },
    peerDependencies: {
      react: MOBILE_APP_DEPENDENCIES.dependencies!.react,
      'react-native': MOBILE_APP_DEPENDENCIES.dependencies!['react-native'],
    },
    devDependencies: {
      typescript: MOBILE_APP_DEPENDENCIES.devDependencies!.typescript,
      '@types/react': MOBILE_APP_DEPENDENCIES.devDependencies!['@types/react'],
      react: MOBILE_APP_DEPENDENCIES.dependencies!.react,
      'react-native': MOBILE_APP_DEPENDENCIES.dependencies!['react-native'],
      '@workspace/eslint-config': 'workspace:*',
      eslint: NATIVE_ESLINT_VERSION,
    },
  });
  json(root, 'packages/native-ui/tsconfig.json', {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      jsx: 'react-jsx',
      noEmit: true,
      skipLibCheck: true,
      esModuleInterop: true,
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
  });
  writeReactLintConfig(root + '/packages/native-ui');
}
