import { Children, isValidElement, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { LabelText, nativeComponent, NativeTextStyleContext, useDirection } from './_core';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  nativeSelectText,
  type SelectOption,
} from './_select';
import { useTheme } from '../theme';
import { useNativeField } from './_field-context';
import { useNativeComponentStyle, useNativeRegistrySource } from './_registry-context';
import {
  nativePresetSelectControlStyle,
  type NativeSelectControlState,
} from './_preset-native-select-style';
type OptionEntry = { value: string; label: string; disabled: boolean };
const optionText = (children: ReactNode) =>
  nativeSelectText(children)
    .replace(/[\t\n\f\r ]+/g, ' ')
    .trim();
function optionsOf(children: ReactNode, disabled = false, result: OptionEntry[] = []) {
  Children.forEach(children, (node) => {
    if (
      !isValidElement<{ value?: string; label?: string; disabled?: boolean; children?: ReactNode }>(
        node,
      )
    )
      return;
    const owner = nativeComponent(node.type),
      props = node.props;
    if (owner === NativeSelectOption)
      result.push({
        value: props.value ?? optionText(props.children),
        label: props.label ?? optionText(props.children),
        disabled: disabled || !!props.disabled,
      });
    else
      optionsOf(
        props.children,
        disabled || (owner === NativeSelectOptGroup && !!props.disabled),
        result,
      );
  });
  return result;
}
function useStyle(
  slot: Parameters<typeof nativePresetSelectControlStyle>[1],
  state: Partial<NativeSelectControlState> = {},
) {
  const theme = useTheme(),
    requested = useNativeComponentStyle(),
    origin = useNativeRegistrySource(),
    window = useWindowDimensions();
  const preset =
    origin === 'default' || origin === 'new-york' || origin === 'new-york-v4'
      ? origin
      : (requested ?? 'nova');
  return {
    ...nativePresetSelectControlStyle(preset, slot, {
      ...theme,
      fontScale: window.fontScale,
      source: origin,
      ...state,
    }),
    theme,
  };
}
const controlReset: ViewStyle = {
  minHeight: 0,
  minWidth: 0,
  padding: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  borderWidth: 0,
  borderRadius: 0,
  backgroundColor: 'transparent',
  gap: 0,
  justifyContent: 'flex-start',
};
export type NativeSelectProps = Omit<
  React.ComponentProps<typeof SelectTrigger>,
  'children' | 'size' | 'style' | 'nativeHideIcon' | 'nativePreset'
> & {
  options?: SelectOption[];
  children?: ReactNode;
  size?: 'default' | 'sm';
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  controlStyle?: React.ComponentProps<typeof SelectTrigger>['style'];
  textStyle?: StyleProp<TextStyle>;
};
export function NativeSelect({
  options,
  children,
  size = 'default',
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled: requestedDisabled,
  invalid: requestedInvalid,
  style,
  controlStyle,
  textStyle,
  onFocus,
  onBlur,
  onHoverIn,
  onHoverOut,
  ...props
}: NativeSelectProps) {
  const field = useNativeField(),
    direction = useDirection(),
    window = useWindowDimensions(),
    inherited = useContext(NativeTextStyleContext),
    [focused, setFocused] = useState(false),
    [hovered, setHovered] = useState(false),
    [measured, setMeasured] = useState(0);
  const entries: OptionEntry[] = [
      ...(options ?? []).map((item) => ({ ...item, disabled: !!item.disabled })),
      ...optionsOf(children),
    ],
    first = entries.find((item) => !item.disabled)?.value ?? '';
  const [internal, setInternal] = useState(
    defaultValue ?? (placeholder !== undefined ? '' : first),
  );
  const selected = value === undefined ? internal : value,
    disabled = !!requestedDisabled || !!field?.disabled,
    invalid = requestedInvalid ?? field?.invalid;
  const signature = JSON.stringify(entries.map((item) => [item.value, item.disabled]));
  useEffect(() => {
    if (
      value === undefined &&
      placeholder === undefined &&
      !entries.some((item) => item.value === internal)
    )
      setInternal(first);
  }, [signature, value, placeholder, internal, first]);
  const requestedText = StyleSheet.flatten<TextStyle>(textStyle);
  const state = {
      size,
      disabled,
      invalid,
      focused,
      hovered,
      fontSize: requestedText?.fontSize,
      lineHeight: requestedText?.lineHeight,
    },
    wrapper = useStyle('wrapper', state),
    control = useStyle('control', state),
    icon = useStyle('icon', state),
    canvas = useStyle('option', state);
  const inheritedText = StyleSheet.flatten([inherited.style, control.text, textStyle]);
  const typography = {
      ...inheritedText,
      textAlign:
        requestedText?.textAlign ??
        control.text.textAlign ??
        (direction === 'rtl' ? 'right' : 'left'),
      color:
        typeof inheritedText?.color === 'string'
          ? inheritedText.color
          : control.theme.colors.foreground,
    },
    wrapperStyle = StyleSheet.flatten(style),
    explicit = wrapperStyle?.width !== undefined;
  const horizontalPadding =
    Number(
      control.view.paddingLeft ?? control.view.paddingHorizontal ?? control.view.padding ?? 0,
    ) +
    Number(
      control.view.paddingRight ?? control.view.paddingHorizontal ?? control.view.padding ?? 0,
    ) +
    Number(control.view.borderLeftWidth ?? control.view.borderWidth ?? 0) +
    Number(control.view.borderRightWidth ?? control.view.borderWidth ?? 0);
  const width =
    !explicit && measured > 0
      ? Math.min(window.width, Math.ceil(measured + horizontalPadding))
      : undefined;
  const labels = [
    ...new Set([...entries.map((item) => item.label), ...(placeholder ? [placeholder] : [])]),
  ].join('\n');
  const change = (next: unknown) => {
    const nextValue = String(next ?? '');
    if (value === undefined) setInternal(nextValue);
    onValueChange?.(nextValue);
  };
  return (
    <View
      testID={props.testID ? props.testID + '-wrapper' : undefined}
      style={[wrapper.view, width !== undefined && { width }, style]}
    >
      <Select
        value={selected}
        nativePreset={false}
        onValueChange={change}
        disabled={disabled}
        invalid={invalid}
        items={entries}
      >
        <SelectTrigger
          {...props}
          nativePreset={false}
          nativeHideIcon
          size={size}
          disabled={disabled}
          invalid={invalid}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onHoverIn={(event) => {
            setHovered(true);
            onHoverIn?.(event);
          }}
          onHoverOut={(event) => {
            setHovered(false);
            onHoverOut?.(event);
          }}
          textStyle={typography}
          style={(event) => [
            controlReset,
            control.view,
            { opacity: 1 },
            width === undefined && !explicit && { width: 'auto' },
            typeof controlStyle === 'function' ? controlStyle(event) : controlStyle,
          ]}
        >
          <LabelText numberOfLines={1} style={typography}>
            {selected === '' && placeholder !== undefined
              ? placeholder
              : (entries.find((item) => item.value === selected)?.label ?? '')}
          </LabelText>
        </SelectTrigger>
        <SelectContent style={{ backgroundColor: canvas.view.backgroundColor }}>
          {options?.map((item) => (
            <NativeSelectOption key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </NativeSelectOption>
          ))}
          {children}
        </SelectContent>
      </Select>
      <ChevronDown
        accessible={false}
        accessibilityElementsHidden
        pointerEvents="none"
        testID={props.testID ? props.testID + '-icon' : undefined}
        size={Number(icon.view.width ?? 16)}
        color={icon.foreground ?? control.theme.colors['muted-foreground']}
        style={[
          icon.view,
          icon.centerIcon && { top: '50%', transform: [{ translateY: icon.iconTranslation }] },
        ]}
      />
      {!explicit && labels !== '' && (
        <View
          testID={props.testID ? props.testID + '-measure' : undefined}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, width: window.width, opacity: 0 }}
        >
          <LabelText
            style={typography}
            onTextLayout={(event) => {
              const next = Math.max(0, ...event.nativeEvent.lines.map((line) => line.width));
              setMeasured((previous) => (Math.abs(previous - next) < 0.25 ? previous : next));
            }}
          >
            {labels}
          </LabelText>
        </View>
      )}
    </View>
  );
}
export function NativeSelectOption({
  value,
  label,
  children,
  style,
  textStyle,
  ...props
}: Omit<React.ComponentProps<typeof SelectItem>, 'value' | 'children'> & {
  value?: string;
  label?: string;
  children?: ReactNode;
}) {
  const paint = useStyle('option');
  return (
    <SelectItem
      {...props}
      value={value ?? optionText(children)}
      textValue={label ?? optionText(children)}
      textStyle={[paint.text, textStyle]}
      style={(state) => [paint.view, typeof style === 'function' ? style(state) : style]}
    >
      {label ?? children}
    </SelectItem>
  );
}
export function NativeSelectOptGroup({
  label,
  children,
  style,
  ...props
}: Omit<React.ComponentProps<typeof SelectGroup>, 'items' | 'children'> & {
  label?: string;
  children?: ReactNode;
}) {
  const paint = useStyle('group');
  return (
    <SelectGroup {...props} style={[{ padding: 0 }, paint.view, style]}>
      {label !== undefined && <SelectLabel style={paint.text}>{label}</SelectLabel>}
      {children}
    </SelectGroup>
  );
}
Object.assign(NativeSelect, { nativeContainerTextSlot: true });
