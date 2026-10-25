import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
  type ReactElement,
  type Ref,
  type ComponentProps,
} from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type ViewProps,
  type PressableProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '../theme';
import {
  nativeComponent,
  content,
  NativeTextStyleContext,
  NativeDescendantStyleContext,
} from './_core';
import { NativeInputGroupHostBoundary } from './_input-group-context';
import { useNativeComponentStyle, useNativeRegistrySource } from './_registry-context';
import { NativePhysicalScope, NativeOverlayContentSlot } from './_physical-scope';
import {
  NativeItemOwners,
  NativeItemGroups,
  useNativeItemOwners,
  useNativeItemDescription,
  useNativeItemGroupSize,
  type NativeItemSize,
} from './_item-context';
import {
  nativePresetItemStyle,
  type NativeItemSlot,
  type NativeItemState,
} from './_preset-item-style';
import { NativeSlot } from './_slot';
import { NativeLink } from './navigation';
import { Separator } from './separator';
type TextPaint = Record<string, string | number | undefined>;
type ContainerProps = ViewProps & {
  textStyle?: StyleProp<TextStyle>;
  nativeTextPaint?: TextPaint;
  ref?: Ref<View>;
};
import { flat, flow, links, itemStyle, TextScope } from './_compound-text';
function useStyle(slot: NativeItemSlot, extra: Partial<NativeItemState> = {}) {
  const theme = useTheme(),
    requested = useNativeComponentStyle(),
    origin = useNativeRegistrySource(),
    owners = useNativeItemOwners(),
    inMenu = useContext(NativeOverlayContentSlot) === 'dropdown-menu-content',
    inherited = useContext(NativeTextStyleContext),
    font = StyleSheet.flatten(inherited.style);
  const name =
    origin === 'default' || origin === 'new-york' || origin === 'new-york-v4'
      ? origin
      : (requested ?? 'nova');
  const size = owners.some((owner) => owner.size === 'xs')
    ? 'xs'
    : owners.some((owner) => owner.size === 'sm')
      ? 'sm'
      : (owners.at(-1)?.size ?? 'default');
  const resolve = (state: Partial<NativeItemState> = {}) =>
    nativePresetItemStyle(name, slot, {
      ...theme,
      source: origin,
      size,
      inMenu,
      hasDescription: owners.some((owner) => owner.hasDescription),
      fontSize: font?.fontSize,
      lineHeight: font?.lineHeight,
      ...extra,
      ...state,
    });
  return { ...resolve(), resolve };
}
function prepareChildren(children: ReactNode) {
  let previous = false;
  return flat(children).map((node) => {
    const isContent = isValidElement(node) && nativeComponent(node.type) === ItemContent;
    const result = isContent
      ? cloneElement(node as ReactElement<{ nativePreviousItemContent?: boolean }>, {
          nativePreviousItemContent: previous,
        })
      : node;
    previous = isContent;
    return result;
  });
}
type ItemProps = Omit<PressableProps, 'children'> & {
  children?: ReactNode;
  variant?: 'default' | 'outline' | 'muted';
  size?: NativeItemSize;
  asChild?: boolean;
  render?:
    | ReactElement<{ children?: ReactNode }>
    | ((
        props: Record<string, unknown>,
        state: { slot: 'item'; variant: 'default' | 'outline' | 'muted'; size: NativeItemSize },
      ) => ReactElement<{ children?: ReactNode }>);
  href?: string;
  textStyle?: StyleProp<TextStyle>;
  nativeTextPaint?: TextPaint;
  ref?: Ref<View>;
};
export function Item({
  children,
  variant = 'default',
  size = 'default',
  style,
  textStyle,
  nativeTextPaint,
  asChild = false,
  render,
  href,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
  ...props
}: ItemProps) {
  const parents = useContext(NativeItemOwners),
    scope = useContext(NativePhysicalScope),
    id = useId(),
    [descriptions, setDescriptions] = useState<ReadonlySet<string>>(new Set()),
    [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const update = useCallback(
      (id: string) =>
        setDescriptions((previous) => (previous.has(id) ? previous : new Set([...previous, id]))),
      [],
    ),
    remove = useCallback(
      (id: string) =>
        setDescriptions((previous) => {
          if (!previous.has(id)) return previous;
          const next = new Set(previous);
          next.delete(id);
          return next;
        }),
      [],
    );
  useNativeItemGroupSize(size);
  const events = {
    ...props,
    onHoverIn: (event: Parameters<NonNullable<PressableProps['onHoverIn']>>[0]) => {
      setHovered(true);
      onHoverIn?.(event);
    },
    onHoverOut: (event: Parameters<NonNullable<PressableProps['onHoverOut']>>[0]) => {
      setHovered(false);
      onHoverOut?.(event);
    },
    onFocus: (event: Parameters<NonNullable<PressableProps['onFocus']>>[0]) => {
      setFocused(true);
      onFocus?.(event);
    },
    onBlur: (event: Parameters<NonNullable<PressableProps['onBlur']>>[0]) => {
      setFocused(false);
      onBlur?.(event);
    },
  };
  let paint = useStyle('Item', {
    variant,
    size,
    isLink: href !== undefined,
    hovered,
    focused,
    disabled: !!props.disabled,
  });
  const callbackStyle = itemStyle(
    paint.view,
    typeof style === 'function' ? style({ pressed: false }) : style,
  );
  const { ref: _callbackRef, ...callbackProps } = events;
  const sourceState = { slot: 'item' as const, variant, size };
  let element =
    typeof render === 'function'
      ? render({ ...callbackProps, style: callbackStyle, children }, sourceState)
      : render;
  if (typeof render === 'function' && !isValidElement(element))
    throw Error('Native Item render callbacks require one native host element.');
  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement<{ children?: ReactNode }>(child))
      throw Error('Native Item asChild requires one native element.');
    element = child;
  }
  const owner = element && nativeComponent(element.type),
    isLink =
      href !== undefined ||
      (!!owner &&
        (typeof owner === 'function' || typeof owner === 'object') &&
        'nativeLinkSlot' in owner &&
        owner.nativeLinkSlot === true);
  if (isLink !== (href !== undefined))
    paint = { ...paint.resolve({ isLink }), resolve: paint.resolve };
  const ownerState = useMemo(
    () => ({ id, scope, size, hasDescription: descriptions.size > 0, update, remove }),
    [id, scope, size, descriptions.size, update, remove],
  );
  const body = (
    <NativeInputGroupHostBoundary>
      {content(
        prepareChildren(
          element
            ? asChild || typeof render === 'function'
              ? element.props.children
              : (children ?? element.props.children)
            : children,
        ),
      )}
    </NativeInputGroupHostBoundary>
  );
  const styled = (state: { pressed: boolean }) =>
    itemStyle(paint.view, typeof style === 'function' ? style(state) : style);
  let host: ReactNode;
  if (element)
    host = (
      <NativeSlot
        {...events}
        slotStyle={
          owner === Pressable ||
          (owner === View &&
            (props.onPress ||
              props.onLongPress ||
              ('onPress' in element.props && element.props.onPress) ||
              ('onLongPress' in element.props && element.props.onLongPress))) ||
          (owner &&
            (typeof owner === 'function' || typeof owner === 'object') &&
            ('nativeButtonSlot' in owner || 'nativeLinkSlot' in owner))
            ? 'pressable'
            : 'static'
        }
        slotInheritedStyle={typeof render === 'function' ? callbackStyle : undefined}
        slotVariant={isLink ? 'item' : undefined}
        style={styled}
      >
        {cloneElement(element, { children: body })}
      </NativeSlot>
    );
  else if (href !== undefined)
    host = (
      <NativeLink {...events} href={href} inline={false} style={styled}>
        {body}
      </NativeLink>
    );
  else if (props.onPress || props.onLongPress)
    host = (
      <Pressable {...events} style={styled}>
        {body}
      </Pressable>
    );
  else
    host = (
      <View {...events} style={styled({ pressed: false })}>
        {body}
      </View>
    );
  return (
    <NativeItemOwners.Provider value={[...parents, ownerState]}>
      <TextScope paint={paint} textStyle={textStyle} nativeTextPaint={nativeTextPaint}>
        {host}
      </TextScope>
    </NativeItemOwners.Provider>
  );
}
Object.assign(Item, {
  nativeContainerTextSlot: true,
  nativeTextPaintSlot: true,
  nativeExampleContainer: true,
});
export function ItemGroup({
  children,
  style,
  textStyle,
  nativeTextPaint,
  ...props
}: ContainerProps) {
  const parents = useContext(NativeItemGroups),
    scope = useContext(NativePhysicalScope),
    id = useId(),
    [sizes, setSizes] = useState<ReadonlyMap<string, NativeItemSize>>(new Map());
  const update = useCallback(
      (id: string, size: NativeItemSize) =>
        setSizes((previous) =>
          previous.get(id) === size ? previous : new Map([...previous, [id, size]]),
        ),
      [],
    ),
    remove = useCallback(
      (id: string) =>
        setSizes((previous) => {
          if (!previous.has(id)) return previous;
          const next = new Map(previous);
          next.delete(id);
          return next;
        }),
      [],
    );
  const paint = useStyle('ItemGroup', {
      hasSmall: [...sizes.values()].includes('sm'),
      hasExtraSmall: [...sizes.values()].includes('xs'),
    }),
    owner = useMemo(() => ({ id, scope, update, remove }), [id, scope, update, remove]);
  return (
    <NativeItemGroups.Provider value={[...parents, owner]}>
      <TextScope paint={paint} textStyle={textStyle} nativeTextPaint={nativeTextPaint}>
        <View role="list" {...props} style={itemStyle(paint.view, style)}>
          <NativeInputGroupHostBoundary>{content(children)}</NativeInputGroupHostBoundary>
        </View>
      </TextScope>
    </NativeItemGroups.Provider>
  );
}
function Container({
  slot,
  children,
  style,
  textStyle,
  nativeTextPaint,
  nativePreviousItemContent = false,
  variant = 'default',
  ...props
}: ContainerProps & {
  slot: NativeItemSlot;
  variant?: 'default' | 'icon' | 'image';
  nativePreviousItemContent?: boolean;
}) {
  const paint = useStyle(slot, {
      mediaVariant: variant,
      previousContent: nativePreviousItemContent,
    }),
    scope = useContext(NativeDescendantStyleContext);
  const body =
    slot === 'ItemTitle'
      ? flow(children)
      : slot === 'ItemDescription'
        ? flow(paint.links ? links(children) : children)
        : content(children);
  return (
    <TextScope paint={paint} textStyle={textStyle} nativeTextPaint={nativeTextPaint}>
      <View {...props} style={itemStyle(paint.view, style)}>
        <NativeInputGroupHostBoundary>
          <NativeDescendantStyleContext.Provider
            value={
              slot === 'ItemMedia'
                ? {
                    ...scope,
                    ...(paint.iconSize === undefined ? {} : { iconSize: paint.iconSize }),
                    ...(paint.iconPointerEvents ? { iconPointerEvents: 'none' as const } : {}),
                    ...(paint.imageFull ? { imageFull: true } : {}),
                    ...(paint.imageCover ? { imageFit: 'cover' as const } : {}),
                  }
                : scope
            }
          >
            {body}
          </NativeDescendantStyleContext.Provider>
        </NativeInputGroupHostBoundary>
      </View>
    </TextScope>
  );
}
export function ItemMedia(props: ContainerProps & { variant?: 'default' | 'icon' | 'image' }) {
  return <Container {...props} slot="ItemMedia" />;
}
export function ItemContent(props: ContainerProps & { nativePreviousItemContent?: boolean }) {
  return <Container {...props} slot="ItemContent" />;
}
export function ItemTitle(props: ContainerProps) {
  return <Container {...props} slot="ItemTitle" />;
}
export function ItemDescription(props: ContainerProps) {
  useNativeItemDescription();
  return <Container {...props} slot="ItemDescription" />;
}
export function ItemActions(props: ContainerProps) {
  return <Container {...props} slot="ItemActions" />;
}
export function ItemHeader(props: ContainerProps) {
  return <Container {...props} slot="ItemHeader" />;
}
export function ItemFooter(props: ContainerProps) {
  return <Container {...props} slot="ItemFooter" />;
}
export function ItemSeparator({ style, ...props }: ComponentProps<typeof Separator>) {
  const paint = useStyle('ItemSeparator');
  return <Separator orientation="horizontal" {...props} style={itemStyle(paint.view, style)} />;
}
for (const component of [
  ItemGroup,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemHeader,
  ItemFooter,
])
  Object.assign(component, { nativeContainerTextSlot: true, nativeTextPaintSlot: true });
