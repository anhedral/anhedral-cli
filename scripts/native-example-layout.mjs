import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
export const reviewedExampleLayouts = {
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
};
export function nativeExampleLayout(inventory) {
  const { globals } = nativeGlobalMetrics(inventory);
  for (const [name, source] of Object.entries(reviewedExampleLayouts))
    if (inventory.sources[source.origin]?.sha256 !== source.sha256)
      throw Error('Example layout source changed; renew native review: ' + name);
  return {
    upstream: inventory.source,
    globals,
    sources: reviewedExampleLayouts,
    slots: {
      outer: 'w-full bg-muted dark:bg-background',
      wrapper:
        'mx-auto grid min-h-screen w-full max-w-5xl min-w-0 content-center items-start gap-8 p-4 pt-2 sm:gap-12 sm:p-6 md:grid-cols-2 md:gap-8 lg:p-12 2xl:max-w-6xl',
      example: 'mx-auto flex w-full max-w-lg min-w-0 flex-col gap-1 self-stretch lg:max-w-none',
      title: 'px-1.5 py-2 text-xs font-medium text-muted-foreground',
      content:
        "flex min-w-0 flex-1 flex-col items-start gap-6 rounded-xl bg-card p-12 text-foreground style-lyra:rounded-none style-sera:rounded-none *:[div:not([class*='w-'])]:w-full",
    },
  };
}
export async function nativeExampleLayoutSource(inventory) {
  const target = fileURLToPath(
    new URL('../assets/ui/native/_example-layout-source.tsx', import.meta.url),
  );
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed example gallery source slots and metric inputs.\nexport const nativeExampleLayoutSource=' +
      JSON.stringify(nativeExampleLayout(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = fileURLToPath(
      new URL('../assets/ui/native/_example-layout-source.tsx', import.meta.url),
    ),
    source = await nativeExampleLayoutSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source)
    throw Error('Native example layout evidence is stale.');
}
