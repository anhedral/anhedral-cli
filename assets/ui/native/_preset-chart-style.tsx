import { useContext } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import { NativeTextStyleContext } from './_core';
import {
  useNativeComponentStyle,
  useNativeRegistrySource,
  useRegistryPalette,
  type NativeComponentStyle,
} from './_registry-context';
import { nativeChartPresetSource as source } from './_chart-presets';
import { nativePresetStyle, type NativePresetState } from './_preset-style';
export function nativePresetChartStyle(name: NativeComponentStyle, state: NativePresetState) {
  const frozen = name === 'default' || name === 'new-york' || name === 'new-york-v4';
  return nativePresetStyle(
    name,
    'chart-tooltip',
    {
      base: frozen ? source.frozenTooltip : 'cn-chart-tooltip min-w-32 items-start',
      variants: {},
      defaultVariants: {},
      compoundVariants: [],
    },
    frozen ? undefined : { base: source.presets[name].tooltip },
    source.globals.radius,
    {},
    state,
  );
}
/** Explicit source typography replaces browser inheritance; caller textStyle remains last. */
export function useNativeChartStyle(textStyle?: StyleProp<TextStyle>) {
  const theme = useTheme(),
    requested = useNativeComponentStyle(),
    registry = useNativeRegistrySource(),
    palette = useRegistryPalette(),
    inherited = useContext(NativeTextStyleContext);
  const preset =
    registry === 'default' || registry === 'new-york' || registry === 'new-york-v4'
      ? registry
      : palette === 'legacy'
        ? 'new-york'
        : (requested ?? 'nova');
  const tooltip = nativePresetChartStyle(preset, theme);
  return {
    tooltip,
    textContext: inherited,
    text: StyleSheet.flatten([
      inherited.style,
      { fontSize: 12, lineHeight: 16, includeFontPadding: false },
      textStyle,
    ]),
    tooltipText: StyleSheet.flatten([
      inherited.style,
      { includeFontPadding: false },
      tooltip.text,
      textStyle,
    ]),
  };
}
