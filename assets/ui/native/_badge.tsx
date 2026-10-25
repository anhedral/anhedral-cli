import {
  Children,
  createElement,
  Fragment,
  cloneElement,
  isValidElement,
  useState,
  type ReactNode,
  type ReactElement,
  type Ref,
} from 'react';
import {
  View,
  Text as NativeText,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
  type TextProps,
  type StyleProp,
} from 'react-native';
import { useTheme } from '../theme';
import {
  NativeTextStyleProvider,
  LabelText,
  TextToneProvider,
  content,
  plainText,
  nativeComponent,
  withAlpha,
} from './_core';
import {
  useNativeComponentStyle,
  useNativeRegistrySource,
  useRegistryPalette,
  NativeButtonIconSize,
} from './_registry-context';
import { NativeSlot, nativeTextPressRetentionOffset } from './_slot';
import { nativePresetBadgeStyle } from './_preset-badge-style';
type RenderProps = Omit<PressableProps, 'children'> & { children?: ReactNode; ref?: Ref<View> };
/** Render callbacks receive native host styles and normalized shared text/pressable fields. */
export type BadgeRenderProps = Omit<
  PressableProps,
  | 'children'
  | 'style'
  | 'disabled'
  | 'onPress'
  | 'onPressIn'
  | 'onPressOut'
  | 'onLongPress'
  | 'pressRetentionOffset'
> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled: boolean;
  onPress?: NonNullable<PressableProps['onPress']>;
  onPressIn?: NonNullable<PressableProps['onPressIn']>;
  onPressOut?: NonNullable<PressableProps['onPressOut']>;
  onLongPress?: NonNullable<PressableProps['onLongPress']>;
  pressRetentionOffset?: TextProps['pressRetentionOffset'];
};
export type BadgeProps = RenderProps & {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  invalid?: boolean;
  nativePreset?: boolean;
  textStyle?: StyleProp<TextStyle>;
  textColor?: string;
  asChild?: boolean;
  render?:
    | ReactElement<{ children?: ReactNode }>
    | ((props: BadgeRenderProps) => ReactElement<{ children?: ReactNode }>);
};
function iconPlacement(nodes: ReactNode, placement: string): boolean {
  return Children.toArray(nodes).some(
    (child) =>
      isValidElement<{ children?: ReactNode; registryIcon?: string }>(child) &&
      (child.type === Fragment
        ? iconPlacement(child.props.children, placement)
        : child.props.registryIcon === placement),
  );
}
export function Badge({
  variant = 'default',
  invalid = false,
  nativePreset = true,
  textStyle,
  textColor,
  asChild = false,
  render,
  children,
  style,
  onPress,
  disabled,
  accessibilityState,
  ...props
}: BadgeProps) {
  const { colors, mode, radius } = useTheme();
  const legacy = useRegistryPalette() === 'legacy';
  const source = useNativeRegistrySource(),
    requested = useNativeComponentStyle();
  const preset =
    source === 'default' || source === 'new-york' || source === 'new-york-v4'
      ? source
      : legacy
        ? 'default'
        : (requested ?? (source ? 'nova' : undefined));
  const [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const { fontScale } = useWindowDimensions();
  const blocked = disabled || accessibilityState?.disabled;
  let surfaceChildren = isValidElement<{ children?: ReactNode }>(render)
    ? render.props.children
    : children;
  const shape = isValidElement(render)
    ? render
    : asChild && isValidElement(children)
      ? children
      : undefined;
  const component = shape ? nativeComponent(shape.type) : undefined;
  let isLink =
    !!component &&
    (typeof component === 'function' || typeof component === 'object') &&
    'nativeLinkSlot' in component &&
    component.nativeLinkSlot === true;
  const resolve = (pressed = false, link = isLink) =>
    preset && nativePreset
      ? nativePresetBadgeStyle(preset, variant, {
          mode,
          radius,
          colors,
          fontScale,
          fontSize: StyleSheet.flatten(textStyle)?.fontSize,
          lineHeight: StyleSheet.flatten(textStyle)?.lineHeight,
          hasText: !!plainText(surfaceChildren),
          hovered,
          focused,
          invalid,
          disabled: !!blocked,
          pressed,
          isLink: link,
          iconStart: iconPlacement(surfaceChildren, 'inline-start'),
          iconEnd: iconPlacement(surfaceChildren, 'inline-end'),
        })
      : undefined;
  const adapted = resolve();
  const filled =
    ['default', 'secondary'].includes(variant) || (legacy && variant === 'destructive');
  const background =
    variant === 'destructive'
      ? colors.destructive
      : variant === 'secondary'
        ? colors.secondary
        : colors.primary;
  const foreground =
    adapted?.foreground ??
    (variant === 'destructive'
      ? legacy
        ? colors['destructive-foreground']
        : colors.destructive
      : variant === 'link'
        ? colors.primary
        : variant === 'secondary'
          ? colors['secondary-foreground']
          : filled
            ? colors['primary-foreground']
            : colors.foreground);
  const baseline: ViewStyle = {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: filled ? background : variant === 'outline' ? colors.border : 'transparent',
    backgroundColor:
      variant === 'destructive' && !legacy
        ? withAlpha(colors.destructive ?? colors.foreground, mode === 'dark' ? 0.2 : 0.1)
        : filled
          ? background
          : 'transparent',
  };
  const resolveStyle = (pressed: boolean, link = isLink) => [
    baseline,
    adapted && {
      minHeight: 0,
      minWidth: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: colors.border,
      backgroundColor: 'transparent',
      gap: 0,
    },
    resolve(pressed, link)?.view,
    typeof style === 'function' ? style({ pressed }) : style,
  ];
  const common: RenderProps = {
    ...props,
    disabled: blocked,
    accessibilityState: { ...accessibilityState, disabled: !!blocked },
    accessibilityRole:
      props.accessibilityRole ?? (onPress ? (variant === 'link' ? 'link' : 'button') : undefined),
    onPress: onPress
      ? (event) => {
          if (!blocked) onPress(event);
        }
      : undefined,
    onFocus: (event) => {
      setFocused(true);
      props.onFocus?.(event);
    },
    onBlur: (event) => {
      setFocused(false);
      props.onBlur?.(event);
    },
    onPointerEnter: (event) => {
      setHovered(true);
      props.onPointerEnter?.(event);
    },
    onPointerLeave: (event) => {
      setHovered(false);
      props.onPointerLeave?.(event);
    },
    onHoverIn: (event) => {
      setHovered(true);
      props.onHoverIn?.(event);
    },
    onHoverOut: (event) => {
      setHovered(false);
      props.onHoverOut?.(event);
    },
    hitSlop:
      props.hitSlop ??
      (onPress || asChild || render
        ? Math.max(12, (44 - Number(adapted?.view.height ?? adapted?.text.lineHeight ?? 21)) / 2)
        : undefined),
    style: ({ pressed }) => resolveStyle(pressed),
  };
  const renderProperties = { ...common };
  delete renderProperties.ref;
  const callbackStyle = typeof render === 'function' ? resolveStyle(false) : undefined;
  const element =
    typeof render === 'function'
      ? render({
          ...renderProperties,
          children,
          style: callbackStyle,
          disabled: !!blocked,
          onPress: common.onPress ?? undefined,
          onPressIn: common.onPressIn ?? undefined,
          onPressOut: common.onPressOut ?? undefined,
          onLongPress: common.onLongPress ?? undefined,
          pressRetentionOffset: nativeTextPressRetentionOffset(common.pressRetentionOffset),
        })
      : render;
  let pressableHost = false;
  let child =
    typeof render === 'function'
      ? element
      : element
        ? cloneElement(element, { children: children ?? element.props.children })
        : children;
  if ((asChild || element) && isValidElement<{ children?: ReactNode }>(child)) {
    const hostChild = child;
    surfaceChildren = hostChild.props.children;
    const target = nativeComponent(hostChild.type);
    pressableHost =
      target === Pressable ||
      (!!target &&
        (typeof target === 'function' || typeof target === 'object') &&
        'nativeButtonSlot' in target &&
        target.nativeButtonSlot === true);
    isLink =
      !!target &&
      (typeof target === 'function' || typeof target === 'object') &&
      'nativeLinkSlot' in target &&
      target.nativeLinkSlot === true;
    if (target === View || target === Pressable)
      child = cloneElement(hostChild, { children: content(hostChild.props.children) });
    if (target === NativeText)
      child = createElement(LabelText, { ...hostChild.props, key: hostChild.key });
  }
  const finalStyle = resolve();
  const rendered =
    asChild || element ? (
      <NativeSlot
        {...common}
        slotVariant={variant}
        slotStyle={isLink || pressableHost ? 'pressable' : 'static'}
        slotInheritedStyle={callbackStyle}
      >
        {child}
      </NativeSlot>
    ) : onPress ? (
      <Pressable
        {...common}
        accessibilityRole={props.accessibilityRole ?? (variant === 'link' ? 'link' : 'button')}
      >
        {content(children)}
      </Pressable>
    ) : (
      <View
        {...props}
        accessibilityState={common.accessibilityState}
        onFocus={common.onFocus}
        onBlur={common.onBlur}
        style={resolveStyle(false)}
        onPointerEnter={(event) => {
          setHovered(true);
          props.onPointerEnter?.(event);
          if (!blocked) props.onHoverIn?.(event as never);
        }}
        onPointerLeave={(event) => {
          setHovered(false);
          props.onPointerLeave?.(event);
          props.onHoverOut?.(event as never);
        }}
      >
        {content(children)}
      </View>
    );
  return (
    <NativeTextStyleProvider
      value={{
        style: [
          { fontSize: 12 },
          finalStyle?.text,
          textStyle,
          textColor ? { color: textColor } : undefined,
        ],
      }}
    >
      <TextToneProvider
        value={
          textColor ??
          (StyleSheet.flatten(textStyle)?.color === undefined
            ? (finalStyle?.foreground ?? foreground)
            : undefined)
        }
      >
        <NativeButtonIconSize.Provider value={finalStyle?.iconSize}>
          {rendered}
        </NativeButtonIconSize.Provider>
      </TextToneProvider>
    </NativeTextStyleProvider>
  );
}

Object.assign(Badge, { nativeBadgeSlot: true });
