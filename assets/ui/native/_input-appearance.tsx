import { useContext } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';
import { NativeTextStyleContext } from './_core';
import { useNativeFontStyle } from './fonts';
import {
  useNativeComponentStyle,
  useNativeRegistrySource,
  useRegistryPalette,
} from './_registry-context';
import { nativePresetInputStyle } from './_preset-input-style';
const textKeys = new Set([
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'includeFontPadding',
  'letterSpacing',
  'lineHeight',
  'textAlign',
  'textAlignVertical',
  'textDecorationColor',
  'textDecorationLine',
  'textDecorationStyle',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'textTransform',
  'writingDirection',
  'verticalAlign',
  'userSelect',
]);
export function useNativeInputAppearance(
  kind: 'input' | 'textarea',
  style: StyleProp<TextStyle>,
  focused: boolean,
  invalid?: boolean,
  disabled?: boolean,
  enabled = true,
  allowFontScaling = true,
) {
  const { colors, radius, mode } = useTheme();
  const inherited = useContext(NativeTextStyleContext),
    inheritedStyle = StyleSheet.flatten(inherited.style);
  const requested = useNativeComponentStyle(),
    source = useNativeRegistrySource(),
    generation = useRegistryPalette();
  const preset =
    source === 'default' || source === 'new-york' || source === 'new-york-v4'
      ? source
      : generation === 'legacy'
        ? 'default'
        : (requested ?? (source ? 'nova' : undefined));
  const { width, fontScale: nativeFontScale } = useWindowDimensions(),
    fontScale = allowFontScaling ? nativeFontScale : 1,
    own = StyleSheet.flatten(style);
  const adapted =
    enabled && preset
      ? nativePresetInputStyle(kind, preset, {
          colors,
          radius,
          mode,
          width,
          fontScale,
          focused,
          invalid,
          disabled,
          fontSize: own?.fontSize,
          lineHeight: own?.lineHeight,
        })
      : undefined;
  const sourceText =
    adapted?.text && own?.fontSize !== undefined && own.lineHeight === undefined
      ? {
          ...adapted.text,
          lineHeight:
            ((adapted.text.lineHeight ?? (adapted.text.fontSize ?? 16) * 1.5) * own.fontSize) /
            (adapted.text.fontSize ?? 16),
        }
      : adapted?.text;
  const metrics = { ...inheritedStyle, ...sourceText, ...own };
  const weight = metrics.fontWeight === 'bold' ? 700 : Number(metrics.fontWeight) || 400;
  const font = useNativeFontStyle(
    inherited.fontRole ?? 'sans',
    weight,
    metrics.fontStyle === 'italic',
  );
  const ownView = Object.fromEntries(
    Object.entries(own ?? {}).filter(([key]) => !textKeys.has(key)),
  ) as ViewStyle;
  const ownText = Object.fromEntries(
    Object.entries(own ?? {}).filter(([key]) => textKeys.has(key)),
  ) as TextStyle;
  const frame = [
    {
      minHeight: kind === 'textarea' ? 100 : 44,
      borderWidth: 1,
      borderColor: invalid ? colors.destructive : colors.input,
      backgroundColor: colors.background,
      borderRadius: radius,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    adapted && {
      minHeight: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderWidth: 0,
      borderRadius: 0,
      backgroundColor: 'transparent',
    },
    adapted?.view,
    ownView,
  ];
  const text = [
    { fontSize: 16, color: inheritedStyle?.color ?? colors.foreground },
    font,
    sourceText,
    ownText,
  ];
  return {
    colors,
    mode,
    preset,
    adapted,
    font,
    frame,
    text,
    fontScale,
    ownText,
    fontRole: inherited.fontRole ?? 'sans',
  };
}
