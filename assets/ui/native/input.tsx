import { useEffect, useState, useContext, useRef, useMemo, type Ref } from 'react';
import { Platform, StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useNativeFieldInput } from './_field-context';
import { useNativeInputAppearance } from './_input-appearance';
import { nativeTextInputBorderStyle } from './_input-border';
import { NativeInputGroupContext, useNativeInputGroupMetadata } from './_input-group-context';
import { composeNativeRefs } from './_slot';
export type InputProps = TextInputProps & {
  invalid?: boolean;
  ref?: Ref<TextInput>;
  /** Compound controls own their own source slots. */
  nativePreset?: boolean;
  /** @internal Textarea selects a separate source recipe. */
  nativeFieldKind?: 'input' | 'textarea';
  /** @internal HTML rows only influences frozen fixed-sizing source recipes. */
  nativeRows?: number;
  /** @internal Identifies the compound control slot for group focus selectors. */
  nativeGroupControl?: boolean;
  /** Explicit field-sizing-content in authored custom textareas. */
  nativeContentSizing?: boolean;
};
export function Input(input: InputProps) {
  const {
    style,
    invalid,
    nativePreset = true,
    nativeFieldKind = 'input',
    nativeRows,
    nativeGroupControl = false,
    nativeContentSizing,
    ...props
  } = useNativeFieldInput(input);
  const [focused, setFocused] = useState(false),
    [nativeText, setNativeText] = useState(props.value ?? props.defaultValue ?? '');
  useEffect(() => {
    if (props.value !== undefined) setNativeText(props.value);
  }, [props.value]);
  const disabled =
    props.accessibilityState?.disabled ?? (props.editable === false && !props.readOnly);
  const group = useContext(NativeInputGroupContext),
    local = useRef<TextInput>(null),
    mergedRef = useMemo(() => composeNativeRefs(local, props.ref), [props.ref]),
    [groupHeight, setGroupHeight] = useState(0);
  useNativeInputGroupMetadata({
    kind: nativeFieldKind,
    disabled,
    invalid,
    focused,
    control: nativeGroupControl,
    height: groupHeight,
    ref: local,
  });
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
      nativeFieldKind === 'textarea' &&
      (nativeContentSizing ?? (!!adapted && preset !== 'default' && preset !== 'new-york')),
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
      ref={mergedRef}
      onLayout={
        group
          ? (event) => {
              const height = event.nativeEvent.layout.height;
              if (Number.isFinite(height) && height >= 0)
                setGroupHeight((previous) => (previous === height ? previous : height));
              props.onLayout?.(event);
            }
          : props.onLayout
      }
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
