// Adapted from shadcn/ui (MIT). Reviewed input-group sources, state selectors and slots.
export const nativeInputGroupPresetSource = {
  upstream: {
    repository: 'https://github.com/shadcn-ui/ui',
    commit: '617134d5810bba521803b3ed787190bacbb80b35',
  },
  globals: {
    sha256: 'c5e271374236f23bcfd559ce64aaf6b8641ee7276156c0f803dd9cb24277af12',
    radius: { sm: 0.6, md: 0.8, lg: 1, xl: 1.4, '2xl': 1.8, '3xl': 2.2, '4xl': 2.6 },
  },
  sources: {
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
          defaultVariants: { align: 'inline-start' },
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
          defaultVariants: { size: 'xs' },
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
          defaultVariants: { align: 'inline-start' },
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
          defaultVariants: { size: 'xs' },
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
          defaultVariants: { align: 'inline-start' },
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
          defaultVariants: { size: 'xs' },
          compoundVariants: [],
        },
      },
    },
    default: {
      origin:
        'apps/v4/public/r/styles/default/input-group.json#registry/default/ui/input-group.tsx',
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
              'inline-start':
                'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
              'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]',
              'block-start':
                '[.border-b]:pb-3 order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5',
              'block-end':
                '[.border-t]:pt-3 order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5',
            },
          },
          defaultVariants: { align: 'inline-start' },
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
          defaultVariants: { size: 'xs' },
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
              'inline-start':
                'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
              'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]',
              'block-start':
                '[.border-b]:pb-3 order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5',
              'block-end':
                '[.border-t]:pt-3 order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5',
            },
          },
          defaultVariants: { align: 'inline-start' },
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
          defaultVariants: { size: 'xs' },
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
              'inline-start':
                'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
              'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]',
              'block-start':
                'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-3',
              'block-end':
                'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-3',
            },
          },
          defaultVariants: { align: 'inline-start' },
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
          defaultVariants: { size: 'xs' },
          compoundVariants: [],
        },
      },
    },
  },
  presets: {
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        base: 'border-input dark:bg-input/30 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 h-9 rounded-md border shadow-xs transition-[color,box-shadow] in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-3 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
        addon:
          "text-muted-foreground h-auto gap-2 py-1.5 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
        'addon-align-inline-start': 'pl-2 has-[>button]:-ml-1 has-[>kbd]:ml-[-0.15rem]',
        'addon-align-inline-end': 'pr-2 has-[>button]:-mr-1 has-[>kbd]:mr-[-0.15rem]',
        'addon-align-block-start':
          'px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2',
        'addon-align-block-end': 'px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2',
        button: 'gap-2 text-sm',
        'button-size-xs':
          "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        'button-size-icon-xs': 'size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0',
        'button-size-icon-sm': 'size-8 p-0 has-[>svg]:p-0',
        text: "text-muted-foreground gap-2 text-sm [&_svg:not([class*='size-'])]:size-4",
        input:
          'rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        textarea:
          'rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        'button-size-sm': '',
      },
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        base: 'border-input dark:bg-input/30 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-disabled:bg-input/50 dark:has-disabled:bg-input/80 h-8 rounded-lg border transition-colors in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-3 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
        addon:
          "text-muted-foreground h-auto gap-2 py-1.5 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
        'addon-align-inline-start': 'pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]',
        'addon-align-inline-end': 'pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]',
        'addon-align-block-start':
          'px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2',
        'addon-align-block-end': 'px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2',
        button: 'gap-2 text-sm',
        'button-size-xs':
          "h-6 gap-1 rounded-[calc(var(--radius)-3px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        'button-size-icon-xs': 'size-6 rounded-[calc(var(--radius)-3px)] p-0 has-[>svg]:p-0',
        'button-size-icon-sm': 'size-8 p-0 has-[>svg]:p-0',
        text: "text-muted-foreground gap-2 text-sm [&_svg:not([class*='size-'])]:size-4",
        input:
          'rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent',
        textarea:
          'rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent',
        'button-size-sm': '',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        base: 'border-input bg-input/30 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 h-9 rounded-4xl border transition-colors in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-data-[align=block-end]:rounded-2xl has-data-[align=block-start]:rounded-2xl has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot][aria-invalid=true]]:ring-[3px] has-[textarea]:rounded-xl has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
        addon:
          "text-muted-foreground **:data-[slot=kbd]:bg-muted-foreground/10 h-auto gap-2 py-2 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-4xl **:data-[slot=kbd]:px-1.5 [&>svg:not([class*='size-'])]:size-4",
        'addon-align-inline-start': 'pl-3 has-[>button]:-ml-1 has-[>kbd]:ml-[-0.15rem]',
        'addon-align-inline-end': 'pr-3 has-[>button]:-mr-1 has-[>kbd]:mr-[-0.15rem]',
        'addon-align-block-start': 'px-3 pt-3 group-has-[>input]/input-group:pt-3 [.border-b]:pb-3',
        'addon-align-block-end': 'px-3 pb-3 group-has-[>input]/input-group:pb-3 [.border-t]:pt-3',
        button: 'gap-2 rounded-4xl text-sm',
        'button-size-xs': "h-6 gap-1 px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        'button-size-icon-xs': 'size-6 p-0 has-[>svg]:p-0',
        'button-size-icon-sm': 'size-8 p-0 has-[>svg]:p-0',
        text: "text-muted-foreground gap-2 text-sm [&_svg:not([class*='size-'])]:size-4",
        input:
          'rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        textarea:
          'rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        'button-size-sm': '',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        base: 'border-input dark:bg-input/30 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-disabled:bg-input/50 dark:has-disabled:bg-input/80 h-8 rounded-none border transition-colors in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:ring-1 has-[[data-slot][aria-invalid=true]]:ring-1 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
        addon:
          "text-muted-foreground h-auto gap-2 py-1.5 text-xs font-medium group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-none [&>svg:not([class*='size-'])]:size-4",
        'addon-align-inline-start': 'pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]',
        'addon-align-inline-end': 'pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]',
        'addon-align-block-start':
          'px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2',
        'addon-align-block-end': 'px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2',
        button: 'gap-2 text-xs',
        'button-size-xs': "h-6 gap-1 rounded-none px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        'button-size-icon-xs': 'size-6 rounded-none p-0 has-[>svg]:p-0',
        'button-size-sm': 'gap-1',
        'button-size-icon-sm': 'size-7 p-0 has-[>svg]:p-0',
        text: "text-muted-foreground gap-2 text-xs [&_svg:not([class*='size-'])]:size-4",
        input:
          'rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent',
        textarea:
          'rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        base: 'border-input bg-input/20 dark:bg-input/30 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/30 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 h-7 rounded-md border transition-colors in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-data-[align=block-end]:rounded-md has-data-[align=block-start]:rounded-md has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot][aria-invalid=true]]:ring-2 has-[textarea]:rounded-md has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
        addon:
          "text-muted-foreground **:data-[slot=kbd]:bg-muted-foreground/10 h-auto gap-1 py-2 text-xs/relaxed font-medium group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-[calc(var(--radius-sm)-2px)] **:data-[slot=kbd]:px-1 **:data-[slot=kbd]:text-[0.625rem] [&>svg:not([class*='size-'])]:size-3.5",
        'addon-align-inline-start': 'pl-2 has-[>button]:ml-[-0.275rem] has-[>kbd]:ml-[-0.275rem]',
        'addon-align-inline-end': 'pr-2 has-[>button]:mr-[-0.275rem] has-[>kbd]:mr-[-0.275rem]',
        'addon-align-block-start': 'px-2 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2',
        'addon-align-block-end': 'px-2 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2',
        button: 'gap-2 rounded-md text-xs/relaxed',
        'button-size-xs':
          "h-5 gap-1 rounded-[calc(var(--radius-sm)-2px)] px-1 [&>svg:not([class*='size-'])]:size-3",
        'button-size-icon-xs': 'size-6 p-0 has-[>svg]:p-0',
        'button-size-sm': 'gap-1',
        'button-size-icon-sm': 'size-7 p-0 has-[>svg]:p-0',
        text: "text-muted-foreground gap-2 text-xs/relaxed [&_svg:not([class*='size-'])]:size-4",
        input:
          'rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        textarea:
          'rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        base: 'bg-input/50 border-transparent has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/30 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 h-9 rounded-4xl border transition-[color,box-shadow,background-color] in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-data-[align=block-end]:rounded-3xl has-data-[align=block-start]:rounded-3xl has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-3 has-[textarea]:rounded-2xl has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
        addon:
          "text-muted-foreground **:data-[slot=kbd]:bg-muted-foreground/10 h-auto gap-2 py-2 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-3xl **:data-[slot=kbd]:px-1.5 [&>svg:not([class*='size-'])]:size-4",
        'addon-align-inline-start': 'pl-3 has-[>button]:-ml-1 has-[>kbd]:-ml-1',
        'addon-align-inline-end': 'pr-3 has-[>button]:-mr-1 has-[>kbd]:-mr-1',
        'addon-align-block-start':
          'px-3 pt-3 group-has-[>input]/input-group:pt-3.5 [.border-b]:pb-3.5',
        'addon-align-block-end':
          'px-3 pb-3 group-has-[>input]/input-group:pb-3.5 [.border-t]:pt-3.5',
        button: 'gap-2 rounded-4xl text-sm',
        'button-size-xs': "h-6 gap-1 rounded-xl px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        'button-size-icon-xs': 'size-6 rounded-xl p-0 has-[>svg]:p-0',
        'button-size-icon-sm': 'size-8 p-0 has-[>svg]:p-0',
        text: "text-muted-foreground gap-2 text-sm [&_svg:not([class*='size-'])]:size-4",
        input:
          'rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        textarea:
          'rounded-none border-0 bg-transparent py-2.5 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        'button-size-sm': '',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        base: 'border-transparent border-b-input bg-transparent has-[[data-slot=input-group-control]:focus-visible]:border-b-ring has-[[data-slot][aria-invalid=true]]:border-b-destructive dark:has-[[data-slot][aria-invalid=true]]:border-b-destructive/50 h-10 rounded-none border transition-[color,border-color] in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-data-[align=block-end]:rounded-none has-data-[align=block-start]:rounded-none has-[textarea]:rounded-none has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3',
        addon:
          "text-muted-foreground **:data-[slot=kbd]:bg-muted-foreground/10 h-auto gap-2 py-2 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-none **:data-[slot=kbd]:px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        'addon-align-block-start': 'pt-3 group-has-[>input]/input-group:pt-3.5 [.border-b]:pb-3.5',
        'addon-align-block-end': 'pb-3 group-has-[>input]/input-group:pb-3.5 [.border-t]:pt-3.5',
        button: 'gap-2 rounded-none text-sm',
        'button-size-xs':
          "h-6 gap-1 rounded-none px-1.5 [&>svg:not([class*='size-'])]:size-3.5 text-xs",
        'button-size-icon-xs': 'size-6 p-0 has-[>svg]:p-0 text-xs',
        'button-size-icon-sm': 'size-8 p-0 has-[>svg]:p-0',
        text: "text-muted-foreground gap-2 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        input:
          'border-0 bg-transparent ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent group-has-[>[data-align=inline-start]]/input-group:pl-2 group-has-[>[data-align=inline-end]]/input-group:pr-2',
        textarea:
          'border-0 bg-transparent py-2.5 ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        'button-size-sm': '',
        'addon-align-inline-start': '',
        'addon-align-inline-end': '',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        base: 'bg-input/50 border-transparent has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/30 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 h-8 rounded-2xl border transition-[color,box-shadow] duration-200 in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-3 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
        addon:
          "text-muted-foreground **:data-[slot=kbd]:bg-muted-foreground/10 h-auto gap-2 py-1.5 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-2xl **:data-[slot=kbd]:px-1.5 [&>svg:not([class*='size-'])]:size-4",
        'addon-align-inline-start': 'pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]',
        'addon-align-inline-end': 'pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]',
        'addon-align-block-start':
          'px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2',
        'addon-align-block-end': 'px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2',
        button: 'gap-2 rounded-2xl text-sm',
        'button-size-xs': "h-6 gap-1 rounded-xl px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        'button-size-icon-xs': 'size-6 rounded-xl p-0 has-[>svg]:p-0',
        'button-size-icon-sm': 'size-8 p-0 has-[>svg]:p-0',
        text: "text-muted-foreground gap-2 text-sm [&_svg:not([class*='size-'])]:size-4",
        input:
          'rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        textarea:
          'rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        'button-size-sm': '',
      },
    },
  },
} as const;
