import { createContext, useContext, useId, useRef, type ReactNode } from 'react';
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
import { Box, LabelText, Muted, Surface, content, plainText, row, useControllable } from './_core';
import { Button, type ButtonProps } from './button';
import { Input } from './input';

export function Checkbox({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  children,
  accessibilityLabel,
  style,
  ...props
}: Omit<PressableProps, 'children'> & {
  checked?: boolean | 'indeterminate';
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  children?: ReactNode;
}) {
  const [value, set] = useControllable<boolean | 'indeterminate'>(checked, defaultChecked, (next) =>
    onCheckedChange?.(next === true),
  );
  const { colors } = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? (plainText(children) || undefined)}
      accessibilityState={{
        checked: value === 'indeterminate' ? 'mixed' : value,
        disabled: !!disabled,
      }}
      disabled={disabled}
      onPress={() => set(value !== true)}
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
          borderColor: colors.primary,
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
  checked,
  defaultChecked = false,
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<typeof NativeSwitch>, 'value' | 'onValueChange'> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const [value, set] = useControllable(checked, defaultChecked, onCheckedChange);
  const { colors } = useTheme();
  return (
    <NativeSwitch
      accessible
      trackColor={{ false: colors.input, true: colors.primary }}
      {...props}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!props.disabled }}
      value={value}
      onValueChange={set}
    />
  );
}
export function Toggle({
  pressed,
  defaultPressed = false,
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
      {...props}
      disabled={disabled}
      variant={value ? 'secondary' : 'ghost'}
      accessibilityState={{ selected: value, disabled: !!disabled }}
      onPress={() => set(!value)}
    />
  );
}
type GroupValue = {
  value: string[];
  set: (value: string[]) => void;
  multiple: boolean;
  disabled?: boolean;
};
const ToggleContext = createContext<GroupValue | null>(null);
export function ToggleGroup({
  type = 'single',
  value,
  defaultValue,
  onValueChange,
  disabled,
  children,
  style,
  ...props
}: ViewProps & {
  type?: 'single' | 'multiple';
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
}) {
  const asArray = (input?: string | string[]) =>
    Array.isArray(input) ? input : input ? [input] : [];
  const [selected, set] = useControllable(
    value === undefined ? undefined : asArray(value),
    asArray(defaultValue),
    (next) => onValueChange?.(type === 'multiple' ? next : (next[0] ?? '')),
  );
  return (
    <ToggleContext.Provider
      value={{ value: selected, set, multiple: type === 'multiple', disabled }}
    >
      <View {...props} style={row(style)}>
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
  value: string;
  set: (value: string) => void;
  disabled?: boolean;
} | null>(null);
export function RadioGroup({
  value,
  defaultValue = '',
  onValueChange,
  disabled,
  ...props
}: ViewProps & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const [selected, set] = useControllable(value, defaultValue, onValueChange);
  return (
    <RadioContext.Provider value={{ value: selected, set, disabled }}>
      <Box accessibilityRole="radiogroup" {...props} />
    </RadioContext.Provider>
  );
}
export function RadioGroupItem({
  value,
  children,
  disabled,
  ...props
}: Omit<ButtonProps, 'children'> & { value: string; children?: ReactNode }) {
  const group = useContext(RadioContext);
  if (!group) throw Error('RadioGroupItem requires RadioGroup.');
  return (
    <Button
      {...props}
      disabled={disabled || group.disabled}
      variant="outline"
      accessibilityRole="radio"
      accessibilityLabel={props.accessibilityLabel ?? plainText(children)}
      accessibilityState={{
        checked: group.value === value,
        disabled: !!(disabled || group.disabled),
      }}
      onPress={() => group.set(value)}
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
} | null>(null);
export function Tabs({
  value,
  defaultValue = '',
  onValueChange,
  ...props
}: ViewProps & { value?: string; defaultValue?: string; onValueChange?: (value: string) => void }) {
  const [selected, set] = useControllable(value, defaultValue, onValueChange);
  const id = useId();
  return (
    <TabsContext.Provider value={{ value: selected, set, id }}>
      <Box {...props} />
    </TabsContext.Provider>
  );
}
export const TabsList = ({ style, ...props }: ViewProps) => (
  <Box accessibilityRole="tablist" {...props} style={row(style)} />
);
export function TabsTrigger({ value, ...props }: ButtonProps & { value: string }) {
  const tabs = useContext(TabsContext);
  if (!tabs) throw Error('TabsTrigger requires Tabs.');
  return (
    <Button
      {...props}
      nativeID={`${tabs.id}-${value}-trigger`}
      accessibilityRole="tab"
      accessibilityState={{ selected: tabs.value === value, disabled: !!props.disabled }}
      variant={tabs.value === value ? 'secondary' : 'ghost'}
      onPress={() => tabs.set(value)}
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
const FieldContext = createContext({ invalid: false, id: '' });
export function Field({ invalid = false, style, ...props }: ViewProps & { invalid?: boolean }) {
  const id = useId();
  return (
    <FieldContext.Provider value={{ invalid, id }}>
      <Box {...props} style={style} />
    </FieldContext.Provider>
  );
}
export const FieldGroup = Box;
export const FieldSet = Box;
export const FieldContent = Box;
export const FieldLegend = ({ style, ...props }: React.ComponentProps<typeof LabelText>) => (
  <LabelText accessibilityRole="header" {...props} style={[{ fontWeight: '600' }, style]} />
);
export const FieldLabel = ({ ...props }: React.ComponentProps<typeof LabelText>) => {
  const field = useContext(FieldContext);
  return <LabelText nativeID={`${field.id}-label`} {...props} />;
};
export const FieldTitle = FieldLabel;
export const FieldDescription = Muted;
export function FieldError({
  children,
  errors,
  ...props
}: React.ComponentProps<typeof LabelText> & { errors?: ({ message?: string } | undefined)[] }) {
  const { colors } = useTheme();
  const message =
    children ?? [...new Set(errors?.map((error) => error?.message).filter(Boolean))].join('\n');
  return message ? (
    <LabelText
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      {...props}
      style={[{ color: colors.destructive }, props.style]}
    >
      {message}
    </LabelText>
  ) : null;
}
export function FieldInput(props: React.ComponentProps<typeof Input>) {
  const field = useContext(FieldContext);
  return <Input accessibilityLabelledBy={`${field.id}-label`} invalid={field.invalid} {...props} />;
}
export const FieldSeparator = ({ children }: { children?: ReactNode }) => <Muted>{children}</Muted>;
export const InputGroup = Surface;
export const InputGroupAddon = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const InputGroupText = Muted;
export const InputGroupButton = Button;
export const InputGroupInput = Input;
export const Textarea = ({ style, ...props }: TextInputProps) => (
  <Input {...props} multiline textAlignVertical="top" style={[{ minHeight: 100 }, style]} />
);
export const InputGroupTextarea = Textarea;
const OTPContext = createContext({ value: '', maxLength: 6, focus: () => {}, disabled: false });
export function InputOTP({
  value,
  defaultValue = '',
  onChange,
  onComplete,
  maxLength = 6,
  disabled = false,
  children,
  ...props
}: Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange' | 'onChangeText' | 'maxLength'> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  children?: ReactNode;
}) {
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
            const cleaned = next.replace(/\D/g, '').slice(0, length);
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
export function InputOTPSlot({ index }: { index: number }) {
  const otp = useContext(OTPContext);
  return (
    <Button
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
