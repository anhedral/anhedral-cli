import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STACK_REGISTRY, validateStackCatalog } from '../dist/stack-registry.js';
import { CAPABILITY_REGISTRY } from '../dist/capabilities.js';

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
  new URL('capabilities.json', references),
  JSON.stringify(CAPABILITY_REGISTRY, null, 2) + '\n',
);
writeFileSync(
  new URL('software-factory.md', references),
  readFileSync(new URL('../docs/software-factory.md', import.meta.url)),
);
writeFileSync(
  new URL('anhedral-stack.md', references),
  readFileSync(new URL('../docs/anhedral-stack.md', import.meta.url)),
);
const artwork = new URL('assets/', references);
mkdirSync(artwork, { recursive: true });
for (const name of ['anhedral-stack.png', 'anhedral-stack-light.png'])
  writeFileSync(
    new URL(name, artwork),
    readFileSync(new URL(`../docs/assets/${name}`, import.meta.url)),
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
manifest.version = CAPABILITY_REGISTRY.cliVersion;
writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');

writeFileSync(
  new URL('verification.md', references),
  readFileSync(new URL('../docs/verification.md', import.meta.url)),
);
