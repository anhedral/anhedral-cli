import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
export const reviewedAlertSources = {
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/alert.tsx',
    sha256: '639c846b57885d8af4dbdf7ddab7b15fd4d392c051f7496c67e811154e7861d9',
    slots: {
      Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
      AlertTitle: [
        {
          tag: 'div',
          classes:
            'cn-alert-title [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
        },
      ],
      AlertDescription: [
        {
          tag: 'div',
          classes:
            'cn-alert-description [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
        },
      ],
      AlertAction: [{ tag: 'div', classes: 'cn-alert-action' }],
    },
    recipes: {
      alertVariants: {
        base: 'cn-alert group/alert relative w-full',
        variants: {
          variant: {
            default: 'cn-alert-variant-default',
            destructive: 'cn-alert-variant-destructive',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
  base: {
    origin: 'apps/v4/registry/bases/base/ui/alert.tsx',
    sha256: '639c846b57885d8af4dbdf7ddab7b15fd4d392c051f7496c67e811154e7861d9',
    slots: {
      Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
      AlertTitle: [
        {
          tag: 'div',
          classes:
            'cn-alert-title [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
        },
      ],
      AlertDescription: [
        {
          tag: 'div',
          classes:
            'cn-alert-description [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
        },
      ],
      AlertAction: [{ tag: 'div', classes: 'cn-alert-action' }],
    },
    recipes: {
      alertVariants: {
        base: 'cn-alert group/alert relative w-full',
        variants: {
          variant: {
            default: 'cn-alert-variant-default',
            destructive: 'cn-alert-variant-destructive',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/alert.json#registry/default/ui/alert.tsx',
    sha256: 'ed78a053a9db783f48d5dfab7398b630f87c17ed2e237b6f30a3eb153675960c',
    slots: {
      Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
      AlertTitle: [{ tag: 'h5', classes: 'mb-1 font-medium leading-none tracking-tight' }],
      AlertDescription: [{ tag: 'div', classes: 'text-sm [&_p]:leading-relaxed' }],
    },
    recipes: {
      alertVariants: {
        base: 'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
        variants: {
          variant: {
            default: 'bg-background text-foreground',
            destructive:
              'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
  'new-york': {
    origin: 'apps/v4/public/r/styles/new-york/alert.json#registry/new-york/ui/alert.tsx',
    sha256: '5950ac01377e7eedc94b00eb3fee678745e4cc1a72b5343867f0733d07db6660',
    slots: {
      Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
      AlertTitle: [{ tag: 'h5', classes: 'mb-1 font-medium leading-none tracking-tight' }],
      AlertDescription: [{ tag: 'div', classes: 'text-sm [&_p]:leading-relaxed' }],
    },
    recipes: {
      alertVariants: {
        base: 'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
        variants: {
          variant: {
            default: 'bg-background text-foreground',
            destructive:
              'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/alert.tsx',
    sha256: 'd03dcae5cdb63c381c1144ca9a0c49ba0e46466967d7deb94662034042acb034',
    slots: {
      Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
      AlertTitle: [
        { tag: 'div', classes: 'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight' },
      ],
      AlertDescription: [
        {
          tag: 'div',
          classes:
            'col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
        },
      ],
    },
    recipes: {
      alertVariants: {
        base: 'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
        variants: {
          variant: {
            default: 'bg-card text-card-foreground',
            destructive:
              'bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/alert.tsx',
    sha256: '639c846b57885d8af4dbdf7ddab7b15fd4d392c051f7496c67e811154e7861d9',
    slots: {
      Alert: [{ tag: 'div', recipe: 'alertVariants', classes: '' }],
      AlertTitle: [
        {
          tag: 'div',
          classes:
            'cn-alert-title [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
        },
      ],
      AlertDescription: [
        {
          tag: 'div',
          classes:
            'cn-alert-description [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
        },
      ],
      AlertAction: [{ tag: 'div', classes: 'cn-alert-action' }],
    },
    recipes: {
      alertVariants: {
        base: 'cn-alert group/alert relative w-full',
        variants: {
          variant: {
            default: 'cn-alert-variant-default',
            destructive: 'cn-alert-variant-destructive',
          },
        },
        defaultVariants: { variant: 'default' },
        compoundVariants: [],
      },
    },
  },
};
export function nativeAlertPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory),
    presets = {};
  for (const [name, source] of Object.entries(reviewedAlertSources)) {
    const actual = inventory.sources[source.origin];
    if (
      actual?.sha256 !== source.sha256 ||
      JSON.stringify(actual.classRecipes) !== JSON.stringify(source.recipes)
    )
      throw Error('Alert source changed; renew review: ' + name);
    if (
      JSON.stringify(Object.keys(source.recipes.alertVariants.variants.variant).sort()) !==
      JSON.stringify(['default', 'destructive'])
    )
      throw Error('Alert variants require review: ' + name);
  }
  const expected = [
    'alert',
    'alert-variant-default',
    'alert-variant-destructive',
    'alert-title',
    'alert-description',
    'alert-action',
  ].sort();
  for (const name of ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea']) {
    const sheet = inventory.styleSheets['style-' + name + '.css'];
    if (!sheet || sha256(sheet.content) !== sheet.sha256)
      throw Error('Alert stylesheet integrity failed: ' + name);
    const content = sheet.content.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...content.matchAll(/^\s*(\.cn-alert[^{}]*?)\s*\{/gm)]
      .map((m) => m[1].trim())
      .filter((s) => !/^\.cn-alert-dialog(?:-|$)/.test(s));
    const entries = [
      ...content.matchAll(
        /\.cn-(alert(?:-variant-[\w-]+|-title|-description|-action)?)\s*\{\s*@apply\s+([^;{}]+);?\s*\}/g,
      ),
    ].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]);
    if (
      selectors.length !== 6 ||
      entries.length !== 6 ||
      JSON.stringify(entries.map((e) => e[0]).sort()) !== JSON.stringify(expected)
    )
      throw Error('Alert selectors require review: ' + name);
    presets[name] = { sha256: sheet.sha256, rules: Object.fromEntries(entries) };
  }
  return { upstream: inventory.source, globals, sources: reviewedAlertSources, presets };
}
const target = fileURLToPath(new URL('../assets/ui/native/_alert-presets.tsx', import.meta.url));
export async function nativeAlertPresetSource(inventory) {
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed Alert source slots, CVA variants and styles.\nexport const nativeAlertPresetSource=' +
      JSON.stringify(nativeAlertPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = await nativeAlertPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source) throw Error('Alert source evidence is stale.');
}
