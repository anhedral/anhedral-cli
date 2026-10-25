import type { ViewStyle } from 'react-native';
import { nativeAlertPresetSource as source } from './_alert-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle, NativeRegistrySource } from './_registry-context';
export type NativeAlertState = NativePresetState & {
  source?: NativeRegistrySource;
  variant?: 'default' | 'destructive';
  hasIcon?: boolean;
  hasAction?: boolean;
  width?: number;
  lineHeightMultiplier?: number;
};
export function nativePresetAlertStyle(
  name: NativeComponentStyle,
  slot: 'root' | 'title' | 'description' | 'action',
  state: NativeAlertState,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4',
    family = frozen
      ? name
      : state.source === 'aria' || state.source === 'radix'
        ? state.source
        : 'base';
  const definition = source.sources[family],
    legacy = family === 'default' || family === 'new-york',
    variant = state.variant ?? 'default';
  if (variant !== 'default' && variant !== 'destructive')
    throw Error('Unknown native Alert variant: ' + variant);
  const recipes = definition.recipes.alertVariants,
    owner =
      slot === 'root'
        ? 'Alert'
        : slot === 'title'
          ? 'AlertTitle'
          : slot === 'description'
            ? 'AlertDescription'
            : 'AlertAction';
  const slots: Readonly<Record<string, readonly { classes: string }[]>> = definition.slots;
  const entry = slots[owner]?.[0],
    rules: Readonly<Record<string, string>> | undefined = frozen
      ? undefined
      : source.presets[name].rules;
  function expand(classes: string): string[] {
    return classes.split(/\s+/).flatMap((token) => {
      if (!token.startsWith('cn-alert')) return [token];
      const value = rules?.[token.slice(3)];
      if (value === undefined) throw Error('Unreviewed Alert marker: ' + token);
      return value.split(/\s+/);
    });
  }
  const root = expand(recipes.base + ' ' + recipes.variants.variant[variant]);
  const literal =
    slot === 'root' ? root : entry ? expand(entry.classes) : ['absolute', 'top-3', 'right-3'];
  const accentEdges: ViewStyle = {},
    iconTransform: ViewStyle = {};
  let iconCurrent = false;
  const regular: string[] = [],
    iconClasses: string[] = [],
    accentClasses: string[] = [];
  let layout: 'block' | 'grid' = 'block',
    columnGap = 0,
    iconSize: number | undefined,
    forcedIconSize: number | undefined,
    indent = 0,
    firstSiblingY = 0,
    paragraphGap: number | undefined,
    paragraphLeading: number | undefined,
    links = false,
    linkOffset: number | undefined;
  const descriptionColor = root
    .find((token) => token.startsWith('*:data-[slot=alert-description]:'))
    ?.slice('*:data-[slot=alert-description]:'.length);
  for (const original of literal) {
    let token = original,
      enabled = true;
    for (;;) {
      const condition = (
        [
          ['has-data-[slot=alert-action]:', state.hasAction],
          ['has-[>svg]:', state.hasIcon],
          ['group-has-[>svg]/alert:', state.hasIcon],
        ] as const
      ).find(([prefix]) => token.startsWith(prefix));
      if (!condition) break;
      enabled &&= !!condition[1];
      token = token.slice(condition[0].length);
    }
    if (!enabled || token === 'group/alert') continue;
    if (token === 'md:text-pretty') {
      if ((state.width ?? 0) < 768) continue;
      token = 'text-pretty';
    }
    if (token === 'grid') {
      layout = 'grid';
      continue;
    }
    if (
      token.startsWith('grid-cols-') ||
      token === 'col-start-2' ||
      token === 'justify-items-start'
    )
      continue;
    if (token.startsWith('gap-y-')) {
      regular.push('gap-' + token.slice(6));
      continue;
    }
    if (token.startsWith('gap-x-')) {
      columnGap = Number(token.slice(6)) * 4;
      continue;
    }
    if (token.startsWith('has-') || token.startsWith('group-has-'))
      throw Error('Unreviewed Alert condition: ' + token);
    if (token === '[&>svg~*]:pl-7') {
      if (state.hasIcon) indent = 28;
      continue;
    }
    if (token === '[&>svg+div]:translate-y-[-3px]') {
      if (state.hasIcon) firstSiblingY = -3;
      continue;
    }
    if (token.startsWith('*:data-[slot=alert-description]:')) continue;
    const svg = /^(?:\*:\[svg\]|\[&>svg\]):(.+)$/.exec(token);
    const defaultSvg = /^\*:\[svg:not\(\[class\*='size-'\]\)\]:(size-[\d.]+)$/.exec(token);
    if (defaultSvg) {
      iconSize = Number(defaultSvg[1]!.slice(5)) * 4;
      continue;
    }
    if (svg) {
      const value = svg[1]!;
      if (value === 'row-span-2') continue;
      if (value.startsWith('size-')) {
        forcedIconSize = Number(value.slice(5)) * 4;
        continue;
      }
      if (value === 'text-current') {
        iconCurrent = true;
        continue;
      }
      if (/^translate-y-[\d.]+$/.test(value)) {
        iconTransform.transform = [{ translateY: Number(value.slice(12)) * 4 }];
        continue;
      }
      iconClasses.push(value);
      continue;
    }
    if (token.startsWith('after:')) {
      const value = token.slice(6);
      if (value === '-inset-y-px') Object.assign(accentEdges, { top: -1, bottom: -1 });
      else if (value === '-left-px') accentEdges.left = -1;
      else accentClasses.push(value);
      continue;
    }
    const paragraphs = /^\[&_p(?::not\(:last-child\))?\]:(.+)$/.exec(token);
    if (paragraphs) {
      if (paragraphs[1] === 'leading-relaxed') paragraphLeading = 1.625;
      else if (paragraphs[1]!.startsWith('mb-')) paragraphGap = Number(paragraphs[1]!.slice(3)) * 4;
      else throw Error('Unreviewed Alert paragraph rule: ' + token);
      continue;
    }
    if (token === '[&_a]:underline') {
      links = true;
      continue;
    }
    if (token === '[&_a]:hover:text-foreground') {
      links = true;
      continue;
    }
    if (token === '[&_a]:underline-offset-3') {
      linkOffset = 3;
      continue;
    }
    if (token === 'top-[calc(--spacing(1.25))]') token = 'top-1.25';
    if (token === 'right-[calc(--spacing(1.25))]') token = 'right-1.25';
    regular.push(token);
  }
  const fontSize = state.fontSize ?? (family === 'default' ? 16 : 14),
    lineHeight = state.lineHeight ?? fontSize * 1.5;
  const adapt = (classes: string[], text = false) =>
    nativePresetStyle(
      name,
      'alert',
      { base: classes.join(' '), variants: {}, defaultVariants: {}, compoundVariants: [] },
      undefined,
      source.globals.radius,
      {},
      { ...state, hasText: text },
    );
  if (slot === 'description' && descriptionColor) regular.push(descriptionColor);
  const result = adapt(regular, slot === 'title' || slot === 'description');
  if (slot !== 'action') {
    result.text.fontSize ??= fontSize;
    if (
      typeof result.paint.lineHeightMultiplier === 'number' &&
      result.paint.lineHeightMultiplier > 0
    )
      result.text.lineHeight = result.text.fontSize * result.paint.lineHeightMultiplier;
    else if (result.text.lineHeight === undefined) {
      const inheritedMultiplier =
        state.lineHeightMultiplier ?? (state.lineHeight === undefined ? 1.5 : undefined);
      result.text.lineHeight =
        inheritedMultiplier === undefined ? lineHeight : result.text.fontSize * inheritedMultiplier;
      if (inheritedMultiplier !== undefined)
        result.paint.lineHeightMultiplier = inheritedMultiplier;
    }
    if (typeof result.paint.letterSpacingEm === 'number')
      result.text.letterSpacing = result.text.fontSize * result.paint.letterSpacingEm;
  }
  const icon = adapt(iconClasses),
    accent = adapt(accentClasses);
  return {
    ...result,
    source: family,
    legacy,
    layout,
    columnGap,
    rowGap: Number(result.view.gap ?? result.view.rowGap ?? 0),
    icon: {
      ...icon,
      view: { ...icon.view, ...iconTransform },
      current: iconCurrent,
      size: iconSize,
      forcedSize: forcedIconSize,
    },
    accent: { ...accent, view: { ...accent.view, ...accentEdges } },
    indent,
    firstSiblingY,
    paragraphGap,
    paragraphLeading,
    links,
    linkOffset,
  };
}
