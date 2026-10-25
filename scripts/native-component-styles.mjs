import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
export { nativeGlobalMetrics } from './native-style-metrics.mjs';
const target = (component) =>
  fileURLToPath(new URL('../assets/ui/native/_' + component + '-presets.tsx', import.meta.url));
const variants = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'];
const sizes = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'];

function nativeComponentPresets(inventory, component) {
  if (component === 'skeleton') return nativeSkeletonPresets(inventory);
  if (component === 'card') return nativeCardPresets(inventory);
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
const reviewedCardInputs = {
  base: {
    origin: 'apps/v4/registry/bases/base/ui/card.tsx',
    sha256: '0d525c03e086b0047f7c0700850281023359cfc020eb233fdb0d74ec870ebea0',
    slots: {
      Card: 'cn-card group/card flex flex-col',
      CardHeader:
        'cn-card-header group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
      CardTitle: 'cn-card-title cn-font-heading',
      CardDescription: 'cn-card-description',
      CardAction: 'cn-card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end',
      CardContent: 'cn-card-content',
      CardFooter: 'cn-card-footer flex items-center',
    },
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/card.tsx',
    sha256: '0d525c03e086b0047f7c0700850281023359cfc020eb233fdb0d74ec870ebea0',
    slots: {
      Card: 'cn-card group/card flex flex-col',
      CardHeader:
        'cn-card-header group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
      CardTitle: 'cn-card-title cn-font-heading',
      CardDescription: 'cn-card-description',
      CardAction: 'cn-card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end',
      CardContent: 'cn-card-content',
      CardFooter: 'cn-card-footer flex items-center',
    },
  },
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/card.tsx',
    sha256: '0d525c03e086b0047f7c0700850281023359cfc020eb233fdb0d74ec870ebea0',
    slots: {
      Card: 'cn-card group/card flex flex-col',
      CardHeader:
        'cn-card-header group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
      CardTitle: 'cn-card-title cn-font-heading',
      CardDescription: 'cn-card-description',
      CardAction: 'cn-card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end',
      CardContent: 'cn-card-content',
      CardFooter: 'cn-card-footer flex items-center',
    },
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/card.json#registry/default/ui/card.tsx',
    sha256: '69afcf9c8e58ca6c3acf43c5b1ec9186bb6c88952f0ff49345dd2666f93d5480',
    slots: {
      Card: 'rounded-lg border bg-card text-card-foreground shadow-sm',
      CardHeader: 'flex flex-col space-y-1.5 p-6',
      CardTitle: 'text-2xl font-semibold leading-none tracking-tight',
      CardDescription: 'text-sm text-muted-foreground',
      CardContent: 'p-6 pt-0',
      CardFooter: 'flex items-center p-6 pt-0',
    },
  },
  'new-york': {
    origin: 'apps/v4/public/r/styles/new-york/card.json#registry/new-york/ui/card.tsx',
    sha256: '525c4bb2c051987be64df0e92e1d90174912b219bf541e24ffbc4a3406de49e8',
    slots: {
      Card: 'rounded-xl border bg-card text-card-foreground shadow',
      CardHeader: 'flex flex-col space-y-1.5 p-6',
      CardTitle: 'font-semibold leading-none tracking-tight',
      CardDescription: 'text-sm text-muted-foreground',
      CardContent: 'p-6 pt-0',
      CardFooter: 'flex items-center p-6 pt-0',
    },
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/card.tsx',
    sha256: 'ef8305b12c3112dab42a4708b41b1ebcc042fa5ab4c20f039da8d45b09ed5059',
    slots: {
      Card: 'flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm',
      CardHeader:
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
      CardTitle: 'leading-none font-semibold',
      CardDescription: 'text-sm text-muted-foreground',
      CardAction: 'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
      CardContent: 'px-6',
      CardFooter: 'flex items-center px-6 [.border-t]:pt-6',
    },
  },
};
export function nativeCardPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory);
  const definitions = Object.fromEntries(
    Object.entries(reviewedCardInputs).map(([name, input]) => {
      if (inventory.sources[input.origin]?.sha256 !== input.sha256)
        throw Error('Card source changed; renew native API and class review: ' + name);
      return [name, input];
    }),
  );
  const expected = [
    '.cn-card',
    '.cn-card-header',
    '.cn-card-title',
    '.cn-card-description',
    '.cn-card-content',
    '.cn-card-footer',
  ].sort();
  const presets = Object.fromEntries(
    ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'].map((style) => {
      const sheet = inventory.styleSheets['style-' + style + '.css'];
      if (!sheet || sha256(sheet.content) !== sheet.sha256)
        throw Error('Upstream preset integrity failed: ' + style);
      const conditional = [
        ...sheet.content.matchAll(
          /\.cn-card-content:has\(> \[data-slot=questionnaire-choices\]\)\s*\{\s*@apply\s+([^;]+);\s*\}/g,
        ),
      ];
      if (
        conditional.length !== (style === 'vega' ? 1 : 0) ||
        conditional.some((match) => match[1].trim().replace(/\s+/g, ' ') !== 'flex flex-col gap-3')
      )
        throw Error('Upstream Card content condition needs native review: ' + style);
      const plain = sheet.content.replace(
        /\.cn-card-content:has\(> \[data-slot=questionnaire-choices\]\)\s*\{[^}]+\}/g,
        '',
      );
      const selectors = [...plain.matchAll(/\.cn-card(?:-[a-z0-9-]+)?(?![\w-])/g)]
        .map((match) => match[0])
        .sort();
      const entries = [
        ...sheet.content.matchAll(/\.cn-card(?:-([a-z]+))?\s*\{\s*@apply\s+([^;]+);\s*\}/g),
      ].map((match) => [match[1] ?? 'base', match[2].trim().replace(/\s+/g, ' ')]);
      if (JSON.stringify(selectors) !== JSON.stringify(expected) || entries.length !== 6)
        throw Error('Upstream Card selectors need native review: ' + style);
      const rules = Object.fromEntries(entries);
      const regular = [
          ...rules.base.matchAll(/(?:^| )\[--card-spacing:--spacing\(([\d.]+)\)\](?= |$)/g),
        ],
        small = [
          ...rules.base.matchAll(/data-\[size=sm\]:\[--card-spacing:--spacing\(([\d.]+)\)\]/g),
        ];
      if (regular.length !== 1 || small.length !== 1)
        throw Error('Upstream Card spacing formulas need native review: ' + style);
      const spacing = { default: Number(regular[0][1]) * 4, sm: Number(small[0][1]) * 4 };
      if (Object.values(spacing).some((value) => !Number.isFinite(value) || value < 0))
        throw Error('Unsupported Card spacing metric: ' + style);
      return [
        style,
        {
          sha256: sheet.sha256,
          rules,
          spacing,
          choices: conditional[0]?.[1].trim().replace(/\s+/g, ' ') ?? '',
        },
      ];
    }),
  );
  return { upstream: inventory.source, globals, presets, definitions };
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
export const nativeCardPresetSource = (inventory) => source(inventory, 'card');
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
    ['button', 'badge', 'skeleton', 'card'].map(async (component) => ({
      component,
      target: target(component),
      data: nativeComponentPresets(inventory, component),
      source: await source(inventory, component),
    })),
  );
  const { nativeInputPresets, nativeInputPresetSource } =
    await import('./native-input-presets.mjs');
  for (const component of ['input', 'textarea'])
    outputs.push({
      component,
      target: target(component),
      data: nativeInputPresets(inventory, component),
      source: await nativeInputPresetSource(inventory, component),
    });
  const { nativeKbdPresets, nativeKbdPresetSource } = await import('./native-kbd-presets.mjs');
  outputs.push({
    component: 'kbd',
    target: target('kbd'),
    data: nativeKbdPresets(inventory),
    source: await nativeKbdPresetSource(inventory),
  });
  const { nativeLabelPresets, nativeLabelPresetSource } =
    await import('./native-label-presets.mjs');
  outputs.push({
    component: 'label',
    target: target('label'),
    data: nativeLabelPresets(inventory),
    source: await nativeLabelPresetSource(inventory),
  });
  const { nativeChartPresets, nativeChartPresetSource } =
    await import('./native-chart-presets.mjs');
  outputs.push({
    component: 'chart',
    target: target('chart'),
    data: nativeChartPresets(inventory),
    source: await nativeChartPresetSource(inventory),
  });
  const { nativeExampleLayout, nativeExampleLayoutSource } =
    await import('./native-example-layout.mjs');
  outputs.push({
    component: 'example-layout',
    target: fileURLToPath(
      new URL('../assets/ui/native/_example-layout-source.tsx', import.meta.url),
    ),
    data: nativeExampleLayout(inventory),
    source: await nativeExampleLayoutSource(inventory),
  });
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
