import { Pressable, StyleSheet, Linking, type View, type PressableProps } from 'react-native';
import {
  Children,
  cloneElement,
  useState,
  type ReactNode,
  type ReactElement,
  type Ref,
} from 'react';
import { useTheme } from '../theme';
import { NativeSlot } from './_slot';
import { LabelText as Text, TextToneProvider, withAlpha } from './_core';
export type ButtonProps = Omit<PressableProps, 'children'> & {
  children?: ReactNode;
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
  const backgrounds = {
    default: colors.primary,
    secondary: colors.secondary,
    outline: colors.background,
    ghost: 'transparent',
    destructive: withAlpha(colors.destructive ?? colors.foreground, mode === 'dark' ? 0.2 : 0.1),
    link: 'transparent',
  };
  const foregrounds = {
    default: colors['primary-foreground'],
    secondary: colors.foreground,
    outline: colors.foreground,
    ghost: colors.foreground,
    destructive: colors.destructive,
    link: colors.primary,
  };
  const surface = {
    borderRadius: radius,
    backgroundColor: backgrounds[variant],
    borderColor: variant === 'outline' ? colors.border : 'transparent',
  };
  const Host = asChild || render ? NativeSlot : Pressable;
  const slotChild = render
    ? cloneElement(render, { children: children ?? render.props.children })
    : children;
  return (
    <TextToneProvider value={foregrounds[variant]}>
      <Host
        {...props}
        {...(asChild || render ? { slotVariant: variant, slotSize: size } : {})}
        accessibilityRole={accessibilityRole}
        accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
        disabled={disabled}
        style={(state) => [
          styles.button,
          sizes[size],
          surface,
          disabled && styles.disabled,
          state.pressed && styles.pressed,
          typeof style === 'function' ? style(state) : style,
        ]}
      >
        {asChild || render
          ? slotChild
          : Children.map(children, (child) =>
              typeof child === 'string' || typeof child === 'number' ? (
                <Text
                  style={[
                    styles.label,
                    {
                      color: foregrounds[variant],
                      fontSize: size === 'xs' ? 12 : size === 'lg' ? 16 : 14,
                    },
                  ]}
                >
                  {child}
                </Text>
              ) : (
                child
              ),
            )}
      </Host>
    </TextToneProvider>
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
