import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
const frozenTooltip =
  'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl';
export const reviewedChartSources = {
  base: {
    origin: 'apps/v4/registry/bases/base/ui/chart.tsx',
    sha256: 'cdaa7c2e82aaf7b233c4764cf506cd9912aa1a49d5a02d4fd2f9a8c134687877',
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/chart.tsx',
    sha256: 'cdaa7c2e82aaf7b233c4764cf506cd9912aa1a49d5a02d4fd2f9a8c134687877',
  },
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/chart.tsx',
    sha256: '1bbf2ff917b84dde3c715477618a244e374eaa490732c976dadf91c9b80328d7',
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/chart.json#registry/default/ui/chart.tsx',
    sha256: '2d7c4634b85fbd0bbe0c4636d0d333e02398fa49ad70fd24eece5853dc3975cc',
  },
  'new-york': {
    origin: 'apps/v4/public/r/styles/new-york/chart.json#registry/new-york/ui/chart.tsx',
    sha256: '2d7c4634b85fbd0bbe0c4636d0d333e02398fa49ad70fd24eece5853dc3975cc',
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/chart.tsx',
    sha256: '35e2fa755465ef8eb8ff8b483d493204d452152e7a8863474b1a69f5d44484db',
  },
};
export function nativeChartPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory);
  for (const [name, input] of Object.entries(reviewedChartSources))
    if (inventory.sources[input.origin]?.sha256 !== input.sha256)
      throw Error('Chart source changed; renew native review: ' + name);
  const presets = Object.fromEntries(
    ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'].map((style) => {
      const sheet = inventory.styleSheets['style-' + style + '.css'];
      if (!sheet || sha256(sheet.content) !== sheet.sha256)
        throw Error('Chart stylesheet integrity failed: ' + style);
      const selectors = [...sheet.content.matchAll(/^\s*(\.cn-chart[^{}]*?)\s*\{/gm)].map((m) =>
        m[1].trim(),
      );
      if (selectors.length !== 1 || selectors[0] !== '.cn-chart-tooltip')
        throw Error('Chart selectors require native review: ' + style);
      const matches = [
        ...sheet.content.matchAll(/\.cn-chart-tooltip\s*\{\s*@apply\s+([^;]+);\s*\}/g),
      ];
      if (matches.length !== 1) throw Error('Chart tooltip slot requires native review: ' + style);
      return [style, { sha256: sheet.sha256, tooltip: matches[0][1].trim().replace(/\s+/g, ' ') }];
    }),
  );
  return {
    upstream: inventory.source,
    globals,
    sources: reviewedChartSources,
    presets,
    frozenTooltip,
  };
}
export async function nativeChartPresetSource(inventory) {
  const target = fileURLToPath(new URL('../assets/ui/native/_chart-presets.tsx', import.meta.url));
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed chart sources and tooltip style slots.\nexport const nativeChartPresetSource=' +
      JSON.stringify(nativeChartPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = fileURLToPath(new URL('../assets/ui/native/_chart-presets.tsx', import.meta.url)),
    source = await nativeChartPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source) throw Error('Chart native presets are stale.');
}
