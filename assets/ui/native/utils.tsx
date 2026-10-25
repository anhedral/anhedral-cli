import {
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
/** Native styles replace Tailwind CSS class-string composition in Expo sources. */
export function nativeStyles<T extends ViewStyle | TextStyle | ImageStyle>(
  ...styles: StyleProp<T>[]
): T {
  return (StyleSheet.flatten(styles) ?? {}) as T;
}
