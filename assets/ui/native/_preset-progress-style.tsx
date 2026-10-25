import { nativeProgressPresetSource as source } from './_progress-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle, NativeRegistrySource } from './_registry-context';
export type NativeProgressState = NativePresetState & { source?: NativeRegistrySource };
export function nativePresetProgressStyle(
  name: NativeComponentStyle,
  slot: 'root' | 'track' | 'indicator' | 'label' | 'value',
  state: NativeProgressState,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  const family = frozen
    ? name
    : state.source === 'aria' || state.source === 'radix'
      ? state.source
      : 'base';
  const definition = source.sources[family],
    compound = family === 'base' || family === 'aria';
  const key =
    slot === 'root'
      ? 'Progress'
      : slot === 'track'
        ? compound
          ? 'ProgressTrack'
          : 'Progress'
        : slot === 'indicator'
          ? compound
            ? 'ProgressIndicator'
            : 'Progress'
          : slot === 'label'
            ? 'ProgressLabel'
            : 'ProgressValue';
  const entries: Readonly<Record<string, readonly { classes: string }[]>> = definition.slots;
  const entry = entries[key]?.[slot === 'indicator' && !compound ? 1 : 0];
  // Optional native compound parts in Radix/frozen families use Base source slots.
  const extension =
    slot === 'label' || slot === 'value'
      ? source.sources.base.slots[slot === 'label' ? 'ProgressLabel' : 'ProgressValue'][0]
      : undefined;
  const classes =
    entry?.classes ??
    (frozen
      ? slot === 'label'
        ? 'text-sm font-medium'
        : 'ml-auto text-sm tabular-nums text-muted-foreground'
      : (extension?.classes ?? ''));
  const rules: Readonly<Record<string, string>> | undefined = frozen
    ? undefined
    : source.presets[name].rules;
  const expanded = classes.split(/\s+/).flatMap((token) => {
    if (token === 'cn-progress-root') return [];
    if (!token.startsWith('cn-progress')) return [token];
    const value = rules?.[token.slice(3)];
    if (value === undefined) throw Error('Unreviewed Progress marker: ' + token);
    return value.split(/\s+/);
  });
  const adapted = expanded
    .filter((token) => token !== 'transition-all')
    .map((token) => (token === 'overflow-x-hidden' ? 'overflow-hidden' : token))
    .join(' ');
  return {
    ...nativePresetStyle(
      name,
      'progress',
      { base: adapted, variants: {}, defaultVariants: {}, compoundVariants: [] },
      undefined,
      source.globals.radius,
      {},
      { ...state, hasText: slot === 'label' || slot === 'value' },
    ),
    source: family,
    compound,
  };
}
