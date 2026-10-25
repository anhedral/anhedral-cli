import { useMemo, type ReactNode } from 'react';
import type { TextInput } from 'react-native';
import {
  useField,
  handleSubmit,
  reset,
  type Schema,
  type RequiredPath,
  type FormStore,
  type FieldStore,
  type FieldProps,
  type FieldElement,
  type SubmitHandler,
} from '@formisch/react';
import { NativeForm, type NativeFormProps } from './native-form';
export { useForm, FieldArray, reset, insert, remove } from '@formisch/react';
export type { SubmitHandler } from '@formisch/react';

type NativeFieldStore<TSchema extends Schema, TPath extends RequiredPath> = Omit<
  FieldStore<TSchema, TPath>,
  'props'
> & {
  props: {
    name: string;
    autoFocus: boolean;
    ref: (element: TextInput | null) => void;
    onFocus: () => void;
    onBlur: () => void;
    onChangeText: (value: string) => void;
  };
};
/** Keep Formisch's real schema/store subscriptions; replace only its DOM event binding. */
export function Field<TSchema extends Schema, const TPath extends RequiredPath>({
  of,
  path,
  children,
}: {
  of: FormStore<TSchema>;
  path: FieldProps<TSchema, TPath>['path'];
  children: (field: NativeFieldStore<TSchema, TPath>) => ReactNode;
}) {
  const field = useField<TSchema, TPath>(of, { path });
  const props = useMemo(
    () => ({
      name: field.props.name,
      autoFocus: field.props.autoFocus,
      // Formisch only calls focus() on this reference during validation. The actual
      // native TextInput supplies it; native values never pass through DOM extraction.
      ref: (element: TextInput | null) => field.props.ref(element as unknown as FieldElement),
      onFocus: field.props.onFocus as () => void,
      onBlur: field.props.onBlur as () => void,
      onChangeText: (value: string) =>
        field.onChange(value as Parameters<typeof field.onChange>[0]),
    }),
    [field],
  );
  return children({ ...field, props });
}
export function Form<TSchema extends Schema>({
  of,
  onSubmit,
  ...props
}: Omit<NativeFormProps, 'onSubmit'> & {
  of: FormStore<TSchema>;
  onSubmit: SubmitHandler<TSchema>;
}) {
  return (
    <NativeForm
      {...props}
      noValidate={props.noValidate ?? true}
      onSubmit={handleSubmit(of, onSubmit)}
      onReset={() => reset(of)}
    />
  );
}
