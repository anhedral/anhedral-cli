import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { View, ScrollView, type ViewProps, type TextInputProps } from 'react-native';
import { Box, LabelText, Muted, row, useControllable } from './_core';
import { Button, type ButtonProps } from './button';
import { Input } from './input';
import {
  OverlayRoot,
  OverlayTrigger,
  OverlayContent,
  useOverlay,
  type OverlayProps,
} from './_overlay';
export type SelectOption = { value: string; label: string; disabled?: boolean };
const SelectContext = createContext<{
  value: string;
  set: (value: string) => void;
  labels: Map<string, string>;
  disabled: boolean;
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
function itemLabels(node: ReactNode, labels = new Map<string, string>()) {
  Children.forEach(node, (child) => {
    if (isValidElement<{ value?: string; children?: ReactNode }>(child)) {
      if (child.type === SelectItem && child.props.value)
        labels.set(child.props.value, textOf(child.props.children));
      itemLabels(child.props.children, labels);
    }
  });
  return labels;
}
export function Select({
  value,
  defaultValue = '',
  onValueChange,
  disabled = false,
  children,
  ...overlay
}: OverlayProps & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const [selected, set] = useControllable(value, defaultValue, onValueChange);
  return (
    <SelectContext.Provider
      value={{ value: selected, set, labels: itemLabels(children), disabled }}
    >
      <OverlayRoot {...overlay}>{children}</OverlayRoot>
    </SelectContext.Provider>
  );
}
function useSelect() {
  const value = useContext(SelectContext);
  if (!value) throw Error('Select parts require Select.');
  return value;
}
export function SelectTrigger(props: ButtonProps) {
  const state = useSelect();
  return (
    <OverlayTrigger
      variant="outline"
      {...props}
      disabled={state.disabled || props.disabled}
      accessibilityRole="combobox"
    />
  );
}
export function SelectValue({
  placeholder = 'Select an option',
  children,
}: {
  placeholder?: string;
  children?: ReactNode;
}) {
  const state = useSelect();
  return (
    <LabelText>
      {children ?? (state.value ? (state.labels.get(state.value) ?? state.value) : placeholder)}
    </LabelText>
  );
}
export function SelectContent({ children, ...props }: React.ComponentProps<typeof OverlayContent>) {
  return (
    <OverlayContent {...props}>
      <ScrollView style={{ maxHeight: 400 }}>{children}</ScrollView>
    </OverlayContent>
  );
}
export function SelectItem({ value, children, ...props }: ButtonProps & { value: string }) {
  const selection = useSelect();
  const overlay = useOverlay();
  return (
    <Button
      variant="ghost"
      {...props}
      disabled={selection.disabled || props.disabled}
      accessibilityRole="radio"
      accessibilityState={{
        checked: selection.value === value,
        disabled: !!(selection.disabled || props.disabled),
      }}
      onPress={() => {
        selection.set(value);
        overlay.set(false);
      }}
    >
      {children}
    </Button>
  );
}
export const SelectGroup = Box;
export const SelectLabel = Muted;
export const SelectItemText = LabelText;
export const SelectSeparator = () => <View style={{ height: 8 }} />;
export function NativeSelect({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled,
  accessibilityLabel,
}: {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger accessibilityLabel={accessibilityLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export const NativeSelectOption = SelectItem;
export const NativeSelectOptGroup = SelectGroup;
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
    if (!isValidElement<{ value?: string; keywords?: string[]; children?: ReactNode }>(child))
      return;
    if (
      child.type === CommandItem &&
      [child.props.value, ...(child.props.keywords ?? [])]
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
export const CommandList = ({ children, ...props }: React.ComponentProps<typeof ScrollView>) => (
  <ScrollView {...props} style={[{ maxHeight: 350 }, props.style]}>
    {children}
  </ScrollView>
);
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
  value,
  keywords = [],
  onSelect,
  children,
  ...props
}: ButtonProps & { value: string; keywords?: string[]; onSelect?: (value: string) => void }) {
  const state = useCommand();
  if (![value, ...keywords].join(' ').toLocaleLowerCase().includes(state.query.toLocaleLowerCase()))
    return null;
  return (
    <Button
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
  <Button variant="link" {...props} accessibilityRole="link" />
);
export const NavigationMenuViewport = Box;
export const NavigationMenuIndicator = () => <LabelText accessibilityElementsHidden>▾</LabelText>;
