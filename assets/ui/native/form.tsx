import {
  createContext,
  useContext,
  useId,
  useState,
  useEffect,
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from 'react';
import { type ViewProps, type TextProps } from 'react-native';
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Box, LabelText, Muted, plainText, nativeComponent } from './_core';
import { Input } from './input';
import { useTheme } from '../theme';

/** React Hook Form is cross-platform; native controls bind field.onChange to onChangeText. */
export const Form = FormProvider;
const FieldContext = createContext<{ name: string } | null>(null);
const ItemContext = createContext<{
  id: string;
  label: string;
  description: string;
  setLabel: (value: string) => void;
  setDescription: (value: string) => void;
} | null>(null);
export function FormField<T extends FieldValues, N extends FieldPath<T>>(
  props: ControllerProps<T, N>,
) {
  return (
    <FieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FieldContext.Provider>
  );
}
export function useFormField() {
  const field = useContext(FieldContext),
    item = useContext(ItemContext);
  const id = item?.id;
  const form = useFormContext();
  if (!field || !form) throw Error('Form field parts require Form and FormField.');
  const state = useFormState({ control: form.control, name: field.name });
  return {
    id,
    label: item?.label,
    description: item?.description,
    name: field.name,
    formItemId: id ? `${id}-control` : undefined,
    formDescriptionId: id ? `${id}-description` : undefined,
    formMessageId: id ? `${id}-message` : undefined,
    ...form.getFieldState(field.name, state),
  };
}
export function FormItem(props: ViewProps) {
  const id = useId();
  const [label, setLabel] = useState(''),
    [description, setDescription] = useState('');
  return (
    <ItemContext.Provider value={{ id, label, description, setLabel, setDescription }}>
      <Box {...props} />
    </ItemContext.Provider>
  );
}
export function FormLabel({ style, ...props }: TextProps) {
  const field = useFormField(),
    item = useContext(ItemContext),
    { colors } = useTheme();
  const text = plainText(props.children),
    register = item?.setLabel;
  useEffect(() => {
    register?.(text);
  }, [register, text]);
  return (
    <LabelText
      {...props}
      style={[{ fontWeight: '500' }, field.error && { color: colors.destructive }, style]}
      nativeID={field.id ? `${field.id}-label` : undefined}
    />
  );
}
export function FormControl({ children, style, ...props }: ViewProps & { children?: ReactNode }) {
  const field = useFormField();
  const child = Children.only(children);
  if (!isValidElement(child)) throw Error('FormControl requires one native control.');
  const control = child as ReactElement<ViewProps & { invalid?: boolean }>;
  return cloneElement(control, {
    ...props,
    nativeID: field.formItemId,
    accessibilityLabel: control.props.accessibilityLabel ?? props.accessibilityLabel ?? field.label,
    accessibilityLabelledBy:
      control.props.accessibilityLabelledBy ??
      props.accessibilityLabelledBy ??
      (control.props.accessibilityLabel || props.accessibilityLabel
        ? undefined
        : field.id
          ? `${field.id}-label`
          : undefined),
    accessibilityHint:
      [
        control.props.accessibilityHint ?? props.accessibilityHint ?? field.description,
        field.error?.message ? String(field.error.message) : undefined,
      ]
        .filter(Boolean)
        .join('. ') || undefined,
    ...(nativeComponent(child.type) === Input ? { invalid: !!field.error } : {}),
    style: [control.props.style, style],
  });
}
export function FormDescription(props: TextProps) {
  const field = useFormField(),
    item = useContext(ItemContext);
  const text = plainText(props.children),
    register = item?.setDescription;
  useEffect(() => {
    register?.(text);
  }, [register, text]);
  return <Muted {...props} nativeID={field.formDescriptionId} />;
}
export function FormMessage({ children, ...props }: TextProps) {
  const field = useFormField();
  const { colors } = useTheme();
  const message = field.error?.message ? String(field.error.message) : children;
  if (!message) return null;
  return (
    <LabelText
      {...props}
      nativeID={field.formMessageId}
      style={[{ color: colors.destructive }, props.style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {message}
    </LabelText>
  );
}
