import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
export const reviewedEmptySources = {
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/empty.tsx',
    sha256: '05c419160ac0226973f6f00d7d8865dc46645a75ea0697138992cdbc736efec4',
    slots: {
      Empty: [
        {
          tag: 'div',
          classes:
            'cn-empty flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance',
        },
      ],
      EmptyHeader: [{ tag: 'div', classes: 'cn-empty-header flex max-w-sm flex-col items-center' }],
      EmptyMedia: [{ tag: 'div', recipe: 'emptyMediaVariants', classes: '' }],
      EmptyTitle: [{ tag: 'div', classes: 'cn-empty-title cn-font-heading' }],
      EmptyDescription: [
        {
          tag: 'div',
          classes:
            'cn-empty-description text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      EmptyContent: [
        {
          tag: 'div',
          classes:
            'cn-empty-content flex w-full max-w-sm min-w-0 flex-col items-center text-balance',
        },
      ],
    },
    recipes: {
      emptyMediaVariants: {
        base: 'cn-empty-media flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants: { variant: { default: 'cn-empty-media-default', icon: 'cn-empty-media-icon' } },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
  base: {
    origin: 'apps/v4/registry/bases/base/ui/empty.tsx',
    sha256: '05c419160ac0226973f6f00d7d8865dc46645a75ea0697138992cdbc736efec4',
    slots: {
      Empty: [
        {
          tag: 'div',
          classes:
            'cn-empty flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance',
        },
      ],
      EmptyHeader: [{ tag: 'div', classes: 'cn-empty-header flex max-w-sm flex-col items-center' }],
      EmptyMedia: [{ tag: 'div', recipe: 'emptyMediaVariants', classes: '' }],
      EmptyTitle: [{ tag: 'div', classes: 'cn-empty-title cn-font-heading' }],
      EmptyDescription: [
        {
          tag: 'div',
          classes:
            'cn-empty-description text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      EmptyContent: [
        {
          tag: 'div',
          classes:
            'cn-empty-content flex w-full max-w-sm min-w-0 flex-col items-center text-balance',
        },
      ],
    },
    recipes: {
      emptyMediaVariants: {
        base: 'cn-empty-media flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants: { variant: { default: 'cn-empty-media-default', icon: 'cn-empty-media-icon' } },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/empty.json#registry/default/ui/empty.tsx',
    sha256: '9f975582a0290dbc7ce6efa3b36b376a4c3f07863026c3b74c1e73cb0023acb8',
    slots: {
      Empty: [
        {
          tag: 'div',
          classes:
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance rounded-lg border-dashed p-6 text-center md:p-12',
        },
      ],
      EmptyHeader: [
        { tag: 'div', classes: 'flex max-w-sm flex-col items-center gap-2 text-center' },
      ],
      EmptyMedia: [{ tag: 'div', recipe: 'emptyMediaVariants', classes: '' }],
      EmptyTitle: [{ tag: 'div', classes: 'text-lg font-medium tracking-tight' }],
      EmptyDescription: [
        {
          tag: 'div',
          classes:
            'text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4',
        },
      ],
      EmptyContent: [
        {
          tag: 'div',
          classes: 'flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm',
        },
      ],
    },
    recipes: {
      emptyMediaVariants: {
        base: 'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants: {
          variant: {
            default: 'bg-transparent',
            icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
  'new-york': {
    origin: 'apps/v4/public/r/styles/new-york/empty.json#registry/new-york/ui/empty.tsx',
    sha256: '9f975582a0290dbc7ce6efa3b36b376a4c3f07863026c3b74c1e73cb0023acb8',
    slots: {
      Empty: [
        {
          tag: 'div',
          classes:
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance rounded-lg border-dashed p-6 text-center md:p-12',
        },
      ],
      EmptyHeader: [
        { tag: 'div', classes: 'flex max-w-sm flex-col items-center gap-2 text-center' },
      ],
      EmptyMedia: [{ tag: 'div', recipe: 'emptyMediaVariants', classes: '' }],
      EmptyTitle: [{ tag: 'div', classes: 'text-lg font-medium tracking-tight' }],
      EmptyDescription: [
        {
          tag: 'div',
          classes:
            'text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4',
        },
      ],
      EmptyContent: [
        {
          tag: 'div',
          classes: 'flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm',
        },
      ],
    },
    recipes: {
      emptyMediaVariants: {
        base: 'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants: {
          variant: {
            default: 'bg-transparent',
            icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/empty.tsx',
    sha256: '54f529ccf72c18c4b5abd5586a7cf1f2a4c8d207aac366029d66ed095cb2965d',
    slots: {
      Empty: [
        {
          tag: 'div',
          classes:
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12',
        },
      ],
      EmptyHeader: [
        { tag: 'div', classes: 'flex max-w-sm flex-col items-center gap-2 text-center' },
      ],
      EmptyMedia: [{ tag: 'div', recipe: 'emptyMediaVariants', classes: '' }],
      EmptyTitle: [{ tag: 'div', classes: 'text-lg font-medium tracking-tight' }],
      EmptyDescription: [
        {
          tag: 'div',
          classes:
            'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      EmptyContent: [
        {
          tag: 'div',
          classes: 'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
        },
      ],
    },
    recipes: {
      emptyMediaVariants: {
        base: 'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants: {
          variant: {
            default: 'bg-transparent',
            icon: "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6",
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/empty.tsx',
    sha256: '05c419160ac0226973f6f00d7d8865dc46645a75ea0697138992cdbc736efec4',
    slots: {
      Empty: [
        {
          tag: 'div',
          classes:
            'cn-empty flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance',
        },
      ],
      EmptyHeader: [{ tag: 'div', classes: 'cn-empty-header flex max-w-sm flex-col items-center' }],
      EmptyMedia: [{ tag: 'div', recipe: 'emptyMediaVariants', classes: '' }],
      EmptyTitle: [{ tag: 'div', classes: 'cn-empty-title cn-font-heading' }],
      EmptyDescription: [
        {
          tag: 'div',
          classes:
            'cn-empty-description text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      EmptyContent: [
        {
          tag: 'div',
          classes:
            'cn-empty-content flex w-full max-w-sm min-w-0 flex-col items-center text-balance',
        },
      ],
    },
    recipes: {
      emptyMediaVariants: {
        base: 'cn-empty-media flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants: { variant: { default: 'cn-empty-media-default', icon: 'cn-empty-media-icon' } },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
};
export function nativeEmptyPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory),
    presets = {};
  for (const [name, definition] of Object.entries(reviewedEmptySources)) {
    const actual = inventory.sources[definition.origin];
    if (
      actual?.sha256 !== definition.sha256 ||
      JSON.stringify(actual.classRecipes) !== JSON.stringify(definition.recipes)
    )
      throw Error('Empty source changed; renew review: ' + name);
    if (
      JSON.stringify(Object.keys(definition.recipes.emptyMediaVariants.variants.variant).sort()) !==
      JSON.stringify(['default', 'icon'])
    )
      throw Error('Empty variants require review: ' + name);
  }
  const expected = [
    'empty',
    'empty-header',
    'empty-media',
    'empty-media-default',
    'empty-media-icon',
    'empty-title',
    'empty-description',
    'empty-content',
  ].sort();
  for (const name of ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea']) {
    const sheet = inventory.styleSheets['style-' + name + '.css'];
    if (!sheet || sha256(sheet.content) !== sheet.sha256)
      throw Error('Empty stylesheet integrity failed: ' + name);
    const content = sheet.content.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...content.matchAll(/^\s*(\.cn-empty[^{}]*?)\s*\{/gm)].map((m) =>
      m[1].trim(),
    );
    const entries = [
      ...content.matchAll(
        /\.cn-(empty(?:-header|-media(?:-default|-icon)?|-title|-description|-content)?)\s*\{\s*@apply\s+([^;{}]+);?\s*\}/g,
      ),
    ].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]);
    if (
      selectors.length !== 8 ||
      entries.length !== 8 ||
      JSON.stringify(entries.map((e) => e[0]).sort()) !== JSON.stringify(expected)
    )
      throw Error('Empty selectors require review: ' + name);
    presets[name] = { sha256: sheet.sha256, rules: Object.fromEntries(entries) };
  }
  return { upstream: inventory.source, globals, sources: reviewedEmptySources, presets };
}
const target = fileURLToPath(new URL('../assets/ui/native/_empty-presets.tsx', import.meta.url));
export async function nativeEmptyPresetSource(inventory) {
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed Empty source slots, media variants and styles.\nexport const nativeEmptyPresetSource=' +
      JSON.stringify(nativeEmptyPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = await nativeEmptyPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source) throw Error('Empty source evidence is stale.');
}
