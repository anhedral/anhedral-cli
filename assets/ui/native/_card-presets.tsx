// Adapted from shadcn/ui (MIT). Source CSS and global formulas remain pinned in the official inventory.
export const nativeCardPresetSource = {
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
        base: 'ring-foreground/10 bg-card text-card-foreground gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm shadow-xs ring-1 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
        header: 'gap-1 rounded-t-xl px-(--card-spacing) [.border-b]:pb-(--card-spacing)',
        title: 'text-base leading-normal font-medium group-data-[size=sm]/card:text-sm',
        description: 'text-muted-foreground text-sm',
        content: 'px-(--card-spacing)',
        footer: 'rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
      },
      spacing: { default: 24, sm: 16 },
      choices: 'flex flex-col gap-3',
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        base: 'ring-foreground/10 bg-card text-card-foreground gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm ring-1 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
        header: 'gap-1 rounded-t-xl px-(--card-spacing) [.border-b]:pb-(--card-spacing)',
        title: 'text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
        description: 'text-muted-foreground text-sm',
        content: 'px-(--card-spacing)',
        footer: 'bg-muted/50 rounded-b-xl border-t p-(--card-spacing)',
      },
      spacing: { default: 16, sm: 12 },
      choices: '',
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        base: 'ring-foreground/10 bg-card text-card-foreground gap-(--card-spacing) overflow-hidden rounded-2xl py-(--card-spacing) text-sm ring-1 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
        header: 'gap-2 rounded-t-xl px-(--card-spacing) [.border-b]:pb-(--card-spacing)',
        title: 'text-base font-medium',
        description: 'text-muted-foreground text-sm',
        content: 'px-(--card-spacing)',
        footer: 'rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
      },
      spacing: { default: 24, sm: 16 },
      choices: '',
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        base: 'ring-foreground/10 bg-card text-card-foreground gap-(--card-spacing) overflow-hidden rounded-none py-(--card-spacing) text-xs/relaxed ring-1 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none',
        header: 'gap-1 rounded-none px-(--card-spacing) [.border-b]:pb-(--card-spacing)',
        title: 'text-sm font-medium group-data-[size=sm]/card:text-sm',
        description: 'text-muted-foreground text-xs/relaxed',
        content: 'px-(--card-spacing)',
        footer: 'rounded-none border-t p-(--card-spacing)',
      },
      spacing: { default: 16, sm: 12 },
      choices: '',
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        base: 'ring-foreground/10 bg-card text-card-foreground gap-(--card-spacing) overflow-hidden rounded-lg py-(--card-spacing) text-xs/relaxed ring-1 [--card-spacing:--spacing(4)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg',
        header: 'gap-1 rounded-t-lg px-(--card-spacing) [.border-b]:pb-(--card-spacing)',
        title: 'text-sm font-medium',
        description: 'text-muted-foreground text-xs/relaxed',
        content: 'px-(--card-spacing)',
        footer: 'rounded-b-lg px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
      },
      spacing: { default: 16, sm: 12 },
      choices: '',
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        base: 'bg-card text-card-foreground ring-foreground/5 dark:ring-foreground/10 gap-(--card-spacing) overflow-hidden rounded-4xl py-(--card-spacing) text-sm shadow-md ring-1 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-4xl *:[img:last-child]:rounded-b-4xl',
        header: 'gap-1.5 rounded-t-4xl px-(--card-spacing) [.border-b]:pb-(--card-spacing)',
        title: 'text-base font-medium',
        description: 'text-muted-foreground text-sm',
        content: 'px-(--card-spacing)',
        footer: 'rounded-b-4xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
      },
      spacing: { default: 24, sm: 16 },
      choices: '',
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        base: 'bg-card text-card-foreground ring-foreground/5 gap-(--card-spacing) overflow-hidden py-(--card-spacing) text-sm shadow-sm ring-1 [--card-spacing:--spacing(8)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(5)] *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none',
        header: 'gap-1.5 rounded-none px-(--card-spacing) [.border-b]:pb-(--card-spacing)',
        title: 'text-lg font-semibold tracking-wider uppercase',
        description: 'text-muted-foreground text-sm leading-relaxed',
        content: 'px-(--card-spacing)',
        footer: 'px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
      },
      spacing: { default: 32, sm: 20 },
      choices: '',
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        base: 'bg-card text-card-foreground ring-foreground/5 dark:ring-foreground/10 gap-(--card-spacing) overflow-hidden rounded-[min(var(--radius-4xl),24px)] py-(--card-spacing) text-sm shadow-sm ring-1 [--card-spacing:--spacing(5)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-[min(var(--radius-4xl),24px)] *:[img:last-child]:rounded-b-[min(var(--radius-4xl),24px)]',
        header:
          'gap-1.5 rounded-t-[min(var(--radius-4xl),24px)] px-(--card-spacing) [.border-b]:pb-(--card-spacing)',
        title: 'text-base font-medium',
        description: 'text-muted-foreground text-sm',
        content: 'px-(--card-spacing)',
        footer:
          'rounded-b-[min(var(--radius-4xl),24px)] px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
      },
      spacing: { default: 20, sm: 16 },
      choices: '',
    },
  },
  definitions: {
    base: {
      origin: 'apps/v4/registry/bases/base/ui/card.tsx',
      sha256: '0d525c03e086b0047f7c0700850281023359cfc020eb233fdb0d74ec870ebea0',
      slots: {
        Card: 'cn-card group/card flex flex-col',
        CardHeader:
          'cn-card-header group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
        CardTitle: 'cn-card-title cn-font-heading',
        CardDescription: 'cn-card-description',
        CardAction: 'cn-card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        CardContent: 'cn-card-content',
        CardFooter: 'cn-card-footer flex items-center',
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/card.tsx',
      sha256: '0d525c03e086b0047f7c0700850281023359cfc020eb233fdb0d74ec870ebea0',
      slots: {
        Card: 'cn-card group/card flex flex-col',
        CardHeader:
          'cn-card-header group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
        CardTitle: 'cn-card-title cn-font-heading',
        CardDescription: 'cn-card-description',
        CardAction: 'cn-card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        CardContent: 'cn-card-content',
        CardFooter: 'cn-card-footer flex items-center',
      },
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/card.tsx',
      sha256: '0d525c03e086b0047f7c0700850281023359cfc020eb233fdb0d74ec870ebea0',
      slots: {
        Card: 'cn-card group/card flex flex-col',
        CardHeader:
          'cn-card-header group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
        CardTitle: 'cn-card-title cn-font-heading',
        CardDescription: 'cn-card-description',
        CardAction: 'cn-card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        CardContent: 'cn-card-content',
        CardFooter: 'cn-card-footer flex items-center',
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/card.json#registry/default/ui/card.tsx',
      sha256: '69afcf9c8e58ca6c3acf43c5b1ec9186bb6c88952f0ff49345dd2666f93d5480',
      slots: {
        Card: 'rounded-lg border bg-card text-card-foreground shadow-sm',
        CardHeader: 'flex flex-col space-y-1.5 p-6',
        CardTitle: 'text-2xl font-semibold leading-none tracking-tight',
        CardDescription: 'text-sm text-muted-foreground',
        CardContent: 'p-6 pt-0',
        CardFooter: 'flex items-center p-6 pt-0',
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/card.json#registry/new-york/ui/card.tsx',
      sha256: '525c4bb2c051987be64df0e92e1d90174912b219bf541e24ffbc4a3406de49e8',
      slots: {
        Card: 'rounded-xl border bg-card text-card-foreground shadow',
        CardHeader: 'flex flex-col space-y-1.5 p-6',
        CardTitle: 'font-semibold leading-none tracking-tight',
        CardDescription: 'text-sm text-muted-foreground',
        CardContent: 'p-6 pt-0',
        CardFooter: 'flex items-center p-6 pt-0',
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/card.tsx',
      sha256: 'ef8305b12c3112dab42a4708b41b1ebcc042fa5ab4c20f039da8d45b09ed5059',
      slots: {
        Card: 'flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm',
        CardHeader:
          '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        CardTitle: 'leading-none font-semibold',
        CardDescription: 'text-sm text-muted-foreground',
        CardAction: 'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        CardContent: 'px-6',
        CardFooter: 'flex items-center px-6 [.border-t]:pt-6',
      },
    },
  },
} as const;
