import type { ReactNode, ComponentProps } from 'react';
import {
  Select as NativeSelect,
  SelectValue as NativeSelectValue,
  type SelectValueState,
} from './_select';
import { NativeRegistryPalette } from './_registry-context';
export {
  SelectTrigger,
  SelectContent,
  SelectPopover,
  SelectList,
  SelectInput,
  SelectEmpty,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectItemText,
  SelectSeparator,
} from './_select';
export function SelectValue<T extends object = object>({
  children,
  ...props
}: Omit<ComponentProps<typeof NativeSelectValue>, 'children'> & {
  children?: ReactNode | ((state: SelectValueState<T>) => ReactNode);
}) {
  return <NativeSelectValue<SelectValueState<T>> {...props}>{children}</NativeSelectValue>;
}
export {
  RegistrySelectAutocomplete as Autocomplete,
  useRegistrySelectFilter as useFilter,
} from './_select';

export function Select(props: ComponentProps<typeof NativeSelect>) {
  return (
    <NativeRegistryPalette generation="modern" source="aria">
      <NativeSelect {...props} />
    </NativeRegistryPalette>
  );
}
