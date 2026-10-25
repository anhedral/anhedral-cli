import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256, validateStyleGlobals } from './shadcn-registry.mjs';
const target = fileURLToPath(new URL('../assets/ui/native/_button-presets.tsx', import.meta.url));
export function nativeButtonPresets(inventory) {
  validateStyleGlobals(inventory);
  const global = inventory.styleGlobals['apps/v4/app/globals.css'];
  const radius = Object.fromEntries(
    [
      ...global.content.matchAll(
        /--radius-(sm|md|lg|xl|2xl|3xl|4xl):\s*(?:calc\(var\(--radius\) \* ([\d.]+)\)|var\(--radius\));/g,
      ),
    ].map((match) => [match[1], Number(match[2] ?? 1)]),
  );
  if (Object.keys(radius).length !== 7) throw Error('Upstream radius formulas need native review.');
  const presets = {};
  for (const style of ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea']) {
    const sheet = inventory.styleSheets['style-' + style + '.css'];
    if (!sheet || sha256(sheet.content) !== sheet.sha256)
      throw Error('Upstream preset integrity failed: ' + style);
    const selectors = [...sheet.content.matchAll(/\.cn-button[^\s{,]*(?=\s*\{)/g)]
      .map((match) => match[0])
      .filter((selector) => !/^\.cn-button-group(?:-|$)/.test(selector));
    if (
      selectors.length !== 15 ||
      selectors.some((selector) => !/^\.cn-button(?:-variant-[\w-]+|-size-[\w-]+)?$/.test(selector))
    )
      throw Error('Upstream button selectors need native review: ' + style);
    const entries = [
      ...sheet.content.matchAll(
        /\.cn-button((?:-variant-[\w-]+|-size-[\w-]+)?)\s*\{\s*@apply\s+([^;]+);\s*\}/g,
      ),
    ].map((match) => [match[1]?.slice(1) || 'base', match[2].trim().replace(/\s+/g, ' ')]);
    const rules = Object.fromEntries(entries);
    const expected = [
      'base',
      ...['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'].map(
        (name) => 'variant-' + name,
      ),
      ...['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'].map(
        (name) => 'size-' + name,
      ),
    ].sort();
    if (
      entries.length !== 15 ||
      JSON.stringify(Object.keys(rules).sort()) !== JSON.stringify(expected)
    )
      throw Error('Upstream button rules need native review: ' + style);
    presets[style] = { sha256: sheet.sha256, rules };
  }
  return { upstream: inventory.source, globals: { sha256: global.sha256, radius }, presets };
}
export async function nativeButtonPresetSource(inventory) {
  return format(
    '// Adapted from shadcn/ui (MIT). Source CSS and global formulas remain pinned in the official inventory.\nexport const nativeButtonPresetSource = ' +
      JSON.stringify(nativeButtonPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = loadOfficialRegistry();
  const source = await nativeButtonPresetSource(inventory);
  if (process.argv.includes('--report'))
    console.log(JSON.stringify(nativeButtonPresets(inventory), null, 2));
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source)
    throw Error('Native button preset evidence is stale; review upstream styles.');
}
