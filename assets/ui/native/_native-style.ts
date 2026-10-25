import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
export function nativeContainerStyle(
  paint: ViewStyle,
  style: StyleProp<ViewStyle>,
): StyleProp<ViewStyle> {
  const own = StyleSheet.flatten(style),
    base = { ...paint };
  if (own?.padding !== undefined)
    for (const key of [
      'paddingHorizontal',
      'paddingVertical',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'paddingStart',
      'paddingEnd',
    ] as const)
      delete base[key];
  if (own?.paddingHorizontal !== undefined)
    for (const key of ['paddingLeft', 'paddingRight', 'paddingStart', 'paddingEnd'] as const)
      delete base[key];
  if (own?.paddingVertical !== undefined) {
    delete base.paddingTop;
    delete base.paddingBottom;
  }
  if (own?.margin !== undefined)
    for (const key of [
      'marginHorizontal',
      'marginVertical',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'marginStart',
      'marginEnd',
    ] as const)
      delete base[key];
  return [base, style];
}
