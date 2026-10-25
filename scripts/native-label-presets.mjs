import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
const modern =
  'cn-label flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed';
const legacy =
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
export const reviewedLabelSources = {
  base: {
    origin: 'apps/v4/registry/bases/base/ui/label.tsx',
    sha256: 'd11f6ddea1304473d829329f36238c164dbee9fe04c038fd169d70d352b75704',
    classes: modern,
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/label.tsx',
    sha256: '075c3ea03aec0f887b9b00c407e1de3b2969371059b9ba84ecd84908f24bdde2',
    classes: modern,
  },
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/label.tsx',
    sha256: '165c4ae2584ec47e5d64107cc8fd6d20d707ed4e24098d0dae67bfd43f6cd5aa',
    classes: modern.replace('cn-label ', 'cn-label cn-label-aria '),
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/label.json#registry/default/ui/label.tsx',
    sha256: '2eac8fbb04002c42b0fbc4062d20d131e421796eaf65c37d2049e29e42ecbc5a',
    classes: legacy,
  },
  'new-york': {
    origin: 'apps/v4/public/r/styles/new-york/label.json#registry/new-york/ui/label.tsx',
    sha256: '2eac8fbb04002c42b0fbc4062d20d131e421796eaf65c37d2049e29e42ecbc5a',
    classes: legacy,
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/label.tsx',
    sha256: '344bde38b8531615dbf8e14af3895517c24d8ef6ce56ddeda7e2e6fe4b5d0c00',
    classes:
      'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
  },
};
export function nativeLabelPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory);
  for (const [name, input] of Object.entries(reviewedLabelSources))
    if (inventory.sources[input.origin]?.sha256 !== input.sha256)
      throw Error('Label source changed; renew native review: ' + name);
  const presets = Object.fromEntries(
    ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'].map((style) => {
      const sheet = inventory.styleSheets['style-' + style + '.css'];
      if (!sheet || sha256(sheet.content) !== sheet.sha256)
        throw Error('Label stylesheet integrity failed: ' + style);
      const selectors = [...sheet.content.matchAll(/^\s*(\.cn-label[^{}]*?)\s*\{/gm)].map((m) =>
        m[1].trim(),
      );
      if (
        selectors.length !== 2 ||
        selectors.some((s) => !['.cn-label', '.cn-label-aria'].includes(s))
      )
        throw Error('Label selectors require native review: ' + style);
      const rules = {};
      for (const slot of ['label', 'label-aria']) {
        const matches = [
          ...sheet.content.matchAll(
            new RegExp('\\.cn-' + slot + '\\s*\\{\\s*@apply\\s+([^;]+);\\s*\\}', 'g'),
          ),
        ];
        if (matches.length !== 1)
          throw Error('Label slot requires native review: ' + style + '/' + slot);
        rules[slot] = matches[0][1].trim().replace(/\s+/g, ' ');
      }
      return [style, { sha256: sheet.sha256, rules }];
    }),
  );
  return { upstream: inventory.source, globals, sources: reviewedLabelSources, presets };
}
export async function nativeLabelPresetSource(inventory) {
  const target = fileURLToPath(new URL('../assets/ui/native/_label-presets.tsx', import.meta.url));
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed label sources, state slots and native metrics.\nexport const nativeLabelPresetSource=' +
      JSON.stringify(nativeLabelPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = fileURLToPath(new URL('../assets/ui/native/_label-presets.tsx', import.meta.url)),
    source = await nativeLabelPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source) throw Error('Label native presets are stale.');
}
