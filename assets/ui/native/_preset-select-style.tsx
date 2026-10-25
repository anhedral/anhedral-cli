import { nativeSelectPresetSource as source } from './_select-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle, NativeRegistrySource } from './_registry-context';
type Slot =
  | keyof typeof source.sources.aria.slots
  | 'SelectItemText'
  | 'SelectScrollUpButton'
  | 'SelectScrollDownButton';
type SourceSlot = {
  tag: string;
  base: string;
  when: readonly { expression: string; classes: string }[];
};
export type NativeSelectState = NativePresetState & {
  source?: NativeRegistrySource;
  size?: 'default' | 'sm';
  position?: 'popper' | 'item-aligned';
  side?: 'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end';
  placeholder?: boolean;
  empty?: boolean;
  translucent?: boolean;
  destructive?: boolean;
};
/** Native owner state replaces the reviewed Select selectors. Unknown classes still fail. */
export function nativePresetSelectStyle(
  name: NativeComponentStyle,
  slot: Slot,
  state: NativeSelectState,
  part = 0,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  const origin = frozen
    ? name
    : state.source === 'aria' || state.source === 'radix'
      ? state.source
      : 'base';
  const definition = source.sources[origin].slots as Partial<Record<Slot, readonly SourceSlot[]>>;
  const entry = definition[slot]?.[part];
  // Base/Radix expose a few headless primitives without a styled source host.
  const headless: Partial<Record<Slot, boolean>> = {
    Select: origin !== 'aria',
    SelectGroup: frozen,
    SelectValue: frozen || origin === 'radix',
    SelectItemText: true,
    SelectList: origin !== 'aria',
    SelectInput: origin !== 'aria',
    SelectEmpty: origin !== 'aria',
  };
  if (!entry && !headless[slot])
    throw Error('Unreviewed Select slot: ' + origin + '/' + slot + '/' + part);
  const classes = [entry?.base ?? ''];
  for (const condition of entry?.when ?? []) {
    if (condition.expression !== 'position === "popper"')
      throw Error('Unreviewed Select predicate: ' + condition.expression);
    if (state.position === 'popper') classes.push(condition.classes);
  }
  const rules: Readonly<Record<string, string>> | undefined = frozen
    ? undefined
    : source.presets[name].rules;
  const expanded = classes
    .flatMap((c) => c.split(/\s+/))
    .flatMap((token) => {
      if (!token.startsWith('cn-')) return [token];
      // These are source markers without declarations in the pinned stylesheet.
      if (['cn-menu-target', 'cn-select-item-indicator-icon', 'cn-select-viewport'].includes(token))
        return [];
      const value = rules?.[token.slice(3)];
      if (value === undefined) throw Error('Unreviewed Select stylesheet marker: ' + token);
      return value.split(/\s+/);
    });
  const regular: string[] = [],
    conditional: string[] = [],
    valueClasses: string[] = [],
    itemTextClasses: string[] = [];
  let iconColor: string | undefined,
    iconSize: number | undefined,
    descendantForeground: string | undefined;
  for (const original of expanded) {
    if (!original || original === 'disabled:cursor-not-allowed') continue;
    let token = original,
      enabled = true,
      conditioned = false;
    for (;;) {
      const conditions = [
        ['data-[size=default]:', (state.size ?? 'default') === 'default'],
        ['data-[size=sm]:', state.size === 'sm'],
        ['data-placeholder:', state.placeholder],
        ['data-[placeholder]:', state.placeholder],
        ['data-disabled:', state.disabled],
        ['data-[disabled]:', state.disabled],
        ['data-focused:', state.focused],
        ['group-data-empty/select-list:', state.empty],
        ['data-[position=popper]:', state.position === 'popper'],
      ] as const;
      const match = conditions.find(([prefix]) => token.startsWith(prefix));
      if (!match) break;
      enabled &&= !!match[1];
      conditioned = true;
      token = token.slice(match[0].length);
    }
    if (!enabled) continue;
    const value = /^\*:data-\[slot=select-value\]:(.+)$/.exec(token);
    if (value) {
      valueClasses.push(value[1]!);
      continue;
    }
    if (token === "[&_svg:not([class*='text-'])]:text-muted-foreground") {
      iconColor = state.colors['muted-foreground'];
      continue;
    }
    const icon = /^\[&_svg:not\(\[class\*='size-'\]\)\]:size-([\d.]+)$/.exec(token);
    if (icon) {
      iconSize = Number(icon[1]) * 4;
      continue;
    }
    // The source backdrop pseudo-element and animation engine are browser paint.
    // Native Modal owns lifecycle/scrolling; surface alpha and native shadows remain.
    if (
      token.startsWith('before:') ||
      /^(?:data-[\w-]+|data-\[[^\]]+\]):(?:animate-|fade-|zoom-|slide-)/.test(token) ||
      token === 'animate-none!' ||
      /^origin-/.test(token) ||
      /^duration-/.test(token) ||
      /^transition-/.test(token)
    )
      continue;
    if (token.startsWith('**:')) continue; // Project the reviewed menu descendants at their physical native owners below.
    if (token === 'not-data-[variant=destructive]:focus:**:text-accent-foreground') {
      if (state.focused && !state.disabled && !state.destructive)
        descendantForeground = state.colors['accent-foreground'];
      continue;
    }
    if (token === '[&>span]:line-clamp-1') continue;
    if (token.startsWith('*:[span]:last:')) {
      itemTextClasses.push(token.slice('*:[span]:last:'.length));
      continue;
    }
    if (
      [
        'isolate',
        'cursor-default',
        'group/select-list',
        'scroll-my-1',
        'scroll-my-1.5',
        '[&::-webkit-search-cancel-button]:hidden',
        'max-h-[inherit]',
        'overflow-x-hidden',
        'overflow-y-auto',
      ].includes(token)
    )
      continue;
    if (/^(?:max-h-|h-|w-|min-w-)(?:\(\-\-|\[.*(?:radix|inherit))/.test(token)) continue; // Measured trigger/viewport dimensions are supplied by the native owner.
    if (token.startsWith('data-[side=')) {
      const m = /^data-\[side=([^\]]+)\]:(.+)$/.exec(token)!;
      if (!/^-?translate-[xy]-1$/.test(m[2]!))
        throw Error('Unreviewed Select side geometry: ' + token);
      // Browser Popper transforms become the native surface's sideOffset contract.
      continue;
    }
    if (token === 'outline-hidden') token = 'outline-none';
    if (token === 'min-w-[8rem]') token = 'min-w-32';
    if (token === 'hidden') {
      if (!state.empty) regular.push(token);
      continue;
    }
    (conditioned ? conditional : regular).push(token);
  }
  if (state.translucent && slot === 'SelectItem' && state.focused)
    conditional.push('bg-foreground/10');
  if (state.translucent && slot === 'SelectSeparator') conditional.push('bg-foreground/5');
  const adapt = (classes: string[], hasText = state.hasText) =>
    nativePresetStyle(
      name,
      'select',
      { base: classes.join(' '), variants: {}, defaultVariants: {}, compoundVariants: [] },
      undefined,
      source.globals.radius,
      {},
      { ...state, hasText },
    );
  const glyph = part > 0 && !entry?.base.includes('cn-select-item-text');
  const result = adapt(
    [...regular, ...conditional],
    glyph || slot === 'SelectSeparator' || slot.startsWith('SelectScroll') ? false : state.hasText,
  );
  return {
    ...result,
    text: {
      ...result.text,
      color: typeof result.text.color === 'string' ? result.text.color : undefined,
    },
    iconSize: iconSize ?? result.iconSize,
    iconColor,
    descendantForeground,
    itemText: adapt(itemTextClasses),
    value: adapt(valueClasses),
    source: origin,
  };
}
