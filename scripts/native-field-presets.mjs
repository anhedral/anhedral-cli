import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
export const reviewedFieldSources = {
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/field.tsx',
    sha256: '1019104c41eaef8ffae109e2ece95be87a7a637e3a9bac049d7a9fb54bfb7275',
    slots: {
      FieldSet: [
        {
          tag: 'fieldset',
          classes: 'cn-field-set flex flex-col',
        },
      ],
      FieldLegend: [
        {
          tag: 'legend',
          classes: 'cn-field-legend',
        },
      ],
      FieldGroup: [
        {
          tag: 'div',
          classes: 'cn-field-group group/field-group @container/field-group flex w-full flex-col',
        },
      ],
      Field: [
        {
          tag: 'div',
          recipe: 'fieldVariants',
          classes: '',
        },
      ],
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
      FieldTitle: [
        {
          tag: 'div',
          classes: 'cn-field-title flex w-fit items-center',
        },
      ],
      FieldDescription: [
        {
          tag: 'p',
          classes:
            'cn-field-description leading-normal font-normal group-has-data-horizontal/field:text-balance last:mt-0 nth-last-2:-mt-1 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      FieldSeparator: [
        {
          tag: 'div',
          classes: 'cn-field-separator relative',
        },
        {
          tag: 'Separator',
          classes: 'absolute inset-0 top-1/2',
        },
        {
          tag: 'span',
          classes: 'cn-field-separator-content relative mx-auto block w-fit bg-background',
        },
      ],
      content: [
        {
          tag: 'ul',
          classes: 'ml-4 flex list-disc flex-col gap-1',
        },
      ],
      FieldError: [
        {
          tag: 'div',
          classes: 'cn-field-error font-normal',
        },
      ],
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
        defaultVariants: {
          orientation: 'vertical',
        },
        compoundVariants: [],
      },
    },
  },
  base: {
    origin: 'apps/v4/registry/bases/base/ui/field.tsx',
    sha256: 'e7305c507a3f777b0193045fdd5ebfb1c58020d3d8e0821cb9e8d19b203576b9',
    slots: {
      FieldSet: [
        {
          tag: 'fieldset',
          classes: 'cn-field-set flex flex-col',
        },
      ],
      FieldLegend: [
        {
          tag: 'legend',
          classes: 'cn-field-legend',
        },
      ],
      FieldGroup: [
        {
          tag: 'div',
          classes: 'cn-field-group group/field-group @container/field-group flex w-full flex-col',
        },
      ],
      Field: [
        {
          tag: 'div',
          recipe: 'fieldVariants',
          classes: '',
        },
      ],
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
      FieldTitle: [
        {
          tag: 'div',
          classes: 'cn-field-title flex w-fit items-center',
        },
      ],
      FieldDescription: [
        {
          tag: 'p',
          classes:
            'cn-field-description leading-normal font-normal group-has-data-horizontal/field:text-balance last:mt-0 nth-last-2:-mt-1 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      FieldSeparator: [
        {
          tag: 'div',
          classes: 'cn-field-separator relative',
        },
        {
          tag: 'Separator',
          classes: 'absolute inset-0 top-1/2',
        },
        {
          tag: 'span',
          classes: 'cn-field-separator-content relative mx-auto block w-fit bg-background',
        },
      ],
      content: [
        {
          tag: 'ul',
          classes: 'ml-4 flex list-disc flex-col gap-1',
        },
      ],
      FieldError: [
        {
          tag: 'div',
          classes: 'cn-field-error font-normal',
        },
      ],
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
        defaultVariants: {
          orientation: 'vertical',
        },
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
          classes: 'mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm',
        },
      ],
      FieldGroup: [
        {
          tag: 'div',
          classes:
            'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
        },
      ],
      Field: [
        {
          tag: 'div',
          recipe: 'fieldVariants',
          classes: '',
        },
      ],
      FieldContent: [
        {
          tag: 'div',
          classes: 'group/field-content flex flex-1 flex-col gap-1.5 leading-snug',
        },
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
        {
          tag: 'Separator',
          classes: 'absolute inset-0 top-1/2',
        },
        {
          tag: 'span',
          classes: 'bg-background text-muted-foreground relative mx-auto block w-fit px-2',
        },
      ],
      content: [
        {
          tag: 'ul',
          classes: 'ml-4 flex list-disc flex-col gap-1',
        },
      ],
      FieldError: [
        {
          tag: 'div',
          classes: 'text-destructive text-sm font-normal',
        },
      ],
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
        defaultVariants: {
          orientation: 'vertical',
        },
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
          classes: 'mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm',
        },
      ],
      FieldGroup: [
        {
          tag: 'div',
          classes:
            'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
        },
      ],
      Field: [
        {
          tag: 'div',
          recipe: 'fieldVariants',
          classes: '',
        },
      ],
      FieldContent: [
        {
          tag: 'div',
          classes: 'group/field-content flex flex-1 flex-col gap-1.5 leading-snug',
        },
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
        {
          tag: 'Separator',
          classes: 'absolute inset-0 top-1/2',
        },
        {
          tag: 'span',
          classes: 'bg-background text-muted-foreground relative mx-auto block w-fit px-2',
        },
      ],
      content: [
        {
          tag: 'ul',
          classes: 'ml-4 flex list-disc flex-col gap-1',
        },
      ],
      FieldError: [
        {
          tag: 'div',
          classes: 'text-destructive text-sm font-normal',
        },
      ],
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
        defaultVariants: {
          orientation: 'vertical',
        },
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
          classes: 'mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm',
        },
      ],
      FieldGroup: [
        {
          tag: 'div',
          classes:
            'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
        },
      ],
      Field: [
        {
          tag: 'div',
          recipe: 'fieldVariants',
          classes: '',
        },
      ],
      FieldContent: [
        {
          tag: 'div',
          classes: 'group/field-content flex flex-1 flex-col gap-1.5 leading-snug',
        },
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
        {
          tag: 'Separator',
          classes: 'absolute inset-0 top-1/2',
        },
        {
          tag: 'span',
          classes: 'relative mx-auto block w-fit bg-background px-2 text-muted-foreground',
        },
      ],
      content: [
        {
          tag: 'ul',
          classes: 'ml-4 flex list-disc flex-col gap-1',
        },
      ],
      FieldError: [
        {
          tag: 'div',
          classes: 'text-sm font-normal text-destructive',
        },
      ],
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
        defaultVariants: {
          orientation: 'vertical',
        },
        compoundVariants: [],
      },
    },
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/field.tsx',
    sha256: 'afcc19444bd161b637a9a0bbc42199c4af281ca12babc34e49e5923fc0539f1b',
    slots: {
      FieldSet: [
        {
          tag: 'fieldset',
          classes: 'cn-field-set flex flex-col',
        },
      ],
      FieldLegend: [
        {
          tag: 'legend',
          classes: 'cn-field-legend',
        },
      ],
      FieldGroup: [
        {
          tag: 'div',
          classes: 'cn-field-group group/field-group @container/field-group flex w-full flex-col',
        },
      ],
      Field: [
        {
          tag: 'div',
          recipe: 'fieldVariants',
          classes: '',
        },
      ],
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
      FieldTitle: [
        {
          tag: 'div',
          classes: 'cn-field-title flex w-fit items-center',
        },
      ],
      FieldDescription: [
        {
          tag: 'p',
          classes:
            'cn-field-description leading-normal font-normal group-has-data-horizontal/field:text-balance last:mt-0 nth-last-2:-mt-1 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
        },
      ],
      FieldSeparator: [
        {
          tag: 'div',
          classes: 'cn-field-separator relative',
        },
        {
          tag: 'Separator',
          classes: 'absolute inset-0 top-1/2',
        },
        {
          tag: 'span',
          classes: 'cn-field-separator-content relative mx-auto block w-fit bg-background',
        },
      ],
      content: [
        {
          tag: 'ul',
          classes: 'ml-4 flex list-disc flex-col gap-1',
        },
      ],
      FieldError: [
        {
          tag: 'div',
          classes: 'cn-field-error font-normal',
        },
      ],
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
        defaultVariants: {
          orientation: 'vertical',
        },
        compoundVariants: [],
      },
    },
  },
};
export function nativeFieldPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory),
    presets = {};
  for (const [name, definition] of Object.entries(reviewedFieldSources)) {
    const actual = inventory.sources[definition.origin];
    if (
      actual?.sha256 !== definition.sha256 ||
      JSON.stringify(actual.classRecipes) !== JSON.stringify(definition.recipes)
    )
      throw Error('Field source changed; renew review: ' + name);
  }
  const expected = [
    'field',
    'field-content',
    'field-description',
    'field-error',
    'field-group',
    'field-label',
    'field-label-aria',
    'field-legend',
    'field-separator',
    'field-separator-content',
    'field-set',
    'field-title',
  ].sort();
  for (const name of ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea']) {
    const sheet = inventory.styleSheets['style-' + name + '.css'];
    if (!sheet || sha256(sheet.content) !== sheet.sha256)
      throw Error('Field stylesheet integrity failed: ' + name);
    const content = sheet.content.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...content.matchAll(/^\s*(\.cn-field[^{}]*?)\s*\{/gm)].map((m) =>
      m[1].trim(),
    );
    const entries = [
      ...content.matchAll(/\.cn-(field[\w-]*)\s*\{\s*@apply\s+([^;{}]+);?\s*\}/g),
    ].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]);
    if (
      selectors.length !== 12 ||
      entries.length !== 12 ||
      JSON.stringify(entries.map((e) => e[0]).sort()) !== JSON.stringify(expected)
    )
      throw Error('Field selectors require review: ' + name);
    presets[name] = { sha256: sheet.sha256, rules: Object.fromEntries(entries) };
  }
  return { upstream: inventory.source, globals, sources: reviewedFieldSources, presets };
}
const target = fileURLToPath(new URL('../assets/ui/native/_field-presets.tsx', import.meta.url));
export async function nativeFieldPresetSource(inventory) {
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed Field source slots, size variants and styles.\nexport const nativeFieldPresetSource=' +
      JSON.stringify(nativeFieldPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = await nativeFieldPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source) throw Error('Field source evidence is stale.');
}
