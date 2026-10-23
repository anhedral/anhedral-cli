import { NATIVE_ESLINT_VERSION } from '../dependencies.js';
import path from 'node:path';
import { writeReactLintConfig } from './lint.js';
import { appendGitignore, writeFile } from '../util.js';
import { childPackageName, jsString } from '../render.js';
import { MOBILE_APP_DEPENDENCIES, EAS_CLI_VERSION } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { scaffoldNativeUI } from '../scaffold/native-ui.js';
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
  const nameLiteral = jsString(displayName);
  writeReactLintConfig(dir);
  writeFile(
    path.join(dir, 'babel.config.js'),
    "module.exports = function(api) { api.cache(true); return { presets: ['babel-preset-expo'] }; };\n",
  );
  writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: childPackageName(projectName, 'mobile'),
        version: '0.1.0',
        private: true,
        main: 'expo-router/entry',
        scripts: {
          android: 'expo start -c --android',
          ios: 'expo start -c --ios',
          start: 'expo start -c',
          build: 'pnpm typecheck',
          typecheck: 'tsc --noEmit',
          lint: 'eslint . --max-warnings 0',
          'eas:login': `pnpm dlx eas-cli@${EAS_CLI_VERSION} login`,
          'build:simulator:ios': `pnpm dlx eas-cli@${EAS_CLI_VERSION} build --platform ios --profile simulator`,
          'build:internal:ios': `pnpm dlx eas-cli@${EAS_CLI_VERSION} build --platform ios --profile preview`,
          'build:internal:android': `pnpm dlx eas-cli@${EAS_CLI_VERSION} build --platform android --profile preview`,
          'build:production:ios': `pnpm dlx eas-cli@${EAS_CLI_VERSION} build --platform ios --profile production`,
          'build:production:android': `pnpm dlx eas-cli@${EAS_CLI_VERSION} build --platform android --profile production`,
        },
        dependencies: {
          ...MOBILE_APP_DEPENDENCIES.dependencies,
          '@workspace/native-ui': 'workspace:*',
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
          platforms: ['ios', 'android'],
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
        include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'],
        exclude: ['node_modules', 'worker', '.output', 'worker-configuration.d.ts'],
      },
      null,
      2,
    ) + '\n',
  );
  scaffoldNativeUI(root);
  writeFile(
    path.join(dir, 'components/ui/button.tsx'),
    "export { Button } from '@workspace/native-ui';\n",
  );
  writeFile(
    path.join(dir, 'app/_layout.tsx'),
    `import '@/lib/development-client';
import { ThemeProvider } from '@workspace/native-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <SafeAreaProvider><ThemeProvider><Stack /></ThemeProvider></SafeAreaProvider>;
}
`,
  );
  writeFile(path.join(dir, 'lib/development-client.ts'), 'export {};\n');
  writeFile(path.join(dir, 'lib/development-client.native.ts'), "import 'expo-dev-client';\n");
  writeFile(
    path.join(dir, 'app/index.tsx'),
    `import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import { Screen, Stack, Text } from '@workspace/native-ui';
import { Button } from '@/components/ui/button';

export default function HomeScreen() {
  const [connection, setConnection] = useState('Connecting to the API…');
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

  return <Screen><StatusBar style="auto" /><Stack>
    <Text variant="heading" accessibilityRole="header">{${nameLiteral}}</Text>
    <Text variant="muted">Native iOS and Android application generated by Anhedral.</Text>
    <Text accessibilityLiveRegion="polite">{connection}</Text>
    <Button disabled={pending} onPress={() => void checkConnection()}>{pending ? 'Connecting…' : 'Check API connection'}</Button>
    <Button onPress={() => void Linking.openURL('https://docs.expo.dev')}>Learn more</Button>
  </Stack></Screen>;
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
