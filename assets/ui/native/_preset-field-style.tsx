import { nativeFieldPresetSource as source } from './_field-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle, NativeRegistrySource } from './_registry-context';
export type NativeFieldSlot =
  | 'FieldSet'
  | 'FieldLegend'
  | 'FieldGroup'
  | 'Field'
  | 'FieldContent'
  | 'FieldLabel'
  | 'FieldTitle'
  | 'FieldDescription'
  | 'FieldSeparator'
  | 'FieldSeparatorLine'
  | 'FieldSeparatorContent'
  | 'FieldError'
  | 'FieldErrorList';
export type NativeFieldStyleState = NativePresetState & {
  source?: NativeRegistrySource;
  controlID?: string;
  orientation?: 'vertical' | 'horizontal' | 'responsive';
  legendVariant?: 'legend' | 'label';
  groupWidth?: number;
  inLabel?: boolean;
  compound?: boolean;
  hasContent?: boolean;
  choiceGroup?: boolean;
  nestedGroup?: boolean;
  checked?: boolean;
  selected?: boolean;
  previousLegend?: boolean;
  last?: boolean;
  secondLast?: boolean;
  outlineGroup?: boolean;
};
export function nativePresetFieldStyle(
  name: NativeComponentStyle,
  slot: NativeFieldSlot,
  state: NativeFieldStyleState,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4',
    family = frozen
      ? name
      : state.source === 'aria' || state.source === 'radix'
        ? state.source
        : 'base',
    definition = source.sources[family];
  const entry =
    slot === 'FieldSeparatorLine'
      ? definition.slots.FieldSeparator[1]
      : slot === 'FieldSeparatorContent'
        ? definition.slots.FieldSeparator[2]
        : slot === 'FieldErrorList'
          ? definition.slots.content[0]
          : definition.slots[slot][0];
  const recipe = slot === 'Field' ? definition.recipes.fieldVariants : undefined;
  const orientation = state.orientation ?? 'vertical';
  const horizontal =
    orientation === 'horizontal' ||
    (orientation === 'responsive' && (state.groupWidth ?? 0) >= 448);
  let classes = entry.classes;
  if (recipe) {
    const value = recipe.variants.orientation[orientation];
    if (value === undefined) throw Error('Unknown native Field orientation');
    classes = recipe.base + ' ' + value;
  }
  const tokens = classes.split(/\s+/).flatMap((token) => {
    if (!token.startsWith('cn-field')) return [token];
    if (
      [
        'cn-field-orientation-vertical',
        'cn-field-orientation-horizontal',
        'cn-field-orientation-responsive',
      ].includes(token)
    )
      return [];
    const rules: Readonly<Record<string, string>> | undefined = frozen
      ? undefined
      : source.presets[name].rules;
    const rule = rules?.[token.slice(3)];
    if (rule === undefined) throw Error('Unreviewed Field marker: ' + token);
    return rule.split(/\s+/);
  });
  const regular: string[] = [];
  let lineHalf = false,
    childrenAuto = false,
    childrenFull = false,
    labelFlex = false,
    choiceOffset = false,
    childPadding: number | undefined,
    nestedGap: number | undefined,
    links = false;
  for (let token of tokens) {
    if (token === 'top-1/2') {
      lineHalf = true;
      continue;
    }
    if (token.startsWith('in-data-[slot=field-label]:')) {
      if (!state.inLabel) continue;
      token = token.slice('in-data-[slot=field-label]:'.length);
    }
    if (token.startsWith('@md/field-group:')) {
      if ((state.groupWidth ?? 0) < 448) continue;
      token = token.slice('@md/field-group:'.length);
    }
    if (
      [
        'group/field',
        'group/field-group',
        'group/field-content',
        'group/field-label',
        'peer/field-label',
        '@container/field-group',
      ].includes(token)
    )
      continue;
    if (token.startsWith('dark:')) {
      if (state.mode !== 'dark') continue;
      token = token.slice(5);
    }
    const variant = /^data-\[variant=(legend|label)\]:(.+)$/.exec(token);
    if (variant) {
      if ((state.legendVariant ?? 'legend') !== variant[1]) continue;
      token = variant[2]!;
    }
    if (token.startsWith('data-[invalid=true]:')) {
      if (!state.invalid) continue;
      token = token.slice('data-[invalid=true]:'.length);
    }
    if (token.startsWith('group-data-[disabled=true]/field:')) {
      if (!state.disabled) continue;
      token = token.slice('group-data-[disabled=true]/field:'.length);
    }
    if (token === '*:w-full' || token === '[&>*]:w-full') {
      childrenFull = true;
      continue;
    }
    if (token === '*:w-auto' || token === '[&>*]:w-auto') {
      childrenFull = false;
      childrenAuto = true;
      continue;
    }
    if (token === '[&>.sr-only]:w-auto') continue; // Native screen-reader-only hosts own their physical size.
    if (
      token === '*:data-[slot=field-label]:flex-auto' ||
      token === '[&>[data-slot=field-label]]:flex-auto'
    ) {
      labelFlex = true;
      continue;
    }
    if (token.startsWith('has-[>[data-slot=field-content]]:')) {
      if (!state.hasContent) continue;
      token = token.slice('has-[>[data-slot=field-content]]:'.length);
    }
    if (token === '[&>[role=checkbox],[role=radio]]:mt-px') {
      choiceOffset = true;
      continue;
    }
    if (
      token.startsWith('has-[>[data-slot=checkbox-group]]:') ||
      token.startsWith('has-[>[data-slot=radio-group]]:')
    ) {
      if (!state.choiceGroup) continue;
      token = token.slice(token.indexOf(']]:') + 3);
    }
    if (token.startsWith('data-[slot=checkbox-group]:')) {
      if (!state.choiceGroup) continue;
      token = token.slice('data-[slot=checkbox-group]:'.length);
    }
    const nested =
      /^(?:\*:data-\[slot=field-group\]|\[&>\[data-slot=field-group\]\]):gap-(\d+)$/.exec(token);
    if (nested) {
      nestedGap = Number(nested[1]) * 4;
      continue;
    }
    if (token.startsWith('has-[>[data-slot=field]]:')) {
      if (!state.compound) continue;
      token = token.slice('has-[>[data-slot=field]]:'.length);
    }
    if (token.startsWith('not-has-[:disabled,[data-disabled]]:')) {
      if (state.disabled) continue;
      token = token.slice('not-has-[:disabled,[data-disabled]]:'.length);
    }
    if (token.startsWith('has-[:focus-visible]:')) {
      if (!state.focused) continue;
      token = token.slice('has-[:focus-visible]:'.length);
    }
    const checked = /^has-(?:data-checked|data-\[state=checked\]|data-selected):(.+)$/.exec(token);
    if (checked) {
      if (!(token.startsWith('has-data-selected:') ? state.selected : state.checked)) continue;
      token = checked[1]!;
    }
    const pad = /^(?:\*:data-\[slot=field\]|\[&>\[data-slot=field\]\]):p-(\d+)$/.exec(token);
    if (pad) {
      childPadding = Number(pad[1]) * 4;
      continue;
    }
    if (
      token.startsWith('group-has-data-horizontal/field:') ||
      token.startsWith('group-has-[[data-orientation=horizontal]]/field:')
    ) {
      if (!horizontal) continue;
      token = token.slice(token.lastIndexOf(':') + 1);
    }
    if (token.startsWith('[[data-variant=legend]+&]:')) {
      if (!state.previousLegend) continue;
      token = token.slice('[[data-variant=legend]+&]:'.length);
    }
    if (token.startsWith('nth-last-2:')) {
      if (!state.secondLast) continue;
      token = token.slice('nth-last-2:'.length);
    }
    if (token.startsWith('last:')) {
      if (!state.last) continue;
      token = token.slice(5);
    }
    if (token.startsWith('group-data-[variant=outline]/field-group:')) {
      if (!state.outlineGroup) continue;
      token = token.slice('group-data-[variant=outline]/field-group:'.length);
    }
    if (
      ['[&>a]:underline', '[&>a]:underline-offset-4', '[&>a:hover]:text-primary'].includes(token)
    ) {
      links = true;
      continue;
    }
    regular.push(token);
  }
  const paint = nativePresetStyle(
    name,
    'field',
    { base: regular.join(' '), variants: {}, defaultVariants: {}, compoundVariants: [] },
    undefined,
    source.globals.radius,
    {},
    state,
  );
  if (lineHalf) Object.assign(paint.view, { top: '50%', bottom: undefined });
  return {
    ...paint,
    source: family,
    horizontal,
    childrenFull,
    childrenAuto,
    labelFlex,
    choiceOffset,
    childPadding,
    nestedGap,
    links,
  };
}
