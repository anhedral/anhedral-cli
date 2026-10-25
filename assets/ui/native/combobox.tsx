import { Children, createContext, isValidElement, useContext, useRef, type ReactNode } from 'react';
import { ScrollView, View, type ViewProps, type TextInputProps } from 'react-native';
import { Combobox as LegacyCombobox } from './_selection';
import { Box, LabelText, Muted, plainText, row, useControllable, nativeComponent } from './_core';
import { OverlayRoot, OverlayTrigger, OverlayContent } from './_overlay';
import { Button, type NativeControlButtonProps as ButtonProps } from './button';
import { Input } from './input';
import { Separator } from './_display';

type Common<T> = {
  items?: readonly T[];
  children?: ReactNode;
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  itemToStringLabel?: (item: T) => string;
  itemToStringValue?: (item: T) => string;
  isItemDisabled?: (item: T) => boolean;
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (query: string) => void;
};
type Props<T> = Common<T> &
  (
    | { multiple: true; value?: T[]; defaultValue?: T[]; onValueChange?: (values: T[]) => void }
    | {
        multiple?: false;
        value?: T | null;
        defaultValue?: T | null;
        onValueChange?: (value: T | null) => void;
      }
  );
type State = {
  items: readonly unknown[];
  selected: readonly unknown[];
  multiple: boolean;
  disabled: boolean;
  query: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  label: (item: unknown) => string;
  key: (item: unknown) => string;
  itemDisabled: (item: unknown) => boolean;
  choose: (item: unknown) => void;
  remove: (item: unknown) => void;
  filtered: readonly unknown[];
};
const Context = createContext<State | null>(null),
  Popup = createContext(false);
function matches(label: string, query: string) {
  const normalize = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
  return normalize(label).includes(normalize(query.trim()));
}
function useCombobox() {
  const state = useContext(Context);
  if (!state) throw Error('Combobox parts require Combobox.');
  return state;
}
function collect(node: ReactNode, result: unknown[] = [], labels = new Map<unknown, string>()) {
  Children.forEach(node, (child) => {
    if (!isValidElement<{ value?: unknown; children?: ReactNode }>(child)) return;
    if (nativeComponent(child.type) === ComboboxItem) {
      result.push(child.props.value);
      labels.set(child.props.value, plainText(child.props.children));
    } else collect(child.props.children, result, labels);
  });
  return result;
}
function containsInput(node: ReactNode): boolean {
  return Children.toArray(node).some(
    (child) =>
      isValidElement<{ children?: ReactNode }>(child) &&
      (nativeComponent(child.type) === ComboboxInput ||
        nativeComponent(child.type) === ComboboxChipsInput ||
        containsInput(child.props.children)),
  );
}
export function Combobox<T = string>(props: Props<T> | Parameters<typeof LegacyCombobox>[0]) {
  return 'options' in props ? <LegacyCombobox {...props} /> : <CompoundCombobox {...props} />;
}
function CompoundCombobox<T>(props: Props<T>) {
  const [value, setValue] = useControllable<T | T[] | null>(
    props.value,
    props.defaultValue ?? (props.multiple ? [] : null),
    (next) => {
      if (props.multiple) props.onValueChange?.(next as T[]);
      else props.onValueChange?.(next as T | null);
    },
  );
  const [open, setOpenValue] = useControllable(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );
  const [query, setQuery] = useControllable(
    props.inputValue,
    props.defaultInputValue ?? '',
    props.onInputValueChange,
  );
  const setOpen = (next: boolean) => {
    setOpenValue(next);
    if (!next) setQuery('');
  };
  const collectedLabels = new Map<unknown, string>();
  const collected = collect(props.children, [], collectedLabels);
  const label = (item: unknown) =>
    props.itemToStringLabel
      ? props.itemToStringLabel(item as T)
      : collectedLabels.has(item)
        ? collectedLabels.get(item)!
        : typeof item === 'object' && item !== null && ('label' in item || 'name' in item)
          ? String('label' in item ? item.label : 'name' in item ? item.name : '')
          : String(item ?? '');
  const key = (item: unknown) =>
    props.itemToStringValue
      ? props.itemToStringValue(item as T)
      : typeof item === 'object' && item !== null && ('value' in item || 'id' in item)
        ? String('value' in item ? item.value : 'id' in item ? item.id : '')
        : label(item);
  const selected: unknown[] = props.multiple
    ? Array.isArray(value)
      ? value
      : []
    : value === null
      ? []
      : [value];
  const items = props.items ?? collected;
  const itemDisabled = (item: unknown) =>
    !!props.isItemDisabled?.(item as T) ||
    (typeof item === 'object' && item !== null && 'disabled' in item && !!item.disabled);
  const remove = (item: unknown) =>
    setValue(props.multiple ? (selected.filter((entry) => key(entry) !== key(item)) as T[]) : null);
  const choose = (item: unknown) => {
    if (props.disabled || itemDisabled(item)) return;
    if (props.multiple) {
      setValue(
        selected.some((entry) => key(entry) === key(item))
          ? (selected.filter((entry) => key(entry) !== key(item)) as T[])
          : ([...selected, item] as T[]),
      );
    } else {
      setValue(item as T);
      setOpen(false);
    }
  };
  const filtered = items.filter((item) => matches(label(item), query));
  return (
    <Context.Provider
      value={{
        items,
        selected,
        multiple: !!props.multiple,
        disabled: !!props.disabled,
        query,
        open,
        setOpen,
        setQuery,
        label,
        key,
        itemDisabled,
        choose,
        remove,
        filtered,
      }}
    >
      <OverlayRoot open={open} onOpenChange={setOpen}>
        {props.children}
      </OverlayRoot>
    </Context.Provider>
  );
}
export function ComboboxTrigger({
  children,
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const state = useCombobox();
  return (
    <OverlayTrigger
      variant="outline"
      {...props}
      disabled={state.disabled || props.disabled}
      accessibilityRole="combobox"
      accessibilityValue={{ text: state.selected.map(state.label).join(', ') || 'None' }}
    >
      {children ?? <ComboboxValue />}
    </OverlayTrigger>
  );
}
export function ComboboxValue({
  placeholder = 'Select an option',
  children,
}: {
  placeholder?: string;
  children?: ReactNode;
}) {
  const state = useCombobox();
  return (
    <LabelText>
      {children ??
        (state.selected.length ? state.selected.map(state.label).join(', ') : placeholder)}
    </LabelText>
  );
}
export function ComboboxInput({
  placeholder = 'Select an option',
  onChangeText,
  ...props
}: TextInputProps) {
  const state = useCombobox(),
    popup = useContext(Popup);
  if (popup)
    return (
      <Input
        nativePreset={false}
        accessibilityLabel="Search options"
        {...props}
        placeholder={placeholder}
        editable={!state.disabled && props.editable !== false}
        value={state.query}
        onChangeText={(query) => {
          onChangeText?.(query);
          state.setQuery(query);
        }}
      />
    );
  return (
    <ComboboxTrigger
      disabled={state.disabled || props.editable === false}
      style={props.style}
      accessibilityLabel={props.accessibilityLabel ?? placeholder}
    >
      {state.multiple
        ? placeholder
        : state.selected.length
          ? state.label(state.selected[0])
          : placeholder}
    </ComboboxTrigger>
  );
}
export function ComboboxContent({
  children,
  searchLabel = 'Search options',
  ...props
}: React.ComponentProps<typeof OverlayContent> & { searchLabel?: string }) {
  const state = useCombobox();
  return (
    <OverlayContent {...props} nativeSurface="combobox">
      <Popup.Provider value={true}>
        {!containsInput(children) && (
          <Input
            nativePreset={false}
            accessibilityLabel={searchLabel}
            placeholder={searchLabel}
            autoFocus
            value={state.query}
            onChangeText={state.setQuery}
          />
        )}
        {children}
      </Popup.Provider>
    </OverlayContent>
  );
}
export function ComboboxList<T = string>({
  children,
  ...props
}: Omit<React.ComponentProps<typeof ScrollView>, 'children'> & {
  children?: ReactNode | ((item: T) => ReactNode);
}) {
  const state = useCombobox();
  return (
    <ScrollView
      {...props}
      keyboardShouldPersistTaps="handled"
      style={[{ maxHeight: 320 }, props.style]}
    >
      {typeof children === 'function'
        ? state.filtered.map((item, index) => (
            <Box key={state.key(item) || index}>{children(item as T)}</Box>
          ))
        : children}
    </ScrollView>
  );
}
export function ComboboxCollection<T = string>({ children }: { children: (item: T) => ReactNode }) {
  const state = useCombobox();
  return (
    <>
      {state.filtered.map((item, index) => (
        <Box key={state.key(item) || index}>{children(item as T)}</Box>
      ))}
    </>
  );
}
export function ComboboxItem<T>({
  value,
  children,
  onPress,
  ...props
}: ButtonProps & { value: T }) {
  const state = useCombobox();
  const selected = state.selected.some((item) => state.key(item) === state.key(value));
  if (
    state.query &&
    !matches(state.label(value), state.query) &&
    !matches(plainText(children), state.query)
  )
    return null;
  return (
    <Button
      nativePreset={false}
      variant={selected ? 'secondary' : 'ghost'}
      {...props}
      disabled={state.disabled || state.itemDisabled(value) || props.disabled}
      accessibilityRole={state.multiple ? 'checkbox' : 'radio'}
      accessibilityState={{
        checked: selected,
        disabled: state.disabled || state.itemDisabled(value) || !!props.disabled,
      }}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) state.choose(value);
      }}
    >
      {children}
    </Button>
  );
}
export function ComboboxEmpty({
  children = 'No options found',
  ...props
}: React.ComponentProps<typeof Muted>) {
  const state = useCombobox();
  return state.filtered.length ? null : (
    <Muted accessibilityLiveRegion="polite" {...props}>
      {children}
    </Muted>
  );
}
export const ComboboxGroup = Box;
export const ComboboxLabel = Muted;
export const ComboboxSeparator = Separator;
export const ComboboxChips = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const ComboboxChipList = ComboboxChips;
export const ComboboxChipsInput = ComboboxInput;
export function ComboboxChip<T>({
  value,
  showRemove = true,
  children,
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & { value: T; showRemove?: boolean; children?: ReactNode }) {
  const state = useCombobox();
  if (!showRemove)
    return (
      <Box>
        <LabelText>{children ?? state.label(value)}</LabelText>
      </Box>
    );
  return (
    <Button
      nativePreset={false}
      variant="secondary"
      {...props}
      disabled={state.disabled || props.disabled}
      accessibilityLabel={props.accessibilityLabel ?? `Remove ${state.label(value)}`}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) state.remove(value);
      }}
    >
      {children ?? state.label(value)}
    </Button>
  );
}
/** Native modal surfaces do not require a DOM positioning anchor. */
export function useComboboxAnchor() {
  return useRef<View | null>(null);
}
