import { Pressable, Text, StyleSheet, type PressableProps } from 'react-native';
import { Children, type ReactNode } from 'react';
import { useTheme } from '../theme';
export type ButtonProps = Omit<PressableProps, 'children'> & {
  children: ReactNode; variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};
const sizes = { default: { minHeight: 44 }, sm: { minHeight: 44 }, lg: { minHeight: 48 }, icon: { minHeight: 44, minWidth: 44 } };
export function Button({ children, variant = 'default', size = 'default', style, disabled, accessibilityState, ...props }: ButtonProps) {
  const { colors } = useTheme();
  const backgrounds = { default: colors.primary, secondary: colors.secondary, outline: colors.background, ghost: 'transparent', destructive: 'transparent', link: 'transparent' };
  const foregrounds = { default: colors['primary-foreground'], secondary: colors.foreground, outline: colors.foreground, ghost: colors.foreground, destructive: colors.destructive, link: colors.primary };
  const surface = { backgroundColor: backgrounds[variant], borderColor: variant === 'outline' ? colors.border : 'transparent' };
  return <Pressable {...props} accessibilityRole="button" accessibilityState={{ ...accessibilityState, disabled: !!disabled }} disabled={disabled}
    style={(state) => [styles.button, sizes[size], surface, disabled && styles.disabled, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]}>
    {Children.map(children, (child) => typeof child === 'string' || typeof child === 'number' ? <Text style={[styles.label, { color: foregrounds[variant] }]}>{child}</Text> : child)}
  </Pressable>;
}
const styles = StyleSheet.create({ button: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }, label: { fontSize: 14, fontWeight: '500' }, disabled: { opacity: 0.5 }, pressed: { opacity: 0.75 } });
