import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MOBILE_APP_DEPENDENCIES, CLIENT_WEB_UI_DEPENDENCIES } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { json, patchPackage, put, sharedPackage } from './files.js';

const assets = fileURLToPath(new URL('../../assets/ui/', import.meta.url));

/** Offline, source-owned Nova web components with explicit native implementations. */
export function scaffoldAnhedralUi({ root, has }: RecipeContext): void {
  const uiName = has('next') || has('vinext') ? 'expo-ui' : 'ui';
  const output = (file: string) => file.replace('packages/ui', 'packages/' + uiName);
  sharedPackage(root, uiName, "export { ThemeProvider, useTheme } from './theme';\n", {
    react: MOBILE_APP_DEPENDENCIES.dependencies!.react,
    'react-dom': MOBILE_APP_DEPENDENCIES.dependencies!['react-dom'],
    'react-native': MOBILE_APP_DEPENDENCIES.dependencies!['react-native'],
    'expo-system-ui': MOBILE_APP_DEPENDENCIES.dependencies!['expo-system-ui'],
    '@react-native-async-storage/async-storage':
      MOBILE_APP_DEPENDENCIES.dependencies!['@react-native-async-storage/async-storage'],
    '@workspace/styling': 'workspace:*',
    ...CLIENT_WEB_UI_DEPENDENCIES.dependencies,
    'react-native-safe-area-context':
      MOBILE_APP_DEPENDENCIES.dependencies!['react-native-safe-area-context'],
  });
  patchPackage(root, output('packages/ui/package.json'), {
    exports: {
      '.': './src/index.ts',
      './theme': './src/theme.tsx',
      './styles.css': './src/styles.css',
      './components/*': {
        'react-native': './src/components/*.tsx',
        default: './src/components/*.web.tsx',
      },
      './web/*': './src/web/*.tsx',
    },
    devDependencies: {
      '@types/react': MOBILE_APP_DEPENDENCIES.devDependencies!['@types/react'],
      '@types/react-dom': MOBILE_APP_DEPENDENCIES.devDependencies!['@types/react-dom'],
      tailwindcss: CLIENT_WEB_UI_DEPENDENCIES.devDependencies!.tailwindcss,
      'tw-animate-css': CLIENT_WEB_UI_DEPENDENCIES.devDependencies!['tw-animate-css'],
    },
  });
  json(root, output('packages/ui/tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'react-jsx',
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      esModuleInterop: true,
      customConditions: ['react-native'],
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
  });
  for (const folder of ['web', 'native'])
    for (const name of readdirSync(path.join(assets, folder))) {
      put(
        root,
        `packages/${uiName}/src/${folder === 'native' ? 'components' : folder}/${name}`,
        readFileSync(path.join(assets, folder, name), 'utf8'),
      );
    }
  for (const name of ['theme.tsx', 'theme-storage.ts', 'theme-storage.web.ts'])
    put(root, `packages/${uiName}/src/${name}`, readFileSync(path.join(assets, name), 'utf8'));
  put(root, output('packages/ui/src/tokens.ts'), "export { themes } from '@workspace/styling';\n");
  put(
    root,
    output('packages/ui/UPSTREAM.json'),
    readFileSync(path.join(assets, 'UPSTREAM.json'), 'utf8'),
  );
  put(
    root,
    output('packages/ui/LICENSE.shadcn'),
    readFileSync(path.join(assets, 'LICENSE.shadcn'), 'utf8'),
  );
  const tokens = JSON.parse(readFileSync(path.join(assets, 'tokens.json'), 'utf8')) as Record<
    string,
    Record<string, string>
  >;
  const css = Object.entries(tokens.light)
    .map(([key]) => `  --color-${key}: var(--${key});`)
    .join('\n');
  put(
    root,
    output('packages/ui/src/styles.css'),
    `@import "tailwindcss";
@import "tw-animate-css";
@source "./web";
@source "./components";
@source "../../../apps/mobile";
@custom-variant dark (&:is(.dark *));
@theme inline {
${css}
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-heading: var(--font-sans);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
:root { color-scheme: light; --radius: 0.625rem;
${Object.entries(tokens.light)
  .map(([key, value]) => `  --${key}: ${value};`)
  .join('\n')}
}
.dark { color-scheme: dark;
${Object.entries(tokens.dark)
  .map(([key, value]) => `  --${key}: ${value};`)
  .join('\n')}
}
@layer base {
  * { @apply border-border; }
  html, body, #root { min-height: 100%; }
  body { @apply bg-background text-foreground font-sans antialiased; }
}
@utility cn-font-heading { font-family: var(--font-heading); }
`,
  );
  json(root, output('packages/ui/components.json'), {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'base-nova',
    rsc: false,
    tsx: true,
    tailwind: { config: '', css: 'src/styles.css', baseColor: 'neutral', cssVariables: true },
    aliases: {
      ui: '@workspace/' + uiName + '/web',
      components: '@workspace/' + uiName + '/web',
      utils: 'cn',
      lib: '@workspace/' + uiName,
      hooks: '@workspace/' + uiName,
    },
    iconLibrary: 'lucide',
  });
  patchPackage(root, 'apps/mobile/package.json', {
    dependencies: { ['@workspace/' + uiName]: 'workspace:*' },
    devDependencies: {
      '@tailwindcss/postcss': CLIENT_WEB_UI_DEPENDENCIES.devDependencies!['@tailwindcss/postcss'],
      postcss: CLIENT_WEB_UI_DEPENDENCIES.devDependencies!.postcss,
    },
  });
  put(
    root,
    'apps/mobile/postcss.config.mjs',
    'export default { plugins: { "@tailwindcss/postcss": {} } };\n',
  );
  put(
    root,
    output('packages/ui/README.md'),
    `# Client design system

Web uses the vendored official shadcn Base UI Nova source in src/web, with provenance and MIT license retained. Universal imports use platform-aware adapters in src/components; native uses React Native views and styles, with accessible touch targets and system text scaling. Browser Base UI never enters native bundles.

Import components from @workspace/ui/components/*, or browser-only Nova components from @workspace/ui/web/*. Keep native counterparts and browser variants aligned. ThemeProvider belongs at the app root, above navigation and overlays. System/light/dark preferences persist using platform storage; system changes remain live. Design values belong to @workspace/styling, not screens. Expo stays on the selected SDK; add native libraries with expo install and verify them on development builds.
`,
  );
}

/** Only use on newly emitted Expo sources; adopted files remain fingerprint-protected. */
export function expoUiSource(root: string, source: string): string {
  return existsSync(path.join(root, 'apps/web/package.json'))
    ? source.replaceAll('@workspace/ui', '@workspace/expo-ui')
    : source;
}
