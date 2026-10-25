import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPluginArchive } from './package-plugin.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
if (
  existsSync(new URL('../plugins/codex/distribution/mcp.json', import.meta.url)) ||
  existsSync(new URL('../plugins/codex/distribution/runtime', import.meta.url))
)
  throw Error('Scaffold plugin must not ship a managed runtime.');
const manifest = JSON.parse(
  readFileSync(new URL('../plugins/codex/distribution/plugin.json', import.meta.url)),
);
if (!manifest.description.includes('Scaffold')) throw Error('Plugin scope differs.');
buildPluginArchive(root);
console.log('Skills-only plugin package validated.');
