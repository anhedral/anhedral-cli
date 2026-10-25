import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256, validateStyleGlobals } from './shadcn-registry.mjs';
const target = (component) =>
  fileURLToPath(new URL('../assets/ui/native/_' + component + '-presets.tsx', import.meta.url));
const variants = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'];
const sizes = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'];
function nativeComponentPresets(inventory, component) {
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
    globals: { sha256: global.sha256, radius },
    presets,
    classRecipes,
  };
}
export const nativeButtonPresets = (inventory) => nativeComponentPresets(inventory, 'button');
export const nativeBadgePresets = (inventory) => nativeComponentPresets(inventory, 'badge');
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
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = loadOfficialRegistry();
  const outputs = await Promise.all(
    ['button', 'badge'].map(async (component) => ({
      component,
      data: nativeComponentPresets(inventory, component),
      source: await source(inventory, component),
    })),
  );
  if (process.argv.includes('--report'))
    console.log(
      JSON.stringify(
        Object.fromEntries(outputs.map(({ component, data }) => [component, data])),
        null,
        2,
      ),
    );
  for (const output of outputs) {
    if (process.argv.includes('--write')) writeFileSync(target(output.component), output.source);
    else if (readFileSync(target(output.component), 'utf8') !== output.source)
      throw Error(
        'Native ' + output.component + ' preset evidence is stale; review upstream styles.',
      );
  }
}
