// Adapted from shadcn/ui (MIT). Reviewed source slots and native metric inputs.
export const nativeKbdPresetSource = {
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
      origin: 'apps/v4/registry/bases/base/ui/kbd.tsx',
      sha256: 'f04fe8ce9c10023fa4d9907030ec5e26a4c714e5377e6b3864cb03548bd0a56f',
      classes: {
        Kbd: 'cn-kbd pointer-events-none inline-flex items-center justify-center select-none',
        KbdGroup: 'cn-kbd-group inline-flex items-center',
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/kbd.tsx',
      sha256: 'f04fe8ce9c10023fa4d9907030ec5e26a4c714e5377e6b3864cb03548bd0a56f',
      classes: {
        Kbd: 'cn-kbd pointer-events-none inline-flex items-center justify-center select-none',
        KbdGroup: 'cn-kbd-group inline-flex items-center',
      },
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/kbd.tsx',
      sha256: '38452bf969618854c72821a8684100aa441653fc15cb2703a2f6e2299f829e27',
      classes: {
        Kbd: 'cn-kbd pointer-events-none inline-flex items-center justify-center select-none',
        KbdGroup: 'cn-kbd-group inline-flex items-center',
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/kbd.json#registry/default/ui/kbd.tsx',
      sha256: '0c025e7736d435f563bfb44105e562629672799eb1f35cbf194148d06cd1a9f7',
      classes: {
        Kbd: "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        KbdGroup: 'inline-flex items-center gap-1',
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/kbd.json#registry/new-york/ui/kbd.tsx',
      sha256: '0c025e7736d435f563bfb44105e562629672799eb1f35cbf194148d06cd1a9f7',
      classes: {
        Kbd: "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        KbdGroup: 'inline-flex items-center gap-1',
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/kbd.tsx',
      sha256: 'c0c0ae6a7d1adb7749b9b34cab8f4d2f5caf333e819b64c2051e77f918d3661f',
      classes: {
        Kbd: "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3 [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        KbdGroup: 'inline-flex items-center gap-1',
      },
    },
  },
  presets: {
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        kbd: "bg-muted text-muted-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3",
        'kbd-group': 'gap-1',
      },
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        kbd: "bg-muted text-muted-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3",
        'kbd-group': 'gap-1',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        kbd: "bg-muted text-muted-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3",
        'kbd-group': 'gap-1',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        kbd: "bg-muted text-muted-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-none px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3",
        'kbd-group': 'gap-1',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        kbd: "bg-muted text-muted-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-xs px-1 font-sans text-[0.625rem] font-medium [&_svg:not([class*='size-'])]:size-3",
        'kbd-group': 'gap-1',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        kbd: "bg-muted text-muted-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 h-5.5 w-fit min-w-5.5 gap-1 rounded-lg px-1.5 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 in-data-[slot=input-group]:bg-input",
        'kbd-group': 'gap-1',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        kbd: "bg-muted text-muted-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 h-5.5 w-fit min-w-5.5 gap-1 rounded-none px-1.5 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 in-data-[slot=input-group]:bg-input",
        'kbd-group': 'gap-1',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        kbd: "bg-muted text-muted-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-lg px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 in-data-[slot=input-group]:bg-input",
        'kbd-group': 'gap-1',
      },
    },
  },
} as const;
