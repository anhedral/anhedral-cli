import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
// Reviewed Base, Radix, Aria and New York v4; the older frozen registries lack this component.
export const reviewedNativeSelectSources = {
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/native-select.tsx',
    sha256: 'a96068a0bf403eac169f8b1e605f314dd268dde7ee2841ed72ff2b41cd944875',
    slots: {
      NativeSelect: [
        {
          tag: 'div',
          classes:
            'cn-native-select-wrapper group/native-select relative w-fit has-[select:disabled]:opacity-50',
        },
        {
          tag: 'select',
          classes:
            'cn-native-select outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
        },
        {
          tag: 'IconPlaceholder',
          classes: 'cn-native-select-icon pointer-events-none absolute select-none',
        },
      ],
      NativeSelectOption: [{ tag: 'option', classes: 'bg-[Canvas] text-[CanvasText]' }],
      NativeSelectOptGroup: [{ tag: 'optgroup', classes: 'bg-[Canvas] text-[CanvasText]' }],
    },
  },
  base: {
    origin: 'apps/v4/registry/bases/base/ui/native-select.tsx',
    sha256: 'a96068a0bf403eac169f8b1e605f314dd268dde7ee2841ed72ff2b41cd944875',
    slots: {
      NativeSelect: [
        {
          tag: 'div',
          classes:
            'cn-native-select-wrapper group/native-select relative w-fit has-[select:disabled]:opacity-50',
        },
        {
          tag: 'select',
          classes:
            'cn-native-select outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
        },
        {
          tag: 'IconPlaceholder',
          classes: 'cn-native-select-icon pointer-events-none absolute select-none',
        },
      ],
      NativeSelectOption: [{ tag: 'option', classes: 'bg-[Canvas] text-[CanvasText]' }],
      NativeSelectOptGroup: [{ tag: 'optgroup', classes: 'bg-[Canvas] text-[CanvasText]' }],
    },
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/native-select.tsx',
    sha256: '4bdbce5575dce610fed747df4547a3d494713f4df8d28e09b3ccee62e4d72f93',
    slots: {
      NativeSelect: [
        {
          tag: 'div',
          classes: 'group/native-select relative w-fit has-[select:disabled]:opacity-50',
        },
        {
          tag: 'select',
          classes:
            'h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent px-3 py-2 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1 dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        },
        {
          tag: 'ChevronDownIcon',
          classes:
            'pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground opacity-50 select-none',
        },
      ],
      NativeSelectOption: [{ tag: 'option', classes: 'bg-[Canvas] text-[CanvasText]' }],
      NativeSelectOptGroup: [{ tag: 'optgroup', classes: 'bg-[Canvas] text-[CanvasText]' }],
    },
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/native-select.tsx',
    sha256: 'a96068a0bf403eac169f8b1e605f314dd268dde7ee2841ed72ff2b41cd944875',
    slots: {
      NativeSelect: [
        {
          tag: 'div',
          classes:
            'cn-native-select-wrapper group/native-select relative w-fit has-[select:disabled]:opacity-50',
        },
        {
          tag: 'select',
          classes:
            'cn-native-select outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
        },
        {
          tag: 'IconPlaceholder',
          classes: 'cn-native-select-icon pointer-events-none absolute select-none',
        },
      ],
      NativeSelectOption: [{ tag: 'option', classes: 'bg-[Canvas] text-[CanvasText]' }],
      NativeSelectOptGroup: [{ tag: 'optgroup', classes: 'bg-[Canvas] text-[CanvasText]' }],
    },
  },
};
export function nativeSelectControlPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory),
    presets = {};
  for (const [family, input] of Object.entries(reviewedNativeSelectSources))
    if (inventory.sources[input.origin]?.sha256 !== input.sha256)
      throw Error('Native Select source changed; renew native review: ' + family);
  for (const name of ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea']) {
    const sheet = inventory.styleSheets['style-' + name + '.css'];
    if (!sheet || sha256(sheet.content) !== sheet.sha256)
      throw Error('Native Select stylesheet integrity failed: ' + name);
    const content = sheet.content.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...content.matchAll(/^\s*(\.cn-native-select[^{}]*?)\s*\{/gm)].map((m) =>
      m[1].trim(),
    );
    const entries = [
      ...content.matchAll(/\.cn-(native-select(?:-icon)?)\s*\{\s*@apply\s+([^;{}]+);?\s*\}/g),
    ].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]);
    if (
      selectors.length !== 2 ||
      entries.length !== 2 ||
      new Set(entries.map((e) => e[0])).size !== 2
    )
      throw Error('Native Select selectors require review: ' + name);
    presets[name] = { sha256: sheet.sha256, rules: Object.fromEntries(entries) };
  }
  return { upstream: inventory.source, globals, sources: reviewedNativeSelectSources, presets };
}
const target = fileURLToPath(
  new URL('../assets/ui/native/_native-select-presets.tsx', import.meta.url),
);
export async function nativeSelectControlPresetSource(inventory) {
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed Native Select source slots and theme rules.\nexport const nativeSelectControlPresetSource = ' +
      JSON.stringify(nativeSelectControlPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = await nativeSelectControlPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source)
    throw Error('Native Select source evidence is stale.');
}
