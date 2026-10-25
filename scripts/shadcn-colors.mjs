import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadOfficialRegistry } from './shadcn-registry.mjs';
const root = fileURLToPath(new URL('../', import.meta.url)),
  target = path.join(root, 'assets/ui/registry-colors.json.gz');
export function loadNativeRegistryColors() {
  return JSON.parse(gunzipSync(readFileSync(target)));
}
export function validateRegistryColors(inventory, catalog) {
  if (
    catalog.schemaVersion !== 1 ||
    catalog.sha256 !== createHash('sha256').update(JSON.stringify(catalog.colors)).digest('hex') ||
    catalog.source.commit !== inventory.source.commit ||
    catalog.source.sha256 !== inventory.auxiliary['colors/index.json'].sha256
  )
    throw Error('Stale official registry color palette.');
  if (Object.keys(catalog.colors).length < 200)
    throw Error('Incomplete official registry color palette.');
  for (const [name, color] of Object.entries(catalog.colors))
    if (!/^(?:[a-z]+(?:-\d+)?)$/.test(name) || !/^#[0-9a-f]{6}$/.test(color))
      throw Error('Invalid native registry color ' + name);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = loadOfficialRegistry(),
    index = process.argv.indexOf('--snapshot');
  if (index >= 0) {
    if (!process.argv[index + 1])
      throw Error('Pass --snapshot /absolute/path/to/the/pinned/shadcn-ui');
    const file = 'apps/v4/public/r/colors/index.json',
      bytes = readFileSync(path.join(process.argv[index + 1], file)),
      sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== inventory.auxiliary['colors/index.json'].sha256)
      throw Error('Registry color source drift.');
    const authored = JSON.parse(bytes),
      colors = {};
    for (const [family, value] of Object.entries(authored)) {
      if (Array.isArray(value)) for (const cut of value) colors[family + '-' + cut.scale] = cut.hex;
      else if (value && typeof value === 'object' && typeof value.hex === 'string')
        colors[family] = value.hex;
    }
    const catalog = {
      schemaVersion: 1,
      source: { ...inventory.source, file, sha256 },
      colors,
      sha256: createHash('sha256').update(JSON.stringify(colors)).digest('hex'),
    };
    validateRegistryColors(inventory, catalog);
    writeFileSync(target, gzipSync(JSON.stringify(catalog), { level: 9 }));
    console.log('Recorded', Object.keys(colors).length, 'official named registry colors.');
  } else {
    validateRegistryColors(inventory, loadNativeRegistryColors());
    console.log('Official named native color evidence passed.');
  }
}
