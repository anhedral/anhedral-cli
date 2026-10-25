import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type Ref,
} from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
} from 'react-native';
import type { IOSNativeProps, AndroidNativeProps } from '@react-native-community/datetimepicker';
import { Button } from './button';
import { LabelText } from './_core';
import { OverlayRoot, OverlayContent, OverlayTitle } from './_overlay';
import { composeNativeRefs } from './_slot';
import { useNativeField, useNativeFieldActivation } from './_field-context';
import { useNativeFormConstraint } from './native-form';
import { useNativeActionControl } from './registry-action-form';
import { useNativeInputAppearance } from './_input-appearance';
export function parseNativeTemporal(
  value: string,
  mode: 'date' | 'time',
  today = new Date(),
): Date | undefined {
  if (mode === 'time') {
    if (!Number.isFinite(today.getTime())) return;
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return;
    const date = new Date(today);
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return date;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match || Number(match[1]) < 1) return;
  const year = Number(match[1]),
    month = Number(match[2]) - 1,
    day = Number(match[3]),
    date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : undefined;
}
export function formatNativeTemporal(date: Date, mode: 'date' | 'time'): string {
  if (!Number.isFinite(date.getTime()) || date.getFullYear() < 1 || date.getFullYear() > 9999)
    throw Error('Native temporal controls require a valid Date.');
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return mode === 'time'
    ? pad(date.getHours()) + ':' + pad(date.getMinutes())
    : pad(date.getFullYear(), 4) + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}
export type TemporalInputProps = Omit<ViewProps, 'children' | 'style'> & {
  ref?: Ref<View>;
  type: 'date' | 'time';
  value?: string;
  defaultValue?: string;
  name?: string;
  onChange?: (value: string) => void;
  onChangeText?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
};
const outerLayoutKeys = new Set([
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'minWidth',
  'maxWidth',
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginEnd',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'start',
  'end',
  'zIndex',
  'display',
  'transform',
  'transformOrigin',
]);
export function TemporalInput({
  ref,
  type,
  value,
  defaultValue = '',
  name,
  onChange,
  onChangeText,
  disabled = false,
  invalid,
  required,
  min,
  max,
  placeholder,
  style,
  onFocus,
  onBlur,
  ...props
}: TemporalInputProps) {
  const field = useNativeField(),
    button = useRef<View>(null),
    mounted = useRef(false),
    latest = useRef(disabled);
  latest.current = disabled;
  const control = useNativeActionControl(
    name,
    value,
    defaultValue,
    onChangeText ?? onChange,
    (value) => (value ? [value] : []),
    disabled,
  );
  const [open, setOpen] = useState(false),
    [focused, setFocused] = useState(false),
    [pickerValue, setPickerValue] = useState(new Date()),
    [error, setError] = useState<string>(),
    [Picker, setPicker] = useState<ComponentType<IOSNativeProps | AndroidNativeProps>>();
  const loading = useRef(false),
    draft = useRef(pickerValue);
  const opened = useRef(false),
    activeType = useRef(type),
    currentType = useRef(type),
    currentValue = useRef(control.value),
    commitLatest = useRef<(date: Date) => void>(() => {});
  currentType.current = type;
  currentValue.current = control.value;
  const close = useCallback(() => {
    opened.current = false;
    setOpen(false);
    button.current?.focus();
  }, []);
  const cancel = useCallback(() => {
    if (!mounted.current) return;
    setError(undefined);
    close();
  }, [close]);
  const pickerError = useCallback(() => {
    if (
      !mounted.current ||
      !opened.current ||
      activeType.current !== currentType.current ||
      latest.current
    )
      return;
    setError('The ' + currentType.current + ' picker is unavailable. Try again.');
    close();
  }, [close]);
  const mergedRef = useMemo(() => composeNativeRefs(ref, button), [ref]);
  const nativeChange = useCallback((_: unknown, date: Date) => {
    if (!mounted.current || !opened.current || activeType.current !== currentType.current) return;
    if (Platform.OS === 'android') commitLatest.current(date);
    else draft.current = date;
  }, []);
  useEffect(() => {
    if (opened.current) close();
  }, [type, close]);
  useEffect(() => {
    if (opened.current) {
      const next = parseNativeTemporal(control.value, type);
      if (next) {
        draft.current = next;
        setPickerValue(next);
      }
    }
  }, [control.value, type]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      opened.current = false;
    };
  }, []);
  useEffect(() => {
    if (disabled && opened.current) close();
  }, [disabled, close]);
  const entries = Object.entries(StyleSheet.flatten(style) ?? {}),
    outerStyle = Object.fromEntries(entries.filter(([key]) => outerLayoutKeys.has(key))),
    controlStyle = Object.fromEntries(entries.filter(([key]) => !outerLayoutKeys.has(key)));
  const appearance = useNativeInputAppearance(
    'input',
    controlStyle,
    focused,
    invalid ?? field?.invalid,
    disabled,
  );
  const label =
    props.accessibilityLabel ??
    (field?.labelFor(props.nativeID) || (type === 'date' ? 'Date' : 'Time'));
  function validate(candidate = control.value): string | undefined {
    if (disabled) return;
    if (!candidate) return required ? label + ' is required.' : undefined;
    if (!parseNativeTemporal(candidate, type)) return 'Choose a valid ' + type + '.';
    const lower = min && parseNativeTemporal(min, type) ? min : undefined,
      upper = max && parseNativeTemporal(max, type) ? max : undefined;
    if (type === 'time' && lower && upper && lower > upper) {
      if (candidate > upper && candidate < lower)
        return label + ' must be between ' + lower + ' and ' + upper + ' across midnight.';
      return;
    }
    if (lower && candidate < lower) return label + ' must be at least ' + lower + '.';
    if (upper && candidate > upper) return label + ' must be at most ' + upper + '.';
  }
  async function show() {
    if (latest.current || loading.current || opened.current) return;
    loading.current = true;
    setError(undefined);
    try {
      const module = await import('@react-native-community/datetimepicker');
      if (!mounted.current || latest.current || type !== currentType.current) return;
      const initial = parseNativeTemporal(currentValue.current, type) ?? new Date();
      draft.current = initial;
      setPickerValue(initial);
      activeType.current = type;
      opened.current = true;
      setPicker(() => module.default);
      setOpen(true);
    } catch {
      if (mounted.current && !latest.current)
        setError('The ' + type + ' picker is unavailable. Try again.');
    } finally {
      loading.current = false;
    }
  }
  function commit(date: Date) {
    if (latest.current) return;
    if (!Number.isFinite(date.getTime()) || date.getFullYear() < 1 || date.getFullYear() > 9999) {
      setError('Choose a valid ' + type + '.');
      return;
    }
    const next = formatNativeTemporal(date, type),
      message = validate(next);
    if (message) {
      setError(message);
      if (Platform.OS === 'android') close();
      return;
    }
    control.set(next);
    setError(undefined);
    close();
  }
  commitLatest.current = commit;
  useNativeFieldActivation(
    () => {
      void show();
    },
    disabled,
    false,
    props.nativeID,
  );
  useNativeFormConstraint(
    () => validate(),
    () => button.current?.focus(),
  );
  const pickerProps = {
    mode: type,
    value: pickerValue,
    minimumDate: type === 'date' && min ? parseNativeTemporal(min, type) : undefined,
    maximumDate: type === 'date' && max ? parseNativeTemporal(max, type) : undefined,
    onDismiss: cancel,
  };
  return (
    <View {...props} style={outerStyle}>
      <Button
        ref={mergedRef}
        type="button"
        nativePreset={false}
        variant="outline"
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityValue={{
          ...props.accessibilityValue,
          text:
            props.accessibilityValue?.text ??
            (control.value || (type === 'date' ? 'No date selected' : 'No time selected')),
        }}
        accessibilityHint={
          [
            props.accessibilityHint,
            field?.description,
            field?.error,
            (invalid ?? field?.invalid) ? 'Invalid value' : undefined,
            required ? 'Required' : undefined,
          ]
            .filter(Boolean)
            .join('. ') || undefined
        }
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onPress={() => {
          void show();
        }}
        style={[{ alignItems: 'stretch', justifyContent: 'center' }, ...appearance.frame]}
      >
        <LabelText style={appearance.text}>
          {control.value || placeholder || (type === 'date' ? 'yyyy-mm-dd' : 'hh:mm')}
        </LabelText>
      </Button>
      {error && (!open || Platform.OS === 'android') ? (
        <LabelText accessibilityRole="alert">{error}</LabelText>
      ) : null}
      {open &&
        Picker &&
        (Platform.OS === 'android' ? (
          <Picker {...pickerProps} is24Hour onValueChange={nativeChange} onError={pickerError} />
        ) : (
          <OverlayRoot
            open={open}
            restoreFocusRef={button}
            onOpenChange={(next) => {
              if (!next) cancel();
            }}
          >
            <OverlayContent accessibilityLabel={'Choose ' + type}>
              <OverlayTitle>Choose {type}</OverlayTitle>
              <Picker {...pickerProps} display="spinner" onValueChange={nativeChange} />
              {error ? <LabelText accessibilityRole="alert">{error}</LabelText> : null}
              <Button type="button" onPress={() => commit(draft.current)}>
                Apply {type}
              </Button>
              <Button type="button" variant="outline" onPress={cancel}>
                Cancel {type}
              </Button>
            </OverlayContent>
          </OverlayRoot>
        ))}
    </View>
  );
}

Object.assign(TemporalInput, { nativeInputSlot: true });
