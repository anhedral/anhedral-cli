// Adapted from shadcn/ui (MIT). Reviewed Alert source slots, CVA variants and styles.
export const nativeAlertPresetSource = {
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
      origin: 'apps/v4/registry/bases/aria/ui/alert.tsx',
      sha256: '639c846b57885d8af4dbdf7ddab7b15fd4d392c051f7496c67e811154e7861d9',
      slots: {
        Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
        AlertTitle: [
          {
            tag: 'div',
            classes:
              'cn-alert-title [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
          },
        ],
        AlertDescription: [
          {
            tag: 'div',
            classes:
              'cn-alert-description [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
          },
        ],
        AlertAction: [{ tag: 'div', classes: 'cn-alert-action' }],
      },
      recipes: {
        alertVariants: {
          base: 'cn-alert group/alert relative w-full',
          variants: {
            variant: {
              default: 'cn-alert-variant-default',
              destructive: 'cn-alert-variant-destructive',
            },
          },
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
    base: {
      origin: 'apps/v4/registry/bases/base/ui/alert.tsx',
      sha256: '639c846b57885d8af4dbdf7ddab7b15fd4d392c051f7496c67e811154e7861d9',
      slots: {
        Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
        AlertTitle: [
          {
            tag: 'div',
            classes:
              'cn-alert-title [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
          },
        ],
        AlertDescription: [
          {
            tag: 'div',
            classes:
              'cn-alert-description [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
          },
        ],
        AlertAction: [{ tag: 'div', classes: 'cn-alert-action' }],
      },
      recipes: {
        alertVariants: {
          base: 'cn-alert group/alert relative w-full',
          variants: {
            variant: {
              default: 'cn-alert-variant-default',
              destructive: 'cn-alert-variant-destructive',
            },
          },
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/alert.json#registry/default/ui/alert.tsx',
      sha256: 'ed78a053a9db783f48d5dfab7398b630f87c17ed2e237b6f30a3eb153675960c',
      slots: {
        Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
        AlertTitle: [{ tag: 'h5', classes: 'mb-1 font-medium leading-none tracking-tight' }],
        AlertDescription: [{ tag: 'div', classes: 'text-sm [&_p]:leading-relaxed' }],
      },
      recipes: {
        alertVariants: {
          base: 'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
          variants: {
            variant: {
              default: 'bg-background text-foreground',
              destructive:
                'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
            },
          },
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/alert.json#registry/new-york/ui/alert.tsx',
      sha256: '5950ac01377e7eedc94b00eb3fee678745e4cc1a72b5343867f0733d07db6660',
      slots: {
        Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
        AlertTitle: [{ tag: 'h5', classes: 'mb-1 font-medium leading-none tracking-tight' }],
        AlertDescription: [{ tag: 'div', classes: 'text-sm [&_p]:leading-relaxed' }],
      },
      recipes: {
        alertVariants: {
          base: 'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
          variants: {
            variant: {
              default: 'bg-background text-foreground',
              destructive:
                'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
            },
          },
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/alert.tsx',
      sha256: 'd03dcae5cdb63c381c1144ca9a0c49ba0e46466967d7deb94662034042acb034',
      slots: {
        Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
        AlertTitle: [
          { tag: 'div', classes: 'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight' },
        ],
        AlertDescription: [
          {
            tag: 'div',
            classes:
              'col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
          },
        ],
      },
      recipes: {
        alertVariants: {
          base: 'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
          variants: {
            variant: {
              default: 'bg-card text-card-foreground',
              destructive:
                'bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current',
            },
          },
          defaultVariants: { variant: 'default' },
          compoundVariants: [],
        },
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/alert.tsx',
      sha256: '639c846b57885d8af4dbdf7ddab7b15fd4d392c051f7496c67e811154e7861d9',
      slots: {
        Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
        AlertTitle: [
          {
            tag: 'div',
            classes:
              'cn-alert-title [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
          },
        ],
        AlertDescription: [
          {
            tag: 'div',
            classes:
              'cn-alert-description [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
          },
        ],
        AlertAction: [{ tag: 'div', classes: 'cn-alert-action' }],
      },
      recipes: {
        alertVariants: {
          base: 'cn-alert group/alert relative w-full',
          variants: {
            variant: {
              default: 'cn-alert-variant-default',
              destructive: 'cn-alert-variant-destructive',
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
        alert:
          "grid gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
        'alert-variant-default': 'bg-card text-card-foreground',
        'alert-variant-destructive':
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
        'alert-title': 'font-medium group-has-[>svg]/alert:col-start-2',
        'alert-description':
          'text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4',
        'alert-action': 'absolute top-2 right-2',
      },
    },
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        alert:
          "grid gap-0.5 rounded-lg border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
        'alert-variant-default': 'bg-card text-card-foreground',
        'alert-variant-destructive':
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
        'alert-title': 'font-medium group-has-[>svg]/alert:col-start-2',
        'alert-description':
          'text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4',
        'alert-action': 'absolute top-2.5 right-3',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        alert:
          "grid gap-0.5 rounded-lg border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
        'alert-variant-default': 'bg-card text-card-foreground',
        'alert-variant-destructive':
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
        'alert-title': 'font-medium group-has-[>svg]/alert:col-start-2',
        'alert-description':
          'text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4',
        'alert-action': 'absolute top-2.5 right-3',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        alert:
          "grid gap-0.5 rounded-none border px-2.5 py-2 text-left text-xs has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
        'alert-variant-default': 'bg-card text-card-foreground',
        'alert-variant-destructive':
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
        'alert-title': 'font-medium group-has-[>svg]/alert:col-start-2',
        'alert-description':
          'text-muted-foreground text-xs/relaxed text-balance md:text-pretty [&_p:not(:last-child)]:mb-2',
        'alert-action': 'absolute top-[calc(--spacing(1.25))] right-[calc(--spacing(1.25))]',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        alert:
          "grid gap-0.5 rounded-lg border px-2 py-1.5 text-left text-xs/relaxed has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-1.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-3.5",
        'alert-variant-default': 'bg-card text-card-foreground',
        'alert-variant-destructive':
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
        'alert-title': 'font-medium group-has-[>svg]/alert:col-start-2',
        'alert-description':
          'text-muted-foreground text-xs/relaxed text-balance md:text-pretty [&_p:not(:last-child)]:mb-4',
        'alert-action': 'absolute top-1.5 right-2',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        alert:
          "grid gap-0.5 rounded-2xl border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
        'alert-variant-default': 'bg-card text-card-foreground',
        'alert-variant-destructive':
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
        'alert-title': 'font-medium group-has-[>svg]/alert:col-start-2',
        'alert-description':
          'text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4',
        'alert-action': 'absolute top-2.5 right-3',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        alert:
          "grid gap-1 bg-background border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 relative after:-inset-y-px after:-left-px after:w-0.5 after:absolute",
        'alert-variant-default': 'bg-card text-card-foreground after:bg-foreground',
        'alert-variant-destructive':
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current after:bg-destructive',
        'alert-title': 'font-semibold group-has-[>svg]/alert:col-start-2 text-sm',
        'alert-description':
          'text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4',
        'alert-action': 'absolute top-2.5 right-3',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        alert:
          "grid gap-0.5 rounded-2xl border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
        'alert-variant-default': 'bg-card text-card-foreground',
        'alert-variant-destructive':
          'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
        'alert-title': 'font-medium group-has-[>svg]/alert:col-start-2',
        'alert-description':
          'text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4',
        'alert-action': 'absolute top-2.5 right-3',
      },
    },
  },
} as const;
