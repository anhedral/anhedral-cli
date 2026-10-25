// Adapted from shadcn/ui (MIT). Reviewed Item source slots, size variants and styles.
export const nativeItemPresetSource = {
  upstream: {
    repository: 'https://github.com/shadcn-ui/ui',
    commit: '617134d5810bba521803b3ed787190bacbb80b35',
  },
  globals: {
    sha256: 'c5e271374236f23bcfd559ce64aaf6b8641ee7276156c0f803dd9cb24277af12',
    radius: { sm: 0.6, md: 0.8, lg: 1, xl: 1.4, '2xl': 1.8, '3xl': 2.2, '4xl': 2.6 },
  },
  sources: {
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/item.tsx',
      sha256: '24f60eb69fe9631d8e58fc4eddda0a12b20c20f079f64aae94c92f81085a8302',
      slots: {
        ItemGroup: [{ tag: 'div', classes: 'cn-item-group group/item-group flex w-full flex-col' }],
        ItemSeparator: [{ tag: 'Separator', classes: 'cn-item-separator' }],
        Item: [{ tag: 'Element', recipe: 'itemVariants', classes: '' }],
        ItemMedia: [{ tag: 'div', recipe: 'itemMediaVariants', classes: '' }],
        ItemContent: [
          {
            tag: 'div',
            classes: 'cn-item-content flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none',
          },
        ],
        ItemTitle: [{ tag: 'div', classes: 'cn-item-title line-clamp-1 flex w-fit items-center' }],
        ItemDescription: [
          {
            tag: 'p',
            classes:
              'cn-item-description line-clamp-2 font-normal [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
          },
        ],
        ItemActions: [{ tag: 'div', classes: 'cn-item-actions flex items-center' }],
        ItemHeader: [
          { tag: 'div', classes: 'cn-item-header flex basis-full items-center justify-between' },
        ],
        ItemFooter: [
          { tag: 'div', classes: 'cn-item-footer flex basis-full items-center justify-between' },
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
            size: { default: 'cn-item-size-default', sm: 'cn-item-size-sm', xs: 'cn-item-size-xs' },
          },
          defaultVariants: { variant: 'default', size: 'default' },
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
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
    base: {
      origin: 'apps/v4/registry/bases/base/ui/item.tsx',
      sha256: 'dcc8a3fbb7d58d32413b31b51d5ec636b9573c5ad3ebe258a3b4a03ec23670cc',
      slots: {
        ItemGroup: [{ tag: 'div', classes: 'cn-item-group group/item-group flex w-full flex-col' }],
        ItemSeparator: [{ tag: 'Separator', classes: 'cn-item-separator' }],
        ItemMedia: [{ tag: 'div', recipe: 'itemMediaVariants', classes: '' }],
        ItemContent: [
          {
            tag: 'div',
            classes: 'cn-item-content flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none',
          },
        ],
        ItemTitle: [{ tag: 'div', classes: 'cn-item-title line-clamp-1 flex w-fit items-center' }],
        ItemDescription: [
          {
            tag: 'p',
            classes:
              'cn-item-description line-clamp-2 font-normal [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
          },
        ],
        ItemActions: [{ tag: 'div', classes: 'cn-item-actions flex items-center' }],
        ItemHeader: [
          { tag: 'div', classes: 'cn-item-header flex basis-full items-center justify-between' },
        ],
        ItemFooter: [
          { tag: 'div', classes: 'cn-item-footer flex basis-full items-center justify-between' },
        ],
        Item: [{ tag: 'useRender', recipe: 'itemVariants', classes: '' }],
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
            size: { default: 'cn-item-size-default', sm: 'cn-item-size-sm', xs: 'cn-item-size-xs' },
          },
          defaultVariants: { variant: 'default', size: 'default' },
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
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/item.json#registry/default/ui/item.tsx',
      sha256: 'da31b03b4eb1d56578b1b72d9f4032e89cc0baf96dfdb1c9527f63ab62537c96',
      slots: {
        ItemGroup: [{ tag: 'div', classes: 'group/item-group flex flex-col' }],
        ItemSeparator: [{ tag: 'Separator', classes: 'my-0' }],
        Item: [{ tag: 'Comp', recipe: 'itemVariants', classes: '' }],
        ItemMedia: [{ tag: 'div', recipe: 'itemMediaVariants', classes: '' }],
        ItemContent: [
          {
            tag: 'div',
            classes: 'flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none',
          },
        ],
        ItemTitle: [
          { tag: 'div', classes: 'flex w-fit items-center gap-2 text-sm font-medium leading-snug' },
        ],
        ItemDescription: [
          {
            tag: 'p',
            classes:
              'text-muted-foreground line-clamp-2 text-balance text-sm font-normal leading-normal [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
          },
        ],
        ItemActions: [{ tag: 'div', classes: 'flex items-center gap-2' }],
        ItemHeader: [{ tag: 'div', classes: 'flex basis-full items-center justify-between gap-2' }],
        ItemFooter: [{ tag: 'div', classes: 'flex basis-full items-center justify-between gap-2' }],
      },
      recipes: {
        itemVariants: {
          base: 'group/item [a]:hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 [a]:transition-colors flex flex-wrap items-center rounded-md border border-transparent text-sm outline-none transition-colors duration-100 focus-visible:ring-[3px]',
          variants: {
            variant: { default: 'bg-transparent', outline: 'border-border', muted: 'bg-muted/50' },
            size: { default: 'gap-4 p-4', sm: 'gap-2.5 px-4 py-3' },
          },
          defaultVariants: { variant: 'default', size: 'default' },
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
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/item.json#registry/new-york/ui/item.tsx',
      sha256: '9ca68b9cac03e53c6ad7063483339d751dfe962433eb13d76f5e4610e2bb47c4',
      slots: {
        ItemGroup: [{ tag: 'div', classes: 'group/item-group flex flex-col' }],
        ItemSeparator: [{ tag: 'Separator', classes: 'my-0' }],
        Item: [{ tag: 'Comp', recipe: 'itemVariants', classes: '' }],
        ItemMedia: [{ tag: 'div', recipe: 'itemMediaVariants', classes: '' }],
        ItemContent: [
          {
            tag: 'div',
            classes: 'flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none',
          },
        ],
        ItemTitle: [
          { tag: 'div', classes: 'flex w-fit items-center gap-2 text-sm font-medium leading-snug' },
        ],
        ItemDescription: [
          {
            tag: 'p',
            classes:
              'text-muted-foreground line-clamp-2 text-balance text-sm font-normal leading-normal [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
          },
        ],
        ItemActions: [{ tag: 'div', classes: 'flex items-center gap-2' }],
        ItemHeader: [{ tag: 'div', classes: 'flex basis-full items-center justify-between gap-2' }],
        ItemFooter: [{ tag: 'div', classes: 'flex basis-full items-center justify-between gap-2' }],
      },
      recipes: {
        itemVariants: {
          base: 'group/item [a]:hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 [a]:transition-colors flex flex-wrap items-center rounded-md border border-transparent text-sm outline-none transition-colors duration-100 focus-visible:ring-[3px]',
          variants: {
            variant: { default: 'bg-transparent', outline: 'border-border', muted: 'bg-muted/50' },
            size: { default: 'gap-4 p-4', sm: 'gap-2.5 px-4 py-3' },
          },
          defaultVariants: { variant: 'default', size: 'default' },
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
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/item.tsx',
      sha256: '9ade8136f010284b7ec0142f52606616dd4b23798012e75a9fc6aac1fb2d792e',
      slots: {
        ItemGroup: [{ tag: 'div', classes: 'group/item-group flex flex-col' }],
        ItemSeparator: [{ tag: 'Separator', classes: 'my-0' }],
        Item: [{ tag: 'Comp', recipe: 'itemVariants', classes: '' }],
        ItemMedia: [{ tag: 'div', recipe: 'itemMediaVariants', classes: '' }],
        ItemContent: [
          {
            tag: 'div',
            classes: 'flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none',
          },
        ],
        ItemTitle: [
          { tag: 'div', classes: 'flex w-fit items-center gap-2 text-sm leading-snug font-medium' },
        ],
        ItemDescription: [
          {
            tag: 'p',
            classes:
              'line-clamp-2 text-sm leading-normal font-normal text-balance text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
          },
        ],
        ItemActions: [{ tag: 'div', classes: 'flex items-center gap-2' }],
        ItemHeader: [{ tag: 'div', classes: 'flex basis-full items-center justify-between gap-2' }],
        ItemFooter: [{ tag: 'div', classes: 'flex basis-full items-center justify-between gap-2' }],
      },
      recipes: {
        itemVariants: {
          base: 'group/item flex flex-wrap items-center rounded-md border border-transparent text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-accent/50',
          variants: {
            variant: { default: 'bg-transparent', outline: 'border-border', muted: 'bg-muted/50' },
            size: { default: 'gap-4 p-4', sm: 'gap-2.5 px-4 py-3' },
          },
          defaultVariants: { variant: 'default', size: 'default' },
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
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/item.tsx',
      sha256: '4c2372a166d80652aff3d201ab8f997acf1bd174a5be613d42cf9e93faa5f849',
      slots: {
        ItemGroup: [{ tag: 'div', classes: 'cn-item-group group/item-group flex w-full flex-col' }],
        ItemSeparator: [{ tag: 'Separator', classes: 'cn-item-separator' }],
        Item: [{ tag: 'Comp', recipe: 'itemVariants', classes: '' }],
        ItemMedia: [{ tag: 'div', recipe: 'itemMediaVariants', classes: '' }],
        ItemContent: [
          {
            tag: 'div',
            classes: 'cn-item-content flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none',
          },
        ],
        ItemTitle: [{ tag: 'div', classes: 'cn-item-title line-clamp-1 flex w-fit items-center' }],
        ItemDescription: [
          {
            tag: 'p',
            classes:
              'cn-item-description line-clamp-2 font-normal [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
          },
        ],
        ItemActions: [{ tag: 'div', classes: 'cn-item-actions flex items-center' }],
        ItemHeader: [
          { tag: 'div', classes: 'cn-item-header flex basis-full items-center justify-between' },
        ],
        ItemFooter: [
          { tag: 'div', classes: 'cn-item-footer flex basis-full items-center justify-between' },
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
            size: { default: 'cn-item-size-default', sm: 'cn-item-size-sm', xs: 'cn-item-size-xs' },
          },
          defaultVariants: { variant: 'default', size: 'default' },
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
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
  },
  presets: {
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        item: '[a]:hover:bg-muted rounded-lg border text-sm',
        'item-variant-default': 'border-transparent',
        'item-variant-outline': 'border-border',
        'item-variant-muted': 'bg-muted/50 border-transparent',
        'item-size-default': 'gap-2.5 px-3 py-2.5',
        'item-size-sm': 'gap-2.5 px-3 py-2.5',
        'item-size-xs': 'gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
        'item-media':
          'gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start',
        'item-media-variant-default': 'bg-transparent',
        'item-media-variant-icon': "[&_svg:not([class*='size-'])]:size-4",
        'item-media-variant-image':
          'size-10 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
        'item-content': 'gap-1 group-data-[size=xs]/item:gap-0',
        'item-title': 'gap-2 text-sm leading-snug font-medium underline-offset-4',
        'item-description':
          'text-muted-foreground text-left text-sm leading-normal group-data-[size=xs]/item:text-xs',
        'item-actions': 'gap-2',
        'item-header': 'gap-2',
        'item-footer': 'gap-2',
        'item-group': 'gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        'item-separator': 'my-2',
      },
    },
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        item: '[a]:hover:bg-muted rounded-md border text-sm',
        'item-variant-default': 'border-transparent',
        'item-variant-outline': 'border-border',
        'item-variant-muted': 'bg-muted/50 border-transparent',
        'item-size-default': 'gap-3.5 px-4 py-3.5',
        'item-size-sm': 'gap-2.5 px-3 py-2.5',
        'item-size-xs': 'gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
        'item-media':
          'gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start',
        'item-media-variant-default': 'bg-transparent',
        'item-media-variant-icon': "[&_svg:not([class*='size-'])]:size-4",
        'item-media-variant-image':
          'size-10 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
        'item-content': 'gap-1 group-data-[size=xs]/item:gap-0',
        'item-title': 'gap-2 text-sm leading-snug font-medium underline-offset-4',
        'item-description':
          'text-muted-foreground text-left text-sm leading-normal group-data-[size=xs]/item:text-xs',
        'item-actions': 'gap-2',
        'item-header': 'gap-2',
        'item-footer': 'gap-2',
        'item-group': 'gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        'item-separator': 'my-2',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        item: '[a]:hover:bg-muted rounded-2xl border text-sm',
        'item-variant-default': 'border-transparent',
        'item-variant-outline': 'border-border',
        'item-variant-muted': 'bg-muted/50 border-transparent',
        'item-size-default': 'gap-3.5 px-4 py-3.5',
        'item-size-sm': 'gap-3.5 px-3.5 py-3',
        'item-size-xs': 'gap-2.5 px-3 py-2.5 in-data-[slot=dropdown-menu-content]:p-0',
        'item-media':
          'gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start',
        'item-media-variant-default': 'bg-transparent',
        'item-media-variant-icon': "[&_svg:not([class*='size-'])]:size-4",
        'item-media-variant-image':
          'size-10 overflow-hidden rounded-lg group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 group-data-[size=xs]/item:rounded-md [&_img]:size-full [&_img]:object-cover',
        'item-content': 'gap-1 group-data-[size=xs]/item:gap-0.5',
        'item-title': 'gap-2 text-sm leading-snug font-medium underline-offset-4',
        'item-description': 'text-muted-foreground text-left text-sm',
        'item-actions': 'gap-2',
        'item-header': 'gap-2',
        'item-footer': 'gap-2',
        'item-group': 'gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        'item-separator': 'my-2',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        item: '[a]:hover:bg-muted rounded-none border text-xs',
        'item-variant-default': 'border-transparent',
        'item-variant-outline': 'border-border',
        'item-variant-muted': 'bg-muted/50 border-transparent',
        'item-size-default': 'gap-2.5 px-3 py-2.5',
        'item-size-sm': 'gap-2.5 px-3 py-2.5',
        'item-size-xs': 'gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
        'item-media':
          'gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start',
        'item-media-variant-default': 'bg-transparent',
        'item-media-variant-icon': "[&_svg:not([class*='size-'])]:size-4",
        'item-media-variant-image':
          'size-10 overflow-hidden rounded-none group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
        'item-content': 'gap-1 group-data-[size=xs]/item:gap-0',
        'item-title': 'gap-2 text-xs font-medium underline-offset-4',
        'item-description':
          'text-muted-foreground text-left text-xs/relaxed group-data-[size=xs]/item:text-xs/relaxed',
        'item-actions': 'gap-2',
        'item-header': 'gap-2',
        'item-footer': 'gap-2',
        'item-group': 'gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        'item-separator': 'my-2',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        item: '[a]:hover:bg-muted rounded-md border text-xs/relaxed',
        'item-variant-default': 'border-transparent',
        'item-variant-outline': 'border-border',
        'item-variant-muted': 'bg-muted/50 border-transparent',
        'item-size-default': 'gap-2.5 px-3 py-2.5',
        'item-size-sm': 'gap-2.5 px-3 py-2.5',
        'item-size-xs': 'gap-2.5 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
        'item-media':
          'gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start',
        'item-media-variant-default': 'bg-transparent',
        'item-media-variant-icon': "[&_svg:not([class*='size-'])]:size-4",
        'item-media-variant-image':
          'size-8 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
        'item-content': 'gap-1 group-data-[size=xs]/item:gap-0.5',
        'item-title': 'gap-2 text-xs/relaxed leading-snug font-medium underline-offset-4',
        'item-description': 'text-muted-foreground text-left text-xs/relaxed',
        'item-actions': 'gap-2',
        'item-header': 'gap-2',
        'item-footer': 'gap-2',
        'item-group': 'gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        'item-separator': 'my-2',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        item: '[a]:hover:bg-muted rounded-2xl border text-sm',
        'item-variant-default': 'border-transparent',
        'item-variant-outline': 'border-border',
        'item-variant-muted': 'bg-muted/50 border-transparent',
        'item-size-default': 'gap-3.5 px-4 py-3.5',
        'item-size-sm': 'gap-3.5 px-3.5 py-3',
        'item-size-xs': 'gap-2.5 px-3 py-2.5 in-data-[slot=dropdown-menu-content]:p-0',
        'item-media':
          'gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start',
        'item-media-variant-default': 'bg-transparent',
        'item-media-variant-icon': "[&_svg:not([class*='size-'])]:size-4",
        'item-media-variant-image':
          'size-10 overflow-hidden rounded-xl group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 group-data-[size=xs]/item:rounded-lg [&_img]:size-full [&_img]:object-cover',
        'item-content': 'gap-1 group-data-[size=xs]/item:gap-0.5',
        'item-title': 'gap-2 text-sm leading-snug font-medium underline-offset-4',
        'item-description': 'text-muted-foreground text-left text-sm',
        'item-actions': 'gap-2',
        'item-header': 'gap-2',
        'item-footer': 'gap-2',
        'item-group': 'gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        'item-separator': 'my-2',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        item: '[a]:hover:bg-muted rounded-none border text-sm',
        'item-variant-default': 'border-transparent',
        'item-variant-outline': 'border-border',
        'item-variant-muted': 'bg-muted/50 border-transparent',
        'item-size-default': 'gap-3.5 px-4 py-3.5',
        'item-size-sm': 'gap-3.5 px-3.5 py-3',
        'item-size-xs': 'gap-2.5 px-3 py-2.5 in-data-[slot=dropdown-menu-content]:p-0',
        'item-media':
          'gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start',
        'item-media-variant-default': 'bg-transparent',
        'item-media-variant-icon': "[&_svg:not([class*='size-'])]:size-4",
        'item-media-variant-image':
          'size-10 overflow-hidden rounded-none group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 group-data-[size=xs]/item:rounded-none [&_img]:size-full [&_img]:object-cover',
        'item-content': 'gap-1 group-data-[size=xs]/item:gap-0.5',
        'item-title': 'gap-2 text-xs leading-snug font-semibold uppercase underline-offset-4',
        'item-description': 'text-muted-foreground text-left text-sm leading-relaxed',
        'item-actions': 'gap-2',
        'item-header': 'gap-2',
        'item-footer': 'gap-2',
        'item-group': 'gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        'item-separator': 'my-2',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        item: '[a]:hover:bg-muted rounded-2xl border text-sm',
        'item-variant-default': 'border-transparent',
        'item-variant-outline': 'border-border',
        'item-variant-muted': 'bg-muted/50 border-transparent',
        'item-size-default': 'gap-3.5 px-4 py-3.5',
        'item-size-sm': 'gap-3.5 px-3.5 py-3',
        'item-size-xs': 'gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
        'item-media':
          'gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start',
        'item-media-variant-default': 'bg-transparent',
        'item-media-variant-icon': "[&_svg:not([class*='size-'])]:size-4",
        'item-media-variant-image':
          'size-10 overflow-hidden rounded-xl group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 group-data-[size=xs]/item:rounded-lg [&_img]:size-full [&_img]:object-cover',
        'item-content': 'gap-1 group-data-[size=xs]/item:gap-0.5',
        'item-title': 'gap-2 text-sm leading-snug font-medium underline-offset-4',
        'item-description': 'text-muted-foreground text-left text-sm',
        'item-actions': 'gap-2',
        'item-header': 'gap-2',
        'item-footer': 'gap-2',
        'item-group': 'gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        'item-separator': 'my-2',
      },
    },
  },
} as const;
