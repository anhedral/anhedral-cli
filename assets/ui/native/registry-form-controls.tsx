import { useState, useRef, useMemo, type ReactNode } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { Input, type InputProps } from './input';
import { Textarea } from './textarea';
import { InputGroupInput, InputGroupTextarea } from './input-group';
import { composeNativeRefs } from './_slot';
import { useNativeFormConstraint, useNativeFormAction } from './native-form';
import { useNativeActionControl } from './registry-action-form';

export type RegistryInputProps = Omit<InputProps, 'onChange' | 'value' | 'defaultValue'> & {
  name?: string;
  pattern?: string;
  required?: boolean;
  minLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  rows?: number;
  type?: 'text' | 'email' | 'password' | 'url' | 'tel' | 'search' | 'number';
  disabled?: boolean;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string) => void;
};
function useRegistryInput({
  name,
  ref,
  required,
  minLength,
  defaultValue,
  rows,
  pattern,
  min,
  max,
  step,
  onBlur,
  type = 'text',
  disabled,
  onChange,
  onChangeText,
  value,
  onSubmitEditing,
  ...props
}: RegistryInputProps): InputProps {
  const form = useNativeFormAction();
  const [numeric, setNumeric] = useState(String(defaultValue ?? ''));
  const inputRef = useRef<TextInput>(null);
  const composedRef = useMemo(() => composeNativeRefs(ref, inputRef), [ref]);
  const numericValue = value === undefined ? numeric : String(value);
  const action = useNativeActionControl(
    name,
    value === undefined ? undefined : String(value),
    String(defaultValue ?? ''),
    onChangeText ?? onChange,
    (value) => (value === undefined ? [] : [String(value)]),
    disabled,
  );
  const keyboard: TextInputProps['keyboardType'] =
    type === 'email'
      ? 'email-address'
      : type === 'url'
        ? 'url'
        : type === 'tel'
          ? 'phone-pad'
          : type === 'number'
            ? 'numeric'
            : 'default';
  const change = (text: string) => {
    setNumeric(text);
    if (action.active) action.set(text);
    else if (onChangeText) onChangeText(text);
    else onChange?.(text);
  };
  useNativeFormConstraint(
    () => {
      if (disabled || props.editable === false) return;
      const current = String(action.active ? (action.value ?? '') : numericValue);
      const label = props.accessibilityLabel ?? name ?? props.nativeID ?? 'Field';
      if (required && !current) return `${label} is required.`;
      if (!current) return;
      if (minLength !== undefined && current.length < minLength)
        return `${label} must contain at least ${minLength} characters.`;
      if (
        type === 'email' &&
        !/^[a-zA-Z0-9.!#$%&\x27*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
          current,
        )
      )
        return `${label} requires a valid email address.`;
      if (type === 'url') {
        try {
          new URL(current);
        } catch {
          return `${label} requires a valid URL.`;
        }
      }
      if (pattern && !new RegExp(`^(?:${pattern})$`, 'u').test(current))
        return `${label} does not match the required format.`;
    },
    () => inputRef.current?.focus(),
  );
  return {
    ...props,
    ref: composedRef,
    accessibilityHint:
      [props.accessibilityHint, required ? 'Required' : undefined].filter(Boolean).join('. ') ||
      undefined,
    value: action.active
      ? String(action.value ?? '')
      : type === 'number'
        ? numericValue
        : value === undefined
          ? undefined
          : String(value),
    defaultValue:
      action.active || type === 'number'
        ? undefined
        : defaultValue === undefined
          ? undefined
          : String(defaultValue),
    editable: props.editable ?? !disabled,
    numberOfLines: props.numberOfLines ?? rows,
    keyboardType: props.keyboardType ?? (pattern === '[0-9]*' ? 'number-pad' : keyboard),
    secureTextEntry: props.secureTextEntry ?? type === 'password',
    autoCapitalize:
      props.autoCapitalize ?? (['email', 'url', 'password'].includes(type) ? 'none' : undefined),
    onChangeText: change,
    onBlur: (event) => {
      if (
        type === 'number' &&
        !disabled &&
        props.editable !== false &&
        !event?.isDefaultPrevented()
      ) {
        const current = Number(action.active ? action.value : numericValue);
        if (numericValue !== '' && Number.isFinite(current)) {
          const lower = min === undefined ? -Infinity : Number(min),
            upper = max === undefined ? Infinity : Number(max);
          if (lower > upper) throw Error('Native number input minimum exceeds its maximum.');
          const increment = step === 'any' ? undefined : Number(step ?? 1),
            base = Number.isFinite(lower) ? lower : 0;
          let next = Math.min(upper, Math.max(lower, current));
          if (increment && Number.isFinite(increment) && increment > 0) {
            const a = Number.isFinite(lower)
              ? base + Math.ceil((lower - base) / increment) * increment
              : -Infinity;
            const b = Number.isFinite(upper)
              ? base + Math.floor((upper - base) / increment) * increment
              : Infinity;
            next = Math.min(
              b,
              Math.max(a, base + Math.round((next - base) / increment) * increment),
            );
          }
          if (next !== current) change(String(Number(next.toPrecision(12))));
        }
      }
      onBlur?.(event);
    },
    onSubmitEditing: (event) => {
      onSubmitEditing?.(event);
      if (form.available && !props.multiline && !event.isDefaultPrevented()) void form.submit();
    },
  };
}
function inputBinding(Component: (props: InputProps) => ReactNode, multiline = false) {
  return function RegistryInput(props: RegistryInputProps) {
    const input = useRegistryInput({ ...props, multiline: props.multiline ?? multiline });
    return <Component {...input} />;
  };
}
export const RegistryInput = inputBinding(Input);
export const RegistryTextarea = inputBinding(Textarea, true);
export const RegistryInputGroupInput = inputBinding(InputGroupInput);
export const RegistryInputGroupTextarea = inputBinding(InputGroupTextarea, true);

export {
  RegistryInput as Input,
  RegistryTextarea as Textarea,
  RegistryInputGroupInput as InputGroupInput,
  RegistryInputGroupTextarea as InputGroupTextarea,
};
export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText } from './input-group';
