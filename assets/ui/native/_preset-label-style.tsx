import { nativeLabelPresetSource as source } from './_label-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle } from './_registry-context';
import type { NativeControlSlot } from './_field-context';
export function nativePresetLabelStyle(
  name: NativeComponentStyle,
  state: NativePresetState & {
    groupDisabled?: boolean;
    peerDisabled?: boolean;
    peerSlot?: NativeControlSlot;
    source?: 'base' | 'radix' | 'aria';
  },
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  const definition = source.sources[frozen ? name : (state.source ?? 'base')];
  const rules = frozen ? undefined : source.presets[name].rules;
  const tokens = definition.classes
    .split(/\s+/)
    .flatMap((token) =>
      token === 'cn-label' || token === 'cn-label-aria'
        ? (rules?.[token.slice(3) as 'label' | 'label-aria'] ?? '').split(/\s+/)
        : [token],
    );
  const regular: string[] = [],
    conditional: string[] = [];
  let blocksPointerEvents = false;
  for (const original of tokens) {
    let token = original,
      condition = false,
      enabled = true;
    for (const [prefix, active] of [
      ['group-data-[disabled=true]:', state.groupDisabled],
      ['peer-disabled:', state.peerDisabled],
      ['peer-data-disabled:', state.peerDisabled],
      ...(['checkbox', 'radio-group-item', 'switch'] as const).map(
        (slot) => [`peer-data-[slot=${slot}]:`, state.peerSlot === slot] as const,
      ),
    ] as const) {
      if (token.startsWith(prefix)) {
        condition = true;
        enabled = !!active;
        token = token.slice(prefix.length);
        break;
      }
    }
    if (!enabled) continue;
    if (token === 'pointer-events-none') {
      blocksPointerEvents = true;
      continue;
    }
    if (token === 'cursor-not-allowed') continue; // OS pointer cursor policy; disabled target cannot activate.
    (condition ? conditional : regular).push(token);
  }
  const adapted = nativePresetStyle(
    name,
    'label',
    {
      base: [...regular, ...conditional].join(' '),
      variants: {},
      defaultVariants: {},
      compoundVariants: [],
    },
    undefined,
    source.globals.radius,
    {},
    state,
  );
  return { ...adapted, blocksPointerEvents };
}
