import { Platform, type ViewStyle } from 'react-native';
/** RN 0.86 applies color-matrix View filters through a hardware Paint on every supported Android API. */
export const nativeBitmapLayerFilter = Platform.OS === 'android';
export function nativeBitmapFilterStyle(grayscale: boolean, brightness: number): ViewStyle {
  return { filter: [{ grayscale: grayscale ? 1 : 0 }, { brightness }] };
}
