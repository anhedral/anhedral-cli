import { nativeEmptyPresetSource as source } from './_empty-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle, NativeRegistrySource } from './_registry-context';
export type NativeEmptySlot =
  'Empty' | 'EmptyHeader' | 'EmptyMedia' | 'EmptyTitle' | 'EmptyDescription' | 'EmptyContent';
export type NativeEmptyState = NativePresetState & {
  source?: NativeRegistrySource;
  variant?: 'default' | 'icon';
  width?: number;
  lineHeightMultiplier?: number;
};
export function nativePresetEmptyStyle(
  name: NativeComponentStyle,
  slot: NativeEmptySlot,
  state: NativeEmptyState,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4',
    family = frozen
      ? name
      : state.source === 'aria' || state.source === 'radix'
        ? state.source
        : 'base';
  const definition = source.sources[family],
    recipe = definition.recipes.emptyMediaVariants,
    variant = state.variant ?? 'default';
  if (variant !== 'default' && variant !== 'icon')
    throw Error('Unknown native Empty variant: ' + variant);
  const rules: Readonly<Record<string, string>> | undefined = frozen
    ? undefined
    : source.presets[name].rules;
  const literal =
    slot === 'EmptyMedia'
      ? recipe.base + ' ' + recipe.variants.variant[variant]
      : definition.slots[slot][0].classes;
  const tokens = literal.split(/\s+/).flatMap((token) => {
    if (token === 'cn-font-heading') return ['font-heading'];
    if (!token.startsWith('cn-empty')) return [token];
    const classes = rules?.[token.slice(3)];
    if (classes === undefined) throw Error('Unreviewed Empty marker: ' + token);
    return classes.split(/\s+/);
  });
  const regular: string[] = [];
  let glyphPointerEvents = false;
  let iconSize: number | undefined,
    links = false,
    linkOffset: number | undefined;
  for (let token of tokens) {
    if (token.startsWith('md:')) {
      if ((state.width ?? 0) < 768) continue;
      token = token.slice(3);
    }
    if (token === '[&_svg]:pointer-events-none') {
      glyphPointerEvents = true;
      continue;
    }
    if (token === '[&_svg]:shrink-0') continue;
    const glyph = /^\[&_svg:not\(\[class\*='size-'\]\)\]:(size-[\d.]+)$/.exec(token);
    if (glyph) {
      iconSize = Number(glyph[1]!.slice(5)) * 4;
      continue;
    }
    if (token === '[&>a]:underline' || token === '[&>a:hover]:text-primary') {
      links = true;
      continue;
    }
    if (token === '[&>a]:underline-offset-4') {
      linkOffset = 4;
      continue;
    }
    regular.push(token);
  }
  const paint = nativePresetStyle(
    name,
    'empty',
    { base: regular.join(' '), variants: {}, defaultVariants: {}, compoundVariants: [] },
    undefined,
    source.globals.radius,
    {},
    { ...state, hasText: slot !== 'EmptyMedia' },
  );
  const fontSize = state.fontSize ?? (family === 'default' ? 16 : 14),
    lineHeight = state.lineHeight ?? fontSize * 1.5;
  paint.text.fontSize ??= fontSize;
  if (typeof paint.paint.lineHeightMultiplier === 'number' && paint.paint.lineHeightMultiplier > 0)
    paint.text.lineHeight = paint.text.fontSize * paint.paint.lineHeightMultiplier;
  else if (paint.text.lineHeight === undefined) {
    const ratio = state.lineHeightMultiplier ?? (state.lineHeight === undefined ? 1.5 : undefined);
    paint.text.lineHeight = ratio === undefined ? lineHeight : paint.text.fontSize * ratio;
    if (ratio !== undefined) paint.paint.lineHeightMultiplier = ratio;
  }
  if (typeof paint.paint.letterSpacingEm === 'number')
    paint.text.letterSpacing = paint.text.fontSize * paint.paint.letterSpacingEm;
  return { ...paint, source: family, iconSize, glyphPointerEvents, links, linkOffset };
}
