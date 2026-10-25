import { useEffect, useState, type Ref } from 'react';
import { Platform, StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useNativeFieldInput } from './_field-context';
import { useNativeInputAppearance } from './_input-appearance';
import { nativeTextInputBorderStyle } from './_input-border';
export type InputProps = TextInputProps & {
  invalid?: boolean;
  ref?: Ref<TextInput>;
  /** Compound controls own their own source slots. */
  nativePreset?: boolean;
  /** @internal Textarea selects a separate source recipe. */
  nativeFieldKind?: 'input' | 'textarea';
  /** @internal HTML rows only influences frozen fixed-sizing source recipes. */
  nativeRows?: number;
};
export function Input(input: InputProps) {
  const {
    style,
    invalid,
    nativePreset = true,
    nativeFieldKind = 'input',
    nativeRows,
    ...props
  } = useNativeFieldInput(input);
  const [focused, setFocused] = useState(false),
    [nativeText, setNativeText] = useState(props.value ?? props.defaultValue ?? '');
  useEffect(() => {
    if (props.value !== undefined) setNativeText(props.value);
  }, [props.value]);
  const disabled =
    props.accessibilityState?.disabled ?? (props.editable === false && !props.readOnly);
  const { colors, preset, adapted, frame, text, fontScale } = useNativeInputAppearance(
    nativeFieldKind,
    style,
    focused,
    invalid,
    disabled,
    nativePreset,
    props.allowFontScaling !== false,
  );
  const contentSizing =
      nativeFieldKind === 'textarea' && !!adapted && preset !== 'default' && preset !== 'new-york',
    automatic = contentSizing && StyleSheet.flatten(style)?.height === undefined;
  const box = StyleSheet.flatten(frame),
    type = StyleSheet.flatten(text);
  const rowsHeight =
    !contentSizing && nativeRows !== undefined && Number.isSafeInteger(nativeRows) && nativeRows > 0
      ? Math.max(
          Number(box.minHeight ?? 0),
          nativeRows *
            (type.lineHeight ?? (type.fontSize ?? 16) * 1.5) *
            (props.allowFontScaling === false ? 1 : fontScale) +
            Number(box.paddingTop ?? box.paddingVertical ?? box.padding ?? 0) +
            Number(box.paddingBottom ?? box.paddingVertical ?? box.padding ?? 0) +
            Number(box.borderTopWidth ?? box.borderWidth ?? 0) +
            Number(box.borderBottomWidth ?? box.borderWidth ?? 0),
        )
      : undefined;
  return (
    <TextInput
      {...props}
      value={automatic ? (props.value ?? nativeText) : props.value}
      defaultValue={automatic ? undefined : props.defaultValue}
      numberOfLines={props.numberOfLines ?? (contentSizing ? undefined : nativeRows)}
      onChangeText={(value) => {
        if (nativeFieldKind === 'textarea') setNativeText(value);
        props.onChangeText?.(value);
      }}
      accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }}
      accessibilityHint={
        props.accessibilityHint || (invalid ? 'Invalid value' : props.accessibilityHint)
      }
      pointerEvents={disabled ? 'none' : props.pointerEvents}
      hitSlop={
        props.hitSlop ??
        (adapted
          ? {
              top: Math.max(0, 44 - Number(adapted.view.height ?? 44)) / 2,
              bottom: Math.max(0, 44 - Number(adapted.view.height ?? 44)) / 2,
              left: 0,
              right: 0,
            }
          : undefined)
      }
      scrollEnabled={props.scrollEnabled ?? !automatic}
      underlineColorAndroid={props.underlineColorAndroid ?? 'transparent'}
      placeholderTextColor={
        props.placeholderTextColor ?? adapted?.placeholderTextColor ?? colors['muted-foreground']
      }
      selectionColor={props.selectionColor ?? adapted?.selectionColor ?? colors.primary}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      style={nativeTextInputBorderStyle(
        StyleSheet.flatten([
          ...frame,
          ...text,
          rowsHeight !== undefined && { height: rowsHeight },
          style,
        ]),
        Platform.OS,
      )}
    />
  );
}
export function Textarea(props: InputProps) {
  return (
    <Input
      {...props}
      nativeFieldKind="textarea"
      multiline
      textAlignVertical={props.textAlignVertical ?? 'top'}
    />
  );
}
Object.assign(Input, { nativeInputSlot: true });
Object.assign(Textarea, { nativeInputSlot: true });
