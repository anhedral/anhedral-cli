import { nativeItemPresetSource as source } from './_item-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle, NativeRegistrySource } from './_registry-context';
export type NativeItemSlot =
  | 'Item'
  | 'ItemGroup'
  | 'ItemSeparator'
  | 'ItemMedia'
  | 'ItemContent'
  | 'ItemTitle'
  | 'ItemDescription'
  | 'ItemActions'
  | 'ItemHeader'
  | 'ItemFooter';
export type NativeItemState = NativePresetState & {
  source?: NativeRegistrySource;
  variant?: 'default' | 'outline' | 'muted';
  size?: 'default' | 'sm' | 'xs';
  mediaVariant?: 'default' | 'icon' | 'image';
  hasDescription?: boolean;
  previousContent?: boolean;
  inMenu?: boolean;
  hasSmall?: boolean;
  hasExtraSmall?: boolean;
};
export function nativePresetItemStyle(
  name: NativeComponentStyle,
  slot: NativeItemSlot,
  state: NativeItemState,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4',
    family = frozen
      ? name
      : state.source === 'aria' || state.source === 'radix'
        ? state.source
        : 'base',
    definition = source.sources[family];
  const entry = definition.slots[slot][0],
    recipe =
      slot === 'Item'
        ? definition.recipes.itemVariants
        : slot === 'ItemMedia'
          ? definition.recipes.itemMediaVariants
          : undefined;
  const classes: string[] = [];
  if (recipe) {
    classes.push(recipe.base);
    const requested =
      slot === 'Item'
        ? { variant: state.variant ?? 'default', size: state.size ?? 'default' }
        : { variant: state.mediaVariant ?? 'default' };
    for (const [key, value] of Object.entries(requested)) {
      const group: Readonly<Record<string, string>> | undefined = (
        recipe.variants as Readonly<Record<string, Readonly<Record<string, string>>>>
      )[key];
      const selected = group?.[value];
      if (selected === undefined)
        throw Error('Unknown native Item ' + family + '/' + slot + '/' + key + '/' + value);
      classes.push(selected);
    }
  } else classes.push(entry.classes);
  const rules: Readonly<Record<string, string>> | undefined = frozen
    ? undefined
    : source.presets[name].rules;
  const tokens = classes
    .flatMap((part) => part.split(/\s+/))
    .flatMap((token) => {
      if (!token.startsWith('cn-item')) return [token];
      const found = rules?.[token.slice(3)];
      if (found === undefined) throw Error('Unreviewed Item marker: ' + token);
      return found.split(/\s+/);
    });
  const regular: string[] = [];
  let iconSize: number | undefined,
    iconPointerEvents = false,
    imageFull = false,
    imageCover = false,
    adjacentContent = false,
    links = false,
    menuPadding = false;
  for (let token of tokens) {
    if (token === 'group/item' || token === 'group/item-group') continue;
    const size = /^group-data-\[size=(default|sm|xs)\]\/item:(.+)$/.exec(token);
    if (size) {
      if (size[1] !== state.size) continue;
      token = size[2]!;
    }
    const hasSize = /^has-data-\[size=(sm|xs)\]:(.+)$/.exec(token);
    if (hasSize) {
      if (!(hasSize[1] === 'sm' ? state.hasSmall : state.hasExtraSmall)) continue;
      token = hasSize[2]!;
    }
    const description =
      /^group-has-(?:data-\[slot=item-description\]|\[\[data-slot=item-description\]\])\/item:(.+)$/.exec(
        token,
      );
    if (description) {
      if (!state.hasDescription) continue;
      token = description[1]!;
    }
    if (token === 'in-data-[slot=dropdown-menu-content]:p-0') {
      if (state.inMenu) {
        regular.push('p-0');
        menuPadding = true;
      }
      continue;
    }
    if (token === '[&+[data-slot=item-content]]:flex-none') {
      adjacentContent = true;
      if (state.previousContent) regular.push('flex-none');
      continue;
    }
    if (token === '[&_svg]:pointer-events-none') {
      iconPointerEvents = true;
      continue;
    }
    const glyph = /^\[&_svg:not\(\[class\*='size-'\]\)\]:(size-[\d.]+)$/.exec(token);
    if (glyph) {
      iconSize = Number(glyph[1]!.slice(5)) * 4;
      continue;
    }
    if (token === '[&_img]:size-full') {
      imageFull = true;
      continue;
    }
    if (token === '[&_img]:object-cover') {
      imageCover = true;
      continue;
    }
    if (
      token === '[&>a]:underline' ||
      token === '[&>a]:underline-offset-4' ||
      token === '[&>a:hover]:text-primary'
    ) {
      links = true;
      continue;
    }
    regular.push(token);
  }
  const paint = nativePresetStyle(
    name,
    'item',
    { base: regular.join(' '), variants: {}, defaultVariants: {}, compoundVariants: [] },
    undefined,
    source.globals.radius,
    {},
    { ...state, hasText: slot !== 'ItemMedia' },
  );
  if (menuPadding)
    Object.assign(paint.view, {
      padding: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingStart: 0,
      paddingEnd: 0,
    });
  return {
    ...paint,
    source: family,
    iconSize,
    iconPointerEvents,
    imageFull,
    imageCover,
    adjacentContent,
    links,
  };
}
