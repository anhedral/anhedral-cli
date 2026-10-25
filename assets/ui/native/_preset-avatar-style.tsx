import { nativeAvatarPresetSource as source } from './_avatar-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle, NativeRegistrySource } from './_registry-context';
export type NativeAvatarSlot =
  'Avatar' | 'AvatarImage' | 'AvatarFallback' | 'AvatarBadge' | 'AvatarGroup' | 'AvatarGroupCount';
export type NativeAvatarState = NativePresetState & {
  source?: NativeRegistrySource;
  size?: 'default' | 'sm' | 'lg';
  hasSmall?: boolean;
  hasLarge?: boolean;
};
export function nativePresetAvatarStyle(
  name: NativeComponentStyle,
  slot: NativeAvatarSlot,
  state: NativeAvatarState,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  const family = frozen
    ? name
    : state.source === 'aria' || state.source === 'radix'
      ? state.source
      : 'base';
  const definition = source.sources[family];
  const entries: Readonly<Record<string, readonly { classes: string }[]>> = definition.slots;
  // Group/badge additions do not exist in the two frozen three-export publications.
  const literal = entries[slot]?.[0]?.classes;
  if (literal === undefined)
    throw Error('Avatar slot is absent from upstream ' + family + ': ' + slot);
  const rules: Readonly<Record<string, string>> | undefined = frozen
    ? undefined
    : source.presets[name].rules;
  const tokens = literal.split(/\s+/).flatMap((token) => {
    // This source marker has no stylesheet rule; group behavior is in literal classes.
    if (token === 'cn-avatar-group') return [];
    if (!token.startsWith('cn-avatar')) return [token];
    const value = rules?.[token.slice(3)];
    if (value === undefined) throw Error('Unreviewed Avatar marker: ' + token);
    return value.split(/\s+/);
  });
  const regular: string[] = [];
  let borderOverlay = false,
    groupRing = false,
    overlap = 0,
    iconSize: number | undefined,
    hideIcon = false;
  for (let token of tokens) {
    if (token.startsWith('after:') || token.startsWith('dark:after:')) {
      borderOverlay = true;
      continue;
    }
    if (
      token === 'group/avatar' ||
      token === 'group/avatar-group' ||
      token === 'peer' ||
      token === 'bg-blend-color'
    )
      continue;
    if (token.startsWith('*:data-[slot=avatar]:')) {
      groupRing = true;
      continue;
    }
    if (token === '-space-x-2') {
      overlap = 8;
      continue;
    }
    if (token.startsWith('peer-') || token === 'data-[state=error]:hidden') continue;
    const own = /^data-\[size=(default|sm|lg)\]:(.+)$/.exec(token);
    if (own) {
      if (own[1] !== (state.size ?? 'default')) continue;
      token = own[2]!;
    }
    const parent = /^group-data-\[size=(default|sm|lg)\]\/avatar:(.+)$/.exec(token);
    if (parent) {
      if (parent[1] !== (state.size ?? 'default')) continue;
      token = parent[2]!;
    }
    const group = /^group-has-data-\[size=(sm|lg)\]\/avatar-group:(.+)$/.exec(token);
    if (group) {
      if (!(group[1] === 'sm' ? state.hasSmall : state.hasLarge)) continue;
      token = group[2]!;
    }
    const svg = /^\[&>svg\]:(.+)$/.exec(token);
    if (svg) {
      if (svg[1] === 'hidden') hideIcon = true;
      else if (/^size-[\d.]+$/.test(svg[1]!)) iconSize = Number(svg[1]!.slice(5)) * 4;
      else throw Error('Unreviewed Avatar glyph utility: ' + token);
      continue;
    }
    regular.push(token);
  }
  const paint = nativePresetStyle(
    name,
    'avatar',
    { base: regular.join(' '), variants: {}, defaultVariants: {}, compoundVariants: [] },
    undefined,
    source.globals.radius,
    {},
    { ...state, hasText: slot === 'AvatarFallback' || slot === 'AvatarGroupCount' },
  );
  if (slot === 'AvatarFallback') {
    paint.text.fontSize ??=
      state.fontSize ?? (family === 'default' || family === 'new-york' ? 16 : 14);
    paint.text.lineHeight ??= state.lineHeight ?? paint.text.fontSize * 1.5;
  }
  return { ...paint, source: family, borderOverlay, groupRing, overlap, iconSize, hideIcon };
}
