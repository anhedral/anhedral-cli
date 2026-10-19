import { NATIVE_ESLINT_VERSION } from '../dependencies.js';
import path from 'node:path';
import { writeReactLintConfig } from './lint.js';
import { appendGitignore, writeFile } from '../util.js';
import { childPackageName, jsString } from '../render.js';
import {
  MOBILE_APP_DEPENDENCIES,
  MOBILE_NATIVEWIND_DEPENDENCIES,
  EAS_CLI_VERSION,
} from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { scaffoldExpoRuntime } from '../scaffold/expo-runtime.js';
function writeReactNativeReusablesConfig(dir: string): void {
  writeFile(
    path.join(dir, 'components.json'),
    JSON.stringify(
      {
        $schema: 'https://ui.shadcn.com/schema.json',
        style: 'new-york',
        rsc: false,
        tsx: true,
        tailwind: {
          config: 'tailwind.config.js',
          css: 'global.css',
          baseColor: 'neutral',
          cssVariables: true,
        },
        aliases: {
          components: '@/components',
          utils: '@/lib/utils',
          ui: '@/components/ui',
          lib: '@/lib',
          hooks: '@/hooks',
        },
        iconLibrary: 'lucide',
      },
      null,
      2,
    ) + '\n',
  );
  writeFile(
    path.join(dir, 'lib/utils.ts'),
    `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
  );
  writeFile(
    path.join(dir, 'components/ui/button.tsx'),
    `import { Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '@/lib/utils';

type ButtonProps = Omit<PressableProps, 'children'> & { children: string; className?: string };

export function Button({ children, className, ...props }: ButtonProps) {
  return <Pressable accessibilityRole="button" className={cn('h-10 items-center justify-center rounded-md bg-primary px-4', className)} {...props}>
    <Text className="font-medium text-primary-foreground">{children}</Text>
  </Pressable>;
}
`,
  );
  writeFile(
    path.join(dir, 'babel.config.js'),
    `module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
`,
  );
  writeFile(
    path.join(dir, 'metro.config.js'),
    `const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
`,
  );
  writeFile(path.join(dir, 'nativewind-env.d.ts'), '/// <reference types="nativewind/types" />\n');
  writeFile(path.join(dir, 'styles.d.ts'), "declare module '*.css';\n");
  writeFile(
    path.join(dir, 'tailwind.config.js'),
    `const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), require('@workspace/styling/tailwind')],
  theme: { extend: { borderWidth: { hairline: hairlineWidth() } } },
  future: { hoverOnlyWhenSupported: true },
  plugins: [require('tailwindcss-animate')],
};
`,
  );
  writeFile(
    path.join(dir, 'global.css'),
    `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
  );
}
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
  const nameLiteral = jsString(displayName);
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
          ...MOBILE_NATIVEWIND_DEPENDENCIES.dependencies,
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
        },
        include: [
          '**/*.ts',
          '**/*.tsx',
          '.expo/types/**/*.ts',
          'expo-env.d.ts',
          'nativewind-env.d.ts',
        ],
        exclude: ['node_modules', 'worker', '.output', 'worker-configuration.d.ts'],
      },
      null,
      2,
    ) + '\n',
  );
  writeReactNativeReusablesConfig(dir);
  writeFile(
    path.join(dir, 'app/_layout.tsx'),
    `import '@/global.css';
import '@/lib/development-client';

import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <><Stack /><PortalHost /></>;
}
`,
  );
  writeFile(path.join(dir, 'lib/development-client.ts'), 'export {};\n');
  writeFile(path.join(dir, 'lib/development-client.native.ts'), "import 'expo-dev-client';\n");
  writeFile(
    path.join(dir, 'app/index.tsx'),
    `${context.has('hono') ? "import { useEffect, useState } from 'react';\nimport { api } from '@/lib/api-client';\n" : ''}import { StatusBar } from 'expo-status-bar';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';

export default function HomeScreen() {
  ${
    context.has('hono')
      ? `const [connection, setConnection] = useState('Connecting to the API…');
  const [pending, setPending] = useState(true);
  useEffect(() => {
    let active = true;
    void api.health().then(
      () => { if (active) setConnection('API connected'); },
      () => { if (active) setConnection('Unable to reach the API. Check the server and device API origin.'); },
    ).finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, []);
  async function checkConnection() {
    setPending(true);
    setConnection('Connecting to the API…');
    try { await api.health(); setConnection('API connected'); }
    catch { setConnection('Unable to reach the API. Check the server and device API origin.'); }
    finally { setPending(false); }
  }
`
      : ''
  }
  return (
    <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>{${nameLiteral}}</Text>
        <Text selectable style={styles.subtitle}>Expo application scaffold generated by Anhedral.</Text>
        ${
          context.has('hono')
            ? `<Text accessibilityLiveRegion="polite">{connection}</Text>
        <Button disabled={pending} onPress={() => void checkConnection()}>{pending ? 'Connecting…' : 'Check API connection'}</Button>`
            : ''
        }
        <Button onPress={() => void Linking.openURL('https://docs.expo.dev')}>Learn more</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  content: { gap: 12 },
  title: { color: '#0f172a', fontSize: 34, fontWeight: '700' },
  subtitle: { color: '#475569', fontSize: 17, paddingBottom: 12 },
});
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
