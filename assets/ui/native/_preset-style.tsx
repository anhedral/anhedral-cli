import Color from 'colorjs.io';
import { registryStyle } from './_registry-css';
import { withAlpha } from './_core';
import type { NativeComponentStyle } from './_registry-context';
export type NativePresetState = {
  mode: 'light' | 'dark';
  radius: number;
  colors: Record<string, string>;
  fontScale?: number;
  fontSize?: number;
  lineHeight?: number;
  hasText?: boolean;
  hasIcon?: boolean;
  hovered?: boolean;
  isLink?: boolean;
  focused?: boolean;
  invalid?: boolean;
  expanded?: boolean;
  pressed?: boolean;
  hasPopup?: boolean;
  disabled?: boolean;
  inGroup?: boolean;
  iconStart?: boolean;
  iconEnd?: boolean;
};
export type NativeClassRecipe = {
  base: string;
  variants: Readonly<Record<string, Readonly<Record<string, string>>>>;
  defaultVariants: Readonly<Record<string, unknown>>;
  compoundVariants: readonly { when: Readonly<Record<string, unknown>>; className: string }[];
};
/** Reviewed native CVA slots retain authored classes, state precedence and source metrics. */
export function nativePresetStyle(
  name: NativeComponentStyle,
  component: string,
  recipe: NativeClassRecipe,
  rules: Readonly<Record<string, string>> | undefined,
  radiusScale: Readonly<Record<'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl', number>>,
  slots: Readonly<Record<string, string>>,
  state: NativePresetState,
  additionalClasses = '',
) {
  const legacy = name === 'default' || name === 'new-york';
  const classes = [recipe.base];
  for (const [key, value] of Object.entries(slots)) {
    const found = recipe.variants[key]?.[value];
    if (found === undefined)
      throw Error(
        'Unknown native ' + component + ' source slot: ' + name + '/' + key + '/' + value,
      );
    classes.push(found);
  }
  const parameters: Record<string, unknown> = {
    ...recipe.defaultVariants,
    ...Object.fromEntries(Object.entries(state).filter(([, value]) => value !== undefined)),
    ...slots,
  };
  for (const compound of recipe.compoundVariants)
    if (
      Object.entries(compound.when).every(([key, wanted]) => {
        if (!Object.hasOwn(parameters, key))
          throw Error('Unbound native ' + component + ' compound condition: ' + key);
        return Array.isArray(wanted)
          ? wanted.includes(parameters[key])
          : wanted === parameters[key];
      })
    )
      classes.push(compound.className);
  if (additionalClasses) classes.push(additionalClasses);
  const authored = classes
    .flatMap((value) => value.split(/\s+/))
    .flatMap((token) => {
      if (!token.startsWith('cn-' + component)) return [token];
      const key =
        token === 'cn-' + component ? 'base' : token.slice(('cn-' + component + '-').length);
      if (!rules?.[key]) throw Error('Unknown native ' + component + ' CSS selector: ' + token);
      return rules[key]!.split(/\s+/);
    });
  let iconSize: number | undefined;
  const tokens: { token: string; priority: number }[] = [];
  for (const original of authored) {
    let token = original.replace(/!$/, ''),
      enabled = true,
      priority = 0;
    for (;;) {
      const prefix =
        /^(\[a&?\]|dark|hover|focus|focus-visible|aria-invalid|aria-expanded|disabled):(.+)$/.exec(
          token,
        );
      if (!prefix) break;
      priority++;
      enabled &&=
        prefix[1] === '[a]' || prefix[1] === '[a&]'
          ? !!state.isLink
          : prefix[1] === 'dark'
            ? state.mode === 'dark'
            : prefix[1] === 'hover'
              ? !!state.hovered && !state.disabled
              : prefix[1] === 'focus-visible' || prefix[1] === 'focus'
                ? !!state.focused && !state.disabled
                : prefix[1] === 'aria-invalid'
                  ? !!state.invalid
                  : prefix[1] === 'disabled'
                    ? !!state.disabled
                    : !!state.expanded;
      token = prefix[2]!;
    }
    if (!enabled) continue;
    const icon = /^\[&(?:_|>)svg(?:\:not\(\[class\*='size-'\]\))?\]:size-([\d.]+)$/.exec(token);
    if (icon) {
      iconSize = Number(icon[1]) * 4;
      continue;
    }
    if (
      [
        '[&_svg]:pointer-events-none',
        '[&>svg]:pointer-events-none',
        '[&_svg]:shrink-0',
        'outline-none',
        'select-none',
        'whitespace-nowrap',
        'pointer-events-none',
      ].includes(token)
    )
      continue;
    // Native text uses OS underline placement; View owns background/border painting.
    if (
      [
        'underline-offset-4',
        'bg-clip-padding',
        'transition-all',
        'transition-colors',
        'transition-[color,box-shadow]',
      ].includes(token)
    )
      continue;
    const directIcon = /^has-\[>svg\]:(.+)$/.exec(token);
    if (directIcon) {
      if (!state.hasIcon) continue;
      token = directIcon[1]!;
      priority++;
    }
    const placement = /^has-data-\[icon=(inline-start|inline-end)\]:(.+)$/.exec(token);
    if (placement) {
      if (!(placement[1] === 'inline-start' ? state.iconStart : state.iconEnd)) continue;
      token = placement[2]!;
      priority++;
    }
    if (token.startsWith('in-data-[slot=button-group]:')) {
      if (!state.inGroup) continue;
      token = token.slice('in-data-[slot=button-group]:'.length);
      priority++;
    }
    if (token === 'active:not-aria-[haspopup]:translate-y-px') {
      if (state.pressed && !state.hasPopup && !state.disabled)
        tokens.push({ token: 'translate-y-[1px]', priority: 2 });
      continue;
    }
    if (token === 'text-xs/relaxed') {
      tokens.push({ token: 'text-xs', priority }, { token: 'leading-relaxed', priority });
      continue;
    }
    const rounded = /^rounded-(sm|md|lg|xl|2xl|3xl|4xl)$/.exec(token),
      capped = /^rounded-\[min\(var\(--radius-(sm|md|lg|xl|2xl|3xl|4xl)\),(\d+)px\)\]$/.exec(token);
    if (rounded || capped) {
      const key = (rounded?.[1] ?? capped?.[1]) as keyof typeof radiusScale;
      const old = {
        sm: Math.max(0, state.radius - 4),
        md: Math.max(0, state.radius - 2),
        lg: state.radius,
        xl: state.radius + 4,
        '2xl': 16,
        '3xl': 24,
        '4xl': 32,
      };
      const radius = legacy ? old[key] : state.radius * radiusScale[key];
      token = `rounded-[${capped ? Math.min(radius, Number(capped[2])) : radius}px]`;
    }
    if (token === 'rounded-none') token = 'rounded-[0px]';
    if (token === 'bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]')
      token = 'bg-native-secondary-hover';
    if (token === 'ring-[3px]') token = 'ring-3';
    tokens.push({ token, priority });
  }
  const color = (value: string): string => {
    if (value === 'native-secondary-hover')
      return new Color(state.colors.secondary!)
        .mix(state.colors.foreground!, 0.05, { space: 'oklch', outputSpace: 'srgb' })
        .toGamut({ method: 'css' })
        .toString({ format: 'hex' });
    const [key, alpha] = value.split('/');
    const found =
      key === 'transparent' ? 'transparent' : key === 'white' ? '#ffffff' : state.colors[key!];
    if (!found) throw Error('Unbound native preset color: ' + value);
    return alpha === undefined ? found : withAlpha(found, Number(alpha) / 100);
  };
  const result = registryStyle(
    tokens
      .sort((left, right) => left.priority - right.priority)
      .map((entry) => entry.token)
      .join(' '),
    {
      width: 0,
      mode: state.mode,
      radius: state.radius,
      radiusScale,
      color,
      generation: legacy ? 'legacy' : 'modern',
    },
  );
  if (typeof result.paint.letterSpacingEm === 'number')
    result.text.letterSpacing = (result.text.fontSize ?? 14) * result.paint.letterSpacingEm;
  const sourceHeight = result.view.height;
  if (
    state.hasText !== false &&
    !slots.size?.startsWith('icon') &&
    typeof result.view.height === 'number'
  ) {
    const sourceLine = result.text.lineHeight ?? (result.text.fontSize ?? 14) * 1.5;
    const line =
      state.lineHeight ??
      (state.fontSize ? (sourceLine * state.fontSize) / (result.text.fontSize ?? 14) : sourceLine);
    const scale =
      Number.isFinite(state.fontScale) && Number(state.fontScale) > 0 ? state.fontScale! : 1;
    result.view.height = Math.max(
      result.view.height,
      line * scale + Math.max(0, result.view.height - sourceLine),
    );
  }
  return {
    ...result,
    sourceHeight,
    iconSize,
    foreground: typeof result.text.color === 'string' ? result.text.color : undefined,
  };
}
