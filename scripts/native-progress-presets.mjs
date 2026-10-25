import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
export const reviewedProgressSources = {
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/progress.tsx',
    sha256: '3037eb4fd45d538216a2aa12d32a2e2a70c4f90678440939e1cb9dc30c467a61',
    slots: {
      Progress: [{ tag: 'ProgressPrimitive', classes: 'cn-progress-root flex flex-wrap gap-3' }],
      ProgressTrack: [
        {
          tag: 'span',
          classes: 'cn-progress-track relative flex w-full items-center overflow-x-hidden',
        },
      ],
      ProgressIndicator: [{ tag: 'span', classes: 'cn-progress-indicator h-full transition-all' }],
      ProgressLabel: [{ tag: 'LabelPrimitive', classes: 'cn-progress-label' }],
      ProgressValue: [{ tag: 'span', classes: 'cn-progress-value' }],
    },
  },
  base: {
    origin: 'apps/v4/registry/bases/base/ui/progress.tsx',
    sha256: '00afc4c7f319f5f5e78c5e294250abc656e2f7e2839821b9e086555fbd91cd76',
    slots: {
      Progress: [
        { tag: 'ProgressPrimitive.Root', classes: 'cn-progress-root flex flex-wrap gap-3' },
      ],
      ProgressTrack: [
        {
          tag: 'ProgressPrimitive.Track',
          classes: 'cn-progress-track relative flex w-full items-center overflow-x-hidden',
        },
      ],
      ProgressIndicator: [
        {
          tag: 'ProgressPrimitive.Indicator',
          classes: 'cn-progress-indicator h-full transition-all',
        },
      ],
      ProgressLabel: [{ tag: 'ProgressPrimitive.Label', classes: 'cn-progress-label' }],
      ProgressValue: [{ tag: 'ProgressPrimitive.Value', classes: 'cn-progress-value' }],
    },
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/progress.json#registry/default/ui/progress.tsx',
    sha256: '8c036da4baed076de68d27719929dc98151a81b51456bfa6a2488d835303b1d7',
    slots: {
      Progress: [
        {
          tag: 'ProgressPrimitive.Root',
          classes: 'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
        },
        {
          tag: 'ProgressPrimitive.Indicator',
          classes: 'h-full w-full flex-1 bg-primary transition-all',
        },
      ],
    },
  },
  'new-york': {
    origin: 'apps/v4/public/r/styles/new-york/progress.json#registry/new-york/ui/progress.tsx',
    sha256: '6b3b4b69a1cb361076174892e9a96e1a09020307616965ef89f2f7e2495b57a9',
    slots: {
      Progress: [
        {
          tag: 'ProgressPrimitive.Root',
          classes: 'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
        },
        {
          tag: 'ProgressPrimitive.Indicator',
          classes: 'h-full w-full flex-1 bg-primary transition-all',
        },
      ],
    },
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/progress.tsx',
    sha256: 'e012e1f7e6e66d11229d1233eccf91954edcd9179b418ff1d114dc651b86fd35',
    slots: {
      Progress: [
        {
          tag: 'ProgressPrimitive.Root',
          classes: 'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
        },
        {
          tag: 'ProgressPrimitive.Indicator',
          classes: 'h-full w-full flex-1 bg-primary transition-all',
        },
      ],
    },
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/progress.tsx',
    sha256: '507bab79d74484391049814b1459476eb1e4c061e99e20a7270f46e510609920',
    slots: {
      Progress: [
        {
          tag: 'ProgressPrimitive.Root',
          classes: 'cn-progress relative flex w-full items-center overflow-x-hidden',
        },
        {
          tag: 'ProgressPrimitive.Indicator',
          classes: 'cn-progress-indicator size-full flex-1 transition-all',
        },
      ],
    },
  },
};
export function nativeProgressPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory),
    presets = {};
  for (const [family, entry] of Object.entries(reviewedProgressSources))
    if (inventory.sources[entry.origin]?.sha256 !== entry.sha256)
      throw Error('Progress source changed; renew review: ' + family);
  const expected = [
    'progress',
    'progress-track',
    'progress-indicator',
    'progress-label',
    'progress-value',
  ].sort();
  for (const name of ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea']) {
    const sheet = inventory.styleSheets['style-' + name + '.css'];
    if (!sheet || sha256(sheet.content) !== sheet.sha256)
      throw Error('Progress stylesheet integrity failed: ' + name);
    const content = sheet.content.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...content.matchAll(/^\s*(\.cn-progress[^{}]*?)\s*\{/gm)].map((m) =>
      m[1].trim(),
    );
    const entries = [
      ...content.matchAll(
        /\.cn-(progress(?:-track|-indicator|-label|-value)?)\s*\{\s*@apply\s+([^;{}]+);?\s*\}/g,
      ),
    ].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]);
    if (
      selectors.length !== 5 ||
      entries.length !== 5 ||
      JSON.stringify(entries.map((e) => e[0]).sort()) !== JSON.stringify(expected)
    )
      throw Error('Progress selectors require review: ' + name);
    presets[name] = { sha256: sheet.sha256, rules: Object.fromEntries(entries) };
  }
  return { upstream: inventory.source, globals, sources: reviewedProgressSources, presets };
}
const target = fileURLToPath(new URL('../assets/ui/native/_progress-presets.tsx', import.meta.url));
export async function nativeProgressPresetSource(inventory) {
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed Progress source slots and styles.\nexport const nativeProgressPresetSource=' +
      JSON.stringify(nativeProgressPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = await nativeProgressPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source)
    throw Error('Progress source evidence is stale.');
}
