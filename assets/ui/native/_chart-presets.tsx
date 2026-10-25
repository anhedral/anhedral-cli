// Adapted from shadcn/ui (MIT). Reviewed chart sources and tooltip style slots.
export const nativeChartPresetSource = {
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
      origin: 'apps/v4/registry/bases/base/ui/chart.tsx',
      sha256: 'cdaa7c2e82aaf7b233c4764cf506cd9912aa1a49d5a02d4fd2f9a8c134687877',
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/chart.tsx',
      sha256: 'cdaa7c2e82aaf7b233c4764cf506cd9912aa1a49d5a02d4fd2f9a8c134687877',
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/chart.tsx',
      sha256: '1bbf2ff917b84dde3c715477618a244e374eaa490732c976dadf91c9b80328d7',
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/chart.json#registry/default/ui/chart.tsx',
      sha256: '2d7c4634b85fbd0bbe0c4636d0d333e02398fa49ad70fd24eece5853dc3975cc',
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/chart.json#registry/new-york/ui/chart.tsx',
      sha256: '2d7c4634b85fbd0bbe0c4636d0d333e02398fa49ad70fd24eece5853dc3975cc',
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/chart.tsx',
      sha256: '35e2fa755465ef8eb8ff8b483d493204d452152e7a8863474b1a69f5d44484db',
    },
  },
  presets: {
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      tooltip:
        'border-border/50 bg-background gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      tooltip:
        'border-border/50 bg-background gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      tooltip:
        'border-border/50 bg-background gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      tooltip:
        'border-border/50 bg-background gap-1.5 rounded-none border px-2.5 py-1.5 text-xs shadow-xl',
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      tooltip:
        'border-border/50 bg-background gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs/relaxed shadow-xl',
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      tooltip:
        'bg-popover text-popover-foreground ring-foreground/5 dark:ring-foreground/10 gap-1.5 rounded-xl px-2.5 py-1.5 text-xs shadow-lg ring-1',
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      tooltip:
        'bg-popover text-popover-foreground ring-foreground/10 gap-1.5 px-2.5 py-1.5 text-xs shadow-sm ring-1',
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      tooltip:
        'bg-popover text-popover-foreground ring-foreground/5 dark:ring-foreground/10 gap-1.5 rounded-xl px-2.5 py-1.5 text-xs shadow-lg ring-1',
    },
  },
  frozenTooltip:
    'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
} as const;
