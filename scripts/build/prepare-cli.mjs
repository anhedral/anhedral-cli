import { checkRepositoryBoundary } from '../checks/repository-boundaries.mjs';
import { chmodSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ANHEDRAL_STACK } from '../../dist/composition/catalog.js';
import { GENERATOR_VERSION } from '../../dist/version.js';

checkRepositoryBoundary();
const entry = fileURLToPath(new URL('../../dist/bin.js', import.meta.url));
if (!readFileSync(entry, 'utf8').startsWith('#!/usr/bin/env node\n')) {
  throw new Error('Compiled CLI must preserve its Node.js shebang');
}
chmodSync(entry, 0o755);
// Ship the same registry and standard with the independently installable plugin.
const references = new URL('../../plugin/references/', import.meta.url);
mkdirSync(references, { recursive: true });
writeFileSync(
  new URL('stack-registry.json', references),
  JSON.stringify({ ...ANHEDRAL_STACK, cliVersion: GENERATOR_VERSION }, null, 2) + '\n',
);
writeFileSync(
  new URL('software-factory.md', references),
  readFileSync(new URL('../../docs/software-factory.md', import.meta.url)),
);
writeFileSync(
  new URL('stack-standard.md', references),
  readFileSync(new URL('../../docs/stack-standard.md', import.meta.url)),
);
writeFileSync(
  new URL('../../plugin/LICENSE', import.meta.url),
  readFileSync(new URL('../../LICENSE', import.meta.url)),
);
const manifestUrl = new URL('../../plugin/plugin.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
manifest.version = GENERATOR_VERSION;
writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
// Claude Code reads its own manifest from the same distribution; keep one release identity.
const claudeManifestUrl = new URL('../../plugin/.claude-plugin/plugin.json', import.meta.url);
const claudeManifest = JSON.parse(readFileSync(claudeManifestUrl, 'utf8'));
for (const field of ['description', 'author', 'repository', 'license'])
  claudeManifest[field] = manifest[field];
claudeManifest.homepage = `${manifest.repository}#readme`;
claudeManifest.version = GENERATOR_VERSION;
writeFileSync(claudeManifestUrl, JSON.stringify(claudeManifest, null, 2) + '\n');

// Retired guides remain in repository history/source, outside current discovery.
for (const name of ['native-ui.md', 'anhedral-stack.md']) {
  try {
    unlinkSync(new URL(name, references));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

writeFileSync(
  new URL('ui.md', references),
  readFileSync(new URL('../../docs/ui.md', import.meta.url)),
);

writeFileSync(
  new URL('capabilities.md', references),
  readFileSync(new URL('../../docs/capabilities.md', import.meta.url)),
);

const marketplaceUrl = new URL('../../.agents/plugins/marketplace.json', import.meta.url);
const marketplace = JSON.parse(readFileSync(marketplaceUrl, 'utf8'));
const plugin = marketplace.plugins.find((entry) => entry.name === 'anhedral');
if (!plugin) throw new Error('Anhedral marketplace entry is missing');
plugin.source.ref = `plugin-v${GENERATOR_VERSION}`;
writeFileSync(marketplaceUrl, JSON.stringify(marketplace, null, 2) + '\n');

const claudeMarketplaceUrl = new URL('../../.claude-plugin/marketplace.json', import.meta.url);
const claudeMarketplace = JSON.parse(readFileSync(claudeMarketplaceUrl, 'utf8'));
const claudePlugin = claudeMarketplace.plugins.find((entry) => entry.name === 'anhedral');
if (!claudePlugin) throw new Error('Anhedral Claude marketplace entry is missing');
claudePlugin.version = GENERATOR_VERSION;
claudePlugin.source.ref = `plugin-v${GENERATOR_VERSION}`;
writeFileSync(claudeMarketplaceUrl, JSON.stringify(claudeMarketplace, null, 2) + '\n');
