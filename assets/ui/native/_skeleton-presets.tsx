// Adapted from shadcn/ui (MIT). Source CSS and global formulas remain pinned in the official inventory.
export const nativeSkeletonPresetSource = {
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
      rules: { base: 'bg-muted rounded-md' },
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: { base: 'bg-muted rounded-md' },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: { base: 'bg-muted rounded-xl' },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: { base: 'bg-muted rounded-none' },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: { base: 'bg-muted rounded-md' },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: { base: 'bg-muted rounded-2xl' },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: { base: 'bg-muted' },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: { base: 'bg-muted rounded-2xl' },
    },
  },
  classRecipes: {
    base: {
      origin: 'apps/v4/registry/bases/base/ui/skeleton.tsx',
      sha256: '8fcbad84e494a75484a0975221fb40f54c4a7d68f79cfc305cb158d1feb1badf',
      recipe: {
        base: 'cn-skeleton animate-pulse',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/skeleton.tsx',
      sha256: '8fcbad84e494a75484a0975221fb40f54c4a7d68f79cfc305cb158d1feb1badf',
      recipe: {
        base: 'cn-skeleton animate-pulse',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/skeleton.tsx',
      sha256: '8fcbad84e494a75484a0975221fb40f54c4a7d68f79cfc305cb158d1feb1badf',
      recipe: {
        base: 'cn-skeleton animate-pulse',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/skeleton.json#registry/default/ui/skeleton.tsx',
      sha256: 'a72a9d8fc1c1999b5411a33391c5e70048863c5865629077280e943ca85689a8',
      recipe: {
        base: 'animate-pulse rounded-md bg-muted',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/skeleton.json#registry/new-york/ui/skeleton.tsx',
      sha256: '87608e7cc815ad3d88e0b9de6c402bb37b58ea1b38636cf69709da1baff6e334',
      recipe: {
        base: 'animate-pulse rounded-md bg-primary/10',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/skeleton.tsx',
      sha256: 'f51ce0fcd31e5c31437382e80ea0af94b4fc3d64221d27091d36824546780a43',
      recipe: {
        base: 'animate-pulse rounded-md bg-accent',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
  },
} as const;
