// Adapted from shadcn/ui (MIT). Reviewed example gallery source slots and metric inputs.
export const nativeExampleLayoutSource = {
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
      origin: 'apps/v4/registry/bases/base/components/example.tsx',
      sha256: '4e8265534863b7291158a5341f305a3cac582cf762054bd2387adf20959e06bf',
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/components/example.tsx',
      sha256: 'f68769304c8698f44e8dfc5b5a883b953ce6b31b04b3e0fb466ca4d759bf4a18',
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/components/example.tsx',
      sha256: '4e8265534863b7291158a5341f305a3cac582cf762054bd2387adf20959e06bf',
    },
  },
  slots: {
    outer: 'w-full bg-muted dark:bg-background',
    wrapper:
      'mx-auto grid min-h-screen w-full max-w-5xl min-w-0 content-center items-start gap-8 p-4 pt-2 sm:gap-12 sm:p-6 md:grid-cols-2 md:gap-8 lg:p-12 2xl:max-w-6xl',
    example: 'mx-auto flex w-full max-w-lg min-w-0 flex-col gap-1 self-stretch lg:max-w-none',
    title: 'px-1.5 py-2 text-xs font-medium text-muted-foreground',
    content:
      "flex min-w-0 flex-1 flex-col items-start gap-6 rounded-xl bg-card p-12 text-foreground style-lyra:rounded-none style-sera:rounded-none *:[div:not([class*='w-'])]:w-full",
  },
} as const;
