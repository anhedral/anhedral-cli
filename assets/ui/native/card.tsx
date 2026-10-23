import { View, type ViewProps } from 'react-native';
import { Text, type TextProps } from './text';
import { useTheme } from '../theme';
export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingVertical: 16,
          gap: 16,
        },
        style,
      ]}
    />
  );
}
export function CardContent({ style, ...props }: ViewProps) {
  return <View {...props} style={[{ paddingHorizontal: 16, gap: 12 }, style]} />;
}
export const CardHeader = CardContent;
export const CardFooter = CardContent;
export function CardTitle(props: TextProps) {
  return <Text variant="title" {...props} />;
}
export function CardDescription(props: TextProps) {
  return <Text variant="muted" {...props} />;
}
