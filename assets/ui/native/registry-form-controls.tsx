import { type ReactNode } from 'react';
import { type TextInputProps } from 'react-native';
import { Input, type InputProps } from './input';
import { Textarea } from './textarea';
import { InputGroupInput, InputGroupTextarea } from './input-group';
import { useNativeFieldInput } from './_field-context';
import { useNativeFormAction } from './native-form';
import { useNativeActionControl } from './registry-action-form';

export type RegistryInputProps = Omit<InputProps, 'onChange' | 'value'> & {
  name?: string;
  rows?: number;
  type?: 'text' | 'email' | 'password' | 'url' | 'tel' | 'search' | 'number';
  disabled?: boolean;
  value?: string | number;
  onChange?: (value: string) => void;
};
function useRegistryInput({
  name,
  defaultValue,
  rows,
  type = 'text',
  disabled,
  onChange,
  onChangeText,
  value,
  onSubmitEditing,
  ...props
}: RegistryInputProps): InputProps {
  const form = useNativeFormAction();
  const action = useNativeActionControl(
    name,
    value === undefined ? undefined : String(value),
    defaultValue ?? '',
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
  return useNativeFieldInput({
    ...props,
    value: action.active
      ? String(action.value ?? '')
      : value === undefined
        ? undefined
        : String(value),
    defaultValue: action.active ? undefined : defaultValue,
    editable: props.editable ?? !disabled,
    numberOfLines: props.numberOfLines ?? rows,
    keyboardType: props.keyboardType ?? keyboard,
    secureTextEntry: props.secureTextEntry ?? type === 'password',
    autoCapitalize:
      props.autoCapitalize ?? (['email', 'url', 'password'].includes(type) ? 'none' : undefined),
    onChangeText: (text) => {
      if (action.active) action.set(text);
      else if (onChangeText) onChangeText(text);
      else onChange?.(text);
    },
    onSubmitEditing: (event) => {
      onSubmitEditing?.(event);
      if (form.available && !props.multiline && !event.isDefaultPrevented()) void form.submit();
    },
  });
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
