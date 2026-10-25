import { useNativeFieldsetDisabled } from './_field-context';
import { useNativeItemGroupSize } from './_item-context';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  Text as NativeText,
  type PressableProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import {
  Children,
  Fragment,
  isValidElement,
  cloneElement,
  createElement,
  useState,
  useContext,
  type ReactNode,
  type ReactElement,
  type Ref,
} from 'react';
import { useTheme } from '../theme';
import type { NativePresetState } from './_preset-style';
import {
  useNativeInputGroupMetadata,
  useNativeInputGroupAddonPresence,
} from './_input-group-context';
import {
  NativeRecipeState,
  useRegistryPalette,
  useNativeComponentStyle,
  useNativeRegistrySource,
  NativeButtonGroupContext,
  NativeButtonIconSize,
} from './_registry-context';
import { nativePresetButtonStyle } from './_preset-button-style';
import { useNativeFormAction } from './native-form';
import { Text as ThemedText } from './text';
import { NativeSlot, nativeTextPressRetentionOffset } from './_slot';
import { NativeLink } from './navigation';
import {
  LabelText as Text,
  TextToneProvider,
  NativeTextStyleProvider,
  withAlpha,
  plainText,
  content,
  nativeComponent,
} from './_core';
export type ButtonChildrenState = {
  isHovered: boolean;
  isPressed: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isPending: boolean;
  defaultChildren?: ReactNode;
};
export type ButtonRenderProps = Omit<
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
  style?: StyleProp<TextStyle>;
  disabled: boolean;
  onPress?: NonNullable<PressableProps['onPress']>;
  onPressIn?: NonNullable<PressableProps['onPressIn']>;
  onPressOut?: NonNullable<PressableProps['onPressOut']>;
  onLongPress?: NonNullable<PressableProps['onLongPress']>;
  pressRetentionOffset?: import('react-native').TextProps['pressRetentionOffset'];
};
export type ButtonRenderState = { disabled: boolean; open?: boolean };
export type ButtonProps = Omit<PressableProps, 'children'> & {
  children?: ReactNode | ((state: ButtonChildrenState) => ReactNode);
  textColor?: string;
  textStyle?: StyleProp<Omit<TextStyle, 'color'> & { color?: string }>;
  invalid?: boolean;
  /** @internal A compound primitive owns its own preset slots. */
  nativePreset?: boolean;
  /** @internal Only the authored registry Button adapter inherits HTML submit defaults. */
  nativeImplicitSubmit?: boolean;
  /** @internal Compound controls own their own source slots. */
  nativeBare?: boolean;
  /** @internal Compound source classes participate in the same CVA cascade, including rings/icons. */
  nativeCompoundStyle?: (state: NativePresetState) => {
    classes: string;
    iconOnly?: boolean;
    inheritedForeground?: string;
  };
  pending?: boolean;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  asChild?: boolean;
  render?:
    | ReactElement<{ children?: ReactNode }>
    | ((
        props: ButtonRenderProps,
        state: ButtonRenderState,
      ) => ReactElement<{ children?: ReactNode }>);
  ref?: Ref<View>;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
};
/** @internal Semantic controls define their own children state separately. */
export type NativeControlButtonProps = Omit<ButtonProps, 'children'> & { children?: ReactNode };
const sizes = {
  default: { minHeight: 44 },
  xs: { minHeight: 44, paddingHorizontal: 8, paddingVertical: 4 },
  sm: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 6 },
  lg: { minHeight: 48 },
  icon: { minHeight: 44, minWidth: 44, paddingHorizontal: 10 },
  'icon-xs': { minHeight: 44, minWidth: 44, paddingHorizontal: 6 },
  'icon-sm': { minHeight: 44, minWidth: 44, paddingHorizontal: 8 },
  'icon-lg': { minHeight: 48, minWidth: 48, paddingHorizontal: 12 },
};
export function Button({
  children,
  type: requestedType,
  invalid = false,
  nativePreset = true,
  nativeImplicitSubmit = false,
  nativeBare = false,
  nativeCompoundStyle,
  pending = false,
  textColor,
  textStyle,
  form,
  asChild = false,
  render,
  variant = 'default',
  size = 'default',
  style,
  disabled: requestedDisabled,
  accessibilityState,
  accessibilityRole = 'button',
  ...props
}: ButtonProps) {
  const fieldsetDisabled = useNativeFieldsetDisabled(),
    disabled = !!requestedDisabled || fieldsetDisabled;
  const { colors, radius, mode } = useTheme();
  const legacy = useRegistryPalette() === 'legacy';
  const requestedPreset = useNativeComponentStyle();
  const registrySource = useNativeRegistrySource();
  const preset =
    registrySource === 'default' ||
    registrySource === 'new-york' ||
    registrySource === 'new-york-v4'
      ? registrySource
      : legacy
        ? 'default'
        : (requestedPreset ?? (registrySource ? 'nova' : undefined));
  useNativeItemGroupSize(
    !nativeBare &&
      (registrySource === 'aria' || registrySource === 'radix' || registrySource === 'new-york-v4')
      ? size
      : undefined,
  );
  const { fontScale } = useWindowDimensions();
  const inGroup = useContext(NativeButtonGroupContext);
  const [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false),
    [pressed, setPressed] = useState(false);
  const action = useNativeFormAction(form);
  const htmlDefault =
    nativeImplicitSubmit &&
    !asChild &&
    !render &&
    (registrySource?.startsWith('radix') ||
      ['default', 'new-york', 'new-york-v4'].includes(registrySource ?? ''));
  const type = requestedType ?? (htmlDefault && action.available ? 'submit' : 'button');
  const busy = pending || (type !== 'button' && action.pending);
  const blocked = disabled || busy;
  useNativeInputGroupMetadata({ kind: 'button', disabled: !!blocked, invalid, focused });
  useNativeInputGroupAddonPresence('button');
  const disabledPaint = !!disabled || (!pending && type !== 'button' && action.pending);
  const renderedChildren =
    typeof children === 'function'
      ? children({
          isHovered: hovered && !blocked,
          isPressed: pressed && !blocked,
          isFocused: focused,
          isFocusVisible: focused,
          isDisabled: !!disabled,
          isPending: !!busy,
          defaultChildren: undefined,
        })
      : (children ??
        (isValidElement<{ children?: ReactNode }>(render) ? render.props.children : undefined));
  let surfaceChildren = renderedChildren;
  const backgrounds = {
    default: colors.primary,
    secondary: colors.secondary,
    outline: colors.background,
    ghost: 'transparent',
    destructive: legacy
      ? colors.destructive
      : withAlpha(colors.destructive ?? colors.foreground, mode === 'dark' ? 0.2 : 0.1),
    link: 'transparent',
  };
  const foregrounds = {
    default: colors['primary-foreground'],
    secondary: colors['secondary-foreground'],
    outline: colors.foreground,
    ghost: colors.foreground,
    destructive: legacy ? colors['destructive-foreground'] : colors.destructive,
    link: colors.primary,
  };
  const iconPlacement = (nodes: ReactNode, placement: string): boolean =>
    Children.toArray(nodes).some(
      (child) =>
        isValidElement<{ registryIcon?: string; children?: ReactNode }>(child) &&
        (child.props.registryIcon === placement || iconPlacement(child.props.children, placement)),
    );
  const hasDirectIcon = (nodes: ReactNode): boolean =>
    Children.toArray(nodes).some(
      (child) =>
        isValidElement<{ children?: ReactNode }>(child) &&
        (child.type === Fragment
          ? hasDirectIcon(child.props.children)
          : (typeof child.type === 'function' || typeof child.type === 'object') &&
            'nativeRegistryIcon' in child.type &&
            child.type.nativeRegistryIcon === true),
    );
  const presetState = {
    mode,
    radius,
    colors,
    inGroup,
    fontScale,
    hasText: !!plainText(renderedChildren),
    fontSize: StyleSheet.flatten(textStyle)?.fontSize,
    lineHeight: StyleSheet.flatten(textStyle)?.lineHeight,
    hovered: hovered && !busy,
    focused,
    invalid,
    disabled: disabledPaint,
    expanded: accessibilityState?.expanded,
    hasPopup: accessibilityState?.expanded !== undefined,
    iconStart: iconPlacement(renderedChildren, 'inline-start'),
    iconEnd: iconPlacement(renderedChildren, 'inline-end'),
    hasIcon: hasDirectIcon(renderedChildren),
  };
  const resolvePreset = (pressed = false) => {
    if (!preset || !nativePreset || nativeBare) return undefined;
    const state = {
      ...presetState,
      hasText: !!plainText(surfaceChildren),
      hasIcon: hasDirectIcon(surfaceChildren),
      iconStart: iconPlacement(surfaceChildren, 'inline-start'),
      iconEnd: iconPlacement(surfaceChildren, 'inline-end'),
      pressed: pressed && !busy,
    };
    const compound = nativeCompoundStyle?.(state);
    return {
      ...nativePresetButtonStyle(
        preset,
        variant,
        size,
        { ...state, hasText: compound?.iconOnly ? false : state.hasText },
        compound?.classes,
      ),
      inheritedForeground: compound?.inheritedForeground,
    };
  };
  const adapted = resolvePreset();
  const foreground =
    textColor ??
    StyleSheet.flatten(textStyle)?.color ??
    adapted?.foreground ??
    adapted?.inheritedForeground ??
    (nativeBare ? colors.foreground : foregrounds[variant]);
  const surface = {
    borderRadius: radius,
    backgroundColor: backgrounds[variant],
    borderColor: invalid
      ? colors.destructive
      : variant === 'outline'
        ? legacy
          ? colors.input
          : colors.border
        : 'transparent',
  };
  const renderLabels = (children: ReactNode): ReactNode =>
    Children.map(children, (child) =>
      typeof child === 'string' || typeof child === 'number' ? (
        <Text
          numberOfLines={adapted ? 1 : undefined}
          style={[
            styles.label,
            {
              fontSize: size === 'xs' ? 12 : size === 'lg' ? 16 : 14,
            },
            adapted?.text,
            textStyle,
            { color: foreground },
          ]}
        >
          {child}
        </Text>
      ) : isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? (
        cloneElement(child, { children: renderLabels(child.props.children) })
      ) : (
        child
      ),
    );
  let delegatesForm = false;
  const common: PressableProps & { ref?: Ref<View> } = {
    ...props,
    hitSlop:
      props.hitSlop ??
      (adapted
        ? {
            top: Math.max(0, 44 - Number(adapted.view.height ?? 44)) / 2,
            bottom: Math.max(0, 44 - Number(adapted.view.height ?? 44)) / 2,
            left: Math.max(0, 44 - Number(adapted.view.width ?? 44)) / 2,
            right: Math.max(0, 44 - Number(adapted.view.width ?? 44)) / 2,
          }
        : undefined),
    onHoverIn: (event) => {
      setHovered(true);
      props.onHoverIn?.(event);
    },
    onHoverOut: (event) => {
      setHovered(false);
      props.onHoverOut?.(event);
    },
    onFocus: (event) => {
      setFocused(true);
      props.onFocus?.(event);
    },
    onBlur: (event) => {
      setFocused(false);
      props.onBlur?.(event);
    },
    pointerEvents: blocked ? 'none' : props.pointerEvents,
    accessibilityRole: accessibilityRole,
    accessibilityLabel: props.accessibilityLabel ?? (plainText(renderedChildren) || undefined),
    onPress: (event) => {
      if (blocked || event.isDefaultPrevented()) return;
      props.onPress?.(event);
      if (
        delegatesForm ||
        blocked ||
        event.isDefaultPrevented() ||
        (!action.available && form === undefined)
      )
        return;
      if (type === 'submit') void action.submit();
      else if (type === 'reset') void action.reset();
    },
    accessibilityState: {
      ...accessibilityState,
      disabled: !!blocked,
      ...(busy ? { busy: true } : {}),
    },
    disabled: blocked,
    style: (state) => [
      !nativeBare && styles.button,
      !nativeBare && sizes[size],
      !nativeBare && surface,
      adapted && {
        minHeight: 0,
        minWidth: 0,
        paddingVertical: 0,
        paddingHorizontal: 0,
        borderWidth: 0,
        borderColor: 'transparent',
        borderRadius: 0,
        backgroundColor: 'transparent',
        gap: 0,
      },
      resolvePreset(state.pressed)?.view,
      disabledPaint && styles.disabled,
      !adapted && state.pressed && styles.pressed,
      typeof style === 'function' ? style(state) : style,
    ],
  };
  common.onPressIn = (event) => {
    setPressed(true);
    props.onPressIn?.(event);
  };
  common.onPressOut = (event) => {
    setPressed(false);
    props.onPressOut?.(event);
  };
  const labels = renderLabels(renderedChildren);
  const callbackStyle =
    typeof render === 'function'
      ? (common.style as (state: { pressed: boolean }) => StyleProp<TextStyle>)({ pressed })
      : undefined;
  const { ref: _callbackRef, ...callbackProps } = common;
  const element =
    typeof render === 'function'
      ? render(
          {
            ...callbackProps,
            style: callbackStyle,
            disabled: !!blocked,
            onPress: common.onPress ?? undefined,
            onPressIn: common.onPressIn ?? undefined,
            onPressOut: common.onPressOut ?? undefined,
            onLongPress: common.onLongPress ?? undefined,
            children: renderedChildren,
            pressRetentionOffset: nativeTextPressRetentionOffset(common.pressRetentionOffset),
          },
          { disabled: !!blocked, open: accessibilityState?.expanded },
        )
      : render;
  if (typeof render === 'function' && !isValidElement(element))
    throw Error('Native Button render callbacks require one native host element.');
  let child =
    typeof render === 'function'
      ? element
      : element
        ? cloneElement(element, { children: renderedChildren ?? element.props.children })
        : renderedChildren;
  let staticHost = false;
  if ((asChild || element) && isValidElement<{ children?: ReactNode }>(child)) {
    const hostChild = child;
    surfaceChildren = hostChild.props.children;
    const target = nativeComponent(hostChild.type);
    delegatesForm =
      !!target &&
      (typeof target === 'function' || typeof target === 'object') &&
      (('nativeButtonSlot' in target && target.nativeButtonSlot === true) ||
        ('nativeLinkSlot' in target && target.nativeLinkSlot === true));
    staticHost = !(
      target === View ||
      target === Pressable ||
      (target &&
        (typeof target === 'function' || typeof target === 'object') &&
        (('nativeButtonSlot' in target && target.nativeButtonSlot === true) ||
          ('nativeLinkSlot' in target && target.nativeLinkSlot === true)))
    );
    if (target === NativeText || target === Text || target === ThemedText) {
      const resolve = common.style as (state: { pressed: boolean }) => StyleProp<TextStyle>;
      common.style = (state) => {
        const base = resolve(state),
          value = StyleSheet.flatten(base),
          typography = StyleSheet.flatten([adapted?.text, textStyle]);
        const line =
          (typography?.lineHeight ?? (typography?.fontSize ?? 14) * 1.5) *
          (Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1);
        const center =
          typeof value?.height === 'number' ? Math.max(0, (value.height - line) / 2) : 0;
        const alignment: TextStyle = {
          textAlign: 'center',
          textAlignVertical: 'center',
          paddingTop:
            typeof (value?.paddingTop ?? value?.paddingVertical ?? value?.padding) === 'number'
              ? Math.max(
                  Number(value?.paddingTop ?? value?.paddingVertical ?? value?.padding),
                  center,
                )
              : (value?.paddingTop ?? value?.paddingVertical ?? value?.padding ?? center),
          paddingBottom:
            typeof (value?.paddingBottom ?? value?.paddingVertical ?? value?.padding) === 'number'
              ? Math.max(
                  Number(value?.paddingBottom ?? value?.paddingVertical ?? value?.padding),
                  center,
                )
              : (value?.paddingBottom ?? value?.paddingVertical ?? value?.padding ?? center),
        };
        return [base, alignment];
      };
    }
    if (target === View || target === Pressable)
      child = cloneElement(hostChild, { children: content(hostChild.props.children) });
    if (target === NativeText)
      child = createElement(Text, { ...hostChild.props, key: hostChild.key });
  }
  const body =
    asChild || element ? (
      <NativeSlot
        {...common}
        slotVariant={variant}
        slotSize={size}
        slotButton={{
          variant,
          size,
          type: requestedType ?? (nativeBare ? type : undefined),
          form,
          disabled: !!disabled,
          pending: !!busy,
          invalid,
          nativePreset: nativeBare ? undefined : nativePreset,
          textColor,
          textStyle,
          style,
        }}
        slotStyle={staticHost ? 'static' : 'pressable'}
        slotInheritedStyle={callbackStyle}
      >
        {child}
      </NativeSlot>
    ) : (
      <Pressable {...common}>{labels}</Pressable>
    );
  return (
    <NativeRecipeState.Provider value={{ ...accessibilityState, disabled: !!blocked }}>
      <TextToneProvider value={foreground}>
        <NativeTextStyleProvider value={{ style: [adapted?.text, textStyle] }}>
          <NativeButtonIconSize.Provider value={adapted?.iconSize}>
            {body}
          </NativeButtonIconSize.Provider>
        </NativeTextStyleProvider>
      </TextToneProvider>
    </NativeRecipeState.Provider>
  );
}
const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 14, fontWeight: '500' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});

/** Button geometry and native link navigation share one composed native surface. */
export function LinkButton({
  href,
  onNavigate,
  onError,
  children,
  ...props
}: ButtonProps & {
  href: string;
  onNavigate?: (href: string) => void | Promise<void>;
  onError?: (error: unknown) => void;
}) {
  return (
    <Button {...props} asChild>
      {typeof children === 'function' ? (
        (state) => (
          <NativeLink
            href={href}
            onNavigate={onNavigate ? (href) => onNavigate(href) : undefined}
            onError={onError}
          >
            {children(state)}
          </NativeLink>
        )
      ) : (
        <NativeLink
          href={href}
          onNavigate={onNavigate ? (href) => onNavigate(href) : undefined}
          onError={onError}
        >
          {children}
        </NativeLink>
      )}
    </Button>
  );
}

Object.assign(Button, { nativeButtonSlot: true, nativeLayoutSlot: true });
Object.assign(LinkButton, { nativeButtonSlot: true });
