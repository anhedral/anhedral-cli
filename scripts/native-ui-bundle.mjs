import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const harness = path.join(root, 'tests/native-ui');
const require = createRequire(path.join(harness, 'package.json'));
await import('../tests/native-ui/prepare.mjs');
const generated = path.join(harness, '.generated');
const catalog = JSON.parse(readFileSync(path.join(generated, 'NATIVE_RECIPES.json')));
const entry = path.join(generated, 'registry-bundle-entry.tsx');
writeFileSync(
  entry,
  "import React from 'react';\nimport {registerRootComponent} from 'expo';\nimport {Text} from 'react-native';\n" +
    catalog.recipes
      .map(
        (recipe, index) =>
          `import * as Recipe${index} from './src/${recipe.kind === 'block' ? 'recipes' : 'examples'}/${recipe.style}/${recipe.name}';`,
      )
      .join('\n') +
    `\nconst exportCount = [${catalog.recipes.map((_, index) => 'Recipe' + index).join(',')}].reduce((count,item) => count+Object.keys(item).length,0);\nregisterRootComponent(() => <Text>{exportCount} registry exports bundled</Text>);\n`,
);
for (const platform of ['ios', 'android']) {
  const output = path.join(root, '.artifacts/native-ui-bundle', platform);
  mkdirSync(output, { recursive: true });
  const bundle = path.join(output, 'registry.hbc');
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('expo/bin/cli'),
      'export:embed',
      '--entry-file',
      entry,
      '--platform',
      platform,
      '--dev',
      'false',
      '--bytecode',
      '--max-workers',
      '2',
      '--bundle-output',
      bundle,
      '--assets-dest',
      path.join(output, 'assets'),
    ],
    {
      cwd: harness,
      env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1' },
      stdio: 'inherit',
      timeout: 180000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(`Native ${platform} registry bundle failed (${result.status}).`);
  if (statSync(bundle).size === 0) throw Error('Empty native bundle.');
  console.log(
    `Bundled ${catalog.recipes.length} native registry modules as ${platform} Hermes bytecode.`,
  );
}
