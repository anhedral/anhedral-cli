import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useState,
  useCallback,
  useId,
  useLayoutEffect,
  type ReactNode,
  type Ref,
} from 'react';
import { View, useWindowDimensions, type ViewProps, type TextProps, type Text } from 'react-native';
import { LabelText, nativeComponent, plainText } from './_core';
import { useTheme } from '../theme';
import { useLocale } from './direction';
import { useNativeField } from './_field-context';
import { useNativeComponentStyle, useNativeRegistrySource } from './_registry-context';
import { nativePresetProgressStyle } from './_preset-progress-style';
type ProgressState = {
  value: number | null;
  min: number;
  max: number;
  percent: number | null;
  formatted: string;
  valueText: string | undefined;
  source: string;
  registerLabel: (id: string, label: string) => () => void;
};
const Context = createContext<ProgressState | null>(null);
function useProgress() {
  const state = useContext(Context);
  if (!state) throw Error('Progress parts require Progress.');
  return state;
}
function useStyle(slot: Parameters<typeof nativePresetProgressStyle>[1]) {
  const theme = useTheme(),
    requested = useNativeComponentStyle(),
    origin = useNativeRegistrySource(),
    window = useWindowDimensions();
  const preset =
    origin === 'default' || origin === 'new-york' || origin === 'new-york-v4'
      ? origin
      : (requested ?? 'nova');
  return nativePresetProgressStyle(preset, slot, {
    ...theme,
    source: origin,
    fontScale: window.fontScale,
  });
}
function labelOf(children: ReactNode): string {
  return Children.toArray(children)
    .map((node) => {
      if (!isValidElement<{ children?: ReactNode }>(node)) return '';
      return nativeComponent(node.type) === ProgressLabel
        ? plainText(node.props.children)
        : labelOf(node.props.children);
    })
    .filter(Boolean)
    .join(' ');
}
export type ProgressProps = ViewProps & {
  ref?: Ref<View>;
  value?: number | null;
  min?: number;
  max?: number;
  minValue?: number;
  maxValue?: number;
  isIndeterminate?: boolean;
  locale?: string;
  format?: Intl.NumberFormatOptions;
  formatOptions?: Intl.NumberFormatOptions;
  valueLabel?: string;
  getAriaValueText?: (formattedValue: string, value: number | null) => string;
  getValueLabel?: (value: number, max: number) => string;
};
export function Progress({
  value = 0,
  min,
  minValue,
  max,
  maxValue,
  isIndeterminate = false,
  locale,
  format,
  formatOptions,
  valueLabel,
  getAriaValueText,
  getValueLabel,
  children,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityValue,
  accessibilityState,
  ...props
}: ProgressProps) {
  const source = useStyle('root'),
    inherited = useLocale(),
    field = useNativeField();
  const [labels, setLabels] = useState<Record<string, string>>({});
  const registerLabel = useCallback((id: string, label: string) => {
    setLabels((previous) => (previous[id] === label ? previous : { ...previous, [id]: label }));
    return () =>
      setLabels((previous) => {
        if (!(id in previous)) return previous;
        const next = { ...previous };
        delete next[id];
        return next;
      });
  }, []);
  const minimum = Number.isFinite(minValue ?? min) ? Number(minValue ?? min) : 0;
  const proposed = maxValue ?? max ?? 100,
    maximum =
      Number.isFinite(proposed) &&
      (proposed > minimum ||
        (source.source === 'aria' && maxValue !== undefined && proposed === minimum))
        ? proposed
        : Math.max(100, minimum + 100);
  const current =
    value === null || isIndeterminate
      ? null
      : Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
  const percent =
    current === null
      ? null
      : maximum === minimum
        ? 0
        : (100 * (current - minimum)) / (maximum - minimum);
  // Base UI 1.6 formats raw value/100; Aria 3.51 formats the normalized range.
  // Keep these distinct source contracts when changing the visual progress state.
  const options = source.source === 'aria' ? formatOptions : format;
  const formatted =
    current === null
      ? ''
      : new Intl.NumberFormat(locale ?? inherited.locale, options ?? { style: 'percent' }).format(
          options
            ? options.style === 'percent' && source.source === 'aria'
              ? (percent ?? 0) / 100
              : current
            : source.source === 'aria'
              ? (percent ?? 0) / 100
              : current / 100,
        );
  const labelOverride = source.source === 'aria' ? valueLabel || undefined : valueLabel;
  const valueText =
    source.source === 'aria' && current === null
      ? undefined
      : (labelOverride ??
        (current !== null && getValueLabel
          ? getValueLabel(current, maximum)
          : getAriaValueText
            ? getAriaValueText(formatted, current)
            : current === null
              ? 'indeterminate progress'
              : formatted));
  const state: ProgressState = {
    value: current,
    min: minimum,
    max: maximum,
    percent,
    formatted,
    valueText,
    source: source.source,
    registerLabel,
  };
  // Supporting meters share fields with inputs; external labels need an explicit nativeID.
  const common = {
    ...props,
    accessible: true,
    accessibilityRole: 'progressbar' as const,
    accessibilityLabel:
      accessibilityLabel ??
      (Object.values(labels).filter(Boolean).join(' ') ||
        labelOf(children) ||
        (props.nativeID ? field?.labelFor(props.nativeID) : undefined) ||
        undefined),
    accessibilityHint:
      accessibilityHint ??
      ([props.nativeID ? field?.description : undefined, props.nativeID ? field?.error : undefined]
        .filter(Boolean)
        .join('. ') ||
        undefined),
    accessibilityValue: {
      min: minimum,
      max: maximum,
      ...(current === null ? {} : { now: current }),
      // Android retains old accessibility text when the key disappears; clear it explicitly.
      text: valueText ?? '',
      ...accessibilityValue,
    },
    accessibilityState: { ...accessibilityState, busy: current === null },
  };
  return (
    <Context.Provider value={state}>
      {source.compound ? (
        <View {...common} style={[source.view, style]}>
          {children}
          <ProgressTrack testID={props.testID ? props.testID + '-track' : undefined}>
            <ProgressIndicator testID={props.testID ? props.testID + '-indicator' : undefined} />
          </ProgressTrack>
        </View>
      ) : (
        <ProgressTrack {...common} style={style}>
          <ProgressIndicator testID={props.testID ? props.testID + '-indicator' : undefined} />
        </ProgressTrack>
      )}
    </Context.Provider>
  );
}
export function ProgressTrack({ style, ...props }: ViewProps & { ref?: Ref<View> }) {
  useProgress();
  const source = useStyle('track');
  return <View {...props} style={[source.view, !source.compound && { direction: 'ltr' }, style]} />;
}
export function ProgressIndicator({ style, ...props }: ViewProps & { ref?: Ref<View> }) {
  const state = useProgress(),
    source = useStyle('indicator');
  const percent =
    state.percent === null
      ? state.source === 'aria'
        ? 100
        : 0
      : source.compound
        ? state.percent
        : Math.max(0, Math.min(100, state.value ?? 0));
  const geometry = {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto' as const,
    height: '100%' as const,
    width: `${percent}%` as `${number}%`,
  };
  return (
    <View
      accessible={false}
      {...props}
      style={[source.view, geometry, style, state.source === 'aria' && { width: geometry.width }]}
    />
  );
}
export function ProgressLabel({ style, ...props }: TextProps & { ref?: Ref<Text> }) {
  const source = useStyle('label'),
    state = useProgress(),
    id = useId(),
    label = plainText(props.children);
  useLayoutEffect(() => state.registerLabel(id, label), [state.registerLabel, id, label]);
  return <LabelText {...props} style={[source.view, source.text, style]} />;
}
export function ProgressValue({
  children,
  style,
  ...props
}: Omit<TextProps, 'children'> & {
  ref?: Ref<Text>;
  children?: ReactNode | ((formattedValue: string, value: number | null) => ReactNode);
}) {
  const state = useProgress(),
    source = useStyle('value');
  const display = state.source === 'aria' ? state.valueText : state.formatted;
  const body =
    state.source === 'aria'
      ? display === undefined
        ? undefined
        : typeof children === 'function'
          ? (children as (value: string) => ReactNode)(display)
          : display
      : typeof children === 'function'
        ? children(state.value === null ? 'indeterminate' : (display ?? ''), state.value)
        : state.value === null
          ? null
          : display;
  return (
    <LabelText
      accessible={false}
      {...props}
      accessibilityElementsHidden={state.source === 'base' || undefined}
      importantForAccessibility={state.source === 'base' ? 'no-hide-descendants' : undefined}
      style={[source.view, source.text, style]}
    >
      {body}
    </LabelText>
  );
}
Object.assign(ProgressLabel, { nativeTextSlot: true });
Object.assign(ProgressValue, { nativeTextSlot: true });
