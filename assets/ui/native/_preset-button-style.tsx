import { nativeButtonPresetSource } from './_button-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle } from './_registry-context';
/** Native slots retain both the component's own CVA classes and the selected source CSS. */
export function nativePresetButtonStyle(
  name: NativeComponentStyle,
  variant: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link',
  size: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg',
  state: NativePresetState,
  additionalClasses = '',
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  return nativePresetStyle(
    name,
    'button',
    frozen
      ? nativeButtonPresetSource.classRecipes[name].recipe
      : nativeButtonPresetSource.classRecipes.base.recipe,
    frozen ? undefined : nativeButtonPresetSource.presets[name]?.rules,
    nativeButtonPresetSource.globals.radius,
    { variant, size },
    state,
    additionalClasses,
  );
}
