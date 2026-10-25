import {
  Pressable,
  StyleSheet,
  Linking,
  useWindowDimensions,
  type View,
  type PressableProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import {
  Children,
  Fragment,
  isValidElement,
  cloneElement,
  useState,
  useContext,
  type ReactNode,
  type ReactElement,
  type Ref,
} from 'react';
import { useTheme } from '../theme';
import {
  NativeRecipeState,
  useRegistryPalette,
  useNativeComponentStyle,
  NativeButtonGroupContext,
  NativeButtonIconSize,
} from './_registry-context';
import { nativePresetButtonStyle } from './_preset-button-style';
import { useNativeFormAction } from './native-form';
import { NativeSlot } from './_slot';
import { LabelText as Text, TextToneProvider, withAlpha, plainText } from './_core';
export type ButtonProps = Omit<PressableProps, 'children'> & {
  children?: ReactNode;
  textColor?: string;
  textStyle?: StyleProp<Omit<TextStyle, 'color'> & { color?: string }>;
  invalid?: boolean;
  /** @internal A compound primitive owns its own preset slots. */
  nativePreset?: boolean;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  asChild?: boolean;
  render?: ReactElement<{ children?: ReactNode }>;
  ref?: Ref<View>;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
};
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
  type = 'button',
  invalid = false,
  nativePreset = true,
  textColor,
  textStyle,
  form,
  asChild = false,
  render,
  variant = 'default',
  size = 'default',
  style,
  disabled,
  accessibilityState,
  accessibilityRole = 'button',
  ...props
}: ButtonProps) {
  const { colors, radius, mode } = useTheme();
  const legacy = useRegistryPalette() === 'legacy';
  const preset = useNativeComponentStyle();
  const { fontScale } = useWindowDimensions();
  const inGroup = useContext(NativeButtonGroupContext);
  const [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const action = useNativeFormAction(form);
  const blocked = disabled || (type !== 'button' && action.pending);
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
  const presetState = {
    mode,
    radius,
    colors,
    inGroup,
    fontScale,
    hasText: !!plainText(children),
    fontSize: StyleSheet.flatten(textStyle)?.fontSize,
    lineHeight: StyleSheet.flatten(textStyle)?.lineHeight,
    hovered,
    focused,
    invalid,
    disabled: !!blocked,
    expanded: accessibilityState?.expanded,
    hasPopup: accessibilityState?.expanded !== undefined,
    iconStart: iconPlacement(children, 'inline-start'),
    iconEnd: iconPlacement(children, 'inline-end'),
  };
  const resolvePreset = (pressed = false) =>
    preset && nativePreset && !legacy
      ? nativePresetButtonStyle(preset, variant, size, { ...presetState, pressed })
      : undefined;
  const adapted = resolvePreset();
  const foreground =
    textColor ??
    StyleSheet.flatten(textStyle)?.color ??
    adapted?.foreground ??
    foregrounds[variant];
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
  const Host = asChild || render ? NativeSlot : Pressable;
  const slotChild = render
    ? cloneElement(render, { children: children ?? render.props.children })
    : children;
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
  return (
    <NativeRecipeState.Provider value={{ ...accessibilityState, disabled: !!blocked }}>
      <TextToneProvider value={foreground}>
        <NativeButtonIconSize.Provider value={adapted?.iconSize}>
          <Host
            {...props}
            {...(asChild || render ? { slotVariant: variant, slotSize: size } : {})}
            hitSlop={
              props.hitSlop ??
              (adapted
                ? {
                    top: Math.max(0, 44 - Number(adapted.view.height ?? 44)) / 2,
                    bottom: Math.max(0, 44 - Number(adapted.view.height ?? 44)) / 2,
                    left: Math.max(0, 44 - Number(adapted.view.width ?? 44)) / 2,
                    right: Math.max(0, 44 - Number(adapted.view.width ?? 44)) / 2,
                  }
                : undefined)
            }
            onHoverIn={(event) => {
              setHovered(true);
              props.onHoverIn?.(event);
            }}
            onHoverOut={(event) => {
              setHovered(false);
              props.onHoverOut?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
              props.onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              props.onBlur?.(event);
            }}
            accessibilityRole={accessibilityRole}
            accessibilityLabel={props.accessibilityLabel ?? (plainText(children) || undefined)}
            onPress={(event) => {
              props.onPress?.(event);
              if (blocked || event.isDefaultPrevented()) return;
              if (type === 'submit') void action.submit();
              else if (type === 'reset') void action.reset();
            }}
            accessibilityState={{
              ...accessibilityState,
              disabled: !!blocked,
              ...(type !== 'button' && action.pending ? { busy: true } : {}),
            }}
            disabled={blocked}
            style={(state) => [
              styles.button,
              sizes[size],
              surface,
              adapted && { minHeight: 0, minWidth: 0, paddingVertical: 0, paddingHorizontal: 0 },
              resolvePreset(state.pressed)?.view,
              blocked && styles.disabled,
              !adapted && state.pressed && styles.pressed,
              typeof style === 'function' ? style(state) : style,
            ]}
          >
            {asChild || render ? slotChild : renderLabels(children)}
          </Host>
        </NativeButtonIconSize.Provider>
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

/** Application routes use onNavigate; external links use the native OS URL bridge. */
export function LinkButton({
  href,
  onNavigate,
  onError,
  onPress,
  children,
  ...props
}: ButtonProps & {
  href: string;
  onNavigate?: (href: string) => void | Promise<void>;
  onError?: (error: unknown) => void;
}) {
  const [failed, setFailed] = useState(false);
  const { colors } = useTheme();
  return (
    <>
      <Button
        {...props}
        accessibilityRole="link"
        onPress={async (event) => {
          onPress?.(event);
          if (event.isDefaultPrevented()) return;
          setFailed(false);
          try {
            if (onNavigate) await onNavigate(href);
            else {
              const parsed = new URL(href);
              if (!['http:', 'https:', 'mailto:', 'tel:', 'sms:'].includes(parsed.protocol))
                throw Error('A native navigation handler is required.');
              await Linking.openURL(href);
            }
          } catch (error) {
            setFailed(true);
            onError?.(error);
          }
        }}
      >
        {children}
      </Button>
      {failed && (
        <Text accessibilityRole="alert" style={{ color: colors.destructive }}>
          Unable to open link.
        </Text>
      )}
    </>
  );
}

Object.assign(Button, { nativeButtonSlot: true });
Object.assign(LinkButton, { nativeButtonSlot: true });
