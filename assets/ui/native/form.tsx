import { createContext, useContext, useId, type ReactNode } from 'react';
import { View, type ViewProps, type TextProps } from 'react-native';
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Box, LabelText, Muted } from './_core';

/** React Hook Form is cross-platform; native controls bind field.onChange to onChangeText. */
export const Form = FormProvider;
const FieldContext = createContext<{ name: string } | null>(null);
const ItemContext = createContext<string | null>(null);
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
    id = useContext(ItemContext);
  const form = useFormContext();
  if (!field || !form) throw Error('Form field parts require Form and FormField.');
  const state = useFormState({ control: form.control, name: field.name });
  return {
    id,
    name: field.name,
    formItemId: id ? `${id}-control` : undefined,
    formDescriptionId: id ? `${id}-description` : undefined,
    formMessageId: id ? `${id}-message` : undefined,
    ...form.getFieldState(field.name, state),
  };
}
export function FormItem(props: ViewProps) {
  const id = useId();
  return (
    <ItemContext.Provider value={id}>
      <Box {...props} />
    </ItemContext.Provider>
  );
}
export function FormLabel(props: TextProps) {
  const field = useFormField();
  return <LabelText {...props} nativeID={field.id ? `${field.id}-label` : undefined} />;
}
export function FormControl({ children, ...props }: ViewProps & { children?: ReactNode }) {
  const field = useFormField();
  return (
    <View {...props} nativeID={field.formItemId}>
      {children}
    </View>
  );
}
export function FormDescription(props: TextProps) {
  const field = useFormField();
  return <Muted {...props} nativeID={field.formDescriptionId} />;
}
export function FormMessage({ children, ...props }: TextProps) {
  const field = useFormField();
  const message = field.error?.message ? String(field.error.message) : children;
  if (!message) return null;
  return (
    <LabelText
      {...props}
      nativeID={field.formMessageId}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {message}
    </LabelText>
  );
}
