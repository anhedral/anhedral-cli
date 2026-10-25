// Adapted from shadcn/ui (MIT). Reviewed Field source slots, size variants and styles.
export const nativeFieldPresetSource = {
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
      origin: 'apps/v4/registry/bases/aria/ui/field.tsx',
      sha256: '1019104c41eaef8ffae109e2ece95be87a7a637e3a9bac049d7a9fb54bfb7275',
      slots: {
        FieldSet: [{ tag: 'fieldset', classes: 'cn-field-set flex flex-col' }],
        FieldLegend: [{ tag: 'legend', classes: 'cn-field-legend' }],
        FieldGroup: [
          {
            tag: 'div',
            classes: 'cn-field-group group/field-group @container/field-group flex w-full flex-col',
          },
        ],
        Field: [{ tag: 'div', recipe: 'fieldVariants', classes: '' }],
        FieldContent: [
          {
            tag: 'div',
            classes: 'cn-field-content group/field-content flex flex-1 flex-col leading-snug',
          },
        ],
        FieldLabel: [
          {
            tag: 'Label',
            classes:
              'cn-field-label cn-field-label-aria group/field-label peer/field-label flex w-fit has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
          },
        ],
        FieldTitle: [{ tag: 'div', classes: 'cn-field-title flex w-fit items-center' }],
        FieldDescription: [
          {
            tag: 'p',
            classes:
              'cn-field-description leading-normal font-normal group-has-data-horizontal/field:text-balance last:mt-0 nth-last-2:-mt-1 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
          },
        ],
        FieldSeparator: [
          { tag: 'div', classes: 'cn-field-separator relative' },
          { tag: 'Separator', classes: 'absolute inset-0 top-1/2' },
          {
            tag: 'span',
            classes: 'cn-field-separator-content relative mx-auto block w-fit bg-background',
          },
        ],
        content: [{ tag: 'ul', classes: 'ml-4 flex list-disc flex-col gap-1' }],
        FieldError: [{ tag: 'div', classes: 'cn-field-error font-normal' }],
      },
      recipes: {
        fieldVariants: {
          base: 'cn-field group/field flex w-full',
          variants: {
            orientation: {
              vertical: 'cn-field-orientation-vertical flex-col *:w-full [&>.sr-only]:w-auto',
              horizontal:
                'cn-field-orientation-horizontal flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
              responsive:
                'cn-field-orientation-responsive flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
            },
          },
          defaultVariants: { orientation: 'vertical' },
          compoundVariants: [],
        },
      },
    },
    base: {
      origin: 'apps/v4/registry/bases/base/ui/field.tsx',
      sha256: 'e7305c507a3f777b0193045fdd5ebfb1c58020d3d8e0821cb9e8d19b203576b9',
      slots: {
        FieldSet: [{ tag: 'fieldset', classes: 'cn-field-set flex flex-col' }],
        FieldLegend: [{ tag: 'legend', classes: 'cn-field-legend' }],
        FieldGroup: [
          {
            tag: 'div',
            classes: 'cn-field-group group/field-group @container/field-group flex w-full flex-col',
          },
        ],
        Field: [{ tag: 'div', recipe: 'fieldVariants', classes: '' }],
        FieldContent: [
          {
            tag: 'div',
            classes: 'cn-field-content group/field-content flex flex-1 flex-col leading-snug',
          },
        ],
        FieldLabel: [
          {
            tag: 'Label',
            classes:
              'cn-field-label group/field-label peer/field-label flex w-fit has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
          },
        ],
        FieldTitle: [{ tag: 'div', classes: 'cn-field-title flex w-fit items-center' }],
        FieldDescription: [
          {
            tag: 'p',
            classes:
              'cn-field-description leading-normal font-normal group-has-data-horizontal/field:text-balance last:mt-0 nth-last-2:-mt-1 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
          },
        ],
        FieldSeparator: [
          { tag: 'div', classes: 'cn-field-separator relative' },
          { tag: 'Separator', classes: 'absolute inset-0 top-1/2' },
          {
            tag: 'span',
            classes: 'cn-field-separator-content relative mx-auto block w-fit bg-background',
          },
        ],
        content: [{ tag: 'ul', classes: 'ml-4 flex list-disc flex-col gap-1' }],
        FieldError: [{ tag: 'div', classes: 'cn-field-error font-normal' }],
      },
      recipes: {
        fieldVariants: {
          base: 'cn-field group/field flex w-full',
          variants: {
            orientation: {
              vertical: 'cn-field-orientation-vertical flex-col *:w-full [&>.sr-only]:w-auto',
              horizontal:
                'cn-field-orientation-horizontal flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
              responsive:
                'cn-field-orientation-responsive flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
            },
          },
          defaultVariants: { orientation: 'vertical' },
          compoundVariants: [],
        },
      },
    },
    default: {
      origin: 'apps/v4/public/r/styles/default/field.json#registry/default/ui/field.tsx',
      sha256: '198d72223fb0009dcab69f6e78e8a49d3c51da09af91ffe7289f1bab659c4c9a',
      slots: {
        FieldSet: [
          {
            tag: 'fieldset',
            classes:
              'flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
          },
        ],
        FieldLegend: [
          {
            tag: 'legend',
            classes:
              'mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm',
          },
        ],
        FieldGroup: [
          {
            tag: 'div',
            classes:
              'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
          },
        ],
        Field: [{ tag: 'div', recipe: 'fieldVariants', classes: '' }],
        FieldContent: [
          { tag: 'div', classes: 'group/field-content flex flex-1 flex-col gap-1.5 leading-snug' },
        ],
        FieldLabel: [
          {
            tag: 'Label',
            classes:
              'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>[data-slot=field]]:p-4 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10',
          },
        ],
        FieldTitle: [
          {
            tag: 'div',
            classes:
              'flex w-fit items-center gap-2 text-sm font-medium leading-snug group-data-[disabled=true]/field:opacity-50',
          },
        ],
        FieldDescription: [
          {
            tag: 'p',
            classes:
              'text-muted-foreground text-sm font-normal leading-normal group-has-[[data-orientation=horizontal]]/field:text-balance nth-last-2:-mt-1 last:mt-0 [[data-variant=legend]+&]:-mt-1.5 [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
          },
        ],
        FieldSeparator: [
          {
            tag: 'div',
            classes: 'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
          },
          { tag: 'Separator', classes: 'absolute inset-0 top-1/2' },
          {
            tag: 'span',
            classes: 'bg-background text-muted-foreground relative mx-auto block w-fit px-2',
          },
        ],
        content: [{ tag: 'ul', classes: 'ml-4 flex list-disc flex-col gap-1' }],
        FieldError: [{ tag: 'div', classes: 'text-destructive text-sm font-normal' }],
      },
      recipes: {
        fieldVariants: {
          base: 'group/field data-[invalid=true]:text-destructive flex w-full gap-3',
          variants: {
            orientation: {
              vertical: 'flex-col [&>*]:w-full [&>.sr-only]:w-auto',
              horizontal:
                'flex-row items-center [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px has-[>[data-slot=field-content]]:items-start',
              responsive:
                '@md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:[&>[data-slot=field-label]]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
            },
          },
          defaultVariants: { orientation: 'vertical' },
          compoundVariants: [],
        },
      },
    },
    'new-york': {
      origin: 'apps/v4/public/r/styles/new-york/field.json#registry/new-york/ui/field.tsx',
      sha256: '6479c92eace3dcdb520e2fe37944d4bdb1cc7dc220cd0741f7551d006f3a0a1d',
      slots: {
        FieldSet: [
          {
            tag: 'fieldset',
            classes:
              'flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
          },
        ],
        FieldLegend: [
          {
            tag: 'legend',
            classes:
              'mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm',
          },
        ],
        FieldGroup: [
          {
            tag: 'div',
            classes:
              'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
          },
        ],
        Field: [{ tag: 'div', recipe: 'fieldVariants', classes: '' }],
        FieldContent: [
          { tag: 'div', classes: 'group/field-content flex flex-1 flex-col gap-1.5 leading-snug' },
        ],
        FieldLabel: [
          {
            tag: 'Label',
            classes:
              'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>[data-slot=field]]:p-4 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10',
          },
        ],
        FieldTitle: [
          {
            tag: 'div',
            classes:
              'flex w-fit items-center gap-2 text-sm font-medium leading-snug group-data-[disabled=true]/field:opacity-50',
          },
        ],
        FieldDescription: [
          {
            tag: 'p',
            classes:
              'text-muted-foreground text-sm font-normal leading-normal group-has-[[data-orientation=horizontal]]/field:text-balance nth-last-2:-mt-1 last:mt-0 [[data-variant=legend]+&]:-mt-1.5 [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
          },
        ],
        FieldSeparator: [
          {
            tag: 'div',
            classes: 'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
          },
          { tag: 'Separator', classes: 'absolute inset-0 top-1/2' },
          {
            tag: 'span',
            classes: 'bg-background text-muted-foreground relative mx-auto block w-fit px-2',
          },
        ],
        content: [{ tag: 'ul', classes: 'ml-4 flex list-disc flex-col gap-1' }],
        FieldError: [{ tag: 'div', classes: 'text-destructive text-sm font-normal' }],
      },
      recipes: {
        fieldVariants: {
          base: 'group/field data-[invalid=true]:text-destructive flex w-full gap-3',
          variants: {
            orientation: {
              vertical: 'flex-col [&>*]:w-full [&>.sr-only]:w-auto',
              horizontal:
                'flex-row items-center [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px has-[>[data-slot=field-content]]:items-start',
              responsive:
                '@md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:[&>[data-slot=field-label]]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
            },
          },
          defaultVariants: { orientation: 'vertical' },
          compoundVariants: [],
        },
      },
    },
    'new-york-v4': {
      origin: 'apps/v4/registry/new-york-v4/ui/field.tsx',
      sha256: '4a4d17fcb933513f637f9f7e2daf5d8348f7de086b29738337dec7e6dd1819a0',
      slots: {
        FieldSet: [
          {
            tag: 'fieldset',
            classes:
              'flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
          },
        ],
        FieldLegend: [
          {
            tag: 'legend',
            classes:
              'mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm',
          },
        ],
        FieldGroup: [
          {
            tag: 'div',
            classes:
              'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
          },
        ],
        Field: [{ tag: 'div', recipe: 'fieldVariants', classes: '' }],
        FieldContent: [
          { tag: 'div', classes: 'group/field-content flex flex-1 flex-col gap-1.5 leading-snug' },
        ],
        FieldLabel: [
          {
            tag: 'Label',
            classes:
              'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10',
          },
        ],
        FieldTitle: [
          {
            tag: 'div',
            classes:
              'flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50',
          },
        ],
        FieldDescription: [
          {
            tag: 'p',
            classes:
              'text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
          },
        ],
        FieldSeparator: [
          {
            tag: 'div',
            classes: 'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
          },
          { tag: 'Separator', classes: 'absolute inset-0 top-1/2' },
          {
            tag: 'span',
            classes: 'relative mx-auto block w-fit bg-background px-2 text-muted-foreground',
          },
        ],
        content: [{ tag: 'ul', classes: 'ml-4 flex list-disc flex-col gap-1' }],
        FieldError: [{ tag: 'div', classes: 'text-sm font-normal text-destructive' }],
      },
      recipes: {
        fieldVariants: {
          base: 'group/field flex w-full gap-3 data-[invalid=true]:text-destructive',
          variants: {
            orientation: {
              vertical: 'flex-col [&>*]:w-full [&>.sr-only]:w-auto',
              horizontal:
                'flex-row items-center [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
              responsive:
                'flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto @md/field-group:[&>[data-slot=field-label]]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
            },
          },
          defaultVariants: { orientation: 'vertical' },
          compoundVariants: [],
        },
      },
    },
    radix: {
      origin: 'apps/v4/registry/bases/radix/ui/field.tsx',
      sha256: 'afcc19444bd161b637a9a0bbc42199c4af281ca12babc34e49e5923fc0539f1b',
      slots: {
        FieldSet: [{ tag: 'fieldset', classes: 'cn-field-set flex flex-col' }],
        FieldLegend: [{ tag: 'legend', classes: 'cn-field-legend' }],
        FieldGroup: [
          {
            tag: 'div',
            classes: 'cn-field-group group/field-group @container/field-group flex w-full flex-col',
          },
        ],
        Field: [{ tag: 'div', recipe: 'fieldVariants', classes: '' }],
        FieldContent: [
          {
            tag: 'div',
            classes: 'cn-field-content group/field-content flex flex-1 flex-col leading-snug',
          },
        ],
        FieldLabel: [
          {
            tag: 'Label',
            classes:
              'cn-field-label group/field-label peer/field-label flex w-fit has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
          },
        ],
        FieldTitle: [{ tag: 'div', classes: 'cn-field-title flex w-fit items-center' }],
        FieldDescription: [
          {
            tag: 'p',
            classes:
              'cn-field-description leading-normal font-normal group-has-data-horizontal/field:text-balance last:mt-0 nth-last-2:-mt-1 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
          },
        ],
        FieldSeparator: [
          { tag: 'div', classes: 'cn-field-separator relative' },
          { tag: 'Separator', classes: 'absolute inset-0 top-1/2' },
          {
            tag: 'span',
            classes: 'cn-field-separator-content relative mx-auto block w-fit bg-background',
          },
        ],
        content: [{ tag: 'ul', classes: 'ml-4 flex list-disc flex-col gap-1' }],
        FieldError: [{ tag: 'div', classes: 'cn-field-error font-normal' }],
      },
      recipes: {
        fieldVariants: {
          base: 'cn-field group/field flex w-full',
          variants: {
            orientation: {
              vertical: 'cn-field-orientation-vertical flex-col *:w-full [&>.sr-only]:w-auto',
              horizontal:
                'cn-field-orientation-horizontal flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
              responsive:
                'cn-field-orientation-responsive flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
            },
          },
          defaultVariants: { orientation: 'vertical' },
          compoundVariants: [],
        },
      },
    },
  },
  presets: {
    nova: {
      sha256: 'fd9803ec398290c306b377a46a769cad0c7ff024bf6a626993c113cacc20f16e',
      rules: {
        'field-set':
          'gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        'field-legend':
          'mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base',
        'field-group': 'gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        field: 'data-[invalid=true]:text-destructive gap-2',
        'field-content': 'gap-0.5',
        'field-label':
          'has-data-checked:bg-primary/5 has-data-checked:border-primary/30 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10 gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-muted/50 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 *:data-[slot=field]:p-2.5',
        'field-label-aria':
          'has-data-selected:bg-primary/5 has-data-selected:border-primary/30 dark:has-data-selected:border-primary/20 dark:has-data-selected:bg-primary/10',
        'field-title':
          'gap-2 leading-snug text-sm font-medium group-data-[disabled=true]/field:opacity-50',
        'field-description':
          'text-muted-foreground text-left text-sm [[data-variant=legend]+&]:-mt-1.5',
        'field-separator': '-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
        'field-separator-content': 'text-muted-foreground px-2',
        'field-error': 'text-destructive text-sm',
      },
    },
    vega: {
      sha256: '10fa07bd61b429ae2c14c572ba9975f6e991d68a04f8fec7e354a062597e0d4e',
      rules: {
        'field-set':
          'gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        'field-legend':
          'mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base',
        'field-group': 'gap-7 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        field: 'data-[invalid=true]:text-destructive gap-3',
        'field-content': 'gap-1',
        'field-label':
          'has-data-checked:bg-primary/5 has-data-checked:border-primary/30 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10 gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-muted/50 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 *:data-[slot=field]:p-3',
        'field-label-aria':
          'has-data-selected:bg-primary/5 has-data-selected:border-primary/30 dark:has-data-selected:border-primary/20 dark:has-data-selected:bg-primary/10',
        'field-title':
          'gap-2 leading-snug text-sm font-medium group-data-[disabled=true]/field:opacity-50',
        'field-description':
          'text-muted-foreground text-left text-sm [[data-variant=legend]+&]:-mt-1.5',
        'field-separator': '-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
        'field-separator-content': 'text-muted-foreground px-2',
        'field-error': 'text-destructive text-sm',
      },
    },
    maia: {
      sha256: '8d518bcb26fad2904e7048e7be4c708814168c5e4ee29f1228945f91efd694a1',
      rules: {
        'field-set':
          'gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        'field-legend':
          'mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base',
        'field-group': 'gap-7 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        field: 'data-[invalid=true]:text-destructive gap-3',
        'field-content': 'gap-1',
        'field-label':
          'has-data-checked:bg-primary/5 has-data-checked:border-primary/30 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10 gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-xl has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-input/40 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 has-[>[data-slot=field]]:has-[:focus-visible]:ring-[3px] *:data-[slot=field]:p-4',
        'field-label-aria':
          'has-data-selected:bg-primary/5 has-data-selected:border-primary/30 dark:has-data-selected:border-primary/20 dark:has-data-selected:bg-primary/10',
        'field-title':
          'gap-2 leading-snug text-sm font-medium group-data-[disabled=true]/field:opacity-50',
        'field-description':
          'text-muted-foreground text-left text-sm [[data-variant=legend]+&]:-mt-1.5',
        'field-separator': '-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
        'field-separator-content': 'text-muted-foreground px-2',
        'field-error': 'text-destructive text-sm',
      },
    },
    lyra: {
      sha256: 'be24110aafbd07d794ced58f15512c640ab3dfa5733beb850e83f968457a9b52',
      rules: {
        'field-set':
          'gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        'field-legend':
          'mb-2.5 font-medium data-[variant=label]:text-xs data-[variant=legend]:text-sm',
        'field-group': 'gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        field: 'data-[invalid=true]:text-destructive gap-2',
        'field-content': 'gap-0.5',
        'field-label':
          'has-data-checked:bg-primary/5 has-data-checked:border-primary/30 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10 gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-muted/50 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 has-[>[data-slot=field]]:has-[:focus-visible]:ring-1 *:data-[slot=field]:p-2',
        'field-label-aria':
          'has-data-selected:bg-primary/5 has-data-selected:border-primary/30 dark:has-data-selected:border-primary/20 dark:has-data-selected:bg-primary/10',
        'field-title': 'gap-2 text-xs/relaxed group-data-[disabled=true]/field:opacity-50',
        'field-description':
          'text-muted-foreground text-left text-xs/relaxed [[data-variant=legend]+&]:-mt-1.5',
        'field-separator': '-my-2 h-5 text-xs group-data-[variant=outline]/field-group:-mb-2',
        'field-separator-content': 'text-muted-foreground px-2',
        'field-error': 'text-destructive text-xs',
      },
    },
    mira: {
      sha256: 'cdde6d38ee43c94cb6785672455adeea7fe195cc57772dc52b41acb5a1789732',
      rules: {
        'field-set':
          'gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        'field-legend':
          'mb-2 font-medium data-[variant=label]:text-xs/relaxed data-[variant=legend]:text-sm',
        'field-group': 'gap-4 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        field: 'data-[invalid=true]:text-destructive gap-2',
        'field-content': 'gap-0.5',
        'field-label':
          'has-data-checked:bg-primary/5 dark:has-data-checked:bg-primary/10 gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-input/40 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/30 has-[>[data-slot=field]]:has-[:focus-visible]:ring-2 *:data-[slot=field]:p-2',
        'field-label-aria': 'has-data-selected:bg-primary/5 dark:has-data-selected:bg-primary/10',
        'field-title':
          'gap-2 text-xs/relaxed font-medium group-data-[disabled=true]/field:opacity-50',
        'field-description':
          'text-muted-foreground text-left text-xs/relaxed [[data-variant=legend]+&]:-mt-1.5',
        'field-separator':
          '-my-2 h-5 text-xs/relaxed group-data-[variant=outline]/field-group:-mb-2',
        'field-separator-content': 'text-muted-foreground px-2',
        'field-error': 'text-destructive text-xs/relaxed',
      },
    },
    luma: {
      sha256: '35c0578be1623049da1f11729ae43a2a7884dcc17b948fc72dcdf4f1be3c0484',
      rules: {
        'field-set':
          'gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        'field-legend':
          'mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base',
        'field-group': 'gap-7 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        field: 'data-[invalid=true]:text-destructive gap-3',
        'field-content': 'gap-1',
        'field-label':
          'has-data-checked:bg-input/30 gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-2xl has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-input/40 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 *:data-[slot=field]:p-4',
        'field-label-aria': 'has-data-selected:bg-input/30',
        'field-title':
          'gap-2 leading-snug text-sm font-medium group-data-[disabled=true]/field:opacity-50',
        'field-description':
          'text-muted-foreground text-left text-sm [[data-variant=legend]+&]:-mt-1.5',
        'field-separator': '-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
        'field-separator-content': 'text-muted-foreground px-2',
        'field-error': 'text-destructive text-sm',
      },
    },
    sera: {
      sha256: 'c26380d5023bb63d25c03c94cae223e0a4f133f6bae0a63f77b8e4ac17483ba0',
      rules: {
        'field-set':
          'gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        'field-legend':
          'mb-3 font-semibold uppercase data-[variant=label]:text-xs data-[variant=legend]:text-xs',
        'field-group': 'gap-10 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        field: 'data-[invalid=true]:text-destructive gap-3',
        'field-content': 'gap-1',
        'field-label':
          'has-data-checked:bg-primary/5 has-data-checked:border-primary/30 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10 gap-2 group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-muted/50 has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/30 has-[>[data-slot=field]]:has-[:focus-visible]:ring-2 *:data-[slot=field]:p-4 leading-relaxed',
        'field-label-aria':
          'has-data-selected:bg-primary/5 has-data-selected:border-primary/30 dark:has-data-selected:border-primary/20 dark:has-data-selected:bg-primary/10',
        'field-title':
          'gap-2 group-data-[disabled=true]/field:opacity-50 leading-normal font-semibold uppercase in-data-[slot=field-label]:font-semibold text-xs',
        'field-description':
          'text-muted-foreground text-left text-sm [[data-variant=legend]+&]:-mt-1.5 normal-case tracking-normal',
        'field-separator': '-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
        'field-separator-content': 'text-muted-foreground px-2',
        'field-error': 'text-destructive text-sm',
      },
    },
    rhea: {
      sha256: 'bac4eff75a0e21d9dd90ce40634937f54730471d8f7fa50ca67b317892cf908f',
      rules: {
        'field-set':
          'gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        'field-legend':
          'mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base',
        'field-group': 'gap-6 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        field: 'data-[invalid=true]:text-destructive gap-3',
        'field-content': 'gap-1',
        'field-label':
          'has-data-checked:bg-input/30 gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-2xl has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-input/40 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 *:data-[slot=field]:p-4',
        'field-label-aria': 'has-data-selected:bg-input/30',
        'field-title':
          'gap-2 leading-snug text-sm font-medium group-data-[disabled=true]/field:opacity-50',
        'field-description':
          'text-muted-foreground text-left text-sm [[data-variant=legend]+&]:-mt-1.5',
        'field-separator': '-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
        'field-separator-content': 'text-muted-foreground px-2',
        'field-error': 'text-destructive text-sm',
      },
    },
  },
} as const;
