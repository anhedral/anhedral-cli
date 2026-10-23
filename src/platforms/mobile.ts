import { NATIVE_ESLINT_VERSION } from '../dependencies.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { writeReactLintConfig } from './lint.js';
import { appendGitignore, writeFile } from '../util.js';
import { childPackageName, jsString } from '../render.js';
import { MOBILE_APP_DEPENDENCIES, EAS_CLI_VERSION } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { scaffoldExpoRuntime } from '../scaffold/expo-runtime.js';
function expoScheme(projectName: string): string {
  const unscoped = projectName.replace(/^@[^/]+\//, '');
  const safe = unscoped.toLowerCase().replace(/[^a-z0-9+.-]+/g, '-');
  let start = 0;
  let end = safe.length;
  while (start < end && '+.-'.includes(safe[start]!)) start++;
  while (end > start && '+.-'.includes(safe[end - 1]!)) end--;
  const normalized = safe.slice(start, end);
  const candidate = normalized || 'app';
  return /^[a-z]/.test(candidate) ? candidate : `app-${candidate}`;
}
export async function scaffoldExpo(context: RecipeContext): Promise<void> {
  const { root, options } = context;
  const dir = path.join(root, 'apps/mobile');
  const projectName = options.name;
  const displayName = options.name;
  writeReactLintConfig(dir);
  writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: childPackageName(projectName, 'mobile'),
        version: '0.1.0',
        private: true,
        main: 'expo-router/entry',
        scripts: {
          dev: 'expo start -c',
          android: 'expo start -c --android',
          ios: 'expo start -c --ios',
          web: 'expo start -c --web',
          build: 'pnpm typecheck && pnpm build:web',
          'build:web': 'expo export --platform web',
          'eas:login': `pnpm dlx eas-cli@${EAS_CLI_VERSION} login`,
          'build:simulator:ios': `pnpm dlx eas-cli@${EAS_CLI_VERSION} build --platform ios --profile simulator`,
          'build:internal:ios': `pnpm dlx eas-cli@${EAS_CLI_VERSION} build --platform ios --profile preview`,
          'build:internal:android': `pnpm dlx eas-cli@${EAS_CLI_VERSION} build --platform android --profile preview`,
          'build:production:ios': `pnpm dlx eas-cli@${EAS_CLI_VERSION} build --platform ios --profile production`,
          'build:production:android': `pnpm dlx eas-cli@${EAS_CLI_VERSION} build --platform android --profile production`,
          typecheck: 'tsc --noEmit',
          lint: 'eslint app components lib --max-warnings 0',
        },
        dependencies: {
          ...MOBILE_APP_DEPENDENCIES.dependencies,
          '@workspace/styling': 'workspace:*',
        },
        devDependencies: {
          ...MOBILE_APP_DEPENDENCIES.devDependencies,
          '@workspace/eslint-config': 'workspace:*',
          eslint: NATIVE_ESLINT_VERSION,
        },
      },
      null,
      2,
    ) + '\n',
  );
  writeFile(
    path.join(dir, 'app.json'),
    JSON.stringify(
      {
        expo: {
          name: displayName,
          slug: projectName.replace(/^@[^/]+\//, ''),
          version: '1.0.0',
          orientation: 'portrait',
          userInterfaceStyle: 'automatic',
          scheme: expoScheme(projectName),
          web: { bundler: 'metro', output: 'static' },
          plugins: ['expo-router', 'expo-status-bar'],
          experiments: { reactCompiler: true, typedRoutes: true },
        },
      },
      null,
      2,
    ) + '\n',
  );
  writeFile(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: 'expo/tsconfig.base',
        compilerOptions: {
          strict: true,
          noUncheckedIndexedAccess: true,
          paths: { '@/*': ['./*'] },
          customConditions: ['react-native'],
        },
        include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'],
        exclude: ['node_modules', 'worker', '.output', 'worker-configuration.d.ts'],
      },
      null,
      2,
    ) + '\n',
  );
  writeFile(
    path.join(dir, 'babel.config.js'),
    "module.exports = function(api) { api.cache(true); return { presets: ['babel-preset-expo'] }; };\n",
  );
  writeFile(
    path.join(dir, 'metro.config.js'),
    "const { getDefaultConfig } = require('expo/metro-config');\nmodule.exports = getDefaultConfig(__dirname);\n",
  );
  writeFile(path.join(dir, 'styles.d.ts'), "declare module '*.css';\n");
  writeFile(
    path.join(dir, 'components/ui/button.tsx'),
    "export { Button } from '@workspace/ui/components/button';\n",
  );
  writeFile(
    path.join(dir, 'app/_layout.tsx'),
    `import '@/components/app-styles';
import '@/lib/development-client';
import { Stack } from 'expo-router';
import { AppProviders } from '@/components/app-providers';
export default function RootLayout() { return <AppProviders><Stack screenOptions={{ headerShown: false }} /></AppProviders>; }
`,
  );
  writeFile(
    path.join(dir, 'lib/starter.ts'),
    `export const starterTitle = ${jsString(displayName)};\n`,
  );
  writeFile(path.join(dir, 'lib/development-client.ts'), 'export {};\n');
  writeFile(path.join(dir, 'lib/development-client.native.ts'), "import 'expo-dev-client';\n");
  writeFile(
    path.join(dir, 'app/index.tsx'),
    `import { router } from 'expo-router';
import { Screen, Stack } from '@workspace/ui/components/layout';
import { Text } from '@workspace/ui/components/text';
import { Button } from '@workspace/ui/components/button';
import { ThemeSwitcher } from '@workspace/ui/components/theme-switcher';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@workspace/ui/components/card';
import { starterTitle } from '@/lib/starter';
export default function HomeScreen() {
  return <Screen><ThemeSwitcher /><Stack><Text accessibilityRole="header" variant="heading">{starterTitle}</Text><Text variant="muted">Your workspace is ready.</Text></Stack>
    <Card><CardHeader><CardTitle>Start building</CardTitle><CardDescription>One application for web, iOS and Android.</CardDescription></CardHeader><CardContent><Text>Use the shared components to keep every screen consistent.</Text>
    ${context.has('better-auth') ? "<Button onPress={() => router.push('/account')}>Account and sign in</Button>" : ''}
    <Button variant="outline" onPress={() => router.push('/design-system')}>Explore components</Button></CardContent></Card>
  </Screen>;
}
`,
  );
  writeFile(path.join(dir, '.env.example'), '');
  writeFile(
    path.join(dir, 'eas.json'),
    JSON.stringify(
      {
        cli: { version: '>= 16.0.0' },
        build: {
          development: { developmentClient: true, distribution: 'internal' },
          preview: {
            environment: 'preview',
            distribution: 'internal',
            android: { buildType: 'apk' },
          },
          simulator: { environment: 'preview', ios: { simulator: true } },
          production: { environment: 'production', autoIncrement: true },
        },
      },
      null,
      2,
    ) + '\n',
  );
  scaffoldExpoRuntime(context);
  writeApplicationShell(dir);
  if (context.has('next') || context.has('vinext'))
    for (const file of [
      'app/index.tsx',
      'app/design-system.tsx',
      'components/app-providers.tsx',
      'components/app-styles.web.ts',
      'components/ui/button.tsx',
      'components/app-link.web.tsx',
      'components/app-link.tsx',
    ]) {
      const target = path.join(dir, file);
      writeFile(
        target,
        readFileSync(target, 'utf8').replaceAll('@workspace/ui', '@workspace/expo-ui'),
      );
    }
  appendGitignore(dir, [
    '.env',
    '.env.*',
    '!.env.example',
    '.expo',
    '.wrangler',
    '.output',
    'dist',
    'node_modules',
  ]);
}

function writeApplicationShell(dir: string): void {
  writeFile(
    path.join(dir, 'app/_layout.web.tsx'),
    `import '@/components/app-styles';
import { Slot } from 'expo-router';
import { AppProviders } from '@/components/app-providers';
export default function WebLayout() { return <AppProviders><Slot /></AppProviders>; }
`,
  );

  writeFile(
    path.join(dir, 'components/app-link.tsx'),
    `import { Link, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@workspace/ui/theme';
export function AppLink({ href, children }: { href: Href; children: ReactNode }) { const { colors } = useTheme(); return <Link href={href} asChild><Pressable accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 14, fontWeight: '500' }}>{children}</Text></Pressable></Link>; }
`,
  );
  writeFile(
    path.join(dir, 'components/app-link.web.tsx'),
    `import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { buttonVariants } from '@workspace/ui/web/button';
export function AppLink({ href, children }: { href: Href; children: ReactNode }) { return <Link href={href} asChild><a data-slot="button" className={buttonVariants({ variant: 'link' })}>{children}</a></Link>; }
`,
  );

  writeFile(path.join(dir, 'components/app-styles.ts'), 'export {};\n');
  writeFile(path.join(dir, 'components/app-styles.web.ts'), "import '@workspace/ui/styles.css';\n");
  writeFile(
    path.join(dir, 'components/app-providers.tsx'),
    `import { type ReactNode } from 'react';
import { DefaultTheme, DarkTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@workspace/ui/theme';
function NavigationTheme({ children }: { children: ReactNode }) {
  const { mode, colors } = useTheme();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  return <NavigationThemeProvider value={{ ...base, colors: { ...base.colors, primary: colors.primary, background: colors.background, card: colors.card, text: colors.foreground, border: colors.border, notification: colors.destructive } }}><StatusBar style={mode === 'dark' ? 'light' : 'dark'} />{children}</NavigationThemeProvider>;
}
export function AppProviders({ children }: { children: ReactNode }) { return <SafeAreaProvider><ThemeProvider><NavigationTheme>{children}</NavigationTheme></ThemeProvider></SafeAreaProvider>; }
`,
  );
  writeFile(
    path.join(dir, 'app/+html.tsx'),
    `import type { PropsWithChildren } from 'react';
const themeScript = "var p='system';try{p=localStorage.getItem('anhedral-theme')}catch{}var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'";
export default function HTML({ children }: PropsWithChildren) { return <html lang="en"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /><meta name="theme-color" content="#ffffff" /><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body>{children}</body></html>; }
`,
  );
  writeFile(
    path.join(dir, 'app/design-system.tsx'),
    `import { useState } from 'react';
import { router } from 'expo-router';
import { Screen, Stack } from '@workspace/ui/components/layout';
import { Text } from '@workspace/ui/components/text';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@workspace/ui/components/card';
import { Dialog } from '@workspace/ui/components/dialog';
import { ThemeSwitcher } from '@workspace/ui/components/theme-switcher';
export default function DesignSystem() {
  const [open, setOpen] = useState(false); const [value, setValue] = useState('');
  return <Screen><Button variant="ghost" onPress={() => router.replace('/')}>Home</Button><ThemeSwitcher /><Text accessibilityRole="header" variant="heading">Design system</Text><Text variant="muted">Nova on web. Native components on iOS and Android.</Text>
    <Card><CardHeader><CardTitle>Controls</CardTitle><CardDescription>Shared variants, readable type and accessible states.</CardDescription></CardHeader><CardContent><Stack>
    {(['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const).map((variant) => <Button key={variant} variant={variant}>{variant}</Button>)}
    <Button disabled>Disabled</Button><Input accessibilityLabel="Example field" placeholder="Write something" value={value} onChangeText={setValue} /><Input accessibilityLabel="Invalid field" placeholder="Invalid value" invalid /><Input accessibilityLabel="Example text area" placeholder="Longer text" multiline />
    <Dialog open={open} onOpenChange={setOpen} title="Example dialog" description="Dismiss with Close, Escape or the system back action." triggerLabel="Open dialog"><Text>Dialogs inherit the app theme.</Text></Dialog>
    </Stack></CardContent></Card>
  </Screen>;
}
`,
  );
}
