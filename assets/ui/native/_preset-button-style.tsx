import Color from 'colorjs.io';
import { nativeButtonPresetSource } from './_button-presets';
import { registryStyle } from './_registry-css';
import { withAlpha } from './_core';
import type { NativeComponentStyle } from './_registry-context';
type State = {
  mode: 'light' | 'dark';
  radius: number;
  colors: Record<string, string>;
  fontScale?: number;
  fontSize?: number;
  lineHeight?: number;
  hasText?: boolean;
  hasIcon?: boolean;
  hovered?: boolean;
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
type ClassRecipe = {
  base: string;
  variants: Readonly<Record<string, Readonly<Record<string, string>>>>;
  defaultVariants: Readonly<Record<string, unknown>>;
  compoundVariants: readonly { when: Readonly<Record<string, unknown>>; className: string }[];
};
/** Native slots retain both the component's own CVA classes and the selected source CSS. */
export function nativePresetButtonStyle(
  name: NativeComponentStyle,
  variant: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link',
  size: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg',
  state: State,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  const legacy = name === 'default' || name === 'new-york';
  const recipe: ClassRecipe = frozen
    ? nativeButtonPresetSource.classRecipes[name].recipe
    : nativeButtonPresetSource.classRecipes.base.recipe;
  const rules: Readonly<Record<string, string>> | undefined = frozen
    ? undefined
    : nativeButtonPresetSource.presets[name]?.rules;
  const variantClasses = recipe.variants.variant?.[variant],
    sizeClasses = recipe.variants.size?.[size];
  if (variantClasses === undefined || sizeClasses === undefined)
    throw Error('Unknown native button source slot: ' + name + '/' + variant + '/' + size);
  const classes = [recipe.base, variantClasses, sizeClasses];
  const parameters: Record<string, unknown> = {
    ...recipe.defaultVariants,
    ...Object.fromEntries(Object.entries(state).filter(([, value]) => value !== undefined)),
    variant,
    size,
  };
  for (const compound of recipe.compoundVariants)
    if (
      Object.entries(compound.when).every(([key, wanted]) => {
        if (!Object.hasOwn(parameters, key))
          throw Error('Unbound native Button compound condition: ' + key);
        return Array.isArray(wanted)
          ? wanted.includes(parameters[key])
          : wanted === parameters[key];
      })
    )
      classes.push(compound.className);
  const authored = classes
    .flatMap((value) => value.split(/\s+/))
    .flatMap((token) => {
      if (!token.startsWith('cn-button')) return [token];
      const key = token === 'cn-button' ? 'base' : token.slice('cn-button-'.length);
      if (!rules?.[key]) throw Error('Unknown native Button CSS selector: ' + token);
      return rules[key]!.split(/\s+/);
    });
  let iconSize: number | undefined;
  const tokens: { token: string; priority: number }[] = [];
  for (const original of authored) {
    let token = original,
      enabled = true,
      priority = 0;
    for (;;) {
      const prefix = /^(dark|hover|focus-visible|aria-invalid|aria-expanded|disabled):(.+)$/.exec(
        token,
      );
      if (!prefix) break;
      priority++;
      enabled &&=
        prefix[1] === 'dark'
          ? state.mode === 'dark'
          : prefix[1] === 'hover'
            ? !!state.hovered && !state.disabled
            : prefix[1] === 'focus-visible'
              ? !!state.focused && !state.disabled
              : prefix[1] === 'aria-invalid'
                ? !!state.invalid
                : prefix[1] === 'disabled'
                  ? !!state.disabled
                  : !!state.expanded;
      token = prefix[2]!;
    }
    if (!enabled) continue;
    const icon = /^\[&_svg(?:\:not\(\[class\*='size-'\]\))?\]:size-([\d.]+)$/.exec(token);
    if (icon) {
      iconSize = Number(icon[1]) * 4;
      continue;
    }
    if (
      [
        '[&_svg]:pointer-events-none',
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
      ['underline-offset-4', 'bg-clip-padding', 'transition-all', 'transition-colors'].includes(
        token,
      )
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
      const key = (rounded?.[1] ??
        capped?.[1]) as keyof typeof nativeButtonPresetSource.globals.radius;
      const old = {
        sm: Math.max(0, state.radius - 4),
        md: Math.max(0, state.radius - 2),
        lg: state.radius,
        xl: state.radius + 4,
        '2xl': 16,
        '3xl': 24,
        '4xl': 32,
      };
      const radius = legacy
        ? old[key]
        : state.radius * nativeButtonPresetSource.globals.radius[key];
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
      color,
      generation: legacy ? 'legacy' : 'modern',
    },
  );
  if (typeof result.paint.letterSpacingEm === 'number')
    result.text.letterSpacing = (result.text.fontSize ?? 14) * result.paint.letterSpacingEm;
  if (
    state.hasText !== false &&
    !size.startsWith('icon') &&
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
    iconSize,
    foreground: typeof result.text.color === 'string' ? result.text.color : undefined,
  };
}
