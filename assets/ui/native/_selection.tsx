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
import { OverlayRoot, OverlayTrigger, OverlayContent, type OverlayProps } from './_overlay';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  nativeSelectText as textOf,
  type SelectOption,
} from './_select';
export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectItemText,
  SelectSeparator,
  SelectPopover,
  SelectList,
  SelectInput,
  SelectEmpty,
  type SelectOption,
} from './_select';
export { NativeSelect, NativeSelectOption, NativeSelectOptGroup } from './native-select';
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
