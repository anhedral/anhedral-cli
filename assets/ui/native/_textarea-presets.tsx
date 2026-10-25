// Adapted from shadcn/ui (MIT). Pinned input classes and global metrics.
export const nativeTextareaPresetSource = {
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
        base: 'border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-md border bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] focus-visible:ring-3 aria-invalid:ring-3 md:text-sm',
      },
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        base: 'border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors focus-visible:ring-3 aria-invalid:ring-3 md:text-sm',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        base: 'border-input bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 resize-none rounded-xl border px-3 py-3 text-base transition-colors focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        base: 'border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 rounded-none border bg-transparent px-2.5 py-2 text-xs transition-colors focus-visible:ring-1 aria-invalid:ring-1 md:text-xs',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        base: 'border-input bg-input/20 dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 resize-none rounded-md border px-2 py-2 text-sm transition-colors focus-visible:ring-2 aria-invalid:ring-2 md:text-xs/relaxed',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        base: 'bg-input/50 border-transparent focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 resize-none rounded-2xl border px-3 py-3 text-base transition-[color,box-shadow,background-color] focus-visible:ring-3 aria-invalid:ring-3 md:text-sm',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        base: 'border-transparent border-b-input bg-transparent focus-visible:border-b-ring aria-invalid:border-b-destructive dark:aria-invalid:border-b-destructive/50 resize-none rounded-none border px-0 py-3 text-base transition-[color,border-color] md:text-sm',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        base: 'bg-input/50 border-transparent focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 resize-none rounded-2xl border px-2.5 py-2 text-base transition-[color,box-shadow] duration-200 focus-visible:ring-3 aria-invalid:ring-3 md:text-sm',
      },
    },
  },
  classRecipes: {
    base: {
      origin: 'apps/v4/registry/bases/base/ui/textarea.tsx',
      sha256: '8f527c89dec40a9b372376dc93d2ebb149bfd82f209856d110ead1aabec19c6a',
      recipe: {
        base: 'cn-textarea flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/textarea.tsx',
      sha256: '8f527c89dec40a9b372376dc93d2ebb149bfd82f209856d110ead1aabec19c6a',
      recipe: {
        base: 'cn-textarea flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/textarea.tsx',
      sha256: '522eb7b565500e9a38ada957dc86ef0a4b2273dca9af2cb92af45332e614a334',
      recipe: {
        base: 'cn-textarea flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/textarea.json#registry/default/ui/textarea.tsx',
      sha256: 'aaf46918c590c2bf59e2afb7904dfd8e69317e12ee34ff93ed2746dd06cc994a',
      recipe: {
        base: 'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/textarea.json#registry/new-york/ui/textarea.tsx',
      sha256: 'ec7c92aaed80f6923a7caa4bfe4eead395b50a7001504fd7fbb0b9381804dae9',
      recipe: {
        base: 'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/textarea.tsx',
      sha256: '5cafcfeeee29534f449387a16b585f5923d2faab1a0cdc50a874416b175f59ce',
      recipe: {
        base: 'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40',
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
    },
  },
} as const;
