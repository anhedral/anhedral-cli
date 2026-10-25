// Adapted from shadcn/ui (MIT). Reviewed Native Select source slots and theme rules.
export const nativeSelectControlPresetSource = {
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
      origin: 'apps/v4/registry/bases/aria/ui/native-select.tsx',
      sha256: 'a96068a0bf403eac169f8b1e605f314dd268dde7ee2841ed72ff2b41cd944875',
      slots: {
        NativeSelect: [
          {
            tag: 'div',
            classes:
              'cn-native-select-wrapper group/native-select relative w-fit has-[select:disabled]:opacity-50',
          },
          {
            tag: 'select',
            classes:
              'cn-native-select outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
          },
          {
            tag: 'IconPlaceholder',
            classes: 'cn-native-select-icon pointer-events-none absolute select-none',
          },
        ],
        NativeSelectOption: [{ tag: 'option', classes: 'bg-[Canvas] text-[CanvasText]' }],
        NativeSelectOptGroup: [{ tag: 'optgroup', classes: 'bg-[Canvas] text-[CanvasText]' }],
      },
    },
    base: {
      origin: 'apps/v4/registry/bases/base/ui/native-select.tsx',
      sha256: 'a96068a0bf403eac169f8b1e605f314dd268dde7ee2841ed72ff2b41cd944875',
      slots: {
        NativeSelect: [
          {
            tag: 'div',
            classes:
              'cn-native-select-wrapper group/native-select relative w-fit has-[select:disabled]:opacity-50',
          },
          {
            tag: 'select',
            classes:
              'cn-native-select outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
          },
          {
            tag: 'IconPlaceholder',
            classes: 'cn-native-select-icon pointer-events-none absolute select-none',
          },
        ],
        NativeSelectOption: [{ tag: 'option', classes: 'bg-[Canvas] text-[CanvasText]' }],
        NativeSelectOptGroup: [{ tag: 'optgroup', classes: 'bg-[Canvas] text-[CanvasText]' }],
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/native-select.tsx',
      sha256: '4bdbce5575dce610fed747df4547a3d494713f4df8d28e09b3ccee62e4d72f93',
      slots: {
        NativeSelect: [
          {
            tag: 'div',
            classes: 'group/native-select relative w-fit has-[select:disabled]:opacity-50',
          },
          {
            tag: 'select',
            classes:
              'h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent px-3 py-2 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1 dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
          },
          {
            tag: 'ChevronDownIcon',
            classes:
              'pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground opacity-50 select-none',
          },
        ],
        NativeSelectOption: [{ tag: 'option', classes: 'bg-[Canvas] text-[CanvasText]' }],
        NativeSelectOptGroup: [{ tag: 'optgroup', classes: 'bg-[Canvas] text-[CanvasText]' }],
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/native-select.tsx',
      sha256: 'a96068a0bf403eac169f8b1e605f314dd268dde7ee2841ed72ff2b41cd944875',
      slots: {
        NativeSelect: [
          {
            tag: 'div',
            classes:
              'cn-native-select-wrapper group/native-select relative w-fit has-[select:disabled]:opacity-50',
          },
          {
            tag: 'select',
            classes:
              'cn-native-select outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
          },
          {
            tag: 'IconPlaceholder',
            classes: 'cn-native-select-icon pointer-events-none absolute select-none',
          },
        ],
        NativeSelectOption: [{ tag: 'option', classes: 'bg-[Canvas] text-[CanvasText]' }],
        NativeSelectOptGroup: [{ tag: 'optgroup', classes: 'bg-[Canvas] text-[CanvasText]' }],
      },
    },
  },
  presets: {
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        'native-select':
          'border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 w-full min-w-0 appearance-none rounded-md border bg-transparent py-1 pr-8 pl-2.5 text-sm shadow-xs transition-[color,box-shadow] select-none focus-visible:ring-3 aria-invalid:ring-3 data-[size=sm]:h-8',
        'native-select-icon': 'text-muted-foreground top-1/2 right-2.5 size-4 -translate-y-1/2',
      },
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        'native-select':
          'border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-8 w-full min-w-0 appearance-none rounded-lg border bg-transparent py-1 pr-8 pl-2.5 text-sm transition-colors select-none focus-visible:ring-3 aria-invalid:ring-3 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-[size=sm]:py-0.5',
        'native-select-icon': 'text-muted-foreground top-1/2 right-2.5 size-4 -translate-y-1/2',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        'native-select':
          'border-input bg-input/30 placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 w-full min-w-0 appearance-none rounded-4xl border py-1 pr-8 pl-3 text-sm transition-colors select-none focus-visible:ring-[3px] aria-invalid:ring-[3px] data-[size=sm]:h-8',
        'native-select-icon': 'text-muted-foreground top-1/2 right-3.5 size-4 -translate-y-1/2',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        'native-select':
          'border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-8 w-full min-w-0 appearance-none rounded-none border bg-transparent py-1 pr-8 pl-2.5 text-xs transition-colors select-none focus-visible:ring-1 aria-invalid:ring-1 data-[size=sm]:h-7 data-[size=sm]:rounded-none data-[size=sm]:py-0.5',
        'native-select-icon': 'text-muted-foreground top-1/2 right-2.5 size-4 -translate-y-1/2',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        'native-select':
          'border-input bg-input/20 placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-7 w-full min-w-0 appearance-none rounded-md border py-0.5 pr-6 pl-2 text-xs/relaxed transition-colors select-none focus-visible:ring-2 aria-invalid:ring-2 data-[size=sm]:h-6 data-[size=sm]:text-[0.625rem]',
        'native-select-icon':
          'text-muted-foreground top-1/2 right-1.5 size-3.5 -translate-y-1/2 group-data-[size=sm]/native-select:size-3 group-data-[size=sm]/native-select:-translate-y-[calc(--spacing(1.25))]',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        'native-select':
          'bg-input/50 border-transparent placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 w-full min-w-0 appearance-none rounded-3xl border py-1 pr-8 pl-3 text-sm transition-[color,box-shadow,background-color] select-none focus-visible:ring-3 aria-invalid:ring-3 data-[size=sm]:h-8',
        'native-select-icon': 'text-muted-foreground top-1/2 right-2.5 size-4 -translate-y-1/2',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        'native-select':
          'border-transparent border-b-input bg-transparent placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:border-b-ring aria-invalid:border-b-destructive dark:aria-invalid:border-b-destructive/50 h-10 w-full min-w-0 appearance-none rounded-none border py-2 pr-8 pl-0 text-sm transition-[color,border-color] select-none data-[size=sm]:h-9',
        'native-select-icon': 'text-muted-foreground top-1/2 right-0 size-3.5 -translate-y-1/2',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        'native-select':
          'bg-input/50 border-transparent placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-8 w-full min-w-0 appearance-none rounded-2xl border py-1 pr-8 pl-2.5 text-sm transition-[color,box-shadow] duration-200 select-none focus-visible:ring-3 aria-invalid:ring-3 data-[size=sm]:h-7',
        'native-select-icon': 'text-muted-foreground top-1/2 right-2.5 size-4 -translate-y-1/2',
      },
    },
  },
} as const;
