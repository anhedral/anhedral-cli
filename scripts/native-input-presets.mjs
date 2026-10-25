import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
import { reviewedInputSources } from './native-input-sources.mjs';
const target = (component) =>
  fileURLToPath(new URL('../assets/ui/native/_' + component + '-presets.tsx', import.meta.url));
/** Exact source recipes are reviewed independently from the eight stylesheet implementations. */
export function nativeInputPresets(inventory, component) {
  if (!['input', 'textarea'].includes(component)) throw Error('Unknown native text field preset');
  const { globals } = nativeGlobalMetrics(inventory);
  const classRecipes = Object.fromEntries(
    Object.entries(reviewedInputSources[component]).map(([name, input]) => {
      if (inventory.sources[input.origin]?.sha256 !== input.sha256)
        throw Error(
          'Text field source changed; renew native class/API review: ' + component + '/' + name,
        );
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
  for (const name of ['radix', 'aria'])
    if (classRecipes[name].recipe.base !== classRecipes.base.recipe.base)
      throw Error('Text field component bases diverged; renew native review');
  const foreign = [
    ...new Set(
      Object.values(inventory.registries).flatMap((r) =>
        r.items
          .filter((i) => i.type === 'registry:ui' && i.name.startsWith(component + '-'))
          .map((i) => i.name),
      ),
    ),
  ];
  const presets = Object.fromEntries(
    ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'].map((style) => {
      const sheet = inventory.styleSheets['style-' + style + '.css'];
      if (!sheet || sha256(sheet.content) !== sheet.sha256)
        throw Error('Upstream text field preset integrity failed: ' + style);
      const selectors = [
        ...sheet.content.matchAll(new RegExp('\\.cn-' + component + '[^\\s{,]*(?=\\s*\\{)', 'g')),
      ]
        .map((m) => m[0])
        .filter(
          (selector) =>
            !foreign.some(
              (name) => selector === '.cn-' + name || selector.startsWith('.cn-' + name + '-'),
            ),
        );
      const rules = [
        ...sheet.content.matchAll(
          new RegExp('\\.cn-' + component + '\\s*\\{\\s*@apply\\s+([^;]+);\\s*\\}', 'g'),
        ),
      ];
      if (selectors.length !== 1 || selectors[0] !== '.cn-' + component || rules.length !== 1)
        throw Error('Upstream text field selectors need native review: ' + component + '/' + style);
      return [
        style,
        { sha256: sheet.sha256, rules: { base: rules[0][1].trim().replace(/\s+/g, ' ') } },
      ];
    }),
  );
  return { upstream: inventory.source, globals, presets, classRecipes };
}
export async function nativeInputPresetSource(inventory, component) {
  const name = component === 'input' ? 'nativeInputPresetSource' : 'nativeTextareaPresetSource';
  return format(
    '// Adapted from shadcn/ui (MIT). Pinned input classes and global metrics.\nexport const ' +
      name +
      ' = ' +
      JSON.stringify(nativeInputPresets(inventory, component)) +
      ' as const;\n',
    { ...(await resolveConfig(target(component))), filepath: target(component) },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = loadOfficialRegistry();
  for (const component of ['input', 'textarea']) {
    const source = await nativeInputPresetSource(inventory, component);
    if (process.argv.includes('--write')) writeFileSync(target(component), source);
    else if (readFileSync(target(component), 'utf8') !== source)
      throw Error('Native text field preset evidence is stale: ' + component);
  }
}
