import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256, validateStyleGlobals } from './shadcn-registry.mjs';
const target = (component) =>
  fileURLToPath(new URL('../assets/ui/native/_' + component + '-presets.tsx', import.meta.url));
const variants = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'];
const sizes = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'];
export function nativeGlobalMetrics(inventory) {
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
  return { upstream: inventory.source, globals: { sha256: global.sha256, radius } };
}
function nativeComponentPresets(inventory, component) {
  if (component === 'skeleton') return nativeSkeletonPresets(inventory);
  const { globals } = nativeGlobalMetrics(inventory);
  const presets = {};
  const expected = [
    'base',
    ...variants.map((name) => 'variant-' + name),
    ...(component === 'button' ? sizes.map((name) => 'size-' + name) : []),
  ].sort();
  for (const style of ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea']) {
    const sheet = inventory.styleSheets['style-' + style + '.css'];
    if (!sheet || sha256(sheet.content) !== sheet.sha256)
      throw Error('Upstream preset integrity failed: ' + style);
    const selectors = [
      ...sheet.content.matchAll(new RegExp('\\.cn-' + component + '[^\\s{,]*(?=\\s*\\{)', 'g')),
    ]
      .map((match) => match[0])
      .filter((selector) => component !== 'button' || !/^\.cn-button-group(?:-|$)/.test(selector));
    if (
      selectors.length !== expected.length ||
      selectors.some(
        (selector) =>
          !new RegExp('^\\.cn-' + component + '(?:-variant-[\\w-]+|-size-[\\w-]+)?$').test(
            selector,
          ),
      )
    )
      throw Error('Upstream ' + component + ' selectors need native review: ' + style);
    const entries = [
      ...sheet.content.matchAll(
        new RegExp(
          '\\.cn-' +
            component +
            '((?:-variant-[\\w-]+|-size-[\\w-]+)?)\\s*\\{\\s*@apply\\s+([^;]+);\\s*\\}',
          'g',
        ),
      ),
    ].map((match) => [match[1]?.slice(1) || 'base', match[2].trim().replace(/\s+/g, ' ')]);
    const rules = Object.fromEntries(entries);
    if (
      entries.length !== expected.length ||
      JSON.stringify(Object.keys(rules).sort()) !== JSON.stringify(expected)
    )
      throw Error('Upstream ' + component + ' rules need native review: ' + style);
    presets[style] = { sha256: sheet.sha256, rules };
  }
  const classRecipes = {};
  for (const [name, registry] of Object.entries({
    base: 'base-nova',
    radix: 'radix-nova',
    aria: 'aria-nova',
    default: 'default',
    'new-york': 'new-york',
    'new-york-v4': 'new-york-v4',
  })) {
    const item = inventory.registries[registry]?.items.find(
      (item) => item.type === 'registry:ui' && item.name === component,
    );
    const origin = item?.files?.[0]?.source,
      input = inventory.sources[origin],
      recipe = input?.classRecipes?.[component + 'Variants'];
    const slotNames = component === 'button' ? 'size,variant' : 'variant';
    if (
      !recipe ||
      recipe.unsupported?.length ||
      typeof recipe.base !== 'string' ||
      Object.keys(recipe.variants).sort().join(',') !== slotNames
    )
      throw Error('Upstream ' + component + ' class recipe needs native review: ' + name);
    const frozenLegacy = name === 'default' || name === 'new-york';
    for (const [slot, options] of Object.entries(recipe.variants)) {
      const wanted =
        slot === 'size'
          ? frozenLegacy
            ? ['default', 'sm', 'lg', 'icon']
            : sizes
          : component === 'badge' && frozenLegacy
            ? ['default', 'secondary', 'destructive', 'outline']
            : variants;
      if (JSON.stringify(Object.keys(options).sort()) !== JSON.stringify([...wanted].sort()))
        throw Error(
          'Upstream ' +
            component +
            ' class recipe slot values need native review: ' +
            name +
            '/' +
            slot,
        );
    }
    classRecipes[name] = { origin, sha256: input.sha256, recipe };
  }
  if (
    ['radix', 'aria'].some(
      (base) =>
        JSON.stringify(classRecipes[base].recipe) !== JSON.stringify(classRecipes.base.recipe),
    )
  )
    throw Error(
      component[0].toUpperCase() +
        component.slice(1) +
        ' class recipes diverged across component bases; native review is required.',
    );
  return {
    upstream: inventory.source,
    globals,
    presets,
    classRecipes,
  };
}
export const nativeButtonPresets = (inventory) => nativeComponentPresets(inventory, 'button');
export const nativeBadgePresets = (inventory) => nativeComponentPresets(inventory, 'badge');
const reviewedSkeletonInputs = {
  base: {
    origin: 'apps/v4/registry/bases/base/ui/skeleton.tsx',
    sha256: '8fcbad84e494a75484a0975221fb40f54c4a7d68f79cfc305cb158d1feb1badf',
    classes: 'cn-skeleton animate-pulse',
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/skeleton.tsx',
    sha256: '8fcbad84e494a75484a0975221fb40f54c4a7d68f79cfc305cb158d1feb1badf',
    classes: 'cn-skeleton animate-pulse',
  },
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/skeleton.tsx',
    sha256: '8fcbad84e494a75484a0975221fb40f54c4a7d68f79cfc305cb158d1feb1badf',
    classes: 'cn-skeleton animate-pulse',
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/skeleton.json#registry/default/ui/skeleton.tsx',
    sha256: 'a72a9d8fc1c1999b5411a33391c5e70048863c5865629077280e943ca85689a8',
    classes: 'animate-pulse rounded-md bg-muted',
  },
  'new-york': {
    origin: 'apps/v4/public/r/styles/new-york/skeleton.json#registry/new-york/ui/skeleton.tsx',
    sha256: '87608e7cc815ad3d88e0b9de6c402bb37b58ea1b38636cf69709da1baff6e334',
    classes: 'animate-pulse rounded-md bg-primary/10',
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/skeleton.tsx',
    sha256: 'f51ce0fcd31e5c31437382e80ea0af94b4fc3d64221d27091d36824546780a43',
    classes: 'animate-pulse rounded-md bg-accent',
  },
};
/** Static classes are reviewed against exact source bytes; upstream edits require renewed review. */
export function nativeSkeletonPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory);
  const classRecipes = Object.fromEntries(
    Object.entries(reviewedSkeletonInputs).map(([name, input]) => {
      if (inventory.sources[input.origin]?.sha256 !== input.sha256)
        throw Error('Skeleton source changed; renew native API and class review: ' + name);
      return [
        name,
        {
          origin: input.origin,
          sha256: input.sha256,
          recipe: { base: input.classes, variants: {}, defaultVariants: {}, compoundVariants: [] },
        },
      ];
    }),
  );
  const presets = Object.fromEntries(
    ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'].map((style) => {
      const sheet = inventory.styleSheets['style-' + style + '.css'];
      if (!sheet || sha256(sheet.content) !== sheet.sha256)
        throw Error('Upstream preset integrity failed: ' + style);
      const selectors = [...sheet.content.matchAll(/\.cn-skeleton[^\s{,]*(?=\s*\{)/g)];
      const rules = [...sheet.content.matchAll(/\.cn-skeleton\s*\{\s*@apply\s+([^;]+);\s*\}/g)];
      if (selectors.length !== 1 || rules.length !== 1)
        throw Error('Upstream skeleton selectors need native review: ' + style);
      return [
        style,
        { sha256: sheet.sha256, rules: { base: rules[0][1].trim().replace(/\s+/g, ' ') } },
      ];
    }),
  );
  return { upstream: inventory.source, globals, presets, classRecipes };
}
async function source(inventory, component) {
  return format(
    '// Adapted from shadcn/ui (MIT). Source CSS and global formulas remain pinned in the official inventory.\nexport const native' +
      component[0].toUpperCase() +
      component.slice(1) +
      'PresetSource = ' +
      JSON.stringify(nativeComponentPresets(inventory, component)) +
      ' as const;\n',
    { ...(await resolveConfig(target(component))), filepath: target(component) },
  );
}
export const nativeButtonPresetSource = (inventory) => source(inventory, 'button');
export const nativeBadgePresetSource = (inventory) => source(inventory, 'badge');
export const nativeSkeletonPresetSource = (inventory) => source(inventory, 'skeleton');
const metricsTarget = fileURLToPath(
  new URL('../assets/ui/native/_preset-metrics.ts', import.meta.url),
);
export async function nativePresetMetricsSource(inventory) {
  return format(
    '// Adapted from shadcn/ui (MIT). Pinned global metric formulas; generated with the component styles.\nexport const nativePresetMetrics = ' +
      JSON.stringify(nativeGlobalMetrics(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(metricsTarget)), filepath: metricsTarget },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = loadOfficialRegistry();
  const outputs = await Promise.all(
    ['button', 'badge', 'skeleton'].map(async (component) => ({
      component,
      target: target(component),
      data: nativeComponentPresets(inventory, component),
      source: await source(inventory, component),
    })),
  );
  outputs.push({
    component: 'metrics',
    target: metricsTarget,
    data: nativeGlobalMetrics(inventory),
    source: await nativePresetMetricsSource(inventory),
  });
  if (process.argv.includes('--report'))
    console.log(
      JSON.stringify(
        Object.fromEntries(outputs.map(({ component, data }) => [component, data])),
        null,
        2,
      ),
    );
  for (const output of outputs) {
    if (process.argv.includes('--write')) writeFileSync(output.target, output.source);
    else if (readFileSync(output.target, 'utf8') !== output.source)
      throw Error(
        'Native ' + output.component + ' preset evidence is stale; review upstream styles.',
      );
  }
}
