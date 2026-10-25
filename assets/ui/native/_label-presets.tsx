// Adapted from shadcn/ui (MIT). Reviewed label sources, state slots and native metrics.
export const nativeLabelPresetSource = {
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
      origin: 'apps/v4/registry/bases/base/ui/label.tsx',
      sha256: 'd11f6ddea1304473d829329f36238c164dbee9fe04c038fd169d70d352b75704',
      classes:
        'cn-label flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed',
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/label.tsx',
      sha256: '075c3ea03aec0f887b9b00c407e1de3b2969371059b9ba84ecd84908f24bdde2',
      classes:
        'cn-label flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed',
    },
    aria: {
      origin: 'apps/v4/registry/bases/aria/ui/label.tsx',
      sha256: '165c4ae2584ec47e5d64107cc8fd6d20d707ed4e24098d0dae67bfd43f6cd5aa',
      classes:
        'cn-label cn-label-aria flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed',
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/label.json#registry/default/ui/label.tsx',
      sha256: '2eac8fbb04002c42b0fbc4062d20d131e421796eaf65c37d2049e29e42ecbc5a',
      classes:
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/label.json#registry/new-york/ui/label.tsx',
      sha256: '2eac8fbb04002c42b0fbc4062d20d131e421796eaf65c37d2049e29e42ecbc5a',
      classes:
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/label.tsx',
      sha256: '344bde38b8531615dbf8e14af3895517c24d8ef6ce56ddeda7e2e6fe4b5d0c00',
      classes:
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
    },
  },
  presets: {
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        label:
          'gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50',
        'label-aria': 'peer-data-disabled:opacity-50',
      },
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        label:
          'gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50',
        'label-aria': 'peer-data-disabled:opacity-50',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        label:
          'gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50',
        'label-aria': 'peer-data-disabled:opacity-50',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        label:
          'gap-2 text-xs leading-none group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50',
        'label-aria': 'peer-data-disabled:opacity-50',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        label:
          'gap-2 text-xs/relaxed leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50',
        'label-aria': 'peer-data-disabled:opacity-50',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        label:
          'gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50',
        'label-aria': 'peer-data-disabled:opacity-50',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        label:
          'gap-2 font-semibold peer-data-[slot=checkbox]:text-sm peer-data-[slot=radio-group-item]:text-sm peer-data-[slot=switch]:text-sm leading-relaxed group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 peer-data-[slot=checkbox]:font-normal peer-data-[slot=radio-group-item]:font-normal peer-data-[slot=switch]:font-normal uppercase text-xs tracking-wide peer-data-[slot=checkbox]:normal-case peer-data-[slot=checkbox]:tracking-normal peer-data-[slot=radio-group-item]:normal-case peer-data-[slot=radio-group-item]:tracking-normal peer-data-[slot=switch]:normal-case peer-data-[slot=switch]:tracking-normal',
        'label-aria': 'peer-data-disabled:opacity-50',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        label:
          'gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50',
        'label-aria': 'peer-data-disabled:opacity-50',
      },
    },
  },
} as const;
