import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
// All six input-group implementations are reviewed independently, including frozen selectors.
export const reviewedInputGroupSources = {
  base: {
    origin: 'apps/v4/registry/bases/base/ui/input-group.tsx',
    sha256: 'b1ed344e05b4161c240fff21b6e224fcc61cbe35d5a3aaa997de02c8fb25e1fe',
    slots: {
      InputGroup:
        'group/input-group cn-input-group relative flex w-full min-w-0 items-center outline-none has-[>textarea]:h-auto',
      InputGroupText: 'cn-input-group-text flex items-center [&_svg]:pointer-events-none',
      InputGroupInput: 'cn-input-group-input flex-1',
      InputGroupTextarea: 'cn-input-group-textarea flex-1 resize-none',
    },
    recipes: {
      inputGroupAddonVariants: {
        base: 'cn-input-group-addon flex cursor-text items-center justify-center select-none',
        variants: {
          align: {
            'inline-start': 'cn-input-group-addon-align-inline-start order-first',
            'inline-end': 'cn-input-group-addon-align-inline-end order-last',
            'block-start':
              'cn-input-group-addon-align-block-start order-first w-full justify-start',
            'block-end': 'cn-input-group-addon-align-block-end order-last w-full justify-start',
          },
        },
        defaultVariants: {
          align: 'inline-start',
        },
        compoundVariants: [],
      },
      inputGroupButtonVariants: {
        base: 'cn-input-group-button flex items-center shadow-none',
        variants: {
          size: {
            xs: 'cn-input-group-button-size-xs',
            sm: 'cn-input-group-button-size-sm',
            'icon-xs': 'cn-input-group-button-size-icon-xs',
            'icon-sm': 'cn-input-group-button-size-icon-sm',
          },
        },
        defaultVariants: {
          size: 'xs',
        },
        compoundVariants: [],
      },
    },
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/input-group.tsx',
    sha256: '1dc8da17e81c94abc4d7b84a48ecd519f6b24e3007c0f2cdb3d70bcf5a657e19',
    slots: {
      InputGroup:
        'group/input-group cn-input-group relative flex w-full min-w-0 items-center outline-none has-[>textarea]:h-auto',
      InputGroupText: 'cn-input-group-text flex items-center [&_svg]:pointer-events-none',
      InputGroupInput: 'cn-input-group-input flex-1',
      InputGroupTextarea: 'cn-input-group-textarea flex-1 resize-none',
    },
    recipes: {
      inputGroupAddonVariants: {
        base: 'cn-input-group-addon flex cursor-text items-center justify-center select-none',
        variants: {
          align: {
            'inline-start': 'cn-input-group-addon-align-inline-start order-first',
            'inline-end': 'cn-input-group-addon-align-inline-end order-last',
            'block-start':
              'cn-input-group-addon-align-block-start order-first w-full justify-start',
            'block-end': 'cn-input-group-addon-align-block-end order-last w-full justify-start',
          },
        },
        defaultVariants: {
          align: 'inline-start',
        },
        compoundVariants: [],
      },
      inputGroupButtonVariants: {
        base: 'cn-input-group-button flex items-center shadow-none',
        variants: {
          size: {
            xs: 'cn-input-group-button-size-xs',
            sm: 'cn-input-group-button-size-sm',
            'icon-xs': 'cn-input-group-button-size-icon-xs',
            'icon-sm': 'cn-input-group-button-size-icon-sm',
          },
        },
        defaultVariants: {
          size: 'xs',
        },
        compoundVariants: [],
      },
    },
  },
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/input-group.tsx',
    sha256: 'f560ff23727006fc7790bef0f9dee2960e8eb00843f8644e9707f0c65582c9d6',
    slots: {
      InputGroup:
        'group/input-group cn-input-group relative flex w-full min-w-0 items-center outline-none has-[>textarea]:h-auto',
      InputGroupText: 'cn-input-group-text flex items-center [&_svg]:pointer-events-none',
      InputGroupInput: 'cn-input-group-input flex-1',
      InputGroupTextarea: 'cn-input-group-textarea flex-1 resize-none',
    },
    recipes: {
      inputGroupAddonVariants: {
        base: 'cn-input-group-addon flex cursor-text items-center justify-center select-none',
        variants: {
          align: {
            'inline-start': 'cn-input-group-addon-align-inline-start order-first',
            'inline-end': 'cn-input-group-addon-align-inline-end order-last',
            'block-start':
              'cn-input-group-addon-align-block-start order-first w-full justify-start',
            'block-end': 'cn-input-group-addon-align-block-end order-last w-full justify-start',
          },
        },
        defaultVariants: {
          align: 'inline-start',
        },
        compoundVariants: [],
      },
      inputGroupButtonVariants: {
        base: 'cn-input-group-button flex items-center shadow-none',
        variants: {
          size: {
            xs: 'cn-input-group-button-size-xs',
            sm: 'cn-input-group-button-size-sm',
            'icon-xs': 'cn-input-group-button-size-icon-xs',
            'icon-sm': 'cn-input-group-button-size-icon-sm',
          },
        },
        defaultVariants: {
          size: 'xs',
        },
        compoundVariants: [],
      },
    },
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/input-group.json#registry/default/ui/input-group.tsx',
    sha256: 'dc1add9fe09200bd5465b4ecc3ea0167ca40b739d140877313acdab8570e87d0',
    slots: {
      InputGroup:
        'group/input-group border-input dark:bg-input/30 shadow-xs relative flex w-full items-center rounded-md border outline-none transition-[color,box-shadow] h-9 has-[>textarea]:h-auto has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring has-[[data-slot=input-group-control]:focus-visible]:ring-1 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
      InputGroupText:
        "text-muted-foreground flex items-center gap-2 text-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
      InputGroupInput:
        'flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
      InputGroupTextarea:
        'flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent',
    },
    recipes: {
      inputGroupAddonVariants: {
        base: "text-muted-foreground flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
        variants: {
          align: {
            'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
            'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]',
            'block-start':
              '[.border-b]:pb-3 order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5',
            'block-end':
              '[.border-t]:pt-3 order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5',
          },
        },
        defaultVariants: {
          align: 'inline-start',
        },
        compoundVariants: [],
      },
      inputGroupButtonVariants: {
        base: 'flex items-center gap-2 text-sm shadow-none',
        variants: {
          size: {
            xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
            sm: 'h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5',
            'icon-xs': 'size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0',
            'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
          },
        },
        defaultVariants: {
          size: 'xs',
        },
        compoundVariants: [],
      },
    },
  },
  'new-york': {
    origin:
      'apps/v4/public/r/styles/new-york/input-group.json#registry/new-york/ui/input-group.tsx',
    sha256: '6da6459f05d525c8ea765ee666aa51560c7f320309a7bf538ef804c1f01837f8',
    slots: {
      InputGroup:
        'group/input-group border-input dark:bg-input/30 shadow-xs relative flex w-full items-center rounded-md border outline-none transition-[color,box-shadow] h-9 has-[>textarea]:h-auto has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring has-[[data-slot=input-group-control]:focus-visible]:ring-1 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
      InputGroupText:
        "text-muted-foreground flex items-center gap-2 text-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
      InputGroupInput:
        'flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
      InputGroupTextarea:
        'flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent',
    },
    recipes: {
      inputGroupAddonVariants: {
        base: "text-muted-foreground flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
        variants: {
          align: {
            'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
            'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]',
            'block-start':
              '[.border-b]:pb-3 order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5',
            'block-end':
              '[.border-t]:pt-3 order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5',
          },
        },
        defaultVariants: {
          align: 'inline-start',
        },
        compoundVariants: [],
      },
      inputGroupButtonVariants: {
        base: 'flex items-center gap-2 text-sm shadow-none',
        variants: {
          size: {
            xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
            sm: 'h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5',
            'icon-xs': 'size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0',
            'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
          },
        },
        defaultVariants: {
          size: 'xs',
        },
        compoundVariants: [],
      },
    },
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/input-group.tsx',
    sha256: 'e379899ac50d6cabc9d9eb1668f265176951c62b1fe83a6f23ee97fe8074d526',
    slots: {
      InputGroup:
        'group/input-group relative flex w-full items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30 h-9 min-w-0 has-[>textarea]:h-auto has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
      InputGroupText:
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
      InputGroupInput:
        'flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
      InputGroupTextarea:
        'flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent',
    },
    recipes: {
      inputGroupAddonVariants: {
        base: "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
        variants: {
          align: {
            'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
            'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]',
            'block-start':
              'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-3',
            'block-end':
              'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-3',
          },
        },
        defaultVariants: {
          align: 'inline-start',
        },
        compoundVariants: [],
      },
      inputGroupButtonVariants: {
        base: 'flex items-center gap-2 text-sm shadow-none',
        variants: {
          size: {
            xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
            sm: 'h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5',
            'icon-xs': 'size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0',
            'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
          },
        },
        defaultVariants: {
          size: 'xs',
        },
        compoundVariants: [],
      },
    },
  },
};
const allowed = [
  'base',
  'addon',
  'addon-align-inline-start',
  'addon-align-inline-end',
  'addon-align-block-start',
  'addon-align-block-end',
  'button',
  'button-size-xs',
  'button-size-sm',
  'button-size-icon-xs',
  'button-size-icon-sm',
  'text',
  'input',
  'textarea',
];
export function nativeInputGroupPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory);
  for (const [name, input] of Object.entries(reviewedInputGroupSources)) {
    if (inventory.sources[input.origin]?.sha256 !== input.sha256)
      throw Error('InputGroup source changed; renew native review: ' + name);
    const actual = inventory.sources[input.origin].classRecipes;
    if (JSON.stringify(actual) !== JSON.stringify(input.recipes))
      throw Error('InputGroup class recipes changed; renew native review: ' + name);
  }
  const presets = Object.fromEntries(
    ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'].map((style) => {
      const sheet = inventory.styleSheets['style-' + style + '.css'];
      if (!sheet || sha256(sheet.content) !== sheet.sha256)
        throw Error('InputGroup stylesheet integrity failed: ' + style);
      const content = sheet.content.replace(/\/\*[\s\S]*?\*\//g, '');
      const selectors = [...content.matchAll(/^\s*(\.cn-input-group[^{}]*?)\s*\{/gm)].map((m) =>
        m[1].trim(),
      );
      const entries = [
        ...content.matchAll(/\.cn-input-group(-[a-z-]+)?\s*\{\s*@apply\s+([^;]+);\s*\}/g),
      ].map((m) => [m[1]?.slice(1) || 'base', m[2].trim().replace(/\s+/g, ' ')]);
      const rules = Object.fromEntries(entries);
      if (
        selectors.length !== entries.length ||
        entries.length !== Object.keys(rules).length ||
        selectors.some(
          (s) =>
            !allowed.includes(
              s === '.cn-input-group' ? 'base' : s.slice('.cn-input-group-'.length),
            ),
        ) ||
        allowed
          .filter(
            (k) =>
              k !== 'button-size-sm' &&
              !(
                style === 'sera' &&
                ['addon-align-inline-start', 'addon-align-inline-end'].includes(k)
              ),
          )
          .some((k) => rules[k] === undefined)
      )
        throw Error('InputGroup selectors require native review: ' + style);
      // An absent small-button marker deliberately inherits the source Button default size.
      rules['button-size-sm'] ??= '';
      if (style === 'sera') {
        rules['addon-align-inline-start'] ??= '';
        rules['addon-align-inline-end'] ??= '';
      }
      return [style, { sha256: sheet.sha256, rules }];
    }),
  );
  return { upstream: inventory.source, globals, sources: reviewedInputGroupSources, presets };
}
export async function nativeInputGroupPresetSource(inventory) {
  const target = fileURLToPath(
    new URL('../assets/ui/native/_input-group-presets.tsx', import.meta.url),
  );
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed input-group sources, state selectors and slots.\nexport const nativeInputGroupPresetSource=' +
      JSON.stringify(nativeInputGroupPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = fileURLToPath(
      new URL('../assets/ui/native/_input-group-presets.tsx', import.meta.url),
    ),
    source = await nativeInputGroupPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source)
    throw Error('InputGroup native presets are stale.');
}
