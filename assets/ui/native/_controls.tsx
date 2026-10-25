import { useNativeItemGroupSize } from './_item-context';
import { createContext, useContext, useId, useRef, useState, useMemo, type ReactNode } from 'react';
import {
  View,
  Pressable,
  Switch as NativeSwitch,
  TextInput,
  type ViewProps,
  type TextInputProps,
  type PressableProps,
} from 'react-native';
import { useTheme } from '../theme';
import {
  Box,
  LabelText,
  Muted,
  content,
  plainText,
  row,
  useControllable,
  withAlpha,
} from './_core';
import { Button, type ButtonProps } from './button';
import { Input } from './input';
import {
  useNativeField,
  useNativeFieldActivation,
  useNativeFieldsetDisabled,
} from './_field-context';

export function Checkbox({
  invalid,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled: requestedDisabled,
  children,
  accessibilityLabel,
  style,
  ...props
}: Omit<PressableProps, 'children'> & {
  invalid?: boolean;
  checked?: boolean | 'indeterminate';
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  children?: ReactNode;
}) {
  const [value, set] = useControllable<boolean | 'indeterminate'>(checked, defaultChecked, (next) =>
    onCheckedChange?.(next === true),
  );
  const { colors } = useTheme();
  const field = useNativeField(),
    fieldsetDisabled = useNativeFieldsetDisabled(),
    disabled = !!requestedDisabled || fieldsetDisabled;
  const inChoice = useNativeFieldActivation(
    () => set(value !== true),
    !!disabled,
    value === true,
    props.nativeID,
    'checkbox',
  );
  return (
    <Pressable
      {...props}
      accessibilityRole="checkbox"
      accessibilityLabel={
        accessibilityLabel ?? (plainText(children) || field?.labelFor(props.nativeID) || undefined)
      }
      accessibilityLabelledBy={
        accessibilityLabel !== undefined
          ? props.accessibilityLabelledBy
          : (props.accessibilityLabelledBy ??
            (field?.labelIDsFor(props.nativeID).length
              ? field.labelIDsFor(props.nativeID)
              : undefined))
      }
      accessibilityHint={
        props.accessibilityHint ?? [field?.description, field?.error].filter(Boolean).join('. ')
      }
      accessibilityState={{
        checked: value === 'indeterminate' ? 'mixed' : value,
        disabled: !!disabled,
      }}
      disabled={disabled}
      onPress={(event) => {
        if (inChoice) event.stopPropagation();
        props.onPress?.(event);
        if (!event.isDefaultPrevented()) set(value !== true);
      }}
      style={(state) => [
        row({ minHeight: 44, opacity: disabled ? 0.5 : 1 }),
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: (invalid ?? field?.invalid) ? colors.destructive : colors.primary,
          backgroundColor: value ? colors.primary : colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LabelText style={{ color: colors['primary-foreground'] }}>
          {value === 'indeterminate' ? '−' : value ? '✓' : ''}
        </LabelText>
      </View>
      {content(children)}
    </Pressable>
  );
}
export function Switch({
  size = 'default',
  invalid,
  disabled: requestedDisabled,
  checked,
  defaultChecked = false,
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<typeof NativeSwitch>, 'value' | 'onValueChange'> & {
  size?: 'default' | 'sm';
  invalid?: boolean;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  useNativeItemGroupSize(size);
  const [value, set] = useControllable(checked, defaultChecked, onCheckedChange);
  const { colors } = useTheme();
  const field = useNativeField(),
    fieldsetDisabled = useNativeFieldsetDisabled(),
    disabled = !!requestedDisabled || fieldsetDisabled;
  useNativeFieldActivation(() => set(!value), disabled, value, props.nativeID, 'switch');
  return (
    <NativeSwitch
      accessible
      trackColor={{ false: colors.input, true: colors.primary }}
      {...props}
      disabled={disabled}
      accessibilityLabel={
        props.accessibilityLabel ?? (field?.labelFor(props.nativeID) || undefined)
      }
      accessibilityLabelledBy={
        props.accessibilityLabel !== undefined
          ? props.accessibilityLabelledBy
          : (props.accessibilityLabelledBy ??
            (field?.labelIDsFor(props.nativeID).length
              ? field.labelIDsFor(props.nativeID)
              : undefined))
      }
      accessibilityHint={
        props.accessibilityHint ?? [field?.description, field?.error].filter(Boolean).join('. ')
      }
      hitSlop={props.hitSlop ?? (size === 'sm' ? 12 : 8)}
      style={[
        (invalid ?? field?.invalid) && {
          borderWidth: 1,
          borderColor: colors.destructive,
          borderRadius: 999,
        },
        size === 'sm' && { transform: [{ scale: 0.8 }] },
        props.style,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: disabled }}
      value={value}
      onValueChange={(next) => {
        if (!disabled) set(next);
      }}
    />
  );
}
export function Toggle({
  pressed,
  defaultPressed = false,
  variant = 'default',
  onPressedChange,
  disabled,
  ...props
}: ButtonProps & {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}) {
  const [value, set] = useControllable(pressed, defaultPressed, onPressedChange);
  return (
    <Button
      nativePreset={false}
      {...props}
      disabled={disabled}
      variant={value ? 'secondary' : variant === 'outline' ? 'outline' : 'ghost'}
      accessibilityState={{ selected: value, disabled: !!disabled }}
      onPress={(event) => {
        props.onPress?.(event);
        if (!event.isDefaultPrevented()) set(!value);
      }}
    />
  );
}
type GroupValue = {
  value: string[];
  set: (value: string[]) => void;
  multiple: boolean;
  variant?: 'default' | 'outline';
  size?: ButtonProps['size'];
  disabled?: boolean;
};
const ToggleContext = createContext<GroupValue | null>(null);
export function ToggleGroup({
  type = 'single',
  orientation = 'horizontal',
  variant = 'default',
  size = 'default',
  value,
  defaultValue,
  onValueChange,
  disabled,
  children,
  style,
  ...props
}: ViewProps & {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'outline';
  size?: ButtonProps['size'];
  disabled?: boolean;
} & (
    | {
        type: 'multiple';
        value?: string[];
        defaultValue?: string[];
        onValueChange?: (value: string[]) => void;
      }
    | {
        type?: 'single';
        value: string[];
        defaultValue?: string[];
        onValueChange?: (value: string[]) => void;
      }
    | {
        type?: 'single';
        value?: undefined;
        defaultValue: string[];
        onValueChange?: (value: string[]) => void;
      }
    | {
        type?: 'single';
        value?: string;
        defaultValue?: string;
        onValueChange?: (value: string) => void;
      }
  )) {
  const asArray = (input?: string | string[]) =>
    Array.isArray(input) ? input : input ? [input] : [];
  const [selected, set] = useControllable(
    value === undefined ? undefined : asArray(value),
    asArray(defaultValue),
    (next) =>
      (onValueChange as ((value: string | string[]) => void) | undefined)?.(
        type === 'multiple' || Array.isArray(value ?? defaultValue) ? next : (next[0] ?? ''),
      ),
  );
  return (
    <ToggleContext.Provider
      value={{ value: selected, set, multiple: type === 'multiple', disabled, variant, size }}
    >
      <View
        {...props}
        style={[row(), { flexDirection: orientation === 'vertical' ? 'column' : 'row' }, style]}
      >
        {children}
      </View>
    </ToggleContext.Provider>
  );
}
export function ToggleGroupItem({ value, disabled, ...props }: ButtonProps & { value: string }) {
  const group = useContext(ToggleContext);
  if (!group) throw Error('ToggleGroupItem requires ToggleGroup.');
  const selected = group.value.includes(value);
  return (
    <Toggle
      variant={group.variant}
      size={group.size}
      {...props}
      disabled={disabled || group.disabled}
      pressed={selected}
      onPressedChange={() =>
        group.set(
          group.multiple
            ? selected
              ? group.value.filter((item) => item !== value)
              : [...group.value, value]
            : selected
              ? []
              : [value],
        )
      }
    />
  );
}
const RadioContext = createContext<{
  invalid?: boolean;
  value: string;
  set: (value: string) => void;
  disabled?: boolean;
} | null>(null);
export function RadioGroup({
  invalid,
  value,
  defaultValue = '',
  onValueChange,
  disabled: requestedDisabled,
  ...props
}: ViewProps & {
  invalid?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const field = useNativeField(),
    fieldsetDisabled = useNativeFieldsetDisabled(),
    disabled = !!requestedDisabled || fieldsetDisabled;
  const [selected, set] = useControllable(value, defaultValue, onValueChange);
  return (
    <RadioContext.Provider
      value={{ value: selected, set, disabled, invalid: invalid ?? field?.invalid }}
    >
      <Box
        accessibilityRole="radiogroup"
        {...props}
        accessibilityLabel={
          props.accessibilityLabel ?? (field?.labelFor(props.nativeID) || undefined)
        }
        accessibilityHint={
          props.accessibilityHint ?? [field?.description, field?.error].filter(Boolean).join('. ')
        }
      />
    </RadioContext.Provider>
  );
}
export function RadioGroupItem({
  invalid,
  value,
  children,
  disabled,
  ...props
}: Omit<ButtonProps, 'children'> & { value: string; children?: ReactNode; invalid?: boolean }) {
  const group = useContext(RadioContext);
  const field = useNativeField(),
    { colors } = useTheme();
  if (!group) throw Error('RadioGroupItem requires RadioGroup.');
  const inChoice = useNativeFieldActivation(
    () => group.set(value),
    !!(disabled || group.disabled),
    group.value === value,
    props.nativeID,
    'radio-group-item',
  );
  return (
    <Button
      nativePreset={false}
      {...props}
      disabled={disabled || group.disabled}
      variant="outline"
      accessibilityRole="radio"
      accessibilityLabel={
        props.accessibilityLabel ??
        (plainText(children) || field?.labelFor(props.nativeID) || undefined)
      }
      accessibilityHint={
        props.accessibilityHint ?? [field?.description, field?.error].filter(Boolean).join('. ')
      }
      style={(state) => [
        (invalid ?? group.invalid ?? field?.invalid) && { borderColor: colors.destructive },
        typeof props.style === 'function' ? props.style(state) : props.style,
      ]}
      accessibilityState={{
        checked: group.value === value,
        disabled: !!(disabled || group.disabled),
      }}
      onPress={(event) => {
        if (inChoice) event.stopPropagation();
        props.onPress?.(event);
        if (!event.isDefaultPrevented()) group.set(value);
      }}
    >
      <LabelText accessibilityElementsHidden>{group.value === value ? '●' : '○'}</LabelText>
      {content(children)}
    </Button>
  );
}
const TabsContext = createContext<{
  value: string;
  set: (value: string) => void;
  id: string;
  orientation: 'horizontal' | 'vertical';
} | null>(null);
export function Tabs({
  value,
  orientation = 'horizontal',
  defaultValue = '',
  onValueChange,
  ...props
}: ViewProps & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}) {
  const [selected, set] = useControllable(value, defaultValue, onValueChange);
  const id = useId();
  return (
    <TabsContext.Provider value={{ value: selected, set, id, orientation }}>
      <Box {...props} />
    </TabsContext.Provider>
  );
}
const TabListVariant = createContext<'default' | 'line'>('default');
export function TabsList({
  variant = 'default',
  style,
  ...props
}: ViewProps & { variant?: 'default' | 'line' }) {
  const { colors, radius } = useTheme();
  const tabs = useContext(TabsContext);
  return (
    <TabListVariant.Provider value={variant}>
      <Box
        accessibilityRole="tablist"
        {...props}
        style={[
          row(),
          {
            flexDirection: tabs?.orientation === 'vertical' ? 'column' : 'row',
            backgroundColor: variant === 'default' ? colors.muted : 'transparent',
            borderRadius: radius,
            padding: variant === 'default' ? 4 : 0,
          },
          style,
        ]}
      />
    </TabListVariant.Provider>
  );
}
export function TabsTrigger({ value, ...props }: ButtonProps & { value: string }) {
  const tabs = useContext(TabsContext);
  const variant = useContext(TabListVariant),
    { colors } = useTheme();
  if (!tabs) throw Error('TabsTrigger requires Tabs.');
  return (
    <Button
      nativePreset={false}
      {...props}
      nativeID={`${tabs.id}-${value}-trigger`}
      accessibilityRole="tab"
      accessibilityState={{ selected: tabs.value === value, disabled: !!props.disabled }}
      variant={variant === 'line' ? 'ghost' : tabs.value === value ? 'secondary' : 'ghost'}
      style={(state) => [
        variant === 'line' && {
          borderBottomWidth: 2,
          borderBottomColor: tabs.value === value ? colors.foreground : 'transparent',
          borderRadius: 0,
        },
        typeof props.style === 'function' ? props.style(state) : props.style,
      ]}
      onPress={(event) => {
        props.onPress?.(event);
        if (!event.isDefaultPrevented()) tabs.set(value);
      }}
    />
  );
}
export function TabsContent({
  value,
  forceMount = false,
  ...props
}: ViewProps & { value: string; forceMount?: boolean }) {
  const tabs = useContext(TabsContext);
  if (!tabs) throw Error('TabsContent requires Tabs.');
  const hidden = tabs.value !== value;
  if (hidden && !forceMount) return null;
  return (
    <Box
      {...props}
      accessibilityLabelledBy={`${tabs.id}-${value}-trigger`}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={[hidden && { display: 'none' }, props.style]}
    />
  );
}
const DisclosureContext = createContext<{
  open: boolean;
  set: (value: boolean) => void;
  disabled?: boolean;
  id: string;
} | null>(null);
export function Collapsible({
  open,
  defaultOpen = false,
  onOpenChange,
  disabled,
  ...props
}: ViewProps & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}) {
  const [value, set] = useControllable(open, defaultOpen, onOpenChange);
  const id = useId();
  return (
    <DisclosureContext.Provider value={{ open: value, set, disabled, id }}>
      <Box {...props} />
    </DisclosureContext.Provider>
  );
}
export function CollapsibleTrigger(props: ButtonProps) {
  const state = useContext(DisclosureContext);
  if (!state) throw Error('CollapsibleTrigger requires Collapsible.');
  return (
    <Button
      nativePreset={false}
      {...props}
      nativeID={`${state.id}-trigger`}
      disabled={state.disabled || props.disabled}
      accessibilityState={{ expanded: state.open, disabled: !!(state.disabled || props.disabled) }}
      onPress={() => state.set(!state.open)}
    />
  );
}
export function CollapsibleContent({
  forceMount = false,
  ...props
}: ViewProps & { forceMount?: boolean }) {
  const state = useContext(DisclosureContext);
  if (!state) throw Error('CollapsibleContent requires Collapsible.');
  if (!state.open && !forceMount) return null;
  return (
    <Box
      {...props}
      nativeID={`${state.id}-content`}
      accessibilityLabelledBy={`${state.id}-trigger`}
      accessibilityElementsHidden={!state.open}
      style={[!state.open && { display: 'none' }, props.style]}
    />
  );
}
const AccordionContext = createContext<(GroupValue & { collapsible: boolean }) | null>(null);
export function Accordion({
  type = 'single',
  value,
  defaultValue,
  onValueChange,
  disabled,
  collapsible = false,
  ...props
}: ViewProps & {
  type?: 'single' | 'multiple';
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
  collapsible?: boolean;
}) {
  const list = (input?: string | string[]) => (Array.isArray(input) ? input : input ? [input] : []);
  const [selected, set] = useControllable(
    value === undefined ? undefined : list(value),
    list(defaultValue),
    (next) => onValueChange?.(type === 'multiple' ? next : (next[0] ?? '')),
  );
  return (
    <AccordionContext.Provider
      value={{ value: selected, set, multiple: type === 'multiple', disabled, collapsible }}
    >
      <Box {...props} />
    </AccordionContext.Provider>
  );
}
export function AccordionItem({
  value,
  disabled,
  ...props
}: ViewProps & { value: string; disabled?: boolean }) {
  const group = useContext(AccordionContext);
  if (!group) throw Error('AccordionItem requires Accordion.');
  return (
    <Collapsible
      {...props}
      disabled={disabled || group.disabled}
      open={group.value.includes(value)}
      onOpenChange={(open) => {
        if (!open && !group.multiple && !group.collapsible) return;
        group.set(
          group.multiple
            ? open
              ? [...group.value, value]
              : group.value.filter((item) => item !== value)
            : open
              ? [value]
              : [],
        );
      }}
    />
  );
}
export const AccordionTrigger = CollapsibleTrigger;
export const AccordionContent = CollapsibleContent;
export {
  Field,
  FieldGroup,
  FieldSet,
  FieldContent,
  FieldLegend,
  FieldLabel,
  FieldTitle,
  FieldDescription,
  FieldError,
  FieldSeparator,
} from './_field';
export function FieldInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} />;
}
export { Textarea } from './input';
const OTPContext = createContext({ value: '', maxLength: 6, focus: () => {}, disabled: false });
export function InputOTP({
  value,
  defaultValue = '',
  onChange,
  onComplete,
  maxLength = 6,
  pattern,
  disabled: requestedDisabled,
  children,
  ...props
}: Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange' | 'onChangeText' | 'maxLength'> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  maxLength?: number;
  pattern?: string | RegExp;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const field = useNativeField(),
    fieldsetDisabled = useNativeFieldsetDisabled(),
    disabled = !!requestedDisabled || fieldsetDisabled;
  const length = Math.max(1, Math.min(32, Math.floor(maxLength) || 6));
  const [code, set] = useControllable(value, defaultValue, onChange);
  const input = useRef<TextInput>(null);
  return (
    <OTPContext.Provider
      value={{ value: code, maxLength: length, disabled, focus: () => input.current?.focus() }}
    >
      <Box>
        <Input
          {...props}
          ref={input}
          accessibilityLabel={props.accessibilityLabel ?? 'One-time code'}
          editable={!disabled}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={length}
          value={code}
          onChangeText={(next) => {
            const candidate = next.slice(0, length);
            if (
              pattern &&
              candidate !== '' &&
              !new RegExp(
                typeof pattern === 'string' ? pattern : pattern.source,
                typeof pattern === 'string' ? undefined : pattern.flags.replace(/[gy]/g, ''),
              ).test(candidate)
            )
              return;
            const cleaned = pattern ? candidate : next.replace(/\D/g, '').slice(0, length);
            set(cleaned);
            if (cleaned.length === length && cleaned !== code) onComplete?.(cleaned);
          }}
        />
        {children}
      </Box>
    </OTPContext.Provider>
  );
}
export const InputOTPGroup = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export function InputOTPSlot({ index, invalid }: { index: number; invalid?: boolean }) {
  const field = useNativeField();
  const otp = useContext(OTPContext);
  return (
    <Button
      invalid={invalid ?? field?.invalid}
      nativePreset={false}
      disabled={otp.disabled}
      variant="outline"
      accessibilityLabel={`Digit ${index + 1} of ${otp.maxLength}`}
      onPress={otp.focus}
    >
      {otp.value[index] ?? '·'}
    </Button>
  );
}
export const InputOTPSeparator = () => <Muted accessibilityElementsHidden>−</Muted>;

for (const [slot, component] of Object.entries({
  checkbox: Checkbox,
  'radio-group': RadioGroup,
  'radio-group-item': RadioGroupItem,
  switch: Switch,
}))
  Object.assign(component, { nativeFieldSlot: slot });
