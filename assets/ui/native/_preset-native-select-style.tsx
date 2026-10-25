import { nativeSelectControlPresetSource as source } from './_native-select-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle, NativeRegistrySource } from './_registry-context';
export type NativeSelectControlState = NativePresetState & {
  size?: 'default' | 'sm';
  source?: NativeRegistrySource;
};
/** The old frozen registries lack NativeSelect; their optional native extension uses New York v4. */
export function nativePresetSelectControlStyle(
  name: NativeComponentStyle,
  slot: 'wrapper' | 'control' | 'icon' | 'option' | 'group',
  state: NativeSelectControlState,
) {
  const frozen = name === 'new-york-v4' || name === 'default' || name === 'new-york',
    family = frozen
      ? 'new-york-v4'
      : state.source === 'aria' || state.source === 'radix'
        ? state.source
        : 'base';
  const definition = source.sources[family],
    index = slot === 'wrapper' ? 0 : slot === 'control' ? 1 : 2;
  const entry =
    slot === 'option'
      ? definition.slots.NativeSelectOption[0]
      : slot === 'group'
        ? definition.slots.NativeSelectOptGroup[0]
        : definition.slots.NativeSelect[index]!;
  const rules: Readonly<Record<string, string>> | undefined = frozen
    ? undefined
    : source.presets[name].rules;
  const expanded = entry.classes.split(/\s+/).flatMap((token) => {
    if (token === 'cn-native-select-wrapper') return [];
    if (!token.startsWith('cn-native-select')) return [token];
    const value = rules?.[token.slice(3)];
    if (value === undefined) throw Error('Unreviewed NativeSelect marker: ' + token);
    return value.split(/\s+/);
  });
  const regular: string[] = [],
    conditional: string[] = [];
  let centerIcon = false,
    iconTranslation: number | undefined;
  for (const original of expanded) {
    let token = original,
      enabled = true,
      conditioned = false;
    for (;;) {
      const rule = (
        [
          ['has-[select:disabled]:', state.disabled],
          ['data-[size=default]:', (state.size ?? 'default') === 'default'],
          ['data-[size=sm]:', state.size === 'sm'],
          ['group-data-[size=sm]/native-select:', state.size === 'sm'],
        ] as const
      ).find(([prefix]) => token.startsWith(prefix));
      if (!rule) break;
      enabled &&= !!rule[1];
      conditioned = true;
      token = token.slice(rule[0].length);
    }
    if (!enabled) continue;
    if (
      [
        'group/native-select',
        'appearance-none',
        'disabled:cursor-not-allowed',
        'duration-200',
        'transition-[color,border-color]',
        'transition-[color,box-shadow,background-color]',
      ].includes(token) ||
      token.startsWith('selection:') ||
      token.startsWith('placeholder:')
    )
      continue;
    if (token === 'top-1/2') {
      centerIcon = true;
      continue;
    }
    if (token === '-translate-y-1/2') {
      iconTranslation = undefined;
      continue;
    }
    if (token === '-translate-y-[calc(--spacing(1.25))]') {
      iconTranslation = -5;
      continue;
    }
    if (token === 'bg-[Canvas]') token = 'bg-native-select-canvas';
    if (token === 'text-[CanvasText]') token = 'text-native-select-canvas-text';
    (conditioned ? conditional : regular).push(token);
  }
  const adapted = nativePresetStyle(
    frozen ? 'new-york-v4' : name,
    'native-select',
    {
      base: [...regular, ...conditional].join(' '),
      variants: {},
      defaultVariants: {},
      compoundVariants: [],
    },
    undefined,
    source.globals.radius,
    {},
    {
      ...state,
      hasText: slot === 'control' || slot === 'option' || slot === 'group',
      colors: {
        ...state.colors,
        'native-select-canvas': state.colors.popover!,
        'native-select-canvas-text': state.colors['popover-foreground']!,
      },
    },
  );
  const height = typeof adapted.view.height === 'number' ? adapted.view.height : 16;
  return {
    ...adapted,
    text: {
      ...adapted.text,
      color: typeof adapted.text.color === 'string' ? adapted.text.color : undefined,
    },
    source: family,
    centerIcon,
    iconTranslation: iconTranslation ?? -height / 2,
  };
}
