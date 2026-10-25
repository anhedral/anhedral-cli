import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { View, ScrollView, type ViewProps, type TextInputProps } from 'react-native';
import { Box, LabelText, Muted, row, useControllable, content, nativeComponent } from './_core';
import { Button, type NativeControlButtonProps as ButtonProps } from './button';
import { Input } from './input';
import { useTheme } from '../theme';
import { useNativeField, useNativeFieldActivation } from './_field-context';
import {
  OverlayRoot,
  OverlayTrigger,
  OverlayContent,
  useOverlay,
  type OverlayProps,
} from './_overlay';
export type SelectOption = { value: string; label: string; disabled?: boolean };
type SelectChange = { change(value: unknown): void }['change'];
type SelectRender = { render(value: unknown): ReactNode }['render'];
type SelectString = { format(value: unknown): string }['format'];
const SelectContext = createContext<{
  value: unknown;
  labels: Map<unknown, string>;
  set: (value: unknown) => void;
  isSelected: (value: unknown) => boolean;
  label: (value: unknown) => string;
  multiple: boolean;
  disabled: boolean;
  invalid?: boolean;
  accessibilityLabel?: string;
  placeholder?: ReactNode;
  query: string;
  setQuery: (query: string) => void;
} | null>(null);
function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      typeof child === 'string' || typeof child === 'number'
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? textOf(child.props.children)
          : '',
    )
    .join('');
}
function itemLabels(node: ReactNode, labels = new Map<unknown, string>()) {
  Children.forEach(node, (child) => {
    if (isValidElement<{ value?: unknown; children?: ReactNode }>(child)) {
      if (nativeComponent(child.type) === SelectItem && child.props.value !== undefined)
        labels.set(child.props.value, textOf(child.props.children));
      itemLabels(child.props.children, labels);
    }
  });
  return labels;
}
export function Select({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  invalid,
  multiple = false,
  items,
  itemToStringValue,
  placeholder,
  accessibilityLabel,
  nativeID: _nativeID,
  children,
  onOpenChange,
  ...overlay
}: OverlayProps & {
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: SelectChange;
  disabled?: boolean;
  invalid?: boolean;
  multiple?: boolean;
  items?: readonly unknown[];
  itemToStringValue?: SelectString;
  placeholder?: ReactNode;
  accessibilityLabel?: string;
  nativeID?: string;
}) {
  const [selected, set] = useControllable(
    value,
    defaultValue ?? (multiple ? [] : ''),
    onValueChange,
  );
  const [query, setQuery] = useState('');
  const labels = itemLabels(children);
  const addItems = (items: readonly unknown[]) => {
    for (const item of items)
      if (item && typeof item === 'object') {
        if ('value' in item && 'label' in item)
          labels.set(item.value, textOf(item.label as ReactNode));
        if ('items' in item && Array.isArray(item.items)) addItems(item.items);
      }
  };
  if (items) addItems(items);
  const equal = (a: unknown, b: unknown) =>
    Object.is(a, b) ||
    (!!itemToStringValue &&
      a != null &&
      b != null &&
      itemToStringValue(a) === itemToStringValue(b));
  const values = multiple && Array.isArray(selected) ? selected : [selected];
  const isSelected = (value: unknown) => values.some((item) => equal(item, value));
  return (
    <SelectContext.Provider
      value={{
        value: selected,
        labels,
        set: (value) =>
          set(
            multiple
              ? isSelected(value)
                ? values.filter((item) => !equal(item, value))
                : [...values, value]
              : value,
          ),
        isSelected,
        multiple,
        label: (value) =>
          labels.get(value) ||
          (itemToStringValue && value != null ? itemToStringValue(value) : String(value ?? '')),
        disabled,
        invalid,
        placeholder,
        accessibilityLabel,
        query,
        setQuery,
      }}
    >
      <OverlayRoot
        {...overlay}
        onOpenChange={(open) => {
          if (!open) setQuery('');
          onOpenChange?.(open);
        }}
      >
        {children}
      </OverlayRoot>
    </SelectContext.Provider>
  );
}
function useSelect() {
  const value = useContext(SelectContext);
  if (!value) throw Error('Select parts require Select.');
  return value;
}
export function SelectTrigger({
  invalid,
  style,
  ...props
}: Omit<ButtonProps, 'size'> & { size?: 'default' | 'sm'; invalid?: boolean }) {
  const state = useSelect(),
    field = useNativeField(),
    { colors } = useTheme();
  const overlay = useOverlay();
  useNativeFieldActivation(
    () => overlay.set(true),
    state.disabled || !!props.disabled,
    false,
    props.nativeID,
  );
  return (
    <OverlayTrigger
      variant="outline"
      {...props}
      disabled={state.disabled || props.disabled}
      accessibilityRole="combobox"
      accessibilityLabel={
        props.accessibilityLabel ??
        state.accessibilityLabel ??
        (field?.labelFor(props.nativeID) || undefined)
      }
      accessibilityHint={
        props.accessibilityHint ?? [field?.description, field?.error].filter(Boolean).join('. ')
      }
      style={(event) => [
        (invalid ?? state.invalid ?? field?.invalid) && { borderColor: colors.destructive },
        typeof style === 'function' ? style(event) : style,
      ]}
    />
  );
}
export function SelectValue({
  placeholder,
  children,
}: {
  placeholder?: ReactNode;
  children?: ReactNode | SelectRender;
}) {
  const state = useSelect(),
    values = state.multiple && Array.isArray(state.value) ? state.value : [state.value];
  const label = values
    .filter((value) => value !== '' && value != null)
    .map(state.label)
    .join(', ');
  const rendered =
    typeof children === 'function'
      ? children(state.value)
      : (children ?? (label || placeholder || state.placeholder || 'Select an option'));
  return <>{content(rendered)}</>;
}
export function SelectContent({
  children,
  align = 'center',
  position: _position,
  style,
  ...props
}: React.ComponentProps<typeof OverlayContent> & {
  align?: 'start' | 'center' | 'end';
  position?: 'popper' | 'item-aligned';
}) {
  return (
    <OverlayContent
      {...props}
      style={[
        {
          alignSelf: align === 'end' ? 'flex-end' : align === 'start' ? 'flex-start' : 'center',
          width: '100%',
        },
        style,
      ]}
    >
      <ScrollView style={{ maxHeight: 400 }}>{children}</ScrollView>
    </OverlayContent>
  );
}
export function SelectItem({
  value,
  children,
  textValue,
  ...props
}: ButtonProps & { value: unknown; textValue?: string }) {
  const selection = useSelect();
  const overlay = useOverlay();
  const groupDisabled = useContext(SelectGroupDisabled);
  if (
    selection.query &&
    !(textValue ?? textOf(children))
      .toLocaleLowerCase()
      .includes(selection.query.toLocaleLowerCase())
  )
    return null;
  return (
    <Button
      nativePreset={false}
      variant="ghost"
      {...props}
      disabled={selection.disabled || groupDisabled || props.disabled}
      accessibilityRole={selection.multiple ? 'checkbox' : 'radio'}
      accessibilityLabel={props.accessibilityLabel ?? textValue}
      accessibilityState={{
        checked: selection.isSelected(value),
        disabled: !!(selection.disabled || groupDisabled || props.disabled),
      }}
      onPress={(event) => {
        props.onPress?.(event);
        if (event.isDefaultPrevented()) return;
        selection.set(value);
        if (!selection.multiple) overlay.set(false);
      }}
    >
      {children}
    </Button>
  );
}
const SelectGroupDisabled = createContext(false);
export function SelectGroup({
  disabled = false,
  children,
  ...props
}: ViewProps & { disabled?: boolean }) {
  const inherited = useContext(SelectGroupDisabled);
  return (
    <SelectGroupDisabled.Provider value={disabled || inherited}>
      <Box {...props}>{children}</Box>
    </SelectGroupDisabled.Provider>
  );
}
export const SelectLabel = Muted;
export const SelectItemText = LabelText;
export const SelectSeparator = () => <View style={{ height: 8 }} />;
export function NativeSelect({
  nativeID,
  options,
  invalid,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled,
  accessibilityLabel,
  size = 'default',
  children,
}: {
  options?: SelectOption[];
  nativeID?: string;
  invalid?: boolean;
  children?: ReactNode;
  size?: 'default' | 'sm';
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Select
      invalid={invalid}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger nativeID={nativeID} size={size} accessibilityLabel={accessibilityLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options?.map((item) => (
          <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </SelectItem>
        ))}
        {children}
      </SelectContent>
    </Select>
  );
}
export const NativeSelectOption = SelectItem;
export function NativeSelectOptGroup({
  label,
  children,
  ...props
}: React.ComponentProps<typeof SelectGroup> & { label?: ReactNode }) {
  return (
    <SelectGroup {...props}>
      {label && <SelectLabel>{label}</SelectLabel>}
      {children}
    </SelectGroup>
  );
}
export function Combobox({
  options,
  value,
  defaultValue = '',
  onValueChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search options',
  emptyText = 'No options found',
  disabled,
  accessibilityLabel,
}: {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const [selected, set] = useControllable(value, defaultValue, onValueChange);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = options.filter((item) =>
    item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <OverlayRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <OverlayTrigger
        variant="outline"
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="combobox"
      >
        {options.find((item) => item.value === selected)?.label ?? placeholder}
      </OverlayTrigger>
      <OverlayContent>
        <Input
          accessibilityLabel={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={query}
          onChangeText={setQuery}
        />
        <ScrollView style={{ maxHeight: 300 }}>
          {filtered.length ? (
            filtered.map((item) => (
              <Button
                nativePreset={false}
                key={item.value}
                disabled={item.disabled}
                accessibilityRole="radio"
                accessibilityState={{ checked: item.value === selected }}
                onPress={() => {
                  set(item.value);
                  setOpen(false);
                  setQuery('');
                }}
              >
                {item.label}
              </Button>
            ))
          ) : (
            <Muted accessibilityLiveRegion="polite">{emptyText}</Muted>
          )}
        </ScrollView>
      </OverlayContent>
    </OverlayRoot>
  );
}
const CommandContext = createContext<{
  query: string;
  setQuery: (value: string) => void;
  value: string;
  setValue: (value: string) => void;
  count: number;
} | null>(null);
function commandCount(node: ReactNode, query: string): number {
  let count = 0;
  Children.forEach(node, (child) => {
    if (
      !isValidElement<{
        value?: string;
        textValue?: string;
        keywords?: string[];
        children?: ReactNode;
      }>(child)
    )
      return;
    if (
      nativeComponent(child.type) === CommandItem &&
      [
        child.props.value ?? child.props.textValue ?? textOf(child.props.children),
        ...(child.props.keywords ?? []),
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase())
    )
      count++;
    else count += commandCount(child.props.children, query);
  });
  return count;
}
export function Command({
  children,
  value,
  defaultValue = '',
  onValueChange,
  ...props
}: ViewProps & { value?: string; defaultValue?: string; onValueChange?: (value: string) => void }) {
  const [query, setQuery] = useState('');
  const [selected, setValue] = useControllable(value, defaultValue, onValueChange);
  return (
    <CommandContext.Provider
      value={{ query, setQuery, value: selected, setValue, count: commandCount(children, query) }}
    >
      <Box {...props}>{children}</Box>
    </CommandContext.Provider>
  );
}
function useCommand() {
  const value = useContext(CommandContext);
  if (!value) throw Error('Command parts require Command.');
  return value;
}
export function CommandInput(props: TextInputProps) {
  const state = useCommand();
  return (
    <Input
      accessibilityLabel="Search commands"
      {...props}
      value={state.query}
      onChangeText={state.setQuery}
    />
  );
}
export function CommandList({
  children,
  renderEmptyState,
  ...props
}: React.ComponentProps<typeof ScrollView> & { renderEmptyState?: () => ReactNode }) {
  const state = useCommand();
  return (
    <ScrollView {...props} style={[{ maxHeight: 350 }, props.style]}>
      {children}
      {state.count === 0 && renderEmptyState?.()}
    </ScrollView>
  );
}
export function CommandEmpty(props: React.ComponentProps<typeof Muted>) {
  return useCommand().count ? null : <Muted accessibilityLiveRegion="polite" {...props} />;
}
export function CommandGroup({ heading, ...props }: ViewProps & { heading?: string }) {
  return (
    <Box>
      {heading && <Muted accessibilityRole="header">{heading}</Muted>}
      <Box {...props} />
    </Box>
  );
}
export function CommandItem({
  value: suppliedValue,
  textValue,
  keywords = [],
  onSelect,
  children,
  ...props
}: ButtonProps & {
  value?: string;
  textValue?: string;
  keywords?: string[];
  onSelect?: (value: string) => void;
}) {
  const state = useCommand();
  const value = suppliedValue ?? textValue ?? textOf(children);
  if (![value, ...keywords].join(' ').toLocaleLowerCase().includes(state.query.toLocaleLowerCase()))
    return null;
  return (
    <Button
      nativePreset={false}
      variant="ghost"
      {...props}
      accessibilityState={{ selected: state.value === value, disabled: !!props.disabled }}
      onPress={() => {
        state.setValue(value);
        onSelect?.(value);
      }}
    >
      {children}
    </Button>
  );
}
export const CommandSeparator = SelectSeparator;
export const CommandShortcut = Muted;
export function CommandDialog({ children, ...props }: OverlayProps) {
  return (
    <OverlayRoot {...props}>
      <OverlayContent>
        <Command>{children}</Command>
      </OverlayContent>
    </OverlayRoot>
  );
}
export const NavigationMenu = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const NavigationMenuList = NavigationMenu;
export const NavigationMenuItem = OverlayRoot;
export const NavigationMenuTrigger = OverlayTrigger;
export const NavigationMenuContent = OverlayContent;
export const NavigationMenuLink = (props: ButtonProps) => (
  <Button nativePreset={false} variant="link" {...props} accessibilityRole="link" />
);
export const NavigationMenuViewport = Box;
export const NavigationMenuIndicator = () => <LabelText accessibilityElementsHidden>▾</LabelText>;

export const SelectPopover = SelectContent;
export const SelectList = Box;
export function SelectInput({ onChangeText, ...props }: TextInputProps) {
  const state = useSelect();
  return (
    <Input
      accessibilityLabel="Search options"
      {...props}
      editable={props.editable !== false && !state.disabled}
      value={state.query}
      onChangeText={(query) => {
        onChangeText?.(query);
        state.setQuery(query);
      }}
    />
  );
}
export function SelectEmpty({
  children = 'No options found',
  ...props
}: React.ComponentProps<typeof Muted>) {
  const state = useSelect();
  return [...state.labels.values()].some((label) =>
    label.toLocaleLowerCase().includes(state.query.toLocaleLowerCase()),
  ) ? null : (
    <Muted accessibilityLiveRegion="polite" {...props}>
      {children}
    </Muted>
  );
}
