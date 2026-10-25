import Color from 'colorjs.io';
import { nativeButtonPresetSource } from './_button-presets';
import { registryStyle } from './_registry-css';
import { withAlpha } from './_core';
import type { NativeExampleStyle } from './_registry-context';

type State = {
  mode: 'light' | 'dark';
  radius: number;
  colors: Record<string, string>;
  fontScale?: number;
  fontSize?: number;
  lineHeight?: number;
  hasText?: boolean;
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
/** Source-driven button slots only. Other component presets remain explicitly pending. */
export function nativePresetButtonStyle(
  name: NativeExampleStyle,
  variant: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link',
  size: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg',
  state: State,
) {
  const rules = nativeButtonPresetSource.presets[name]?.rules;
  if (
    !rules ||
    !rules[('variant-' + variant) as keyof typeof rules] ||
    !rules[('size-' + size) as keyof typeof rules]
  )
    throw Error('Unknown native button preset slot.');
  let iconSize: number | undefined;
  const tokens: { token: string; priority: number }[] = [];
  for (const original of [
    rules.base,
    rules[('variant-' + variant) as keyof typeof rules],
    rules[('size-' + size) as keyof typeof rules],
  ]
    .join(' ')
    .split(/\s+/)) {
    let token = original,
      enabled = true,
      priority = 0;
    for (;;) {
      const prefix = /^(dark|hover|focus-visible|aria-invalid|aria-expanded):(.+)$/.exec(token);
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
                : !!state.expanded;
      token = prefix[2]!;
    }
    if (!enabled) continue;
    const icon = /^\[&_svg:not\(\[class\*='size-'\]\)\]:size-([\d.]+)$/.exec(token);
    if (icon) {
      iconSize = Number(icon[1]) * 4;
      continue;
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
    // Native text uses the OS underline position; View owns background/border painting.
    if (token === 'underline-offset-4' || token === 'bg-clip-padding') continue;
    if (token === 'text-xs/relaxed') {
      tokens.push({ token: 'text-xs', priority }, { token: 'leading-relaxed', priority });
      continue;
    }
    const rounded = /^rounded-(sm|md|lg|xl|2xl|3xl|4xl)$/.exec(token);
    const capped = /^rounded-\[min\(var\(--radius-(sm|md|lg|xl|2xl|3xl|4xl)\),(\d+)px\)\]$/.exec(
      token,
    );
    if (rounded || capped) {
      const key = (rounded?.[1] ??
        capped?.[1]) as keyof typeof nativeButtonPresetSource.globals.radius;
      const radius = state.radius * nativeButtonPresetSource.globals.radius[key];
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
    const found = key === 'transparent' ? 'transparent' : state.colors[key!];
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
