import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
export const reviewedItemSources = {
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/item.tsx',
    sha256: '24f60eb69fe9631d8e58fc4eddda0a12b20c20f079f64aae94c92f81085a8302',
    slots: {
      ItemGroup: [
        {
          tag: 'div',
          classes: 'cn-item-group group/item-group flex w-full flex-col',
        },
      ],
      ItemSeparator: [
        {
          tag: 'Separator',
          classes: 'cn-item-separator',
        },
      ],
      Item: [
        {
          tag: 'Element',
          recipe: 'itemVariants',
          classes: '',
        },
      ],
      ItemMedia: [
        {
          tag: 'div',
          recipe: 'itemMediaVariants',
          classes: '',
        },
      ],
      ItemContent: [
        {
          tag: 'div',
          classes: 'cn-item-content flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none',
        },
      ],
      ItemTitle: [
        {
          tag: 'div',
          classes: 'cn-item-title line-clamp-1 flex w-fit items-center',
        },
      ],
      ItemDescription: [
        {
          tag: 'p',
          classes:
            'cn-item-description line-clamp-2 font-normal [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      ItemActions: [
        {
          tag: 'div',
          classes: 'cn-item-actions flex items-center',
        },
      ],
      ItemHeader: [
        {
          tag: 'div',
          classes: 'cn-item-header flex basis-full items-center justify-between',
        },
      ],
      ItemFooter: [
        {
          tag: 'div',
          classes: 'cn-item-footer flex basis-full items-center justify-between',
        },
      ],
    },
    recipes: {
      itemVariants: {
        base: 'cn-item group/item flex w-full flex-wrap items-center transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors',
        variants: {
          variant: {
            default: 'cn-item-variant-default',
            outline: 'cn-item-variant-outline',
            muted: 'cn-item-variant-muted',
          },
          size: {
            default: 'cn-item-size-default',
            sm: 'cn-item-size-sm',
            xs: 'cn-item-size-xs',
          },
        },
        defaultVariants: {
          variant: 'default',
          size: 'default',
        },
        compoundVariants: [],
      },
      itemMediaVariants: {
        base: 'cn-item-media flex shrink-0 items-center justify-center [&_svg]:pointer-events-none',
        variants: {
          variant: {
            default: 'cn-item-media-variant-default',
            icon: 'cn-item-media-variant-icon',
            image: 'cn-item-media-variant-image',
          },
        },
        defaultVariants: {
          variant: 'default',
        },
        compoundVariants: [],
      },
    },
  },
  base: {
    origin: 'apps/v4/registry/bases/base/ui/item.tsx',
    sha256: 'dcc8a3fbb7d58d32413b31b51d5ec636b9573c5ad3ebe258a3b4a03ec23670cc',
    slots: {
      ItemGroup: [
        {
          tag: 'div',
          classes: 'cn-item-group group/item-group flex w-full flex-col',
        },
      ],
      ItemSeparator: [
        {
          tag: 'Separator',
          classes: 'cn-item-separator',
        },
      ],
      ItemMedia: [
        {
          tag: 'div',
          recipe: 'itemMediaVariants',
          classes: '',
        },
      ],
      ItemContent: [
        {
          tag: 'div',
          classes: 'cn-item-content flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none',
        },
      ],
      ItemTitle: [
        {
          tag: 'div',
          classes: 'cn-item-title line-clamp-1 flex w-fit items-center',
        },
      ],
      ItemDescription: [
        {
          tag: 'p',
          classes:
            'cn-item-description line-clamp-2 font-normal [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      ItemActions: [
        {
          tag: 'div',
          classes: 'cn-item-actions flex items-center',
        },
      ],
      ItemHeader: [
        {
          tag: 'div',
          classes: 'cn-item-header flex basis-full items-center justify-between',
        },
      ],
      ItemFooter: [
        {
          tag: 'div',
          classes: 'cn-item-footer flex basis-full items-center justify-between',
        },
      ],
      Item: [
        {
          tag: 'useRender',
          recipe: 'itemVariants',
          classes: '',
        },
      ],
    },
    recipes: {
      itemVariants: {
        base: 'cn-item group/item flex w-full flex-wrap items-center transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors',
        variants: {
          variant: {
            default: 'cn-item-variant-default',
            outline: 'cn-item-variant-outline',
            muted: 'cn-item-variant-muted',
          },
          size: {
            default: 'cn-item-size-default',
            sm: 'cn-item-size-sm',
            xs: 'cn-item-size-xs',
          },
        },
        defaultVariants: {
          variant: 'default',
          size: 'default',
        },
        compoundVariants: [],
      },
      itemMediaVariants: {
        base: 'cn-item-media flex shrink-0 items-center justify-center [&_svg]:pointer-events-none',
        variants: {
          variant: {
            default: 'cn-item-media-variant-default',
            icon: 'cn-item-media-variant-icon',
            image: 'cn-item-media-variant-image',
          },
        },
        defaultVariants: {
          variant: 'default',
        },
        compoundVariants: [],
      },
    },
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/item.json#registry/default/ui/item.tsx',
    sha256: 'da31b03b4eb1d56578b1b72d9f4032e89cc0baf96dfdb1c9527f63ab62537c96',
    slots: {
      ItemGroup: [
        {
          tag: 'div',
          classes: 'group/item-group flex flex-col',
        },
      ],
      ItemSeparator: [
        {
          tag: 'Separator',
          classes: 'my-0',
        },
      ],
      Item: [
        {
          tag: 'Comp',
          recipe: 'itemVariants',
          classes: '',
        },
      ],
      ItemMedia: [
        {
          tag: 'div',
          recipe: 'itemMediaVariants',
          classes: '',
        },
      ],
      ItemContent: [
        {
          tag: 'div',
          classes: 'flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none',
        },
      ],
      ItemTitle: [
        {
          tag: 'div',
          classes: 'flex w-fit items-center gap-2 text-sm font-medium leading-snug',
        },
      ],
      ItemDescription: [
        {
          tag: 'p',
          classes:
            'text-muted-foreground line-clamp-2 text-balance text-sm font-normal leading-normal [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        },
      ],
      ItemActions: [
        {
          tag: 'div',
          classes: 'flex items-center gap-2',
        },
      ],
      ItemHeader: [
        {
          tag: 'div',
          classes: 'flex basis-full items-center justify-between gap-2',
        },
      ],
      ItemFooter: [
        {
          tag: 'div',
          classes: 'flex basis-full items-center justify-between gap-2',
        },
      ],
    },
    recipes: {
      itemVariants: {
        base: 'group/item [a]:hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 [a]:transition-colors flex flex-wrap items-center rounded-md border border-transparent text-sm outline-none transition-colors duration-100 focus-visible:ring-[3px]',
        variants: {
          variant: {
            default: 'bg-transparent',
            outline: 'border-border',
            muted: 'bg-muted/50',
          },
          size: {
            default: 'gap-4 p-4',
            sm: 'gap-2.5 px-4 py-3',
          },
        },
        defaultVariants: {
          variant: 'default',
          size: 'default',
        },
        compoundVariants: [],
      },
      itemMediaVariants: {
        base: 'flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none',
        variants: {
          variant: {
            default: 'bg-transparent',
            icon: "bg-muted size-8 rounded-sm border [&_svg:not([class*='size-'])]:size-4",
            image: 'size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover',
          },
        },
        defaultVariants: {
          variant: 'default',
        },
        compoundVariants: [],
      },
    },
  },
  'new-york': {
    origin: 'apps/v4/public/r/styles/new-york/item.json#registry/new-york/ui/item.tsx',
    sha256: '9ca68b9cac03e53c6ad7063483339d751dfe962433eb13d76f5e4610e2bb47c4',
    slots: {
      ItemGroup: [
        {
          tag: 'div',
          classes: 'group/item-group flex flex-col',
        },
      ],
      ItemSeparator: [
        {
          tag: 'Separator',
          classes: 'my-0',
        },
      ],
      Item: [
        {
          tag: 'Comp',
          recipe: 'itemVariants',
          classes: '',
        },
      ],
      ItemMedia: [
        {
          tag: 'div',
          recipe: 'itemMediaVariants',
          classes: '',
        },
      ],
      ItemContent: [
        {
          tag: 'div',
          classes: 'flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none',
        },
      ],
      ItemTitle: [
        {
          tag: 'div',
          classes: 'flex w-fit items-center gap-2 text-sm font-medium leading-snug',
        },
      ],
      ItemDescription: [
        {
          tag: 'p',
          classes:
            'text-muted-foreground line-clamp-2 text-balance text-sm font-normal leading-normal [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        },
      ],
      ItemActions: [
        {
          tag: 'div',
          classes: 'flex items-center gap-2',
        },
      ],
      ItemHeader: [
        {
          tag: 'div',
          classes: 'flex basis-full items-center justify-between gap-2',
        },
      ],
      ItemFooter: [
        {
          tag: 'div',
          classes: 'flex basis-full items-center justify-between gap-2',
        },
      ],
    },
    recipes: {
      itemVariants: {
        base: 'group/item [a]:hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 [a]:transition-colors flex flex-wrap items-center rounded-md border border-transparent text-sm outline-none transition-colors duration-100 focus-visible:ring-[3px]',
        variants: {
          variant: {
            default: 'bg-transparent',
            outline: 'border-border',
            muted: 'bg-muted/50',
          },
          size: {
            default: 'gap-4 p-4',
            sm: 'gap-2.5 px-4 py-3',
          },
        },
        defaultVariants: {
          variant: 'default',
          size: 'default',
        },
        compoundVariants: [],
      },
      itemMediaVariants: {
        base: 'flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none',
        variants: {
          variant: {
            default: 'bg-transparent',
            icon: "bg-muted size-8 rounded-sm border [&_svg:not([class*='size-'])]:size-4",
            image: 'size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover',
          },
        },
        defaultVariants: {
          variant: 'default',
        },
        compoundVariants: [],
      },
    },
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/item.tsx',
    sha256: '9ade8136f010284b7ec0142f52606616dd4b23798012e75a9fc6aac1fb2d792e',
    slots: {
      ItemGroup: [
        {
          tag: 'div',
          classes: 'group/item-group flex flex-col',
        },
      ],
      ItemSeparator: [
        {
          tag: 'Separator',
          classes: 'my-0',
        },
      ],
      Item: [
        {
          tag: 'Comp',
          recipe: 'itemVariants',
          classes: '',
        },
      ],
      ItemMedia: [
        {
          tag: 'div',
          recipe: 'itemMediaVariants',
          classes: '',
        },
      ],
      ItemContent: [
        {
          tag: 'div',
          classes: 'flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none',
        },
      ],
      ItemTitle: [
        {
          tag: 'div',
          classes: 'flex w-fit items-center gap-2 text-sm leading-snug font-medium',
        },
      ],
      ItemDescription: [
        {
          tag: 'p',
          classes:
            'line-clamp-2 text-sm leading-normal font-normal text-balance text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      ItemActions: [
        {
          tag: 'div',
          classes: 'flex items-center gap-2',
        },
      ],
      ItemHeader: [
        {
          tag: 'div',
          classes: 'flex basis-full items-center justify-between gap-2',
        },
      ],
      ItemFooter: [
        {
          tag: 'div',
          classes: 'flex basis-full items-center justify-between gap-2',
        },
      ],
    },
    recipes: {
      itemVariants: {
        base: 'group/item flex flex-wrap items-center rounded-md border border-transparent text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-accent/50',
        variants: {
          variant: {
            default: 'bg-transparent',
            outline: 'border-border',
            muted: 'bg-muted/50',
          },
          size: {
            default: 'gap-4 p-4',
            sm: 'gap-2.5 px-4 py-3',
          },
        },
        defaultVariants: {
          variant: 'default',
          size: 'default',
        },
        compoundVariants: [],
      },
      itemMediaVariants: {
        base: 'flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none',
        variants: {
          variant: {
            default: 'bg-transparent',
            icon: "size-8 rounded-sm border bg-muted [&_svg:not([class*='size-'])]:size-4",
            image: 'size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover',
          },
        },
        defaultVariants: {
          variant: 'default',
        },
        compoundVariants: [],
      },
    },
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/item.tsx',
    sha256: '4c2372a166d80652aff3d201ab8f997acf1bd174a5be613d42cf9e93faa5f849',
    slots: {
      ItemGroup: [
        {
          tag: 'div',
          classes: 'cn-item-group group/item-group flex w-full flex-col',
        },
      ],
      ItemSeparator: [
        {
          tag: 'Separator',
          classes: 'cn-item-separator',
        },
      ],
      Item: [
        {
          tag: 'Comp',
          recipe: 'itemVariants',
          classes: '',
        },
      ],
      ItemMedia: [
        {
          tag: 'div',
          recipe: 'itemMediaVariants',
          classes: '',
        },
      ],
      ItemContent: [
        {
          tag: 'div',
          classes: 'cn-item-content flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none',
        },
      ],
      ItemTitle: [
        {
          tag: 'div',
          classes: 'cn-item-title line-clamp-1 flex w-fit items-center',
        },
      ],
      ItemDescription: [
        {
          tag: 'p',
          classes:
            'cn-item-description line-clamp-2 font-normal [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      ItemActions: [
        {
          tag: 'div',
          classes: 'cn-item-actions flex items-center',
        },
      ],
      ItemHeader: [
        {
          tag: 'div',
          classes: 'cn-item-header flex basis-full items-center justify-between',
        },
      ],
      ItemFooter: [
        {
          tag: 'div',
          classes: 'cn-item-footer flex basis-full items-center justify-between',
        },
      ],
    },
    recipes: {
      itemVariants: {
        base: 'cn-item group/item flex w-full flex-wrap items-center transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors',
        variants: {
          variant: {
            default: 'cn-item-variant-default',
            outline: 'cn-item-variant-outline',
            muted: 'cn-item-variant-muted',
          },
          size: {
            default: 'cn-item-size-default',
            sm: 'cn-item-size-sm',
            xs: 'cn-item-size-xs',
          },
        },
        defaultVariants: {
          variant: 'default',
          size: 'default',
        },
        compoundVariants: [],
      },
      itemMediaVariants: {
        base: 'cn-item-media flex shrink-0 items-center justify-center [&_svg]:pointer-events-none',
        variants: {
          variant: {
            default: 'cn-item-media-variant-default',
            icon: 'cn-item-media-variant-icon',
            image: 'cn-item-media-variant-image',
          },
        },
        defaultVariants: {
          variant: 'default',
        },
        compoundVariants: [],
      },
    },
  },
};
export function nativeItemPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory),
    presets = {};
  for (const [name, definition] of Object.entries(reviewedItemSources)) {
    const actual = inventory.sources[definition.origin];
    if (
      actual?.sha256 !== definition.sha256 ||
      JSON.stringify(actual.classRecipes) !== JSON.stringify(definition.recipes)
    )
      throw Error('Item source changed; renew review: ' + name);
  }
  const expected = [
    'item',
    'item-variant-default',
    'item-variant-outline',
    'item-variant-muted',
    'item-size-default',
    'item-size-sm',
    'item-size-xs',
    'item-media',
    'item-media-variant-default',
    'item-media-variant-icon',
    'item-media-variant-image',
    'item-content',
    'item-title',
    'item-description',
    'item-actions',
    'item-header',
    'item-footer',
    'item-group',
    'item-separator',
  ].sort();
  for (const name of ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea']) {
    const sheet = inventory.styleSheets['style-' + name + '.css'];
    if (!sheet || sha256(sheet.content) !== sheet.sha256)
      throw Error('Item stylesheet integrity failed: ' + name);
    const content = sheet.content.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...content.matchAll(/^\s*(\.cn-item[^{}]*?)\s*\{/gm)].map((m) =>
      m[1].trim(),
    );
    const entries = [
      ...content.matchAll(/\.cn-(item[\w-]*)\s*\{\s*@apply\s+([^;{}]+);?\s*\}/g),
    ].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]);
    if (
      selectors.length !== 19 ||
      entries.length !== 19 ||
      JSON.stringify(entries.map((e) => e[0]).sort()) !== JSON.stringify(expected)
    )
      throw Error('Item selectors require review: ' + name);
    presets[name] = { sha256: sheet.sha256, rules: Object.fromEntries(entries) };
  }
  return { upstream: inventory.source, globals, sources: reviewedItemSources, presets };
}
const target = fileURLToPath(new URL('../assets/ui/native/_item-presets.tsx', import.meta.url));
export async function nativeItemPresetSource(inventory) {
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed Item source slots, size variants and styles.\nexport const nativeItemPresetSource=' +
      JSON.stringify(nativeItemPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = await nativeItemPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source) throw Error('Item source evidence is stale.');
}
