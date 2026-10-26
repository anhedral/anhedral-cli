import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STACK_REGISTRY, validateStackCatalog } from '../dist/stack-registry.js';
import { GENERATOR_VERSION } from '../dist/version.js';

validateStackCatalog();
const entry = fileURLToPath(new URL('../dist/bin.js', import.meta.url));
if (!readFileSync(entry, 'utf8').startsWith('#!/usr/bin/env node\n')) {
  throw new Error('Compiled CLI must preserve its Node.js shebang');
}
chmodSync(entry, 0o755);
// Ship the same registry and standard with the independently installable plugin.
const references = new URL('../plugins/codex/distribution/references/', import.meta.url);
mkdirSync(references, { recursive: true });
writeFileSync(
  new URL('stack-registry.json', references),
  JSON.stringify(STACK_REGISTRY, null, 2) + '\n',
);
writeFileSync(
  new URL('software-factory.md', references),
  readFileSync(new URL('../docs/software-factory.md', import.meta.url)),
);
writeFileSync(
  new URL('anhedral-stack.md', references),
  readFileSync(new URL('../docs/anhedral-stack.md', import.meta.url)),
);
writeFileSync(
  new URL('stack-standard.md', references),
  readFileSync(new URL('../docs/stack-standard.md', import.meta.url)),
);
writeFileSync(
  new URL('../plugins/codex/distribution/LICENSE', import.meta.url),
  readFileSync(new URL('../LICENSE', import.meta.url)),
);
const manifestUrl = new URL('../plugins/codex/distribution/plugin.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
manifest.version = GENERATOR_VERSION;
writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');

writeFileSync(
  new URL('native-ui.md', references),
  readFileSync(new URL('../docs/native-ui.md', import.meta.url)),
);

writeFileSync(
  new URL('ui.md', references),
  readFileSync(new URL('../docs/ui.md', import.meta.url)),
);
