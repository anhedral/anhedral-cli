import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useContext,
  useId,
  useCallback,
  useLayoutEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type ViewProps,
  type TextProps,
  type TextStyle,
  type StyleProp,
  type TextInputProps,
  type ScrollViewProps,
  type Text as NativeText,
} from 'react-native';
import { Check, ChevronDown, Search } from 'lucide-react-native';
import {
  LabelText,
  NativeTextStyleContext,
  NativeDescendantStyleContext,
  NativeTextStyleProvider,
  content,
  nativeComponent,
  useControllable,
  useDirection,
} from './_core';
import { Button, type NativeControlButtonProps as ButtonProps } from './button';
import { InputGroup, InputGroupInput, InputGroupAddon } from './input-group';
import { useTheme } from '../theme';
import { useNativeField, useNativeFieldActivation, NativeFieldProvider } from './_field-context';
import {
  OverlayRoot,
  OverlayTrigger,
  OverlayContent,
  useOverlay,
  type OverlayProps,
} from './_overlay';
import {
  useNativeComponentStyle,
  useNativeRegistrySource,
  useRegistryPalette,
  NativeButtonIconSize,
} from './_registry-context';
import { nativePresetSelectStyle, type NativeSelectState } from './_preset-select-style';
import { composeNativeRefs } from './_slot';
export type SelectOption = { value: string; label: string; disabled?: boolean };
type SelectChange = { change(value: unknown): void }['change'];
type SelectRender = { render(value: unknown): ReactNode }['render'];
type SelectString = { format(value: unknown): string }['format'];
type Entry = { value: unknown; label: string; children: ReactNode; item?: unknown };
type Selection = {
  value: unknown;
  values: unknown[];
  entries: Map<unknown, Entry>;
  set(value: unknown): void;
  isSelected(value: unknown): boolean;
  label(value: unknown): string;
  multiple: boolean;
  disabled: boolean;
  invalid?: boolean;
  accessibilityLabel?: string;
  placeholder?: ReactNode;
  nativeID?: string;
  query: string;
  setQuery(query: string): void;
};
const SelectContext = createContext<Selection | null>(null);
const FilterContext = createContext<((text: string, query: string) => boolean) | null>(null);
const SelectGroupDisabled = createContext(false);
const TranslucentMenu = createContext(false);
const ValuePaint = createContext<ReturnType<typeof nativePresetSelectStyle>['value'] | null>(null);
export function nativeSelectText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      typeof child === 'string' || typeof child === 'number'
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? nativeSelectText(child.props.children)
          : '',
    )
    .join('');
}
function collection(node: ReactNode, entries = new Map<unknown, Entry>(), item?: unknown) {
  Children.forEach(node, (child) => {
    if (
      !isValidElement<{
        value?: unknown;
        id?: unknown;
        textValue?: string;
        children?: ReactNode | ((item: unknown) => ReactNode);
        items?: readonly unknown[];
      }>(child)
    )
      return;
    const props = child.props;
    if (nativeComponent(child.type) === SelectItem) {
      const value = props.value ?? props.id;
      if (value !== undefined && typeof props.children !== 'function')
        entries.set(value, {
          value,
          label: props.textValue ?? nativeSelectText(props.children),
          children: props.children,
          item,
        });
    }
    if (typeof props.children === 'function' && props.items)
      for (const data of props.items) collection(props.children(data), entries, data);
    else if (typeof props.children !== 'function') collection(props.children, entries, item);
  });
  return entries;
}
function useSelect() {
  const value = useContext(SelectContext);
  if (!value) throw Error('Select parts require Select.');
  return value;
}
function useSelectStyle(
  slot: Parameters<typeof nativePresetSelectStyle>[1],
  state: Partial<NativeSelectState> = {},
  part = 0,
) {
  const theme = useTheme(),
    origin = useNativeRegistrySource(),
    requested = useNativeComponentStyle(),
    generation = useRegistryPalette(),
    window = useWindowDimensions();
  const preset =
    origin === 'default' || origin === 'new-york' || origin === 'new-york-v4'
      ? origin
      : generation === 'legacy'
        ? 'default'
        : (requested ?? 'nova');
  return nativePresetSelectStyle(
    preset,
    slot,
    { ...theme, fontScale: window.fontScale, source: origin, ...state },
    part,
  );
}
const reset = {
  minHeight: 0,
  minWidth: 0,
  height: 'auto' as const,
  padding: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingHorizontal: 0,
  paddingVertical: 0,
  borderWidth: 0,
  borderRadius: 0,
  gap: 0,
  backgroundColor: 'transparent',
};
export function Select({
  value,
  defaultValue,
  onValueChange,
  disabled: requestedDisabled = false,
  invalid,
  multiple: requestedMultiple = false,
  selectionMode,
  items,
  itemToStringValue,
  placeholder,
  accessibilityLabel,
  nativeID,
  children,
  onOpenChange,
  style,
  ...overlay
}: OverlayProps & {
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: SelectChange;
  disabled?: boolean;
  invalid?: boolean;
  multiple?: boolean;
  selectionMode?: 'single' | 'multiple';
  items?: readonly unknown[];
  itemToStringValue?: SelectString;
  placeholder?: ReactNode;
  accessibilityLabel?: string;
  nativeID?: string;
  style?: ViewProps['style'];
}) {
  const field = useNativeField(),
    disabled = requestedDisabled || !!field?.disabled;
  const multiple = selectionMode ? selectionMode === 'multiple' : requestedMultiple;
  const [selected, set] = useControllable(
      value,
      defaultValue ?? (multiple ? [] : ''),
      onValueChange,
    ),
    [query, setQuery] = useState('');
  const entries = collection(children);
  function addItems(values: readonly unknown[]) {
    for (const item of values)
      if (item && typeof item === 'object') {
        if ('value' in item && 'label' in item) {
          const old = entries.get(item.value);
          entries.set(item.value, {
            value: item.value,
            label: nativeSelectText(item.label as ReactNode),
            children: old?.children ?? (item.label as ReactNode),
            item,
          });
        }
        if ('items' in item && Array.isArray(item.items)) addItems(item.items);
      }
  }
  if (items) addItems(items);
  const equal = (a: unknown, b: unknown) =>
    Object.is(a, b) ||
    !!(
      itemToStringValue &&
      a != null &&
      b != null &&
      itemToStringValue(a) === itemToStringValue(b)
    );
  const values = multiple
    ? Array.isArray(selected)
      ? selected
      : selected instanceof Set
        ? [...selected]
        : []
    : [selected];
  const isSelected = (value: unknown) => values.some((item) => equal(item, value));
  const source = useSelectStyle('Select');
  const body = (
    <OverlayRoot
      {...overlay}
      onOpenChange={(open) => {
        if (!open) setQuery('');
        onOpenChange?.(open);
      }}
    >
      {children}
    </OverlayRoot>
  );
  return (
    <SelectContext.Provider
      value={{
        value: selected,
        values,
        entries,
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
        label: (value) => {
          const entry =
            entries.get(value) ?? [...entries.values()].find((item) => equal(item.value, value));
          return (
            entry?.label ??
            (itemToStringValue && value != null ? itemToStringValue(value) : String(value ?? ''))
          );
        },
        disabled,
        invalid,
        placeholder,
        accessibilityLabel,
        nativeID,
        query,
        setQuery,
      }}
    >
      {source.source === 'aria' ? <View style={[source.view, style]}>{body}</View> : body}
    </SelectContext.Provider>
  );
}
export function SelectTrigger({
  invalid,
  style,
  textStyle,
  size = 'default',
  children,
  onFocus,
  onBlur,
  onHoverIn,
  onHoverOut,
  ...props
}: Omit<ButtonProps, 'size'> & { size?: 'default' | 'sm'; invalid?: boolean }) {
  const theme = useTheme(),
    inherited = useContext(NativeTextStyleContext);
  const state = useSelect(),
    field = useNativeField(),
    overlay = useOverlay(),
    [focused, setFocused] = useState(false),
    [hovered, setHovered] = useState(false);
  const id = props.nativeID ?? state.nativeID,
    disabled = state.disabled || !!props.disabled,
    bad = invalid ?? state.invalid ?? field?.invalid;
  const empty = state.values.every((value) => value === '' || value == null);
  const source = useSelectStyle('SelectTrigger', {
      size,
      focused,
      hovered,
      disabled,
      invalid: bad,
      placeholder: empty,
    }),
    icon = useSelectStyle('SelectTrigger', { size }, 1);
  const ownText = StyleSheet.flatten([inherited.style, source.text, textStyle]);
  const foreground =
    props.textColor ??
    (typeof ownText?.color === 'string' ? ownText.color : theme.colors.foreground);
  useNativeFieldActivation(() => overlay.set(true), disabled, false, id);
  return (
    <ValuePaint.Provider value={source.value}>
      <OverlayTrigger
        variant="ghost"
        nativePreset={false}
        {...props}
        nativeID={id}
        disabled={disabled}
        invalid={bad}
        accessibilityRole="combobox"
        accessibilityLabel={
          props.accessibilityLabel ?? state.accessibilityLabel ?? (field?.labelFor(id) || undefined)
        }
        accessibilityHint={
          props.accessibilityHint ?? [field?.description, field?.error].filter(Boolean).join('. ')
        }
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onHoverIn={(event) => {
          setHovered(true);
          onHoverIn?.(event);
        }}
        onHoverOut={(event) => {
          setHovered(false);
          onHoverOut?.(event);
        }}
        textColor={foreground}
        textStyle={[source.text, textStyle]}
        style={(event) => [reset, source.view, typeof style === 'function' ? style(event) : style]}
      >
        {props.asChild ? (
          children
        ) : (
          <>
            <NativeButtonIconSize.Provider value={source.iconSize}>
              <NativeDescendantStyleContext.Provider value={{ iconColor: source.iconColor }}>
                <NativeTextStyleProvider value={{ style: source.text }}>
                  {content(children)}
                </NativeTextStyleProvider>
              </NativeDescendantStyleContext.Provider>
            </NativeButtonIconSize.Provider>
            <ChevronDown
              testID={props.testID ? props.testID + '-icon' : undefined}
              accessible={false}
              accessibilityElementsHidden
              size={source.iconSize ?? Number(icon.view.width ?? icon.view.height ?? 16)}
              color={source.iconColor ?? icon.foreground ?? foreground}
              style={icon.view}
            />
          </>
        )}
      </OverlayTrigger>
    </ValuePaint.Provider>
  );
}
export type SelectValueState<T = unknown> = {
  selectedItems: T[];
  selectedText: string;
  defaultChildren: ReactNode;
  isPlaceholder: boolean;
};
export function SelectValue<T = unknown>({
  placeholder,
  children,
  style,
  textStyle,
  ...props
}: Omit<ViewProps, 'children'> & {
  placeholder?: ReactNode;
  children?: ReactNode | { render(value: T): ReactNode }['render'];
  style?: ViewProps['style'];
  textStyle?: StyleProp<TextStyle>;
  ref?: Ref<View>;
}) {
  const state = useSelect(),
    origin = useNativeRegistrySource(),
    source = useSelectStyle('SelectValue'),
    inherited = useContext(NativeTextStyleContext),
    parent = useContext(ValuePaint),
    window = useWindowDimensions();
  const typography = StyleSheet.flatten([inherited.style, parent?.text, source.text, textStyle]);
  const intrinsicLine =
    (typography?.lineHeight ?? (typography?.fontSize ?? 14) * 1.5) * window.fontScale;
  const values = state.values.filter((value) => value !== '' && value != null),
    label = values.map(state.label).join(', '),
    empty = values.length === 0;
  const fallback = placeholder ?? state.placeholder ?? 'Select an option';
  const entry = values.length === 1 ? state.entries.get(values[0]) : undefined;
  const defaultChildren = empty ? fallback : (entry?.children ?? label);
  const renderState: SelectValueState = {
    selectedItems: values.map(
      (value) => state.entries.get(value)?.item ?? { value, label: state.label(value) },
    ),
    selectedText: label,
    defaultChildren,
    isPlaceholder: empty,
  };
  const body =
    typeof children === 'function'
      ? children((origin === 'aria' ? renderState : state.value) as T)
      : (children ?? (origin === 'aria' && !state.multiple ? defaultChildren : label || fallback));
  return (
    <View
      {...props}
      style={[
        { flexShrink: 1, minWidth: 0 },
        parent?.view,
        source.view,
        // Native flex measurement must preserve the browser's intrinsic text line.
        { flexBasis: 'auto', minHeight: intrinsicLine },
        style,
      ]}
    >
      <NativeTextStyleProvider
        value={{ style: [inherited.style, parent?.text, source.text, textStyle] }}
      >
        {typeof body === 'string' || typeof body === 'number' ? (
          <LabelText numberOfLines={1}>{body}</LabelText>
        ) : (
          content(body)
        )}
      </NativeTextStyleProvider>
    </View>
  );
}
type SelectViewportOwner = {
  register(value: unknown, node: { current: View | null }): () => void;
  schedule(): void;
};
const SelectViewportContext = createContext<SelectViewportOwner | null>(null);
/** Native measurements keep a selected row visible without browser Popper coordinates. */
function SelectViewport({
  ref: forwardedRef,
  onContentSizeChange,
  onScrollBeginDrag,
  children,
  ...props
}: ScrollViewProps & { ref?: Ref<ScrollView> }) {
  const state = useSelect(),
    latest = useRef(state),
    scroll = useRef<ScrollView>(null),
    rows = useRef(new Map<unknown, { current: View | null }>()),
    aligned = useRef(false),
    dragged = useRef(false),
    alive = useRef(true),
    frame = useRef<number | undefined>(undefined),
    attempts = useRef(0);
  latest.current = state;
  const hostRef = useMemo(() => composeNativeRefs(scroll, forwardedRef), [forwardedRef]);
  const schedule = useCallback(() => {
    if (!alive.current || aligned.current || dragged.current || frame.current !== undefined) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      const selected = [...rows.current.entries()].find(
        ([value, node]) => latest.current.isSelected(value) && !!node.current,
      );
      const node = selected?.[1].current,
        // RN 0.86 exposes this method; its legacy TypeScript ScrollView class omits it.
        parent = (
          scroll.current as (ScrollView & { getInnerViewRef?: () => View | null }) | null
        )?.getInnerViewRef?.();
      if (!node || !parent || !selected) return;
      node.measureLayout(
        parent,
        (_x, y, width, height) => {
          if (!alive.current || dragged.current || rows.current.get(selected[0])?.current !== node)
            return;
          if (Number.isFinite(y) && width > 0 && height > 0) {
            aligned.current = true;
            scroll.current?.scrollTo({ y: Math.max(0, y - 4), animated: false });
          } else if (attempts.current++ < 3) schedule();
        },
        () => {
          if (attempts.current++ < 3) schedule();
        },
      );
    });
  }, []);
  const owner = useMemo<SelectViewportOwner>(
    () => ({
      register: (value, node) => {
        rows.current.set(value, node);
        schedule();
        return () => {
          if (rows.current.get(value) === node) rows.current.delete(value);
        };
      },
      schedule,
    }),
    [schedule],
  );
  useLayoutEffect(() => {
    alive.current = true;
    schedule();
    return () => {
      alive.current = false;
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [schedule]);
  return (
    <SelectViewportContext.Provider value={owner}>
      <ScrollView
        {...props}
        ref={hostRef}
        onContentSizeChange={(width, height) => {
          onContentSizeChange?.(width, height);
          schedule();
        }}
        onScrollBeginDrag={(event) => {
          dragged.current = true;
          onScrollBeginDrag?.(event);
        }}
      >
        {children}
      </ScrollView>
    </SelectViewportContext.Provider>
  );
}

type ContentProps = React.ComponentProps<typeof OverlayContent> & {
  ref?: Ref<View>;
  position?: 'popper' | 'item-aligned';
  alignItemWithTrigger?: boolean;
  matchTriggerWidth?: boolean;
};
export function SelectPopover({
  children,
  align,
  position: requestedPosition,
  alignItemWithTrigger: _alignItemWithTrigger,
  matchTriggerWidth = true,
  style,
  side,
  placement,
  sideOffset,
  alignOffset,
  offset,
  crossOffset,
  ...props
}: ContentProps) {
  const family = useSelectStyle('Select').source,
    overlay = useOverlay(),
    direction = useDirection();
  const position =
    requestedPosition ??
    (family === 'radix' || family === 'new-york-v4' ? 'item-aligned' : 'popper');
  const [placed, placedAlign] = (
    placement ??
    overlay.placement ??
    (family === 'aria' ? 'bottom start' : 'bottom')
  ).split(' ');
  const resolvedSide =
    side ??
    ((placed === 'start'
      ? 'inline-start'
      : placed === 'end'
        ? 'inline-end'
        : placed) as NonNullable<ContentProps['side']>);
  if (
    !['center', 'top', 'bottom', 'left', 'right', 'inline-start', 'inline-end'].includes(
      resolvedSide,
    )
  )
    throw Error('Unsupported native Select placement: ' + resolvedSide);
  const resolvedAlign =
    align ??
    (placedAlign === 'start' || placedAlign === 'top'
      ? 'start'
      : placedAlign === 'end' || placedAlign === 'bottom'
        ? 'end'
        : 'center');
  const source = useSelectStyle(
    family === 'aria' ? 'SelectPopover' : 'SelectContent',
    { position, side: resolvedSide === 'center' ? 'bottom' : resolvedSide },
    family === 'base' ? 1 : 0,
  );
  const translucent = !['default', 'new-york', 'new-york-v4'].includes(source.source);
  return (
    <OverlayContent
      {...props}
      nativeSurface="select"
      side={resolvedSide}
      align={resolvedAlign}
      sideOffset={
        sideOffset ?? (family === 'base' || family === 'aria' || position === 'popper' ? 4 : 0)
      }
      alignOffset={alignOffset ?? 0}
      offset={offset}
      crossOffset={crossOffset}
      style={[
        reset,
        { maxHeight: '90%', maxWidth: '100%', direction },
        source.view,
        matchTriggerWidth && overlay.triggerSize.width > 0
          ? { width: overlay.triggerSize.width }
          : undefined,
        style,
      ]}
    >
      <TranslucentMenu.Provider value={translucent}>
        <NativeTextStyleProvider value={{ style: source.text }}>
          {content(children)}
        </NativeTextStyleProvider>
      </TranslucentMenu.Provider>
    </OverlayContent>
  );
}
export function SelectContent({ children, ...props }: ContentProps) {
  const family = useSelectStyle('Select').source;
  const source = useSelectStyle(
    family === 'aria' || family === 'base' ? 'SelectList' : 'SelectContent',
    {
      position:
        props.position ??
        (family === 'radix' || family === 'new-york-v4' ? 'item-aligned' : 'popper'),
    },
    family === 'aria' || family === 'base' ? 0 : 1,
  );
  return (
    <SelectPopover
      {...props}
      placement={props.placement ?? (family === 'aria' ? 'bottom' : undefined)}
    >
      <SelectViewport
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: 400 }}
        contentContainerStyle={source.view}
      >
        {children}
      </SelectViewport>
    </SelectPopover>
  );
}
export function SelectItem({
  value,
  id,
  ref: forwardedRef,
  children,
  textValue,
  style,
  textStyle,
  onFocus,
  onBlur,
  onHoverIn,
  onHoverOut,
  ...props
}: Omit<ButtonProps, 'children'> & {
  value?: unknown;
  id?: unknown;
  textValue?: string;
  children?:
    | ReactNode
    | ((state: {
        isSelected: boolean;
        isDisabled: boolean;
        isFocused: boolean;
        isFocusVisible: boolean;
        isHovered: boolean;
        isPressed: boolean;
      }) => ReactNode);
}) {
  const theme = useTheme(),
    inherited = useContext(NativeTextStyleContext);
  const state = useSelect(),
    overlay = useOverlay(),
    groupDisabled = useContext(SelectGroupDisabled),
    filter = useContext(FilterContext),
    translucent = useContext(TranslucentMenu),
    [focused, setFocused] = useState(false),
    [hovered, setHovered] = useState(false);
  const viewport = useContext(SelectViewportContext),
    node = useRef<View>(null),
    hostRef = useMemo(() => composeNativeRefs(node, forwardedRef), [forwardedRef]);
  const key = value ?? id,
    disabled = state.disabled || groupDisabled || !!props.disabled,
    selected = state.isSelected(key);
  const source = useSelectStyle('SelectItem', {
      focused: focused || hovered,
      disabled,
      translucent,
      destructive: props.variant === 'destructive',
    }),
    origin = source.source;
  const indicator = useSelectStyle(
      'SelectItem',
      {},
      origin === 'base' || origin === 'aria' ? 2 : 1,
    ),
    glyph = useSelectStyle('SelectItem', {}, origin === 'base' || origin === 'aria' ? 3 : 2);
  useLayoutEffect(() => viewport?.register(key, node), [viewport, key]);
  const textSlot = useSelectStyle(
    origin === 'base' || origin === 'aria' ? 'SelectItem' : 'SelectItemText',
    {},
    origin === 'base' || origin === 'aria' ? 1 : 0,
  );
  const ownText = StyleSheet.flatten([inherited.style, source.text, textStyle]);
  const foreground =
    props.textColor ??
    (typeof ownText?.color === 'string' ? ownText.color : theme.colors['popover-foreground']);
  const text = textValue ?? (typeof children === 'function' ? '' : nativeSelectText(children));
  if (
    state.query &&
    !(filter
      ? filter(text, state.query)
      : text.toLocaleLowerCase().includes(state.query.toLocaleLowerCase()))
  )
    return null;
  return (
    <Button
      nativePreset={false}
      variant="ghost"
      {...props}
      ref={hostRef}
      onLayout={(event) => {
        props.onLayout?.(event);
        viewport?.schedule();
      }}
      disabled={disabled}
      accessibilityRole={state.multiple ? 'checkbox' : 'radio'}
      accessibilityLabel={props.accessibilityLabel ?? textValue}
      accessibilityState={{ ...props.accessibilityState, checked: selected, selected, disabled }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onHoverIn={(event) => {
        setHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        onHoverOut?.(event);
      }}
      textColor={foreground}
      textStyle={[source.text, textStyle]}
      style={(event) => [reset, source.view, typeof style === 'function' ? style(event) : style]}
      onPress={(event) => {
        props.onPress?.(event);
        if (event.isDefaultPrevented()) return;
        state.set(key);
        if (!state.multiple) overlay.set(false);
      }}
    >
      <NativeButtonIconSize.Provider value={source.iconSize}>
        <NativeDescendantStyleContext.Provider
          value={{ textColor: source.descendantForeground, iconColor: source.iconColor }}
        >
          <View
            testID={props.testID ? props.testID + '-text' : undefined}
            style={[source.itemText.view, textSlot.view]}
          >
            <NativeTextStyleProvider value={{ style: source.text }}>
              {content(
                typeof children === 'function'
                  ? children({
                      isSelected: selected,
                      isDisabled: disabled,
                      isFocused: focused,
                      isFocusVisible: focused,
                      isHovered: hovered,
                      isPressed: false,
                    })
                  : children,
              )}
            </NativeTextStyleProvider>
          </View>
        </NativeDescendantStyleContext.Provider>
      </NativeButtonIconSize.Provider>
      {selected && (
        <View pointerEvents="none" accessible={false} style={indicator.view}>
          <Check
            testID={props.testID ? props.testID + '-indicator-icon' : undefined}
            accessible={false}
            accessibilityElementsHidden
            color={source.descendantForeground ?? source.iconColor ?? foreground}
            size={source.iconSize ?? Number(glyph.view.width ?? glyph.view.height ?? 16)}
            style={glyph.view}
          />
        </View>
      )}
    </Button>
  );
}
export function SelectGroup<T = unknown>({
  disabled = false,
  children,
  items,
  style,
  ...props
}: Omit<ViewProps, 'children'> & {
  ref?: Ref<View>;
  disabled?: boolean;
  items?: readonly T[];
  children?: ReactNode | ((item: T) => ReactNode);
}) {
  const inherited = useContext(SelectGroupDisabled),
    source = useSelectStyle('SelectGroup');
  const body =
    typeof children === 'function'
      ? items?.map((item, index) => (
          <Fragment
            key={item && typeof item === 'object' && 'value' in item ? String(item.value) : index}
          >
            {children(item)}
          </Fragment>
        ))
      : children;
  return (
    <SelectGroupDisabled.Provider value={disabled || inherited}>
      <View {...props} style={[source.view, style]}>
        {body}
      </View>
    </SelectGroupDisabled.Provider>
  );
}
export function SelectLabel({ style, ...props }: TextProps & { ref?: Ref<NativeText> }) {
  const source = useSelectStyle('SelectLabel');
  return <LabelText {...props} style={[source.text, source.view, style]} />;
}
export function SelectItemText({ style, ...props }: TextProps & { ref?: Ref<NativeText> }) {
  const source = useSelectStyle('SelectItemText');
  return <LabelText {...props} style={[source.text, style]} />;
}
export function SelectSeparator({ style, ...props }: ViewProps & { ref?: Ref<View> }) {
  const translucent = useContext(TranslucentMenu),
    source = useSelectStyle('SelectSeparator', { translucent });
  return <View {...props} accessible={false} style={[source.view, style]} />;
}
function SelectSearchIcon() {
  const inherited = useContext(NativeTextStyleContext),
    source = useSelectStyle('SelectInput', {}, 2),
    text = StyleSheet.flatten(inherited.style);
  return (
    <Search
      accessible={false}
      size={Number(source.view.width ?? source.view.height ?? 16)}
      color={source.foreground ?? (typeof text?.color === 'string' ? text.color : undefined)}
      style={source.view}
    />
  );
}
export function SelectInput({ onChangeText, style, ...props }: TextInputProps) {
  const state = useSelect(),
    source = useSelectStyle('SelectInput'),
    id = useId();
  return (
    <NativeFieldProvider id={id} invalid={false} disabled={state.disabled}>
      <View style={source.view}>
        <InputGroup>
          <InputGroupInput
            autoFocus
            accessibilityLabel="Search options"
            {...props}
            style={style}
            editable={props.editable !== false && !state.disabled}
            value={state.query}
            onChangeText={(query) => {
              onChangeText?.(query);
              state.setQuery(query);
            }}
          />
          <InputGroupAddon>
            <SelectSearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </View>
    </NativeFieldProvider>
  );
}
function matches(state: Selection, filter: ((text: string, query: string) => boolean) | null) {
  return [...state.entries.values()].some((entry) =>
    filter
      ? filter(entry.label, state.query)
      : entry.label.toLocaleLowerCase().includes(state.query.toLocaleLowerCase()),
  );
}
export function SelectList({
  children,
  renderEmptyState,
  style,
  ...props
}: ScrollViewProps & { ref?: Ref<ScrollView>; renderEmptyState?: () => ReactNode }) {
  const state = useSelect(),
    filter = useContext(FilterContext),
    source = useSelectStyle('SelectList'),
    empty = !matches(state, filter);
  return (
    <SelectViewport
      {...props}
      keyboardShouldPersistTaps="handled"
      style={[{ maxHeight: 400 }, source.view, style]}
    >
      {children}
      {empty && renderEmptyState?.()}
    </SelectViewport>
  );
}
export function SelectEmpty({
  children = 'No options found',
  style,
  ...props
}: TextProps & { ref?: Ref<NativeText> }) {
  const state = useSelect(),
    filter = useContext(FilterContext),
    empty = !matches(state, filter),
    source = useSelectStyle('SelectEmpty', { empty });
  return !empty ? null : (
    <LabelText
      {...props}
      accessibilityLiveRegion="polite"
      style={[source.view, source.text, style]}
    >
      {children}
    </LabelText>
  );
}
export function RegistrySelectAutocomplete({
  filter,
  children,
}: {
  filter?: (text: string, query: string) => boolean;
  children?: ReactNode;
}) {
  return <FilterContext.Provider value={filter ?? null}>{children}</FilterContext.Provider>;
}
export function useRegistrySelectFilter(options: Intl.CollatorOptions & { locale?: string } = {}) {
  const key = JSON.stringify(options);
  return useMemo(() => {
    const { locale, ...settings } = options,
      collator = new Intl.Collator(locale, { usage: 'search', ...settings });
    const contains = (text: string, query: string) => {
      if (!query) return true;
      const value = Array.from(text.normalize('NFC'));
      for (let start = 0; start < value.length; start++)
        for (let end = start + 1; end <= value.length; end++)
          if (collator.compare(value.slice(start, end).join(''), query.normalize('NFC')) === 0)
            return true;
      return false;
    };
    return { contains };
  }, [key]);
}
