// Adapted from shadcn/ui (MIT). Reviewed Progress source slots and styles.
export const nativeProgressPresetSource = {
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
      origin: 'apps/v4/registry/bases/aria/ui/progress.tsx',
      sha256: '3037eb4fd45d538216a2aa12d32a2e2a70c4f90678440939e1cb9dc30c467a61',
      slots: {
        Progress: [{ tag: 'ProgressPrimitive', classes: 'cn-progress-root flex flex-wrap gap-3' }],
        ProgressTrack: [
          {
            tag: 'span',
            classes: 'cn-progress-track relative flex w-full items-center overflow-x-hidden',
          },
        ],
        ProgressIndicator: [
          { tag: 'span', classes: 'cn-progress-indicator h-full transition-all' },
        ],
        ProgressLabel: [{ tag: 'LabelPrimitive', classes: 'cn-progress-label' }],
        ProgressValue: [{ tag: 'span', classes: 'cn-progress-value' }],
      },
    },
    base: {
      origin: 'apps/v4/registry/bases/base/ui/progress.tsx',
      sha256: '00afc4c7f319f5f5e78c5e294250abc656e2f7e2839821b9e086555fbd91cd76',
      slots: {
        Progress: [
          { tag: 'ProgressPrimitive.Root', classes: 'cn-progress-root flex flex-wrap gap-3' },
        ],
        ProgressTrack: [
          {
            tag: 'ProgressPrimitive.Track',
            classes: 'cn-progress-track relative flex w-full items-center overflow-x-hidden',
          },
        ],
        ProgressIndicator: [
          {
            tag: 'ProgressPrimitive.Indicator',
            classes: 'cn-progress-indicator h-full transition-all',
          },
        ],
        ProgressLabel: [{ tag: 'ProgressPrimitive.Label', classes: 'cn-progress-label' }],
        ProgressValue: [{ tag: 'ProgressPrimitive.Value', classes: 'cn-progress-value' }],
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/progress.json#registry/default/ui/progress.tsx',
      sha256: '8c036da4baed076de68d27719929dc98151a81b51456bfa6a2488d835303b1d7',
      slots: {
        Progress: [
          {
            tag: 'ProgressPrimitive.Root',
            classes: 'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
          },
          {
            tag: 'ProgressPrimitive.Indicator',
            classes: 'h-full w-full flex-1 bg-primary transition-all',
          },
        ],
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/progress.json#registry/new-york/ui/progress.tsx',
      sha256: '6b3b4b69a1cb361076174892e9a96e1a09020307616965ef89f2f7e2495b57a9',
      slots: {
        Progress: [
          {
            tag: 'ProgressPrimitive.Root',
            classes: 'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
          },
          {
            tag: 'ProgressPrimitive.Indicator',
            classes: 'h-full w-full flex-1 bg-primary transition-all',
          },
        ],
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/progress.tsx',
      sha256: 'e012e1f7e6e66d11229d1233eccf91954edcd9179b418ff1d114dc651b86fd35',
      slots: {
        Progress: [
          {
            tag: 'ProgressPrimitive.Root',
            classes: 'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
          },
          {
            tag: 'ProgressPrimitive.Indicator',
            classes: 'h-full w-full flex-1 bg-primary transition-all',
          },
        ],
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/progress.tsx',
      sha256: '507bab79d74484391049814b1459476eb1e4c061e99e20a7270f46e510609920',
      slots: {
        Progress: [
          {
            tag: 'ProgressPrimitive.Root',
            classes: 'cn-progress relative flex w-full items-center overflow-x-hidden',
          },
          {
            tag: 'ProgressPrimitive.Indicator',
            classes: 'cn-progress-indicator size-full flex-1 transition-all',
          },
        ],
      },
    },
  },
  presets: {
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        progress: 'bg-muted h-1 rounded-full',
        'progress-track': 'bg-muted h-1 rounded-full',
        'progress-indicator': 'bg-primary',
        'progress-label': 'text-sm font-medium',
        'progress-value': 'text-muted-foreground ml-auto text-sm tabular-nums',
      },
    },
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        progress: 'bg-muted h-1.5 rounded-full',
        'progress-track': 'bg-muted h-1.5 rounded-full',
        'progress-indicator': 'bg-primary',
        'progress-label': 'text-sm font-medium',
        'progress-value': 'text-muted-foreground ml-auto text-sm tabular-nums',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        progress: 'bg-muted h-3 rounded-4xl',
        'progress-track': 'bg-muted h-3 rounded-4xl',
        'progress-indicator': 'bg-primary',
        'progress-label': 'text-sm font-medium',
        'progress-value': 'text-muted-foreground ml-auto text-sm tabular-nums',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        progress: 'bg-muted h-1 rounded-none',
        'progress-track': 'bg-muted h-1 rounded-none',
        'progress-indicator': 'bg-primary',
        'progress-label': 'text-xs',
        'progress-value': 'text-muted-foreground ml-auto text-xs tabular-nums',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        progress: 'bg-muted h-1 rounded-md',
        'progress-track': 'bg-muted h-1 rounded-md',
        'progress-indicator': 'bg-primary',
        'progress-label': 'text-xs/relaxed font-medium',
        'progress-value': 'text-muted-foreground ml-auto text-xs/relaxed tabular-nums',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        progress: 'bg-muted h-3 rounded-full',
        'progress-track': 'bg-muted h-3 rounded-full',
        'progress-indicator': 'bg-primary',
        'progress-label': 'text-sm font-medium',
        'progress-value': 'text-muted-foreground ml-auto text-sm tabular-nums',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        progress: 'bg-muted h-0.5 rounded-none',
        'progress-track': 'bg-muted h-0.5 rounded-none',
        'progress-indicator': 'bg-primary',
        'progress-label': 'text-xs font-semibold tracking-wide uppercase',
        'progress-value': 'text-muted-foreground ml-auto text-sm tabular-nums',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        progress: 'bg-muted h-2 rounded-2xl',
        'progress-track': 'bg-muted h-2 rounded-2xl',
        'progress-indicator': 'bg-primary',
        'progress-label': 'text-sm font-medium',
        'progress-value': 'text-muted-foreground ml-auto text-sm tabular-nums',
      },
    },
  },
} as const;
