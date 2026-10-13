import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STABLE_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function parseStableVersion(value) {
  const match = STABLE_SEMVER_PATTERN.exec(value);
  if (!match)
    throw new Error(`Expected a stable semantic version, received ${JSON.stringify(value)}`);
  return match.slice(1).map(Number);
}

export function compareStableVersions(left, right) {
  const leftParts = parseStableVersion(left);
  const rightParts = parseStableVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

export function resolveReleaseVersion(currentVersion, publishedVersion, automaticPatch = true) {
  const comparison = compareStableVersions(currentVersion, publishedVersion);
  if (comparison < 0) {
    throw new Error(
      `package.json version ${currentVersion} is behind npm version ${publishedVersion}`,
    );
  }
  if (comparison > 0 || !automaticPatch) {
    return { version: currentVersion, automatic: false };
  }
  const [major, minor, patch] = parseStableVersion(publishedVersion);
  return { version: `${major}.${minor}.${patch + 1}`, automatic: true };
}

export function prepareAutomaticRelease(root, publishedVersion, automaticPatch = true) {
  const packagePath = path.join(root, 'package.json');
  const versionSourcePath = path.join(root, 'src', 'version.ts');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const resolution = resolveReleaseVersion(packageJson.version, publishedVersion, automaticPatch);

  if (!resolution.automatic) return resolution;

  const versionSource = readFileSync(versionSourcePath, 'utf8');
  const updatedVersionSource = versionSource.replace(
    /export const GENERATOR_VERSION = '[^']+';/,
    `export const GENERATOR_VERSION = '${resolution.version}';`,
  );
  if (updatedVersionSource === versionSource) {
    throw new Error('src/version.ts does not contain GENERATOR_VERSION');
  }
  const pluginPath = path.join(root, 'plugins/anhedral/plugin.json');
  const registryPath = path.join(
    root,
    'plugins/anhedral/skills/anhedral/references/capabilities.json',
  );
  const stackPath = path.join(
    root,
    'plugins/anhedral/skills/anhedral/references/stack-registry.json',
  );
  const stack = JSON.parse(readFileSync(stackPath, 'utf8'));
  const plugin = JSON.parse(readFileSync(pluginPath, 'utf8'));
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const marketplacePath = path.join(root, '.agents/plugins/marketplace.json');
  const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8'));
  const marketplacePlugin = marketplace.plugins?.find((entry) => entry.name === 'anhedral');
  if (marketplacePlugin?.source?.source !== 'git-subdir')
    throw new Error('Marketplace must use the versioned plugin source');
  marketplacePlugin.source.ref = `plugin-v${resolution.version}`;
  packageJson.version = resolution.version;
  plugin.version = resolution.version;
  registry.cliVersion = resolution.version;
  stack.cliVersion = resolution.version;
  for (const item of stack.items) item.version = resolution.version;
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  writeFileSync(versionSourcePath, updatedVersionSource);
  writeFileSync(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  writeFileSync(stackPath, `${JSON.stringify(stack, null, 2)}\n`);
  writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);

  return resolution;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const publishedVersion = process.argv[2];
  if (!publishedVersion) {
    console.error(
      'Usage: node scripts/prepare-auto-release.mjs <published-version> [--preserve-current]',
    );
    process.exit(1);
  }
  const root = path.resolve(import.meta.dirname, '..');
  const automaticPatch = process.argv[3] !== '--preserve-current';
  const result = prepareAutomaticRelease(root, publishedVersion, automaticPatch);
  console.log(JSON.stringify(result));
}
