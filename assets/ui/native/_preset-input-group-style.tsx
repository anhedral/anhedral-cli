import type { TextStyle, ViewStyle } from 'react-native';
import { nativeInputGroupPresetSource as source } from './_input-group-presets';
import { nativePresetStyle, type NativePresetState, type NativeClassRecipe } from './_preset-style';
import type { NativeComponentStyle } from './_registry-context';
export type NativeInputGroupSlot =
  | 'InputGroup'
  | 'InputGroupAddon'
  | 'InputGroupButton'
  | 'InputGroupText'
  | 'InputGroupInput'
  | 'InputGroupTextarea';
export type NativeInputGroupState = NativePresetState & {
  align?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
  size?: 'xs' | 'sm' | 'icon-xs' | 'icon-sm';
  hasInput?: boolean;
  hasTextarea?: boolean;
  hasTextareaAny?: boolean;
  blockStartAny?: boolean;
  blockEndAny?: boolean;
  hasDisabled?: boolean;
  groupDisabled?: boolean;
  inlineStart?: boolean;
  inlineEnd?: boolean;
  blockStart?: boolean;
  blockEnd?: boolean;
  hasButton?: boolean;
  hasKbd?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
  inCombobox?: boolean;
  focusWithin?: boolean;
  inheritedBorderColor?: string;
};
/** Source predicates are explicit native owner state; unreviewed selectors remain errors. */
export function nativePresetInputGroupStyle(
  name: NativeComponentStyle,
  slot: NativeInputGroupSlot,
  state: NativeInputGroupState,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  const definition = source.sources[frozen ? name : 'base'],
    rules = frozen ? undefined : source.presets[name].rules;
  let classes: string;
  if (slot === 'InputGroupAddon' || slot === 'InputGroupButton') {
    const recipe: NativeClassRecipe =
      definition.recipes[
        slot === 'InputGroupAddon' ? 'inputGroupAddonVariants' : 'inputGroupButtonVariants'
      ];
    const key = slot === 'InputGroupAddon' ? 'align' : 'size',
      value = slot === 'InputGroupAddon' ? (state.align ?? 'inline-start') : (state.size ?? 'xs');
    const variant = recipe.variants[key]?.[value];
    if (variant === undefined)
      throw Error('Unreviewed native InputGroup variant: ' + slot + '/' + value);
    classes = recipe.base + ' ' + variant;
  } else classes = definition.slots[slot];
  const expanded = classes.split(/\s+/).flatMap((token) => {
    if (!token.startsWith('cn-input-group')) return [token];
    const key = token === 'cn-input-group' ? 'base' : token.slice('cn-input-group-'.length);
    if (!rules || !(key in rules)) throw Error('Unknown InputGroup stylesheet slot: ' + token);
    return rules[key as keyof typeof rules].split(/\s+/);
  });
  const regular: { token: string; priority: number }[] = [],
    control: string[] = [],
    kbdDirect: string[] = [],
    kbdDescendant: string[] = [];
  let iconSize: number | undefined;
  for (const original of expanded) {
    if (!original) continue;
    let token = original,
      priority = 0,
      enabled = true;
    for (;;) {
      if (token.startsWith('dark:')) {
        enabled &&= state.mode === 'dark';
        token = token.slice(5);
        priority++;
        continue;
      }
      const condition = [
        ['has-[>textarea]:', state.hasTextarea],
        ['has-[textarea]:', state.hasTextareaAny ?? state.hasTextarea],
        ['has-[[data-slot=input-group-control]:focus-visible]:', state.focused],
        ['has-[[data-slot][aria-invalid=true]]:', state.invalid],
        ['has-disabled:', state.hasDisabled],
        ['group-data-[disabled=true]/input-group:', state.groupDisabled],
        ['has-[>[data-align=inline-start]]:', state.inlineStart],
        ['has-[>[data-align=inline-end]]:', state.inlineEnd],
        ['has-[>[data-align=block-start]]:', state.blockStart],
        ['has-[>[data-align=block-end]]:', state.blockEnd],
        ['has-data-[align=block-start]:', state.blockStartAny ?? state.blockStart],
        ['has-data-[align=block-end]:', state.blockEndAny ?? state.blockEnd],
        ['group-has-[>input]/input-group:', state.hasInput],
        ['group-has-[>[data-align=inline-start]]/input-group:', state.inlineStart],
        ['group-has-[>[data-align=inline-end]]/input-group:', state.inlineEnd],
        ['has-[>button]:', state.hasButton],
        ['has-[>kbd]:', state.hasKbd],
        ['has-[>svg]:', state.hasIcon],
        ['[.border-b]:', state.borderBottom],
        ['[.border-t]:', state.borderTop],
        ['in-data-[slot=combobox-content]:', state.inCombobox],
        ['focus-within:', state.focusWithin ?? state.focused],
      ] as const;
      const matched = condition.find(([prefix]) => token.startsWith(prefix));
      if (!matched) break;
      enabled &&= !!matched[1];
      token = token.slice(matched[0].length);
      const prefix = matched[0];
      // Tailwind in-* ancestors use :where (zero specificity). :has retains
      // its attributes/pseudo-classes; direct tag conditions contribute a type selector.
      priority +=
        prefix === 'in-data-[slot=combobox-content]:'
          ? 0
          : prefix === 'has-[[data-slot=input-group-control]:focus-visible]:' ||
              prefix === 'has-[[data-slot][aria-invalid=true]]:'
            ? 2
            : [
                  'has-[>textarea]:',
                  'has-[textarea]:',
                  'has-[>button]:',
                  'has-[>kbd]:',
                  'has-[>svg]:',
                  'group-has-[>input]/input-group:',
                ].includes(prefix)
              ? 0.01
              : 1;
    }
    if (!enabled) continue;
    if (
      [
        'group/input-group',
        'cursor-text',
        'order-first',
        'order-last',
        'resize-none',
        'transition-[color,box-shadow]',
        'transition-[color,border-color]',
        'transition-[color,box-shadow,background-color]',
        'duration-200',
      ].includes(token)
    )
      continue;
    if (token.startsWith('[&>input]:')) {
      if (state.hasInput) control.push(token.slice('[&>input]:'.length));
      continue;
    }
    if (token.startsWith('[&>kbd]:')) {
      kbdDirect.push(token.slice('[&>kbd]:'.length));
      continue;
    }
    if (token.startsWith('**:data-[slot=kbd]:')) {
      kbdDescendant.push(token.slice('**:data-[slot=kbd]:'.length));
      continue;
    }
    const glyph = /^\[&(?:_|>)svg:not\(\[class\*='size-'\]\)\]:size-([\d.]+)$/.exec(token);
    if (glyph) {
      iconSize = Number(glyph[1]) * 4;
      continue;
    }
    if (token === 'border-inherit') token = 'border-native-group-inherited';
    regular.push({ token, priority });
  }
  const normalize = (token: string) => {
    const calc = /^rounded-\[calc\(var\(--radius(?:-(sm|md|lg|xl))?\)-(\d+)px\)\]$/.exec(token);
    if (!calc) return token;
    const factor = calc[1] ? source.globals.radius[calc[1] as 'sm' | 'md' | 'lg' | 'xl'] : 1;
    const legacy = {
      sm: Math.max(0, state.radius - 4),
      md: Math.max(0, state.radius - 2),
      lg: state.radius,
      xl: state.radius + 4,
    };
    const radius =
      calc[1] && (name === 'default' || name === 'new-york')
        ? legacy[calc[1] as keyof typeof legacy]
        : state.radius * factor;
    return 'rounded-[' + Math.max(0, radius - Number(calc[2])) + 'px]';
  };
  const adapt = (tokens: string[], hasText = true) =>
    nativePresetStyle(
      name,
      'input-group',
      {
        base: tokens.map(normalize).join(' '),
        variants: {},
        defaultVariants: {},
        compoundVariants: [],
      },
      undefined,
      source.globals.radius,
      {},
      {
        ...state,
        hasText,
        colors: {
          ...state.colors,
          'native-group-inherited': state.inheritedBorderColor ?? state.colors.border!,
        },
      },
    );
  const result = adapt(
    regular.sort((a, b) => a.priority - b.priority).map((t) => t.token),
    slot !== 'InputGroup' &&
      !(slot === 'InputGroupButton' && state.size?.startsWith('icon')) &&
      state.hasText !== false,
  );
  const kbd = (tokens: string[]): ViewStyle & TextStyle => {
    const next = adapt(tokens);
    const result = { ...next.view, ...next.text };
    if (
      tokens.some((t) => /^text-\[/.test(t)) &&
      !tokens.some((t) => /^(leading-|text-(?:xs|sm|base|lg|xl|[2-9]xl)(?:$|\/))/.test(t))
    )
      delete result.lineHeight;
    return result;
  };
  return {
    ...result,
    classes: regular.map((entry) => normalize(entry.token)).join(' '),
    iconSize,
    control: adapt(control).view,
    kbdDirect: kbd(kbdDirect),
    kbdDescendant: kbd(kbdDescendant),
  };
}
