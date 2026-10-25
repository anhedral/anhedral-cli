import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
import { nativeGlobalMetrics } from './native-style-metrics.mjs';
export const reviewedAvatarSources = {
  aria: {
    origin: 'apps/v4/registry/bases/aria/ui/avatar.tsx',
    sha256: '87cbda924259089cf0ecb7b29850c268e22b938ec7aba3e9c48021c535a6e6c9',
    slots: {
      Avatar: [
        {
          tag: 'div',
          classes:
            'cn-avatar group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten',
        },
      ],
      AvatarImage: [
        {
          tag: 'img',
          classes:
            'cn-avatar-image peer aspect-square size-full object-cover data-[state=error]:hidden',
        },
      ],
      AvatarFallback: [
        {
          tag: 'div',
          classes:
            'cn-avatar-fallback flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs peer-data-[state=error]:flex peer-[*]:hidden',
        },
      ],
      AvatarBadge: [
        {
          tag: 'span',
          classes:
            'cn-avatar-badge absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
        },
      ],
      AvatarGroup: [
        {
          tag: 'div',
          classes:
            'cn-avatar-group group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
        },
      ],
      AvatarGroupCount: [
        {
          tag: 'div',
          classes:
            'cn-avatar-group-count relative flex shrink-0 items-center justify-center ring-2 ring-background',
        },
      ],
    },
  },
  base: {
    origin: 'apps/v4/registry/bases/base/ui/avatar.tsx',
    sha256: 'd9850dc6f9aaccf9f7aab3c730c3aef62b42ef8cd9404b2d7133f771e14a6cbd',
    slots: {
      Avatar: [
        {
          tag: 'AvatarPrimitive.Root',
          classes:
            'cn-avatar group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten',
        },
      ],
      AvatarImage: [
        {
          tag: 'AvatarPrimitive.Image',
          classes: 'cn-avatar-image aspect-square size-full object-cover',
        },
      ],
      AvatarFallback: [
        {
          tag: 'AvatarPrimitive.Fallback',
          classes:
            'cn-avatar-fallback flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs',
        },
      ],
      AvatarBadge: [
        {
          tag: 'span',
          classes:
            'cn-avatar-badge absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
        },
      ],
      AvatarGroup: [
        {
          tag: 'div',
          classes:
            'cn-avatar-group group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
        },
      ],
      AvatarGroupCount: [
        {
          tag: 'div',
          classes:
            'cn-avatar-group-count relative flex shrink-0 items-center justify-center ring-2 ring-background',
        },
      ],
    },
  },
  default: {
    origin: 'apps/v4/public/r/styles/default/avatar.json#registry/default/ui/avatar.tsx',
    sha256: 'e78b35ed76c67d8ff50603fbe0dfa4fe600097bd860d89e65beea3e16683dad8',
    slots: {
      Avatar: [
        {
          tag: 'AvatarPrimitive.Root',
          classes: 'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        },
      ],
      AvatarImage: [
        {
          tag: 'AvatarPrimitive.Image',
          classes: 'aspect-square h-full w-full',
        },
      ],
      AvatarFallback: [
        {
          tag: 'AvatarPrimitive.Fallback',
          classes: 'flex h-full w-full items-center justify-center rounded-full bg-muted',
        },
      ],
    },
  },
  'new-york': {
    origin: 'apps/v4/public/r/styles/new-york/avatar.json#registry/new-york/ui/avatar.tsx',
    sha256: 'e78b35ed76c67d8ff50603fbe0dfa4fe600097bd860d89e65beea3e16683dad8',
    slots: {
      Avatar: [
        {
          tag: 'AvatarPrimitive.Root',
          classes: 'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        },
      ],
      AvatarImage: [
        {
          tag: 'AvatarPrimitive.Image',
          classes: 'aspect-square h-full w-full',
        },
      ],
      AvatarFallback: [
        {
          tag: 'AvatarPrimitive.Fallback',
          classes: 'flex h-full w-full items-center justify-center rounded-full bg-muted',
        },
      ],
    },
  },
  'new-york-v4': {
    origin: 'apps/v4/registry/new-york-v4/ui/avatar.tsx',
    sha256: '0c5c48b8a1dff4fdc5ff9b6cb79cc9cd138682b7d86868068f571befe9675e88',
    slots: {
      Avatar: [
        {
          tag: 'AvatarPrimitive.Root',
          classes:
            'group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6',
        },
      ],
      AvatarImage: [
        {
          tag: 'AvatarPrimitive.Image',
          classes: 'aspect-square size-full',
        },
      ],
      AvatarFallback: [
        {
          tag: 'AvatarPrimitive.Fallback',
          classes:
            'flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs',
        },
      ],
      AvatarBadge: [
        {
          tag: 'span',
          classes:
            'absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
        },
      ],
      AvatarGroup: [
        {
          tag: 'div',
          classes:
            'group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
        },
      ],
      AvatarGroupCount: [
        {
          tag: 'div',
          classes:
            'relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
        },
      ],
    },
  },
  radix: {
    origin: 'apps/v4/registry/bases/radix/ui/avatar.tsx',
    sha256: 'a85a03da4dba7e7efc440f28fe93408f776fd6fc6390cf68a16faafa790ff724',
    slots: {
      Avatar: [
        {
          tag: 'AvatarPrimitive.Root',
          classes:
            'cn-avatar group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten',
        },
      ],
      AvatarImage: [
        {
          tag: 'AvatarPrimitive.Image',
          classes: 'cn-avatar-image aspect-square size-full object-cover',
        },
      ],
      AvatarFallback: [
        {
          tag: 'AvatarPrimitive.Fallback',
          classes:
            'cn-avatar-fallback flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs',
        },
      ],
      AvatarBadge: [
        {
          tag: 'span',
          classes:
            'cn-avatar-badge absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
        },
      ],
      AvatarGroup: [
        {
          tag: 'div',
          classes:
            'cn-avatar-group group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
        },
      ],
      AvatarGroupCount: [
        {
          tag: 'div',
          classes:
            'cn-avatar-group-count relative flex shrink-0 items-center justify-center ring-2 ring-background',
        },
      ],
    },
  },
};
export function nativeAvatarPresets(inventory) {
  const { globals } = nativeGlobalMetrics(inventory),
    presets = {};
  for (const [name, definition] of Object.entries(reviewedAvatarSources)) {
    const actual = inventory.sources[definition.origin];
    if (
      actual?.sha256 !== definition.sha256 ||
      JSON.stringify(actual.classRecipes) !== JSON.stringify(definition.recipes)
    )
      throw Error('Avatar source changed; renew review: ' + name);
  }
  const expected = [
    'avatar',
    'avatar-image',
    'avatar-fallback',
    'avatar-badge',
    'avatar-group-count',
  ].sort();
  for (const name of ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea']) {
    const sheet = inventory.styleSheets['style-' + name + '.css'];
    if (!sheet || sha256(sheet.content) !== sheet.sha256)
      throw Error('Avatar stylesheet integrity failed: ' + name);
    const content = sheet.content.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...content.matchAll(/^\s*(\.cn-avatar[^{}]*?)\s*\{/gm)].map((m) =>
      m[1].trim(),
    );
    const entries = [
      ...content.matchAll(
        /\.cn-(avatar(?:-image|-fallback|-badge|-group-count)?)\s*\{\s*@apply\s+([^;{}]+);?\s*\}/g,
      ),
    ].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]);
    if (
      selectors.length !== 5 ||
      entries.length !== 5 ||
      JSON.stringify(entries.map((e) => e[0]).sort()) !== JSON.stringify(expected)
    )
      throw Error('Avatar selectors require review: ' + name);
    presets[name] = { sha256: sheet.sha256, rules: Object.fromEntries(entries) };
  }
  return { upstream: inventory.source, globals, sources: reviewedAvatarSources, presets };
}
const target = fileURLToPath(new URL('../assets/ui/native/_avatar-presets.tsx', import.meta.url));
export async function nativeAvatarPresetSource(inventory) {
  return format(
    '// Adapted from shadcn/ui (MIT). Reviewed Avatar source slots, size variants and styles.\nexport const nativeAvatarPresetSource=' +
      JSON.stringify(nativeAvatarPresets(inventory)) +
      ' as const;\n',
    { ...(await resolveConfig(target)), filepath: target },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = await nativeAvatarPresetSource(loadOfficialRegistry());
  if (process.argv.includes('--write')) writeFileSync(target, source);
  else if (readFileSync(target, 'utf8') !== source) throw Error('Avatar source evidence is stale.');
}
