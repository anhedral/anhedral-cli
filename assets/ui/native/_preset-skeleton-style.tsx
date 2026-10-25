import { nativeSkeletonPresetSource } from './_skeleton-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
import type { NativeComponentStyle } from './_registry-context';
export function nativePresetSkeletonStyle(name: NativeComponentStyle, state: NativePresetState) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  return nativePresetStyle(
    name,
    'skeleton',
    frozen
      ? nativeSkeletonPresetSource.classRecipes[name].recipe
      : nativeSkeletonPresetSource.classRecipes.base.recipe,
    frozen ? undefined : nativeSkeletonPresetSource.presets[name].rules,
    nativeSkeletonPresetSource.globals.radius,
    {},
    state,
  );
}
