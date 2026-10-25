import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
// Six source implementations reviewed at the pinned upstream revision. No upstream code is evaluated.
const modern = {
  Kbd: 'cn-kbd pointer-events-none inline-flex items-center justify-center select-none',
  KbdGroup: 'cn-kbd-group inline-flex items-center',
};
const frozen = {
  Kbd: "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
  KbdGroup: 'inline-flex items-center gap-1',
};
export const reviewedKbdSources = {
  base: {
    origin: 'apps/v4/registry/bases/base/ui/kbd.tsx',
    sha256: 'f04fe8ce9c10023fa4d9907030ec5e26a4c714e5377e6b3864cb03548bd0a56f',
    classes: modern,
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/kbd.tsx',
    sha256: 'f04fe8ce9c10023fa4d9907030ec5e26a4c714e5377e6b3864cb03548bd0a56f',
    classes: modern,
  },
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/kbd.tsx',
    sha256: '38452bf969618854c72821a8684100aa441653fc15cb2703a2f6e2299f829e27',
    classes: modern,
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/kbd.json#registry/default/ui/kbd.tsx',
    sha256: '0c025e7736d435f563bfb44105e562629672799eb1f35cbf194148d06cd1a9f7',
    classes: frozen,
  },
  'new-york': {
    origin: 'apps/v4/public/r/styles/new-york/kbd.json#registry/new-york/ui/kbd.tsx',
    sha256: '0c025e7736d435f563bfb44105e562629672799eb1f35cbf194148d06cd1a9f7',
    classes: frozen,
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/kbd.tsx',
    sha256: 'c0c0ae6a7d1adb7749b9b34cab8f4d2f5caf333e819b64c2051e77f918d3661f',
    classes: {
      ...frozen,
      Kbd: "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3 [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
    },
  },
};
export function nativeKbdPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory);
  for (const [name, input] of Object.entries(reviewedKbdSources))
    if (inventory.sources[input.origin]?.sha256 !== input.sha256)
      throw Error('Keyboard source changed; renew native review: ' + name);
  const presets = Object.fromEntries(
    ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'].map((style) => {
      const sheet = inventory.styleSheets['style-' + style + '.css'];
      if (!sheet || sha256(sheet.content) !== sheet.sha256)
        throw Error('Keyboard stylesheet integrity failed: ' + style);
      const selectors = [...sheet.content.matchAll(/^\s*(\.cn-kbd[^{}]*?)\s*\{/gm)].map((m) =>
        m[1].trim(),
      );
      if (
        selectors.length !== 2 ||
        selectors.some((selector) => !['.cn-kbd', '.cn-kbd-group'].includes(selector))
      )
        throw Error('Keyboard selectors require native review: ' + style);
      const rules = {};
      for (const slot of ['kbd', 'kbd-group']) {
        const matches = [
          ...sheet.content.matchAll(
            new RegExp('\\.cn-' + slot + '\\s*\\{\\s*@apply\\s+([^;]+);\\s*\\}', 'g'),
          ),
        ];
        if (matches.length !== 1)
          throw Error('Keyboard slot requires native review: ' + style + '/' + slot);
        rules[slot] = matches[0][1].trim().replace(/\s+/g, ' ');
      }
      return [style, { sha256: sheet.sha256, rules }];
    }),
  );
  return { upstream: inventory.source, globals, sources: reviewedKbdSources, presets };
}
export async function nativeKbdPresetSource(inventory) {
  const target = fileURLToPath(new URL('../assets/ui/native/_kbd-presets.tsx', import.meta.url));
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed source slots and native metric inputs.\nexport const nativeKbdPresetSource=' +
      JSON.stringify(nativeKbdPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = fileURLToPath(new URL('../assets/ui/native/_kbd-presets.tsx', import.meta.url)),
    source = await nativeKbdPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source)
    throw Error('Keyboard native presets are stale.');
}
