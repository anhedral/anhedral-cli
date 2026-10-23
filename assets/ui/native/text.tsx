import { Text as NativeText, StyleSheet, type TextProps as NativeTextProps } from 'react-native';
import { useTheme } from '../theme';
export type TextProps = NativeTextProps & { variant?: 'heading' | 'title' | 'body' | 'muted' | 'caption' | 'label' };
const typography = StyleSheet.create({
  heading: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  muted: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
});
export function Text({ variant = 'body', style, ...props }: TextProps) {
  const { colors } = useTheme();
  const color = ['muted', 'caption'].includes(variant) ? colors['muted-foreground'] : colors.foreground;
  return <NativeText {...props} style={[typography[variant], { color }, style]} />;
}
