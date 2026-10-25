// Adapted from shadcn/ui (MIT). Source CSS and global formulas remain pinned in the official inventory.
export const nativeButtonPresetSource = {
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
        base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-md border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-4",
        'variant-default': 'bg-primary text-primary-foreground hover:bg-primary/80',
        'variant-outline':
          'border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground shadow-xs',
        'variant-secondary':
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        'variant-ghost':
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-destructive':
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
        'size-xs':
          "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        'size-sm':
          'h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
        'size-default':
          'h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'size-lg':
          'h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'size-icon-xs':
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        'size-icon-sm':
          'size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md',
        'size-icon': 'size-9',
        'size-icon-lg': 'size-10',
      },
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-4",
        'variant-default': 'bg-primary text-primary-foreground hover:bg-primary/80',
        'variant-outline':
          'border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-secondary':
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        'variant-ghost':
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-destructive':
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
        'size-xs':
          "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        'size-sm':
          "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        'size-default':
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'size-lg':
          'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'size-icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'size-icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'size-icon': 'size-8',
        'size-icon-lg': 'size-9',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-4xl border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-4",
        'variant-default': 'bg-primary text-primary-foreground hover:bg-primary/80',
        'variant-outline':
          'border-border bg-input/30 hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-secondary':
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        'variant-ghost':
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-destructive':
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
        'size-xs':
          "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        'size-sm':
          'h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'size-default':
          'h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        'size-lg':
          'h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        'size-icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'size-icon-sm': 'size-8',
        'size-icon': 'size-9',
        'size-icon-lg': 'size-10',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-none border border-transparent bg-clip-padding text-xs font-medium focus-visible:ring-1 aria-invalid:ring-1 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-4",
        'variant-default': 'bg-primary text-primary-foreground hover:bg-primary/80',
        'variant-outline':
          'border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-secondary':
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        'variant-ghost':
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-destructive':
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
        'size-xs':
          "h-6 gap-1 rounded-none px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        'size-sm':
          "h-7 gap-1 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        'size-default':
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'size-lg':
          'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'size-icon-xs': "size-6 rounded-none [&_svg:not([class*='size-'])]:size-3",
        'size-icon-sm': 'size-7 rounded-none',
        'size-icon': 'size-8',
        'size-icon-lg': 'size-9',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        base: "focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-md border border-transparent bg-clip-padding text-xs/relaxed font-medium focus-visible:ring-2 aria-invalid:ring-2 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-4",
        'variant-default': 'bg-primary text-primary-foreground hover:bg-primary/80',
        'variant-outline':
          'border-border dark:bg-input/30 hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-secondary':
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        'variant-ghost':
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-destructive':
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
        'size-xs':
          "h-5 gap-1 rounded-sm px-2 text-[0.625rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-2.5",
        'size-sm':
          "h-6 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        'size-default':
          "h-7 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        'size-lg':
          "h-8 gap-1 px-2.5 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        'size-icon-xs': "size-5 rounded-sm [&_svg:not([class*='size-'])]:size-2.5",
        'size-icon-sm': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'size-icon': "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        'size-icon-lg': "size-8 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        base: "focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-4xl border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-4",
        'variant-default': 'bg-primary text-primary-foreground hover:bg-primary/80',
        'variant-outline':
          'border-border bg-background dark:bg-transparent hover:bg-muted hover:text-foreground dark:hover:bg-input/30 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-secondary':
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        'variant-ghost':
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-destructive':
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
        'size-xs':
          "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        'size-sm':
          'h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'size-default':
          'h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        'size-lg':
          'h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        'size-icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'size-icon-sm': 'size-8',
        'size-icon': 'size-9',
        'size-icon-lg': 'size-10',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        base: "focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-none border border-transparent bg-clip-padding text-xs font-semibold uppercase tracking-widest focus-visible:ring-2 aria-invalid:ring-2 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-3.5",
        'variant-default': 'bg-primary text-primary-foreground hover:bg-primary/80',
        'variant-outline':
          'border-border bg-transparent hover:bg-muted hover:text-foreground dark:hover:bg-input/30 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-secondary':
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        'variant-ghost':
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-destructive':
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        'variant-link': 'text-primary underline-offset-4 hover:underline underline',
        'size-xs':
          "h-7 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        'size-sm':
          'h-9 gap-1 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        'size-default':
          'h-10 gap-1.5 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        'size-lg':
          'h-11 gap-1.5 px-8 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5',
        'size-icon-xs': "size-7 [&_svg:not([class*='size-'])]:size-3",
        'size-icon-sm': 'size-9',
        'size-icon': 'size-10',
        'size-icon-lg': 'size-11',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        base: "focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-2xl border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-4",
        'variant-default': 'bg-primary text-primary-foreground hover:bg-primary/80',
        'variant-outline':
          'border-border bg-background dark:bg-transparent hover:bg-muted hover:text-foreground dark:hover:bg-input/30 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-secondary':
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        'variant-ghost':
          'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        'variant-destructive':
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        'variant-link': 'text-primary underline-offset-4 hover:underline',
        'size-xs':
          "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        'size-sm':
          'h-7 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'size-default':
          'h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        'size-lg':
          'h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        'size-icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'size-icon-sm': 'size-7',
        'size-icon': 'size-8',
        'size-icon-lg': 'size-9',
      },
    },
  },
  classRecipes: {
    base: {
      origin: 'apps/v4/registry/bases/base/ui/button.tsx',
      sha256: '74f982d7ad7a764e3c95a519fc063a671e66ad758ea31dc89d747838e20c2487',
      recipe: {
        base: 'cn-button group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants: {
          variant: {
            default: 'cn-button-variant-default',
            outline: 'cn-button-variant-outline',
            secondary: 'cn-button-variant-secondary',
            ghost: 'cn-button-variant-ghost',
            destructive: 'cn-button-variant-destructive',
            link: 'cn-button-variant-link',
          },
          size: {
            default: 'cn-button-size-default',
            xs: 'cn-button-size-xs',
            sm: 'cn-button-size-sm',
            lg: 'cn-button-size-lg',
            icon: 'cn-button-size-icon',
            'icon-xs': 'cn-button-size-icon-xs',
            'icon-sm': 'cn-button-size-icon-sm',
            'icon-lg': 'cn-button-size-icon-lg',
          },
        },
        defaultVariants: { variant: 'default', size: 'default' },
        compoundVariants: [],
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/button.tsx',
      sha256: '76c6abdf94fae4085fd6c50c97c7a99ec21240af187c63ea4b2e71551d33495f',
      recipe: {
        base: 'cn-button group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants: {
          variant: {
            default: 'cn-button-variant-default',
            outline: 'cn-button-variant-outline',
            secondary: 'cn-button-variant-secondary',
            ghost: 'cn-button-variant-ghost',
            destructive: 'cn-button-variant-destructive',
            link: 'cn-button-variant-link',
          },
          size: {
            default: 'cn-button-size-default',
            xs: 'cn-button-size-xs',
            sm: 'cn-button-size-sm',
            lg: 'cn-button-size-lg',
            icon: 'cn-button-size-icon',
            'icon-xs': 'cn-button-size-icon-xs',
            'icon-sm': 'cn-button-size-icon-sm',
            'icon-lg': 'cn-button-size-icon-lg',
          },
        },
        defaultVariants: { variant: 'default', size: 'default' },
        compoundVariants: [],
      },
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/button.tsx',
      sha256: '8bcff6f70522e6e6cb0ff67f050830ea1a93596403d2d9b035f3b543c7a42e2c',
      recipe: {
        base: 'cn-button group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variants: {
          variant: {
            default: 'cn-button-variant-default',
            outline: 'cn-button-variant-outline',
            secondary: 'cn-button-variant-secondary',
            ghost: 'cn-button-variant-ghost',
            destructive: 'cn-button-variant-destructive',
            link: 'cn-button-variant-link',
          },
          size: {
            default: 'cn-button-size-default',
            xs: 'cn-button-size-xs',
            sm: 'cn-button-size-sm',
            lg: 'cn-button-size-lg',
            icon: 'cn-button-size-icon',
            'icon-xs': 'cn-button-size-icon-xs',
            'icon-sm': 'cn-button-size-icon-sm',
            'icon-lg': 'cn-button-size-icon-lg',
          },
        },
        defaultVariants: { variant: 'default', size: 'default' },
        compoundVariants: [],
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/button.json#registry/default/ui/button.tsx',
      sha256: '415ccc47cf69a2a87db699cc6da7f1fdcb799a1f40dab3a6220d91ac8da8abbe',
      recipe: {
        base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        variants: {
          variant: {
            default: 'bg-primary text-primary-foreground hover:bg-primary/90',
            destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            outline:
              'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            ghost: 'hover:bg-accent hover:text-accent-foreground',
            link: 'text-primary underline-offset-4 hover:underline',
          },
          size: {
            default: 'h-10 px-4 py-2',
            sm: 'h-9 rounded-md px-3',
            lg: 'h-11 rounded-md px-8',
            icon: 'h-10 w-10',
          },
        },
        defaultVariants: { variant: 'default', size: 'default' },
        compoundVariants: [],
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/button.json#registry/new-york/ui/button.tsx',
      sha256: 'c2b999a96781e6c932632bd089095368e973bf5602e1b1a62156b7d2b43f1e84',
      recipe: {
        base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        variants: {
          variant: {
            default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
            destructive:
              'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
            outline:
              'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
            secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
            ghost: 'hover:bg-accent hover:text-accent-foreground',
            link: 'text-primary underline-offset-4 hover:underline',
          },
          size: {
            default: 'h-9 px-4 py-2',
            sm: 'h-8 rounded-md px-3 text-xs',
            lg: 'h-10 rounded-md px-8',
            icon: 'h-9 w-9',
          },
        },
        defaultVariants: { variant: 'default', size: 'default' },
        compoundVariants: [],
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/button.tsx',
      sha256: '79dd6f75f8136394442202d6b8b922fb269eaad0a5dba579397c9d5b41f893bb',
      recipe: {
        base: "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variants: {
          variant: {
            default: 'bg-primary text-primary-foreground hover:bg-primary/90',
            destructive:
              'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
            outline:
              'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
            link: 'text-primary underline-offset-4 hover:underline',
          },
          size: {
            default: 'h-9 px-4 py-2 has-[>svg]:px-3',
            xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
            sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
            lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
            icon: 'size-9',
            'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
            'icon-sm': 'size-8',
            'icon-lg': 'size-10',
          },
        },
        defaultVariants: { variant: 'default', size: 'default' },
        compoundVariants: [],
      },
    },
  },
} as const;
