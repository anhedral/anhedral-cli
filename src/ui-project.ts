import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { UI_CATALOG, type UiPlatform } from './ui-catalog.js';

type Manifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
export interface UiTarget {
  root: string;
  platform: UiPlatform;
  manifest: Manifest;
}
export function detectUiTargets(cwd: string, selector?: UiPlatform | 'all'): UiTarget[] {
  let root = realpathSync(cwd);
  let targets: UiTarget[] = [];
  function inspect(directory: string) {
    const file = path.join(directory, 'package.json');
    if (!existsSync(file)) return;
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as Manifest;
    const dependencies = { ...manifest.devDependencies, ...manifest.dependencies };
    if (dependencies.next) targets.push({ root: directory, platform: 'web', manifest });
    if (dependencies.expo) targets.push({ root: directory, platform: 'native', manifest });
  }
  for (;;) {
    inspect(root);
    if (!targets.length && existsSync(path.join(root, 'apps'))) {
      for (const entry of readdirSync(path.join(root, 'apps'), { withFileTypes: true }))
        if (entry.isDirectory() && !entry.isSymbolicLink())
          inspect(path.join(root, 'apps', entry.name));
    }
    if (targets.length || existsSync(path.join(root, '.git'))) break;
    const parent = path.dirname(root);
    if (parent === root) break;
    root = parent;
  }
  if (selector && selector !== 'all')
    targets = targets.filter((target) => target.platform === selector);
  if (!targets.length)
    throw Error(
      'No matching Next.js or Expo application found. Use --cwd to select an application.',
    );
  if (targets.length > 1 && selector !== 'all')
    throw Error(
      'Multiple UI applications found. Select --web, --native, --all, or use --cwd for one application.',
    );
  if (new Set(targets.map((target) => target.root)).size !== targets.length)
    throw Error('Web and native UI must use separate application directories.');
  return targets;
}

export function inspectUiTarget(target: UiTarget) {
  const issues: string[] = [];
  const file = path.join(target.root, 'components.json');
  const config = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  if (!config) issues.push('Missing components.json. Run anhedral ui init for this application.');
  if (config && (!config.aliases?.ui || !config.aliases?.utils || !config.tailwind?.css))
    issues.push('components.json needs UI/utils aliases and a Tailwind CSS entry.');
  const marker = path.join(target.root, '.anhedral-ui.json');
  if (existsSync(marker) && JSON.parse(readFileSync(marker, 'utf8')).platform !== target.platform)
    issues.push('Existing Anhedral UI configuration targets another platform.');
  if (target.platform === 'native') {
    const dependencies = { ...target.manifest.devDependencies, ...target.manifest.dependencies };
    for (const dependency of [
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'tailwindcss-animate',
      '@rn-primitives/portal',
    ])
      if (!dependencies[dependency])
        issues.push(
          `Missing RNR baseline dependency: ${dependency}. Complete the upstream setup first.`,
        );
    if (!/^\D*4\./.test(dependencies.nativewind ?? ''))
      issues.push('Set up NativeWind 4 using the RNR manual guide before native UI installation.');
    if (
      !['metro.config.js', 'metro.config.cjs', 'metro.config.ts'].some((name) =>
        existsSync(path.join(target.root, name)),
      )
    )
      issues.push('Missing Metro configuration. Complete the upstream NativeWind setup first.');
    if (config?.rsc) issues.push('Native components.json must set rsc to false.');
  }
  return {
    root: target.root,
    platform: target.platform,
    configurationReady: issues.length === 0,
    issues,
    runtimeAcceptance: 'not evaluated',
    guide:
      target.platform === 'native'
        ? 'https://reactnativereusables.com/docs/installation/manual'
        : 'https://ui.shadcn.com/docs/installation/next',
  };
}

/** New metadata and attribution only; never overwrite consumer-owned files. */
export function initializeUiMetadata(root: string, platform: UiPlatform) {
  const file = path.join(root, '.anhedral-ui.json');
  if (existsSync(file)) {
    const existing = JSON.parse(readFileSync(file, 'utf8'));
    if (existing.platform !== platform)
      throw Error('Existing Anhedral UI configuration targets another platform.');
  } else
    writeFileSync(
      file,
      JSON.stringify(
        {
          schemaVersion: 1,
          platform,
          catalogRevision: UI_CATALOG.revision,
          nativeStyling: platform === 'native' ? UI_CATALOG.nativeStyling : undefined,
          sourceOwned: true,
          automaticUpdates: false,
        },
        null,
        2,
      ) + '\n',
      { flag: 'wx' },
    );
  const licenses = path.join(root, 'ANHEDRAL_UI_LICENSES');
  mkdirSync(licenses, { recursive: true });
  for (const name of platform === 'native'
    ? ['LICENSE.react-native-reusables', 'LICENSE.shadcn']
    : ['LICENSE.shadcn']) {
    const destination = path.join(licenses, name);
    if (!existsSync(destination))
      writeFileSync(destination, readFileSync(new URL(`../assets/ui/${name}`, import.meta.url)), {
        flag: 'wx',
      });
  }
}
