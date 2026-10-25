import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
// Reviewed independently: Base, Radix, Aria, Default, New York and New York v4.
export const reviewedSelectSources = {
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
        { tag: 'SelectPrimitive.Label', base: 'py-1.5 pl-8 pr-2 text-sm font-semibold', when: [] },
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
        { tag: 'SelectPrimitive.ScrollDownButton', base: 'cn-select-scroll-down-button', when: [] },
      ],
    },
  },
};
const expectedSelectors = {
  vega: [
    'command-input-icon',
    'menu-translucent',
    'menu-translucent-aria',
    'select-content',
    'select-content-aria',
    'select-content-logical',
    'select-empty-aria',
    'select-group',
    'select-item',
    'select-item-aria',
    'select-item-indicator',
    'select-item-text',
    'select-label',
    'select-scroll-down-button',
    'select-scroll-up-button',
    'select-separator',
    'select-trigger',
    'select-trigger-icon',
    'select-value',
    'select-value-aria',
  ],
  nova: [
    'command-input-icon',
    'menu-translucent',
    'menu-translucent-aria',
    'select-content',
    'select-content-aria',
    'select-content-logical',
    'select-empty-aria',
    'select-group',
    'select-item',
    'select-item-aria',
    'select-item-indicator',
    'select-item-text',
    'select-label',
    'select-scroll-down-button',
    'select-scroll-up-button',
    'select-separator',
    'select-trigger',
    'select-trigger-icon',
    'select-value',
    'select-value-aria',
  ],
  maia: [
    'command-input-icon',
    'menu-translucent',
    'menu-translucent-aria',
    'select-content',
    'select-content-aria',
    'select-content-logical',
    'select-empty-aria',
    'select-group',
    'select-item',
    'select-item-aria',
    'select-item-indicator',
    'select-item-text',
    'select-label',
    'select-scroll-down-button',
    'select-scroll-up-button',
    'select-separator',
    'select-trigger',
    'select-trigger-icon',
    'select-value',
    'select-value-aria',
  ],
  lyra: [
    'command-input-icon',
    'menu-translucent',
    'menu-translucent-aria',
    'select-content',
    'select-content-aria',
    'select-content-logical',
    'select-empty-aria',
    'select-group',
    'select-item',
    'select-item-aria',
    'select-item-indicator',
    'select-item-text',
    'select-label',
    'select-scroll-down-button',
    'select-scroll-up-button',
    'select-separator',
    'select-trigger',
    'select-trigger-icon',
    'select-value',
    'select-value-aria',
  ],
  mira: [
    'command-input-icon',
    'menu-translucent',
    'menu-translucent-aria',
    'select-content',
    'select-content-aria',
    'select-content-logical',
    'select-empty-aria',
    'select-group',
    'select-item',
    'select-item-aria',
    'select-item-indicator',
    'select-item-text',
    'select-label',
    'select-scroll-down-button',
    'select-scroll-up-button',
    'select-separator',
    'select-trigger',
    'select-trigger-icon',
    'select-value',
    'select-value-aria',
  ],
  luma: [
    'command-input-icon',
    'menu-translucent',
    'menu-translucent-aria',
    'select-content',
    'select-content-aria',
    'select-content-logical',
    'select-empty-aria',
    'select-group',
    'select-item',
    'select-item-aria',
    'select-item-indicator',
    'select-item-text',
    'select-label',
    'select-scroll-down-button',
    'select-scroll-up-button',
    'select-separator',
    'select-trigger',
    'select-trigger-icon',
    'select-value',
    'select-value-aria',
  ],
  sera: [
    'command-input-icon',
    'menu-translucent',
    'menu-translucent-aria',
    'select-content',
    'select-content-aria',
    'select-content-logical',
    'select-empty-aria',
    'select-group',
    'select-item',
    'select-item-aria',
    'select-item-indicator',
    'select-item-text',
    'select-label',
    'select-scroll-down-button',
    'select-scroll-up-button',
    'select-separator',
    'select-trigger',
    'select-trigger-icon',
    'select-value',
    'select-value-aria',
  ],
  rhea: [
    'command-input-icon',
    'menu-translucent',
    'menu-translucent-aria',
    'select-content',
    'select-content-aria',
    'select-content-logical',
    'select-empty-aria',
    'select-group',
    'select-item',
    'select-item-aria',
    'select-item-indicator',
    'select-item-text',
    'select-label',
    'select-scroll-down-button',
    'select-scroll-up-button',
    'select-separator',
    'select-trigger',
    'select-trigger-icon',
    'select-value',
    'select-value-aria',
  ],
};
const prefixes = '(?:select(?:-[a-z-]+)?|menu-translucent(?:-aria)?|command-input-icon)';
function rules(sheet) {
  const content = sheet.content.replace(/\/\*[\s\S]*?\*\//g, '');
  const names = [
    ...content.matchAll(new RegExp('^\\s*(\\.cn-' + prefixes + '[^{}]*?)\\s*\\{', 'gm')),
  ].map((m) => m[1].trim());
  const entries = [
    ...content.matchAll(
      new RegExp('\\.cn-(' + prefixes + ')\\s*\\{\\s*@apply\\s+([^;{}]+);?\\s*\\}', 'g'),
    ),
  ].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]);
  if (names.length !== entries.length || entries.length !== new Set(entries.map((e) => e[0])).size)
    throw Error('Unreviewed selector structure');
  return Object.fromEntries(entries);
}
export function nativeSelectSlotPolicy() {
  return Object.fromEntries(
    Object.entries(reviewedSelectSources).flatMap(([family, source]) =>
      Object.entries(source.slots).flatMap(([owner, parts]) =>
        parts.map((part, index) => {
          const key = family + '/' + owner + '/' + index;
          if (owner === 'SelectScrollUpButton' || owner === 'SelectScrollDownButton')
            return [
              key,
              {
                classification: 'web-specific-slot',
                reason:
                  'Native ScrollView pan and accessibility scrolling replace browser hover scroll arrows.',
              },
            ];
          if (
            family === 'base' &&
            owner === 'SelectContent' &&
            part.tag === 'SelectPrimitive.Positioner'
          )
            return [
              key,
              {
                classification: 'web-specific-slot',
                reason:
                  'Native Modal owns the window; browser Positioner/portal coordinate and stacking hosts are omitted.',
              },
            ];
          if (family === 'aria' && owner === 'SelectContent' && index === 0)
            return [
              key,
              {
                classification: 'delegated-slot',
                reason:
                  'The unstyled content adapter delegates native paint to SelectPopover and SelectList; source defaults remain tested.',
              },
            ];
          if (family === 'aria' && owner === 'SelectInput' && index === 1)
            return [
              key,
              {
                classification: 'web-specific-slot',
                reason:
                  'WebKit search-cancel pseudo-element suppression has no native DOM host; native TextInput owns its clear affordance.',
              },
            ];
          return [
            key,
            {
              classification: 'native-slot',
              reason: 'Source slot is consumed by the native adapter and its renderer contract.',
            },
          ];
        }),
      ),
    ),
  );
}
export function nativeSelectPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory);
  for (const [name, input] of Object.entries(reviewedSelectSources))
    if (inventory.sources[input.origin]?.sha256 !== input.sha256)
      throw Error('Select source changed; renew native review: ' + name);
  const presets = Object.fromEntries(
    Object.keys(expectedSelectors).map((name) => {
      const sheet = inventory.styleSheets['style-' + name + '.css'];
      if (!sheet || sha256(sheet.content) !== sheet.sha256)
        throw Error('Select stylesheet integrity failed: ' + name);
      const next = rules(sheet);
      if (JSON.stringify(Object.keys(next).sort()) !== JSON.stringify(expectedSelectors[name]))
        throw Error('Select selectors require native review: ' + name);
      return [name, { sha256: sheet.sha256, rules: next }];
    }),
  );
  return {
    upstream: inventory.source,
    globals,
    sources: reviewedSelectSources,
    presets,
    slotPolicy: nativeSelectSlotPolicy(),
  };
}
const target = fileURLToPath(new URL('../assets/ui/native/_select-presets.tsx', import.meta.url));
export async function nativeSelectPresetSource(inventory) {
  return format(
    '// Adapted from shadcn/ui (MIT). All Select source slots and theme rules.\nexport const nativeSelectPresetSource = ' +
      JSON.stringify(nativeSelectPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = await nativeSelectPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, output);
  else if (readFileSync(target, 'utf8') !== output)
    throw Error('Native Select preset source is stale.');
}
