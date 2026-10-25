// Adapted from shadcn/ui (MIT). All Select source slots and theme rules.
export const nativeSelectPresetSource = {
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
      origin: 'apps/v4/registry/bases/aria/ui/select.tsx',
      sha256: '9e662cbcb7177303d243076e86ce6b9c2a4c5c5ccff23350fcaae4bf140f9619',
      slots: {
        Select: [{ tag: 'SelectPrimitive', base: 'w-fit', when: [] }],
        SelectGroup: [{ tag: 'ListBoxSectionPrimitive', base: 'cn-select-group', when: [] }],
        SelectValue: [
          { tag: 'SelectValuePrimitive', base: 'cn-select-value cn-select-value-aria', when: [] },
        ],
        SelectTrigger: [
          {
            tag: 'ButtonPrimitive',
            base: 'cn-select-trigger flex w-full items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
            when: [],
          },
          { tag: 'IconPlaceholder', base: 'cn-select-trigger-icon pointer-events-none', when: [] },
        ],
        SelectContent: [{ tag: 'SelectPopover', base: '', when: [] }],
        SelectPopover: [
          {
            tag: 'PopoverPrimitive',
            base: 'cn-select-content-aria cn-menu-target cn-menu-translucent cn-menu-translucent-aria relative isolate z-50 w-(--trigger-width) origin-(--trigger-anchor-point) overflow-hidden',
            when: [],
          },
        ],
        SelectList: [
          {
            tag: 'ListBoxPrimitive',
            base: 'group/select-list max-h-[inherit] overflow-x-hidden overflow-y-auto p-0 outline-hidden',
            when: [],
          },
        ],
        SelectInput: [
          { tag: 'SearchField', base: 'p-1 pb-0', when: [] },
          { tag: 'InputGroupInput', base: '[&::-webkit-search-cancel-button]:hidden', when: [] },
          { tag: 'IconPlaceholder', base: 'cn-command-input-icon', when: [] },
        ],
        SelectLabel: [{ tag: 'HeaderPrimitive', base: 'cn-select-label', when: [] }],
        SelectItem: [
          {
            tag: 'ListBoxItemPrimitive',
            base: 'cn-select-item cn-select-item-aria relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
            when: [],
          },
          { tag: 'span', base: 'cn-select-item-text shrink-0 whitespace-nowrap', when: [] },
          { tag: 'span', base: 'cn-select-item-indicator', when: [] },
          {
            tag: 'IconPlaceholder',
            base: 'cn-select-item-indicator-icon pointer-events-none',
            when: [],
          },
        ],
        SelectSeparator: [
          { tag: 'SeparatorPrimitive', base: 'cn-select-separator pointer-events-none', when: [] },
        ],
        SelectEmpty: [{ tag: 'div', base: 'cn-select-empty-aria', when: [] }],
      },
    },
    base: {
      origin: 'apps/v4/registry/bases/base/ui/select.tsx',
      sha256: '6348d30035b68867d5efffe9b0b1611718226bef9fdeef9554349d6b98252110',
      slots: {
        SelectGroup: [{ tag: 'SelectPrimitive.Group', base: 'cn-select-group', when: [] }],
        SelectValue: [{ tag: 'SelectPrimitive.Value', base: 'cn-select-value', when: [] }],
        SelectTrigger: [
          {
            tag: 'SelectPrimitive.Trigger',
            base: 'cn-select-trigger flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
            when: [],
          },
          { tag: 'IconPlaceholder', base: 'cn-select-trigger-icon pointer-events-none', when: [] },
        ],
        SelectContent: [
          { tag: 'SelectPrimitive.Positioner', base: 'isolate z-50', when: [] },
          {
            tag: 'SelectPrimitive.Popup',
            base: 'cn-select-content cn-select-content-logical cn-menu-target cn-menu-translucent relative isolate z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto data-[align-trigger=true]:animate-none',
            when: [],
          },
        ],
        SelectLabel: [{ tag: 'SelectPrimitive.GroupLabel', base: 'cn-select-label', when: [] }],
        SelectItem: [
          {
            tag: 'SelectPrimitive.Item',
            base: 'cn-select-item relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
            when: [],
          },
          {
            tag: 'SelectPrimitive.ItemText',
            base: 'cn-select-item-text shrink-0 whitespace-nowrap',
            when: [],
          },
          { tag: 'span', base: 'cn-select-item-indicator', when: [] },
          {
            tag: 'IconPlaceholder',
            base: 'cn-select-item-indicator-icon pointer-events-none',
            when: [],
          },
        ],
        SelectSeparator: [
          {
            tag: 'SelectPrimitive.Separator',
            base: 'cn-select-separator pointer-events-none',
            when: [],
          },
        ],
        SelectScrollUpButton: [
          {
            tag: 'SelectPrimitive.ScrollUpArrow',
            base: 'cn-select-scroll-up-button top-0 w-full',
            when: [],
          },
        ],
        SelectScrollDownButton: [
          {
            tag: 'SelectPrimitive.ScrollDownArrow',
            base: 'cn-select-scroll-down-button bottom-0 w-full',
            when: [],
          },
        ],
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/select.json#registry/default/ui/select.tsx',
      sha256: '79888d8afa95a5eb89cf0395e3e5a64d9c30264ea802d2bf3f6e52d8850d6304',
      slots: {
        SelectTrigger: [
          {
            tag: 'SelectPrimitive.Trigger',
            base: 'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            when: [],
          },
          { tag: 'ChevronDown', base: 'h-4 w-4 opacity-50', when: [] },
        ],
        SelectScrollUpButton: [
          {
            tag: 'SelectPrimitive.ScrollUpButton',
            base: 'flex cursor-default items-center justify-center py-1',
            when: [],
          },
          { tag: 'ChevronUp', base: 'h-4 w-4', when: [] },
        ],
        SelectScrollDownButton: [
          {
            tag: 'SelectPrimitive.ScrollDownButton',
            base: 'flex cursor-default items-center justify-center py-1',
            when: [],
          },
          { tag: 'ChevronDown', base: 'h-4 w-4', when: [] },
        ],
        SelectContent: [
          {
            tag: 'SelectPrimitive.Content',
            base: 'relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]',
            when: [
              {
                expression: 'position === "popper"',
                classes:
                  'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
              },
            ],
          },
          {
            tag: 'SelectPrimitive.Viewport',
            base: 'p-1',
            when: [
              {
                expression: 'position === "popper"',
                classes:
                  'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
              },
            ],
          },
        ],
        SelectLabel: [
          {
            tag: 'SelectPrimitive.Label',
            base: 'py-1.5 pl-8 pr-2 text-sm font-semibold',
            when: [],
          },
        ],
        SelectItem: [
          {
            tag: 'SelectPrimitive.Item',
            base: 'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            when: [],
          },
          {
            tag: 'span',
            base: 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center',
            when: [],
          },
          { tag: 'Check', base: 'h-4 w-4', when: [] },
        ],
        SelectSeparator: [
          { tag: 'SelectPrimitive.Separator', base: '-mx-1 my-1 h-px bg-muted', when: [] },
        ],
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/select.json#registry/new-york/ui/select.tsx',
      sha256: '3d93ae07a8f3fe121ba60f4439e26bd7859f247eb8bfcafcf4b4a8a069888eec',
      slots: {
        SelectTrigger: [
          {
            tag: 'SelectPrimitive.Trigger',
            base: 'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            when: [],
          },
          { tag: 'ChevronDown', base: 'h-4 w-4 opacity-50', when: [] },
        ],
        SelectScrollUpButton: [
          {
            tag: 'SelectPrimitive.ScrollUpButton',
            base: 'flex cursor-default items-center justify-center py-1',
            when: [],
          },
          { tag: 'ChevronUp', base: 'h-4 w-4', when: [] },
        ],
        SelectScrollDownButton: [
          {
            tag: 'SelectPrimitive.ScrollDownButton',
            base: 'flex cursor-default items-center justify-center py-1',
            when: [],
          },
          { tag: 'ChevronDown', base: 'h-4 w-4', when: [] },
        ],
        SelectContent: [
          {
            tag: 'SelectPrimitive.Content',
            base: 'relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]',
            when: [
              {
                expression: 'position === "popper"',
                classes:
                  'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
              },
            ],
          },
          {
            tag: 'SelectPrimitive.Viewport',
            base: 'p-1',
            when: [
              {
                expression: 'position === "popper"',
                classes:
                  'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
              },
            ],
          },
        ],
        SelectLabel: [
          { tag: 'SelectPrimitive.Label', base: 'px-2 py-1.5 text-sm font-semibold', when: [] },
        ],
        SelectItem: [
          {
            tag: 'SelectPrimitive.Item',
            base: 'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            when: [],
          },
          {
            tag: 'span',
            base: 'absolute right-2 flex h-3.5 w-3.5 items-center justify-center',
            when: [],
          },
          { tag: 'Check', base: 'h-4 w-4', when: [] },
        ],
        SelectSeparator: [
          { tag: 'SelectPrimitive.Separator', base: '-mx-1 my-1 h-px bg-muted', when: [] },
        ],
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/select.tsx',
      sha256: '962830436bd0b7ee50e556f0747e277d6a86869ed27d167516346b15f26309d8',
      slots: {
        SelectTrigger: [
          {
            tag: 'SelectPrimitive.Trigger',
            base: "flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
            when: [],
          },
          { tag: 'ChevronDownIcon', base: 'size-4 opacity-50', when: [] },
        ],
        SelectContent: [
          {
            tag: 'SelectPrimitive.Content',
            base: 'relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            when: [
              {
                expression: 'position === "popper"',
                classes:
                  'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
              },
            ],
          },
          {
            tag: 'SelectPrimitive.Viewport',
            base: 'p-1',
            when: [
              {
                expression: 'position === "popper"',
                classes:
                  'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
              },
            ],
          },
        ],
        SelectLabel: [
          {
            tag: 'SelectPrimitive.Label',
            base: 'px-2 py-1.5 text-xs text-muted-foreground',
            when: [],
          },
        ],
        SelectItem: [
          {
            tag: 'SelectPrimitive.Item',
            base: "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
            when: [],
          },
          {
            tag: 'span',
            base: 'absolute right-2 flex size-3.5 items-center justify-center',
            when: [],
          },
          { tag: 'CheckIcon', base: 'size-4', when: [] },
        ],
        SelectSeparator: [
          {
            tag: 'SelectPrimitive.Separator',
            base: 'pointer-events-none -mx-1 my-1 h-px bg-border',
            when: [],
          },
        ],
        SelectScrollUpButton: [
          {
            tag: 'SelectPrimitive.ScrollUpButton',
            base: 'flex cursor-default items-center justify-center py-1',
            when: [],
          },
          { tag: 'ChevronUpIcon', base: 'size-4', when: [] },
        ],
        SelectScrollDownButton: [
          {
            tag: 'SelectPrimitive.ScrollDownButton',
            base: 'flex cursor-default items-center justify-center py-1',
            when: [],
          },
          { tag: 'ChevronDownIcon', base: 'size-4', when: [] },
        ],
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/select.tsx',
      sha256: '6e6ba85872b1b0f7286ee934adaadb8a18130d7ffb535e1f04f3505fa041428a',
      slots: {
        SelectGroup: [{ tag: 'SelectPrimitive.Group', base: 'cn-select-group', when: [] }],
        SelectTrigger: [
          {
            tag: 'SelectPrimitive.Trigger',
            base: 'cn-select-trigger flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
            when: [],
          },
          { tag: 'IconPlaceholder', base: 'cn-select-trigger-icon pointer-events-none', when: [] },
        ],
        SelectContent: [
          {
            tag: 'SelectPrimitive.Content',
            base: 'cn-select-content cn-menu-target cn-menu-translucent relative z-50 max-h-(--radix-select-content-available-height) origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto data-[align-trigger=true]:animate-none',
            when: [
              {
                expression: 'position === "popper"',
                classes:
                  'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
              },
            ],
          },
          {
            tag: 'SelectPrimitive.Viewport',
            base: 'cn-select-viewport data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)',
            when: [{ expression: 'position === "popper"', classes: '' }],
          },
        ],
        SelectLabel: [{ tag: 'SelectPrimitive.Label', base: 'cn-select-label', when: [] }],
        SelectItem: [
          {
            tag: 'SelectPrimitive.Item',
            base: 'cn-select-item relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
            when: [],
          },
          { tag: 'span', base: 'cn-select-item-indicator', when: [] },
          {
            tag: 'IconPlaceholder',
            base: 'cn-select-item-indicator-icon pointer-events-none',
            when: [],
          },
        ],
        SelectSeparator: [
          {
            tag: 'SelectPrimitive.Separator',
            base: 'cn-select-separator pointer-events-none',
            when: [],
          },
        ],
        SelectScrollUpButton: [
          { tag: 'SelectPrimitive.ScrollUpButton', base: 'cn-select-scroll-up-button', when: [] },
        ],
        SelectScrollDownButton: [
          {
            tag: 'SelectPrimitive.ScrollDownButton',
            base: 'cn-select-scroll-down-button',
            when: [],
          },
        ],
      },
    },
  },
  presets: {
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        'command-input-icon': 'size-4 shrink-0 opacity-50',
        'select-trigger':
          "border-input data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-md border bg-transparent py-2 pr-2 pl-2.5 text-sm shadow-xs transition-[color,box-shadow] focus-visible:ring-3 aria-invalid:ring-3 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4",
        'select-value': 'flex flex-1 text-left',
        'select-value-aria': 'data-placeholder:text-muted-foreground',
        'select-trigger-icon': 'text-muted-foreground size-4',
        'select-content':
          'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-md shadow-md ring-1 duration-100',
        'select-content-logical':
          'data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2',
        'select-label': 'text-muted-foreground px-2 py-1.5 text-xs',
        'select-item':
          "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        'select-item-aria': 'data-focused:bg-accent data-focused:text-accent-foreground',
        'select-item-indicator':
          'pointer-events-none absolute right-2 flex size-4 items-center justify-center',
        'select-group': 'scroll-my-1 p-1',
        'select-item-text': 'flex flex-1 gap-2',
        'select-separator': 'bg-border -mx-1 my-1 h-px',
        'select-scroll-up-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-scroll-down-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-empty-aria':
          'text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/select-list:flex',
        'menu-translucent':
          'animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!',
        'menu-translucent-aria': '**:data-[slot$=-item]:data-focused:bg-foreground/10',
        'select-content-aria':
          'bg-popover text-popover-foreground data-entering:animate-in data-exiting:animate-out data-exiting:fade-out-0 data-entering:fade-in-0 data-exiting:zoom-out-95 data-entering:zoom-in-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-md shadow-md ring-1 duration-100',
      },
    },
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        'command-input-icon': 'size-4 shrink-0 opacity-50',
        'select-trigger':
          "border-input data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-lg border bg-transparent py-2 pr-2 pl-2.5 text-sm transition-colors select-none focus-visible:ring-3 aria-invalid:ring-3 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4",
        'select-value': 'flex flex-1 text-left',
        'select-value-aria': 'data-placeholder:text-muted-foreground',
        'select-trigger-icon': 'text-muted-foreground size-4',
        'select-content':
          'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-lg shadow-md ring-1 duration-100',
        'select-content-logical':
          'data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2',
        'select-label': 'text-muted-foreground px-1.5 py-1 text-xs',
        'select-item':
          "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        'select-item-aria': 'data-focused:bg-accent data-focused:text-accent-foreground',
        'select-item-indicator':
          'pointer-events-none absolute right-2 flex size-4 items-center justify-center',
        'select-group': 'scroll-my-1 p-1',
        'select-item-text': 'flex flex-1 gap-2',
        'select-separator': 'bg-border -mx-1 my-1 h-px',
        'select-scroll-up-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-scroll-down-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-empty-aria':
          'text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/select-list:flex',
        'menu-translucent':
          'animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!',
        'menu-translucent-aria': '**:data-[slot$=-item]:data-focused:bg-foreground/10',
        'select-content-aria':
          'bg-popover text-popover-foreground data-entering:animate-in data-exiting:animate-out data-exiting:fade-out-0 data-entering:fade-in-0 data-exiting:zoom-out-95 data-entering:zoom-in-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-lg shadow-md ring-1 duration-100',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        'command-input-icon': 'size-4 shrink-0 opacity-50',
        'select-trigger':
          "border-input data-placeholder:text-muted-foreground bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-4xl border px-3 py-2 text-sm transition-colors focus-visible:ring-[3px] aria-invalid:ring-[3px] data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4",
        'select-value': 'flex flex-1 text-left',
        'select-value-aria': 'data-placeholder:text-muted-foreground',
        'select-trigger-icon': 'text-muted-foreground size-4',
        'select-content':
          'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/5 min-w-36 rounded-2xl shadow-2xl ring-1 duration-100',
        'select-content-logical':
          'data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2',
        'select-label': 'text-muted-foreground px-3 py-2.5 text-xs',
        'select-item':
          "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2.5 rounded-xl py-2 pr-8 pl-3 text-sm [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        'select-item-aria': 'data-focused:bg-accent data-focused:text-accent-foreground',
        'select-item-indicator':
          'pointer-events-none absolute right-2 flex size-4 items-center justify-center',
        'select-group': 'scroll-my-1 p-1',
        'select-item-text': 'flex flex-1 gap-2',
        'select-separator': 'bg-border/50 -mx-1 my-1 h-px',
        'select-scroll-up-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-scroll-down-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-empty-aria':
          'text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/select-list:flex',
        'menu-translucent':
          'animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!',
        'menu-translucent-aria': '**:data-[slot$=-item]:data-focused:bg-foreground/10',
        'select-content-aria':
          'bg-popover text-popover-foreground data-entering:animate-in data-exiting:animate-out data-exiting:fade-out-0 data-entering:fade-in-0 data-exiting:zoom-out-95 data-entering:zoom-in-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 ring-foreground/5 min-w-36 rounded-2xl shadow-2xl ring-1 duration-100',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        'command-input-icon': 'size-4 shrink-0 opacity-50',
        'select-trigger':
          "border-input data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-none border bg-transparent py-2 pr-2 pl-2.5 text-xs transition-colors select-none focus-visible:ring-1 aria-invalid:ring-1 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-none *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4",
        'select-value': 'flex flex-1 text-left',
        'select-value-aria': 'data-placeholder:text-muted-foreground',
        'select-trigger-icon': 'text-muted-foreground size-4',
        'select-content':
          'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-none shadow-md ring-1 duration-100',
        'select-content-logical':
          'data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2',
        'select-label': 'text-muted-foreground px-2 py-2 text-xs',
        'select-item':
          "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2 rounded-none py-2 pr-8 pl-2 text-xs [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        'select-item-aria': 'data-focused:bg-accent data-focused:text-accent-foreground',
        'select-item-indicator':
          'pointer-events-none absolute right-2 flex size-4 items-center justify-center',
        'select-group': 'scroll-my-1',
        'select-item-text': 'flex flex-1 gap-2',
        'select-separator': 'bg-border -mx-1 h-px',
        'select-scroll-up-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-scroll-down-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-empty-aria':
          'text-muted-foreground hidden w-full justify-center py-2 text-center text-xs group-data-empty/select-list:flex',
        'menu-translucent':
          'animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!',
        'menu-translucent-aria': '**:data-[slot$=-item]:data-focused:bg-foreground/10',
        'select-content-aria':
          'bg-popover text-popover-foreground data-entering:animate-in data-exiting:animate-out data-exiting:fade-out-0 data-entering:fade-in-0 data-exiting:zoom-out-95 data-entering:zoom-in-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-none shadow-md ring-1 duration-100',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        'command-input-icon': 'size-3.5 shrink-0 opacity-50',
        'select-trigger':
          "border-input data-placeholder:text-muted-foreground bg-input/20 dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-md border px-2 py-1.5 text-xs/relaxed transition-colors focus-visible:ring-2 aria-invalid:ring-2 data-[size=default]:h-7 data-[size=sm]:h-6 *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        'select-value': 'flex flex-1 text-left',
        'select-value-aria': 'data-placeholder:text-muted-foreground',
        'select-trigger-icon': 'text-muted-foreground size-3.5',
        'select-content':
          'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-32 rounded-lg shadow-md ring-1 duration-100',
        'select-content-logical':
          'data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2',
        'select-label': 'text-muted-foreground px-2 py-1.5 text-xs',
        'select-item':
          "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground min-h-7 gap-2 rounded-md px-2 py-1 text-xs/relaxed [&_svg:not([class*='size-'])]:size-3.5 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        'select-item-aria': 'data-focused:bg-accent data-focused:text-accent-foreground',
        'select-item-indicator':
          'pointer-events-none absolute right-2 flex items-center justify-center',
        'select-group': 'scroll-my-1 p-1',
        'select-item-text': 'flex flex-1 gap-2',
        'select-separator': 'bg-border/50 -mx-1 my-1 h-px',
        'select-scroll-up-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-3.5",
        'select-scroll-down-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-3.5",
        'select-empty-aria':
          'text-muted-foreground hidden w-full justify-center py-2 text-center text-xs/relaxed group-data-empty/select-list:flex',
        'menu-translucent':
          'animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!',
        'menu-translucent-aria': '**:data-[slot$=-item]:data-focused:bg-foreground/10',
        'select-content-aria':
          'bg-popover text-popover-foreground data-entering:animate-in data-exiting:animate-out data-exiting:fade-out-0 data-entering:fade-in-0 data-exiting:zoom-out-95 data-entering:zoom-in-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-32 rounded-lg shadow-md ring-1 duration-100',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        'select-trigger':
          "bg-input/50 border-transparent data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-3xl border py-2 px-3 text-sm transition-[color,box-shadow,background-color] focus-visible:ring-3 aria-invalid:ring-3 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4",
        'select-value': 'flex flex-1 text-left',
        'select-value-aria': 'data-placeholder:text-muted-foreground',
        'select-trigger-icon': 'text-muted-foreground size-4',
        'select-content':
          'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/5 dark:ring-foreground/10 min-w-36 rounded-3xl shadow-lg ring-1 duration-100',
        'select-content-logical':
          'data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2',
        'select-label': 'text-muted-foreground px-3 py-2.5 text-xs',
        'select-item':
          "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        'select-item-aria': 'data-focused:bg-accent data-focused:text-accent-foreground',
        'select-item-indicator':
          'pointer-events-none absolute right-2 flex size-4 items-center justify-center',
        'select-group': 'scroll-my-1.5 p-1.5',
        'select-item-text': 'flex flex-1 gap-2',
        'select-separator': 'bg-border -mx-1.5 my-1.5 h-px',
        'select-scroll-up-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-scroll-down-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-empty-aria':
          'text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/select-list:flex',
        'command-input-icon': 'size-4 shrink-0 opacity-50',
        'menu-translucent':
          'animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!',
        'menu-translucent-aria': '**:data-[slot$=-item]:data-focused:bg-foreground/10',
        'select-content-aria':
          'bg-popover text-popover-foreground data-entering:animate-in data-exiting:animate-out data-exiting:fade-out-0 data-entering:fade-in-0 data-exiting:zoom-out-95 data-entering:zoom-in-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 ring-foreground/5 dark:ring-foreground/10 min-w-36 rounded-3xl shadow-lg ring-1 duration-100',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        'command-input-icon': 'size-3.5 shrink-0 opacity-50',
        'select-trigger':
          "border-transparent border-b-input bg-transparent data-placeholder:text-muted-foreground focus-visible:border-b-ring aria-invalid:border-b-destructive dark:aria-invalid:border-b-destructive/50 gap-1.5 rounded-none border py-2 px-0 text-sm transition-[color,border-color] data-[size=default]:h-10 data-[size=sm]:h-9 *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        'select-value': 'flex flex-1 text-left',
        'select-value-aria': 'data-placeholder:text-muted-foreground',
        'select-trigger-icon': 'text-muted-foreground size-3.5',
        'select-content':
          'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-none shadow-md ring-1 duration-100',
        'select-content-logical':
          'data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2',
        'select-label':
          'px-3 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground',
        'select-item':
          "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2.5 rounded-none py-2 pr-8 pl-3 text-sm [&_svg:not([class*='size-'])]:size-3.5 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        'select-item-aria': 'data-focused:bg-accent data-focused:text-accent-foreground',
        'select-item-indicator':
          'pointer-events-none absolute right-2 flex size-4 items-center justify-center',
        'select-group': 'scroll-my-1.5 p-1.5',
        'select-item-text': 'flex flex-1 gap-2',
        'select-separator': 'bg-border/50 -mx-1.5 my-1.5 h-px',
        'select-scroll-up-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-3.5",
        'select-scroll-down-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-3.5",
        'select-empty-aria':
          'text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/select-list:flex',
        'menu-translucent':
          'animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!',
        'menu-translucent-aria': '**:data-[slot$=-item]:data-focused:bg-foreground/10',
        'select-content-aria':
          'bg-popover text-popover-foreground data-entering:animate-in data-exiting:animate-out data-exiting:fade-out-0 data-entering:fade-in-0 data-exiting:zoom-out-95 data-entering:zoom-in-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-none shadow-md ring-1 duration-100',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        'select-trigger':
          "bg-input/50 border-transparent data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-2xl border py-2 px-3 text-sm transition-[color,box-shadow] duration-200 focus-visible:ring-3 aria-invalid:ring-3 data-[size=default]:h-8 data-[size=sm]:h-7 *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4",
        'select-value': 'flex flex-1 text-left',
        'select-value-aria': 'data-placeholder:text-muted-foreground',
        'select-trigger-icon': 'text-muted-foreground size-4',
        'select-content':
          'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/5 dark:ring-foreground/10 min-w-36 rounded-2xl shadow-lg ring-1 duration-100',
        'select-content-logical':
          'data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2',
        'select-label': 'text-muted-foreground px-2 py-1 text-xs',
        'select-item':
          "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2 min-h-7 rounded-xl py-1.5 pr-8 pl-2 text-sm [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        'select-item-aria': 'data-focused:bg-accent data-focused:text-accent-foreground',
        'select-item-indicator':
          'pointer-events-none absolute right-2 flex size-4 items-center justify-center',
        'select-group': 'scroll-my-1.5 p-1',
        'select-item-text': 'flex flex-1 gap-2',
        'select-separator': 'bg-border -mx-1 my-1 h-px',
        'select-scroll-up-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-scroll-down-button':
          "bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
        'select-empty-aria':
          'text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/select-list:flex',
        'command-input-icon': 'size-4 shrink-0 opacity-50',
        'menu-translucent':
          'animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!',
        'menu-translucent-aria': '**:data-[slot$=-item]:data-focused:bg-foreground/10',
        'select-content-aria':
          'bg-popover text-popover-foreground data-entering:animate-in data-exiting:animate-out data-exiting:fade-out-0 data-entering:fade-in-0 data-exiting:zoom-out-95 data-entering:zoom-in-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 ring-foreground/5 dark:ring-foreground/10 min-w-36 rounded-2xl shadow-lg ring-1 duration-100',
      },
    },
  },
  slotPolicy: {
    'aria/Select/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectGroup/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectValue/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectTrigger/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectTrigger/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectContent/0': {
      classification: 'delegated-slot',
      reason:
        'The unstyled content adapter delegates native paint to SelectPopover and SelectList; source defaults remain tested.',
    },
    'aria/SelectPopover/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectList/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectInput/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectInput/1': {
      classification: 'web-specific-slot',
      reason:
        'WebKit search-cancel pseudo-element suppression has no native DOM host; native TextInput owns its clear affordance.',
    },
    'aria/SelectInput/2': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectLabel/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectItem/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectItem/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectItem/2': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectItem/3': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectSeparator/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'aria/SelectEmpty/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectGroup/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectValue/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectTrigger/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectTrigger/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectContent/0': {
      classification: 'web-specific-slot',
      reason:
        'Native Modal owns the window; browser Positioner/portal coordinate and stacking hosts are omitted.',
    },
    'base/SelectContent/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectLabel/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectItem/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectItem/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectItem/2': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectItem/3': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectSeparator/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'base/SelectScrollUpButton/0': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'base/SelectScrollDownButton/0': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'default/SelectTrigger/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'default/SelectTrigger/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'default/SelectScrollUpButton/0': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'default/SelectScrollUpButton/1': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'default/SelectScrollDownButton/0': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'default/SelectScrollDownButton/1': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'default/SelectContent/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'default/SelectContent/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'default/SelectLabel/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'default/SelectItem/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'default/SelectItem/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'default/SelectItem/2': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'default/SelectSeparator/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york/SelectTrigger/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york/SelectTrigger/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york/SelectScrollUpButton/0': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'new-york/SelectScrollUpButton/1': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'new-york/SelectScrollDownButton/0': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'new-york/SelectScrollDownButton/1': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'new-york/SelectContent/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york/SelectContent/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york/SelectLabel/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york/SelectItem/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york/SelectItem/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york/SelectItem/2': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york/SelectSeparator/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york-v4/SelectTrigger/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york-v4/SelectTrigger/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york-v4/SelectContent/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york-v4/SelectContent/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york-v4/SelectLabel/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york-v4/SelectItem/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york-v4/SelectItem/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york-v4/SelectItem/2': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york-v4/SelectSeparator/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'new-york-v4/SelectScrollUpButton/0': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'new-york-v4/SelectScrollUpButton/1': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'new-york-v4/SelectScrollDownButton/0': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'new-york-v4/SelectScrollDownButton/1': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'radix/SelectGroup/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'radix/SelectTrigger/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'radix/SelectTrigger/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'radix/SelectContent/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'radix/SelectContent/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'radix/SelectLabel/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'radix/SelectItem/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'radix/SelectItem/1': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'radix/SelectItem/2': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'radix/SelectSeparator/0': {
      classification: 'native-slot',
      reason: 'Source slot is consumed by the native adapter and its renderer contract.',
    },
    'radix/SelectScrollUpButton/0': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
    'radix/SelectScrollDownButton/0': {
      classification: 'web-specific-slot',
      reason:
        'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
    },
  },
} as const;
