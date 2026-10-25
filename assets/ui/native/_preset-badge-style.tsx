import { nativeBadgePresetSource } from './_badge-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle } from './_registry-context';
export function nativePresetBadgeStyle(
  name: NativeComponentStyle,
  variant: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link',
  state: NativePresetState,
) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  return nativePresetStyle(
    name,
    'badge',
    frozen
      ? nativeBadgePresetSource.classRecipes[name].recipe
      : nativeBadgePresetSource.classRecipes.base.recipe,
    frozen ? undefined : nativeBadgePresetSource.presets[name]?.rules,
    nativeBadgePresetSource.globals.radius,
    { variant },
    state,
  );
}
