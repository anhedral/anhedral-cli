import { nativeKbdPresetSource as source } from './_kbd-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle } from './_registry-context';
export type NativeKbdSurface = { tooltip?: boolean; inputGroup?: boolean };
export function nativePresetKbdStyle(
  name: NativeComponentStyle,
  part: 'Kbd' | 'KbdGroup',
  state: NativePresetState & NativeKbdSurface,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  const definition = source.sources[frozen ? name : 'base'];
  const slot = part === 'Kbd' ? 'kbd' : 'kbd-group';
  const rule = frozen ? undefined : source.presets[name].rules[slot];
  const classes = definition.classes[part]
    .split(/\s+/)
    .flatMap((token) => (token === 'cn-' + slot ? (rule ?? '').split(/\s+/) : [token]))
    .flatMap((original) => {
      let token = original;
      for (const [selector, enabled] of [
        ['in-data-[slot=tooltip-content]:', state.tooltip],
        ['[[data-slot=tooltip-content]_&]:', state.tooltip],
        ['in-data-[slot=input-group]:', state.inputGroup],
      ] as const) {
        if (token.includes(selector)) {
          if (!enabled) return [];
          token = token.replace(selector, '');
        }
      }
      return [token];
    });
  return nativePresetStyle(
    name,
    slot,
    { base: classes.join(' '), variants: {}, defaultVariants: {}, compoundVariants: [] },
    undefined,
    source.globals.radius,
    {},
    state,
  );
}
