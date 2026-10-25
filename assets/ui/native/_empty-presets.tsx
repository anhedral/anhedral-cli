// Adapted from shadcn/ui (MIT). Reviewed Empty source slots, media variants and styles.
export const nativeEmptyPresetSource = {
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
        EmptyHeader: [
          { tag: 'div', classes: 'cn-empty-header flex max-w-sm flex-col items-center' },
        ],
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
        EmptyHeader: [
          { tag: 'div', classes: 'cn-empty-header flex max-w-sm flex-col items-center' },
        ],
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
            classes:
              'flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm',
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
            classes:
              'flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm',
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
            classes:
              'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
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
        EmptyHeader: [
          { tag: 'div', classes: 'cn-empty-header flex max-w-sm flex-col items-center' },
        ],
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
  },
  presets: {
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        empty: 'gap-4 rounded-xl border-dashed p-6',
        'empty-header': 'gap-2',
        'empty-media': 'mb-2',
        'empty-media-default': 'bg-transparent',
        'empty-media-icon':
          "bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-4",
        'empty-title': 'text-sm font-medium tracking-tight',
        'empty-description': 'text-sm/relaxed',
        'empty-content': 'gap-2.5 text-sm',
      },
    },
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        empty: 'gap-4 rounded-lg border-dashed p-12',
        'empty-header': 'gap-2',
        'empty-media': 'mb-2',
        'empty-media-default': 'bg-transparent',
        'empty-media-icon':
          "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
        'empty-title': 'text-lg font-medium tracking-tight',
        'empty-description': 'text-sm/relaxed',
        'empty-content': 'gap-4 text-sm',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        empty: 'gap-4 rounded-lg border-dashed p-12',
        'empty-header': 'gap-2',
        'empty-media': 'mb-2',
        'empty-media-default': 'bg-transparent',
        'empty-media-icon':
          "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
        'empty-title': 'text-lg font-medium tracking-tight',
        'empty-description': 'text-sm/relaxed',
        'empty-content': 'gap-4 text-sm',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        empty: 'gap-4 rounded-none border-dashed p-6',
        'empty-header': 'gap-2',
        'empty-media': 'mb-2',
        'empty-media-default': 'bg-transparent',
        'empty-media-icon':
          "bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-none [&_svg:not([class*='size-'])]:size-4",
        'empty-title': 'text-sm font-medium',
        'empty-description': 'text-xs/relaxed',
        'empty-content': 'gap-2.5 text-xs',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        empty: 'gap-4 rounded-xl border-dashed p-6',
        'empty-header': 'gap-1',
        'empty-media': 'mb-2',
        'empty-media-default': 'bg-transparent',
        'empty-media-icon':
          "bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-md [&_svg:not([class*='size-'])]:size-4",
        'empty-title': 'text-sm font-medium tracking-tight',
        'empty-description': 'text-xs/relaxed',
        'empty-content': 'gap-2 text-xs/relaxed',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        empty: 'gap-4 rounded-2xl border-dashed p-12',
        'empty-header': 'gap-2',
        'empty-media': 'mb-2',
        'empty-media-default': 'bg-transparent',
        'empty-media-icon':
          "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg:not([class*='size-'])]:size-5",
        'empty-title': 'text-lg font-medium tracking-tight',
        'empty-description': 'text-sm/relaxed',
        'empty-content': 'gap-4 text-sm',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        empty: 'gap-4 border-dashed p-12',
        'empty-header': 'gap-2',
        'empty-media': 'mb-2',
        'empty-media-default': 'bg-transparent',
        'empty-media-icon':
          "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-none [&_svg:not([class*='size-'])]:size-5",
        'empty-title': 'text-lg font-semibold tracking-wider uppercase',
        'empty-description': 'text-sm/relaxed mt-0.5',
        'empty-content': 'gap-4 text-sm',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        empty: 'gap-4 rounded-3xl border-dashed p-12',
        'empty-header': 'gap-2',
        'empty-media': 'mb-2',
        'empty-media-default': 'bg-transparent',
        'empty-media-icon':
          "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg:not([class*='size-'])]:size-5",
        'empty-title': 'text-lg font-medium tracking-tight',
        'empty-description': 'text-sm/relaxed',
        'empty-content': 'gap-4 text-sm',
      },
    },
  },
} as const;
