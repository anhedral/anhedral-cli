import {
  createContext,
  startTransition,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
  type ComponentProps,
} from 'react';
import { NativeForm, type NativeFormProps } from './native-form';
import {
  RadioGroup as NativeRadioGroup,
  Checkbox as NativeCheckbox,
  Switch as NativeSwitch,
} from './_controls';
import { Select as NativeSelect } from './_selection';
/** Native values for the official action examples. No DOM, multipart upload or server transport is implied. */
export class NativeFormValues {
  constructor(private readonly values: readonly (readonly [string, string])[]) {}
  get(name: string): string | null {
    return this.values.find(([key]) => key === name)?.[1] ?? null;
  }
  getAll(name: string): string[] {
    return this.values.filter(([key]) => key === name).map(([, value]) => value);
  }
  entries() {
    return this.values[Symbol.iterator]();
  }
}
type Field = { name: string; read: () => string[] };
const Fields = createContext<{ fields: Map<string, Field>; values: object } | null>(null);
export function NativeActionForm({
  action,
  values,
  pending = false,
  children,
  ...props
}: Omit<NativeFormProps, 'onSubmit'> & {
  action: (data: NativeFormValues) => void;
  values: object;
  pending?: boolean;
}) {
  const [fields] = useState(() => new Map<string, Field>());
  return (
    <Fields.Provider value={{ fields, values }}>
      <NativeForm
        {...props}
        noValidate={props.noValidate ?? true}
        accessibilityState={{ ...props.accessibilityState, busy: pending }}
        onSubmit={() => {
          const data = new NativeFormValues(
            [...fields.values()].flatMap((field) =>
              field.read().map((value) => [field.name, value] as const),
            ),
          );
          startTransition(() => action(data));
        }}
      >
        {children}
      </NativeForm>
    </Fields.Provider>
  );
}
export function useNativeActionControl<T>(
  name: string | undefined,
  value: T | undefined,
  initial: T,
  onChange: ((value: T) => void) | undefined,
  serialize: (value: T) => string[],
  disabled = false,
) {
  const scope = useContext(Fields),
    id = useId(),
    [local, setLocal] = useState(initial),
    current = value ?? local;
  const latest = useRef({ current, serialize, disabled });
  latest.current = { current, serialize, disabled };
  const fields = scope?.fields,
    reset = scope?.values;
  useLayoutEffect(() => {
    if (!fields || !name) return;
    fields.set(id, {
      name,
      read: () => (latest.current.disabled ? [] : latest.current.serialize(latest.current.current)),
    });
    return () => {
      fields.delete(id);
    };
  }, [fields, name, id]);
  useEffect(() => {
    if (reset) setLocal(initial);
  }, [reset, initial]);
  return {
    active: !!scope && !!name,
    value: current,
    set: (next: T) => {
      setLocal(next);
      onChange?.(next);
    },
  };
}
export function RadioGroup({
  name,
  value,
  defaultValue = '',
  onValueChange,
  ...props
}: ComponentProps<typeof NativeRadioGroup> & { name?: string }) {
  const field = useNativeActionControl(
    name,
    value,
    defaultValue,
    onValueChange,
    (value) => [value],
    props.disabled,
  );
  return <NativeRadioGroup {...props} value={field.value} onValueChange={field.set} />;
}
export function Select({
  name,
  value,
  defaultValue = '',
  onValueChange,
  ...props
}: ComponentProps<typeof NativeSelect> & { name?: string }) {
  const field = useNativeActionControl(
    name,
    value,
    defaultValue,
    onValueChange,
    (value) => (value == null ? [] : Array.isArray(value) ? value.map(String) : [String(value)]),
    props.disabled,
  );
  return <NativeSelect {...props} value={field.value} onValueChange={field.set} />;
}
export function Checkbox({
  name,
  value = 'on',
  checked,
  defaultChecked = false,
  onCheckedChange,
  ...props
}: ComponentProps<typeof NativeCheckbox> & { name?: string; value?: string }) {
  const field = useNativeActionControl<boolean | 'indeterminate'>(
    name,
    checked,
    defaultChecked,
    (next) => onCheckedChange?.(next === true),
    (checked) => (checked === true ? [value] : []),
    !!props.disabled,
  );
  return <NativeCheckbox {...props} checked={field.value} onCheckedChange={field.set} />;
}
export function Switch({
  name,
  value = 'on',
  checked,
  defaultChecked = false,
  onCheckedChange,
  ...props
}: ComponentProps<typeof NativeSwitch> & { name?: string; value?: string }) {
  const field = useNativeActionControl(
    name,
    checked,
    defaultChecked,
    onCheckedChange,
    (checked) => (checked ? [value] : []),
    !!props.disabled,
  );
  return <NativeSwitch {...props} checked={field.value} onCheckedChange={field.set} />;
}
export { SelectContent, SelectItem, SelectTrigger, SelectValue } from './_selection';
export { RadioGroupItem } from './_controls';
