import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSyncPortable } from '../scripts/spawn-command.mjs';

if (!process.argv[2]) throw Error('Pass an installed generated Anhedral Stack workspace.');
const root = path.resolve(process.argv[2]);
const metadata = JSON.parse(readFileSync(path.join(root, 'anhedral.json'), 'utf8'));
assert.equal(metadata.composition.foundation, 'tanstack-start');
const web = path.join(root, 'apps/web');
assert.ok(
  existsSync(path.join(web, 'node_modules/typescript')),
  'Install the generated workspace first.',
);
const route = path.join(web, 'src/routes/index.tsx');
const original = readFileSync(route);
try {
  // No incidental Start import from the example page may supply the router's augmentation.
  writeFileSync(
    route,
    "import { createFileRoute } from '@tanstack/react-router';\nexport const Route = createFileRoute('/')({ component: Home });\nfunction Home() { return <main>Replacement page</main>; }\n",
  );
  const result = spawnSyncPortable('pnpm', ['--filter', '@workspace/web', 'typecheck'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 180000,
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  });
  assert.equal(
    result.status,
    0,
    `Replacement route typecheck failed:\n${result.stdout}\n${result.stderr}`,
  );
} finally {
  writeFileSync(route, original);
}
console.log('Generated router augmentation survives replacement of the example page.');
