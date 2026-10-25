import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  useMemo,
  Children,
  isValidElement,
  type ReactNode,
} from 'react';
import {
  View,
  Pressable,
  Switch as NativeSwitch,
  useWindowDimensions,
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
  nativeComponent,
  withAlpha,
} from './_core';
import { Button, type ButtonProps } from './button';
import { Input } from './input';
import {
  NativeFieldProvider,
  useNativeFieldPart,
  useNativeField,
  NativeChoiceLabelContext,
  useNativeFieldActivation,
  type NativeChoiceState,
} from './_field-context';

export function Checkbox({
  invalid,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
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
  const field = useNativeField();
  const inChoice = useNativeFieldActivation(
    () => set(value !== true),
    !!disabled,
    value === true,
    props.nativeID,
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
  const [value, set] = useControllable(checked, defaultChecked, onCheckedChange);
  const { colors } = useTheme();
  const field = useNativeField();
  useNativeFieldActivation(() => set(!value), !!props.disabled, value, props.nativeID);
  return (
    <NativeSwitch
      accessible
      trackColor={{ false: colors.input, true: colors.primary }}
      {...props}
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
      accessibilityState={{ checked: value, disabled: !!props.disabled }}
      value={value}
      onValueChange={set}
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
  disabled,
  ...props
}: ViewProps & {
  invalid?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const field = useNativeField();
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
export function Field({
  invalid = false,
  orientation = 'vertical',
  style,
  ...props
}: ViewProps & { invalid?: boolean; orientation?: 'horizontal' | 'vertical' | 'responsive' }) {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const width = containerWidth ?? windowWidth;
  const id = useId();
  return (
    <NativeFieldProvider invalid={invalid} id={id}>
      <Box
        {...props}
        onLayout={(event) => {
          setContainerWidth(event.nativeEvent.layout.width);
          props.onLayout?.(event);
        }}
        style={[
          {
            flexDirection:
              orientation === 'horizontal' || (orientation === 'responsive' && width >= 640)
                ? 'row'
                : 'column',
            alignItems: orientation === 'horizontal' ? 'center' : 'stretch',
          },
          style,
        ]}
      />
    </NativeFieldProvider>
  );
}
export const FieldGroup = Box;
export function FieldSet(props: ViewProps & { invalid?: boolean }) {
  return <Field {...props} />;
}
export const FieldContent = Box;
export function FieldLegend({
  variant = 'legend',
  children,
  style,
  ...props
}: React.ComponentProps<typeof LabelText> & { variant?: 'label' | 'legend' }) {
  const { field, nativeID } = useNativeFieldPart('label', children, props.nativeID),
    { colors } = useTheme();
  return (
    <LabelText
      accessibilityRole="header"
      {...props}
      nativeID={nativeID}
      style={[
        { fontWeight: '500', fontSize: variant === 'legend' ? 16 : 14 },
        field?.invalid && { color: colors.destructive },
        style,
      ]}
    >
      {children}
    </LabelText>
  );
}
export const FieldLabel = ({
  children,
  onPress,
  style,
  ...props
}: React.ComponentProps<typeof LabelText>) => {
  const compound = Children.toArray(children).some(
    (child) =>
      isValidElement(child) &&
      [Field, Box, View].includes(nativeComponent(child.type) as typeof Field),
  );
  const { field, nativeID } = useNativeFieldPart('label', compound ? '' : children, props.nativeID),
    { colors, radius, mode } = useTheme();
  const activate = useRef<(() => void) | null>(null),
    [choiceState, setState] = useState<NativeChoiceState>({ disabled: false, checked: false });
  const choice = useMemo(() => ({ activate, setState }), []);
  const press = (event: Parameters<NonNullable<typeof onPress>>[0]) => {
    onPress?.(event);
    if (event.isDefaultPrevented()) return;
    if (compound) activate.current?.();
    else {
      const control = field?.control.current;
      if (control?.activate) control.activate();
      else control?.focus?.();
    }
  };
  if (compound)
    return (
      <NativeChoiceLabelContext.Provider value={choice}>
        <Pressable
          {...props}
          nativeID={nativeID}
          accessible={false}
          disabled={choiceState.disabled}
          onPress={press}
          style={[
            {
              borderWidth: 1,
              borderRadius: radius,
              borderColor: choiceState.checked
                ? withAlpha(colors.primary ?? colors.foreground, mode === 'dark' ? 0.2 : 0.3)
                : colors.border,
              backgroundColor: choiceState.checked
                ? withAlpha(colors.primary ?? colors.foreground, mode === 'dark' ? 0.1 : 0.05)
                : 'transparent',
              opacity: choiceState.disabled ? 0.5 : 1,
              padding: 10,
            },
            style,
          ]}
        >
          {content(children)}
        </Pressable>
      </NativeChoiceLabelContext.Provider>
    );
  return (
    <LabelText
      {...props}
      nativeID={nativeID}
      style={[{ fontWeight: '500' }, field?.invalid && { color: colors.destructive }, style]}
      onPress={press}
    >
      {children}
    </LabelText>
  );
};
export const FieldTitle = FieldLabel;
export function FieldDescription({ children, ...props }: React.ComponentProps<typeof LabelText>) {
  const { nativeID } = useNativeFieldPart('description', children, props.nativeID);
  return (
    <Muted {...props} nativeID={props.nativeID ?? nativeID}>
      {children}
    </Muted>
  );
}
export function FieldError({
  children,
  errors,
  ...props
}: React.ComponentProps<typeof LabelText> & { errors?: ({ message?: string } | undefined)[] }) {
  const { colors } = useTheme(),
    message =
      children ?? [...new Set(errors?.map((error) => error?.message).filter(Boolean))].join('\n');
  const { nativeID } = useNativeFieldPart('error', message, props.nativeID);
  return message ? (
    <LabelText
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      {...props}
      nativeID={props.nativeID ?? nativeID}
      style={[{ color: colors.destructive }, props.style]}
    >
      {message}
    </LabelText>
  ) : null;
}
export function FieldInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} />;
}
export const FieldSeparator = ({ children }: { children?: ReactNode }) => <Muted>{children}</Muted>;
export { Textarea } from './input';
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
