import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPluginArchive } from './package-plugin.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(new URL('../plugins/codex/distribution/runtime', import.meta.url)))
  throw Error('Plugin must not ship an executable managed runtime.');
const manifest = JSON.parse(
  readFileSync(new URL('../plugins/codex/distribution/plugin.json', import.meta.url)),
);
if (!manifest.description.includes('Scaffold')) throw Error('Plugin source scope differs.');
buildPluginArchive(root);
console.log('Source skills and remote Platform MCP plugin validated.');
