import type { ImageStyle } from 'react-native';
import { nativeCardPresetSource } from './_card-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import { registryStyle } from './_registry-css';
import type { NativeComponentStyle } from './_registry-context';
export type NativeCardSlot =
  | 'Card'
  | 'CardHeader'
  | 'CardTitle'
  | 'CardDescription'
  | 'CardAction'
  | 'CardContent'
  | 'CardFooter';
export type NativeCardState = NativePresetState & {
  size?: 'default' | 'sm';
  spacing?: number;
  hasFooter?: boolean;
  hasChoices?: boolean;
  firstImage?: boolean;
  lastImage?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
};
const structural = new Set([
  'group/card',
  'group/card-header',
  '@container/card-header',
  'grid',
  'auto-rows-min',
  'grid-rows-[auto_auto]',
  'has-data-[slot=card-action]:grid-cols-[1fr_auto]',
  'has-data-[slot=card-description]:grid-rows-[auto_auto]',
  'col-start-2',
  'row-span-2',
  'row-start-1',
  'justify-self-end',
]);
export function nativePresetCardStyle(
  name: NativeComponentStyle,
  slot: NativeCardSlot,
  state: NativeCardState,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  const definition = frozen
    ? nativeCardPresetSource.definitions[name]
    : nativeCardPresetSource.definitions.base;
  const classes = definition.slots[slot as keyof typeof definition.slots];
  // The older registry has no CardAction export; its native companion keeps the shared action flow.
  if (classes === undefined && slot !== 'CardAction')
    throw Error('Missing native Card source slot: ' + name + '/' + slot);
  const preset = frozen ? undefined : nativeCardPresetSource.presets[name],
    spacing = state.spacing ?? preset?.spacing[state.size ?? 'default'];
  if (spacing !== undefined && (!Number.isFinite(spacing) || spacing < 0))
    throw Error('Invalid native Card spacing.');
  const expanded = (classes ?? 'self-start').split(/\s+/).flatMap((token) => {
    if (!token.startsWith('cn-card')) return [token];
    const key = token === 'cn-card' ? 'base' : token.slice(8);
    if (key === 'action') return []; // This source marker has no stylesheet declarations at the pin.
    const value = preset?.rules[key as keyof typeof preset.rules];
    if (value === undefined) throw Error('Unknown Card stylesheet slot: ' + token);
    return value.split(/\s+/);
  });
  if (slot === 'CardContent' && state.hasChoices && preset?.choices)
    expanded.push(...preset.choices.split(/\s+/));
  const imageCorners: { first: string[]; last: string[] } = { first: [], last: [] };
  const projected: string[] = [];
  for (let token of expanded) {
    if (structural.has(token)) continue;
    if (token === 'cn-font-heading') {
      projected.push('font-heading');
      continue;
    }
    if (/^\[--card-spacing:--spacing\([\d.]+\)\]$/.test(token)) continue;
    if (token.startsWith('data-[size=sm]:')) {
      if (state.size !== 'sm') continue;
      token = token.slice('data-[size=sm]:'.length);
    }
    if (/^\[--card-spacing:--spacing\([\d.]+\)\]$/.test(token)) continue;
    if (token.startsWith('group-data-[size=sm]/card:')) {
      if (state.size !== 'sm') continue;
      token = token.slice('group-data-[size=sm]/card:'.length);
    }
    if (token.startsWith('has-data-[slot=card-footer]:')) {
      if (!state.hasFooter) continue;
      token = token.slice('has-data-[slot=card-footer]:'.length);
    }
    if (token.startsWith('has-[>img:first-child]:')) {
      if (!state.firstImage) continue;
      token = token.slice('has-[>img:first-child]:'.length);
    }
    if (token.startsWith('[.border-t]:')) {
      if (!state.borderTop) continue;
      token = token.slice('[.border-t]:'.length);
    }
    if (token.startsWith('[.border-b]:')) {
      if (!state.borderBottom) continue;
      token = token.slice('[.border-b]:'.length);
    }
    const corner = /^\*:\[img:(first|last)-child\]:(.+)$/.exec(token);
    if (corner) {
      imageCorners[corner[1] as 'first' | 'last'].push(corner[2]!);
      continue;
    }
    if (token.includes('(--card-spacing)')) {
      if (spacing === undefined) throw Error('Unbound native Card spacing variable.');
      token = token.replaceAll('(--card-spacing)', '[' + spacing + 'px]');
    }
    projected.push(token);
  }
  const result = nativePresetStyle(
    name,
    'card',
    { base: projected.join(' '), variants: {}, defaultVariants: {}, compoundVariants: [] },
    undefined,
    nativeCardPresetSource.globals.radius,
    {},
    state,
  );
  const corners = (which: 'first' | 'last') => {
    const view = registryStyle(imageCorners[which].join(' '), {
      width: 0,
      radius: state.radius,
      generation: frozen && name !== 'new-york-v4' ? 'legacy' : 'modern',
      radiusScale: nativeCardPresetSource.globals.radius,
      color: (value) => {
        throw Error('Unexpected Card image corner paint: ' + value);
      },
    }).view;
    const corners: Pick<
      ImageStyle,
      | 'borderRadius'
      | 'borderTopLeftRadius'
      | 'borderTopRightRadius'
      | 'borderBottomLeftRadius'
      | 'borderBottomRightRadius'
    > = {};
    for (const key of [
      'borderRadius',
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderBottomLeftRadius',
      'borderBottomRightRadius',
    ] as const)
      if (typeof view[key] === 'number') corners[key] = view[key];
    if (Object.keys(view).length !== Object.keys(corners).length)
      throw Error('Unreviewed native Card image declaration.');
    return corners;
  };
  return { ...result, spacing, imageCorners: { first: corners('first'), last: corners('last') } };
}
