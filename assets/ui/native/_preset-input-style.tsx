import { nativeInputPresetSource } from './_input-presets';
import { nativeTextareaPresetSource } from './_textarea-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import { withAlpha } from './_core';
import type { NativeComponentStyle } from './_registry-context';
const webFiles = new Set([
  'file:inline-flex',
  'file:border-0',
  'file:bg-transparent',
  'file:text-foreground',
  'file:text-sm',
  'file:text-xs',
  'file:text-xs/relaxed',
  'file:font-medium',
  'file:h-6',
  'file:h-7',
]);
const transitions = new Set([
  'transition-[color,box-shadow,background-color]',
  'transition-[color,border-color]',
  'duration-200',
]);
/** Browser file/selection/outline paint has an explicit native policy; unknown classes still fail. */
export function nativePresetInputStyle(
  component: 'input' | 'textarea',
  name: NativeComponentStyle,
  state: NativePresetState & { width: number },
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  const source = component === 'input' ? nativeInputPresetSource : nativeTextareaPresetSource;
  const definition = frozen ? source.classRecipes[name] : source.classRecipes.base;
  const rules = frozen ? undefined : source.presets[name].rules;
  const expanded = definition.recipe.base.split(/\s+/).flatMap((token) => {
    if (token !== 'cn-' + component) return [token];
    if (!rules) throw Error('Missing native input preset CSS');
    return rules.base.split(/\s+/);
  });
  const fileTokens: string[] = [];
  let placeholderTextColor: string | undefined, selectionColor: string | undefined;
  const nativeColor = (value: string) => {
    const [name, alpha] = value.split('/');
    const color = state.colors[name!];
    if (!color) throw Error('Unreviewed native field color: ' + value);
    return alpha === undefined ? color : withAlpha(color, Number(alpha) / 100);
  };
  const projected = expanded.flatMap((original) => {
    let token = original;
    if (token.startsWith('md:')) {
      if (state.width < 768) return [];
      token = token.slice(3);
    }
    if (
      transitions.has(token) ||
      [
        'outline-none',
        'focus-visible:outline-none',
        'disabled:cursor-not-allowed',
        'field-sizing-content',
      ].includes(token)
    )
      return [];
    if (webFiles.has(token)) {
      fileTokens.push(token.slice(5) === 'inline-flex' ? 'flex' : token.slice(5));
      return [];
    }
    if (token.startsWith('placeholder:text-')) {
      placeholderTextColor = nativeColor(token.slice('placeholder:text-'.length));
      return [];
    }
    if (token.startsWith('selection:bg-')) {
      selectionColor = nativeColor(token.slice('selection:bg-'.length));
      return [];
    }
    if (token === 'selection:text-primary-foreground') return []; // Native selection foreground is OS-owned.
    return [token];
  });
  const result = nativePresetStyle(
    name,
    component,
    { base: projected.join(' '), variants: {}, defaultVariants: {}, compoundVariants: [] },
    undefined,
    source.globals.radius,
    {},
    state,
  );
  const file = nativePresetStyle(
    name,
    'file-selector',
    { base: fileTokens.join(' '), variants: {}, defaultVariants: {}, compoundVariants: [] },
    undefined,
    source.globals.radius,
    {},
    { ...state, fontSize: undefined, lineHeight: undefined },
  );
  return { ...result, placeholderTextColor, selectionColor, file };
}
