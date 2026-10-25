import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync, brotliDecompressSync } from 'node:zlib';
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
  let overlay: { schemaVersion: number; files: Record<string, string> } | undefined;
  const readAsset = (file: string): string => {
    if (existsSync(assets + file)) return readFileSync(assets + file, 'utf8');
    if (existsSync(assets + file + '.gz'))
      return gunzipSync(readFileSync(assets + file + '.gz'), {
        maxOutputLength: 16 * 1024 * 1024,
      }).toString();
    overlay ??= JSON.parse(
      brotliDecompressSync(readFileSync(assets + 'native-overlay.json.br'), {
        maxOutputLength: 16 * 1024 * 1024,
      }).toString(),
    );
    if (
      overlay?.schemaVersion !== 1 ||
      !Object.hasOwn(overlay.files, file) ||
      typeof overlay.files[file] !== 'string'
    )
      throw Error('Missing native template: ' + file);
    return overlay.files[file]!;
  };
  const registry = JSON.parse(readFileSync(assets + 'native/registry.json', 'utf8')) as {
    components: { id: string; file: string }[];
    supportFiles: string[];
    recipeCatalogs?: string[];
    supportModules?: { file: string; exports: string[] }[];
  };
  const components = [
    ...registry.components.map((item) => item.id),
    'layout',
    'text',
    'theme-switcher',
  ];
  put(root, 'packages/native-ui/native-fonts.json', readAsset('native-fonts.json'));
  type RecipeCatalog = {
    schemaVersion: number;
    upstream: unknown;
    recipes: {
      kind: 'block' | 'example';
      style: string;
      name: string;
      source: string;
      origin: string;
      upstreamSha256: string;
      nativeSha256: string;
    }[];
  };
  const catalogs = (registry.recipeCatalogs ?? ['native-chart-recipes.json']).map((file) => {
    if (!/^native-[a-z-]+-recipes\.json$/.test(file)) throw Error('Unsafe native recipe catalog.');
    return JSON.parse(readAsset(file)) as RecipeCatalog;
  });
  const recipes: RecipeCatalog = {
    schemaVersion: 1,
    upstream: catalogs[0]?.upstream,
    recipes: catalogs.flatMap((catalog) => catalog.recipes),
  };
  if (
    catalogs.some(
      (catalog) =>
        catalog.schemaVersion !== 1 ||
        JSON.stringify(catalog.upstream) !== JSON.stringify(recipes.upstream),
    )
  )
    throw Error('Native recipe catalogs must share one reviewed source pin.');
  for (const recipe of recipes.recipes) {
    if (
      !/^(default|new-york|new-york-v4|base|radix|aria)$/.test(recipe.style) ||
      !/^[a-z][a-z0-9-]+$/.test(recipe.name)
    )
      throw Error('Unsafe native recipe path.');
    const folder = recipe.kind === 'block' ? 'recipes' : 'examples';
    put(root, `packages/native-ui/src/${folder}/${recipe.style}/${recipe.name}.tsx`, recipe.source);
  }
  json(root, 'packages/native-ui/NATIVE_RECIPES.json', {
    ...recipes,
    recipes: recipes.recipes.map(({ source: _source, ...metadata }) => metadata),
  });
  const nativeFiles = [...registry.components.map((item) => item.file), ...registry.supportFiles];
  for (const file of [
    'theme.tsx',
    'theme-storage.ts',
    'LICENSE.shadcn',
    'UPSTREAM.json',
    'UPSTREAM-LOCK.json',
    ...nativeFiles.map((name) => `native/${name}`),
  ]) {
    const source = readAsset(file);
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
      components
        .map((name) =>
          name === 'toast'
            ? `export { ToastProvider, useToast, Toast, Toaster, ToastViewport, ToastTitle, ToastDescription, ToastAction, ToastClose, ToastContent, ToastPortal, createToastManager, useToastManager, toast as nativeToastManager } from './native/toast';\n`
            : `export * from './native/${name}';\n`,
        )
        .join('') +
      (registry.supportModules ?? [])
        .map((item) => `export { ${item.exports.join(', ')} } from './native/${item.file}';\n`)
        .join(''),
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
      './blocks/*': './src/recipes/*.tsx',
      './examples/*': './src/examples/*.tsx',
      './recipes': './NATIVE_RECIPES.json',
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
      ...NATIVE_UI_DEPENDENCIES.devDependencies,
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
      resolveJsonModule: true,
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
  });
  writeReactLintConfig(root + '/packages/native-ui');
}
