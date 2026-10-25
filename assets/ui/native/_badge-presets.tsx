// Adapted from shadcn/ui (MIT). Source CSS and global formulas remain pinned in the official inventory.
export const nativeBadgePresetSource = {
  upstream: {
    repository: 'https://github.com/shadcn-ui/ui',
    commit: '617134d5810bba521803b3ed787190bacbb80b35',
  },
  globals: {
    sha256: 'c5e271374236f23bcfd559ce64aaf6b8641ee7276156c0f803dd9cb24277af12',
    radius: { sm: 0.6, md: 0.8, lg: 1, xl: 1.4, '2xl': 1.8, '3xl': 2.2, '4xl': 2.6 },
  },
  presets: {
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        base: 'h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3!',
        'variant-default': 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        'variant-secondary': 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        'variant-outline':
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        'variant-destructive':
          'bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20',
        'variant-ghost': 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
      },
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        base: 'h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3!',
        'variant-default': 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        'variant-secondary': 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        'variant-outline':
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        'variant-destructive':
          'bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20',
        'variant-ghost': 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        base: 'h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3!',
        'variant-default': 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        'variant-secondary': 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        'variant-outline':
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground bg-input/30',
        'variant-destructive':
          'bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20',
        'variant-ghost': 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        base: 'h-5 gap-1 rounded-none border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3!',
        'variant-default': 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        'variant-secondary': 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        'variant-outline':
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        'variant-destructive':
          'bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20',
        'variant-ghost': 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        base: 'h-5 gap-1 rounded-full border border-transparent px-2 py-0.5 text-[0.625rem] font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-2.5!',
        'variant-default': 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        'variant-secondary': 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        'variant-outline':
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground bg-input/20 dark:bg-input/30',
        'variant-destructive':
          'bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20',
        'variant-ghost': 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        base: 'h-5 gap-1 rounded-3xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3!',
        'variant-default': 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        'variant-secondary': 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        'variant-outline':
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        'variant-destructive':
          'bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20',
        'variant-ghost': 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        base: 'gap-1.5 rounded-none border-0 bg-transparent px-0 py-0 text-[0.625rem] font-semibold uppercase tracking-widest transition-colors has-data-[icon=inline-end]:pr-0 has-data-[icon=inline-start]:pl-0 [&>svg]:size-3!',
        'variant-default': 'text-foreground [a]:hover:text-foreground/70',
        'variant-secondary': 'text-muted-foreground [a]:hover:text-foreground',
        'variant-outline': 'text-foreground [a]:hover:text-foreground/70',
        'variant-destructive':
          'text-destructive [a]:hover:text-destructive/70 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        'variant-ghost': 'text-muted-foreground hover:text-foreground',
        'variant-link': 'text-foreground underline-offset-4 hover:underline',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        base: 'h-5 gap-1 rounded-2xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3!',
        'variant-default': 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        'variant-secondary': 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        'variant-outline':
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        'variant-destructive':
          'bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20',
        'variant-ghost': 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
      },
    },
  },
  classRecipes: {
    base: {
      origin: 'apps/v4/registry/bases/base/ui/badge.tsx',
      sha256: 'cad65ac68df79093dc7e9655a94cc60011a2f82b45fc42a0ad74a6e6323c4389',
      recipe: {
        base: 'cn-badge group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none',
        variants: {
          variant: {
            default: 'cn-badge-variant-default',
            secondary: 'cn-badge-variant-secondary',
            destructive: 'cn-badge-variant-destructive',
            outline: 'cn-badge-variant-outline',
            ghost: 'cn-badge-variant-ghost',
            link: 'cn-badge-variant-link',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/badge.tsx',
      sha256: '7e3d99527690ba61aaa540c8305d5e148285907690c6c8e6caec589ad11bb3c8',
      recipe: {
        base: 'cn-badge group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none',
        variants: {
          variant: {
            default: 'cn-badge-variant-default',
            secondary: 'cn-badge-variant-secondary',
            destructive: 'cn-badge-variant-destructive',
            outline: 'cn-badge-variant-outline',
            ghost: 'cn-badge-variant-ghost',
            link: 'cn-badge-variant-link',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/badge.tsx',
      sha256: '7771524b64abcdf8dd0d1a0dad02ae5dd78b6865ec69be6d19ff204e73302c64',
      recipe: {
        base: 'cn-badge group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none',
        variants: {
          variant: {
            default: 'cn-badge-variant-default',
            secondary: 'cn-badge-variant-secondary',
            destructive: 'cn-badge-variant-destructive',
            outline: 'cn-badge-variant-outline',
            ghost: 'cn-badge-variant-ghost',
            link: 'cn-badge-variant-link',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/badge.json#registry/default/ui/badge.tsx',
      sha256: 'db977d821af56ae3fb7952182d9c0a076a10c75c38bc2d2b000827e720423d32',
      recipe: {
        base: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variants: {
          variant: {
            default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
            secondary:
              'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
            destructive:
              'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
            outline: 'text-foreground',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/badge.json#registry/new-york/ui/badge.tsx',
      sha256: 'dab689d836ad3292b41e7f4986b4e68e5d45c6903e4aeaae8972a82d4aebec29',
      recipe: {
        base: 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variants: {
          variant: {
            default:
              'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
            secondary:
              'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
            destructive:
              'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
            outline: 'text-foreground',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/badge.tsx',
      sha256: '13a9380dfff853ee730c14a52df49f22aecd31f40f2998d7c1e7ec458b6e1650',
      recipe: {
        base: 'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3',
        variants: {
          variant: {
            default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
            secondary: 'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
            destructive:
              'bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90',
            outline:
              'border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
            ghost: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
            link: 'text-primary underline-offset-4 [a&]:hover:underline',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
} as const;
