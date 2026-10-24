import { View, type ViewProps } from 'react-native';
import { Text, type TextProps } from './text';
import { content } from './_core';
import { useTheme } from '../theme';
export function Card({ style, children, ...props }: ViewProps) {
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
    >
      {content(children)}
    </View>
  );
}
export function CardContent({ style, children, ...props }: ViewProps) {
  return (
    <View {...props} style={[{ paddingHorizontal: 16, gap: 12 }, style]}>
      {content(children)}
    </View>
  );
}
export const CardHeader = CardContent;
export const CardFooter = CardContent;
export function CardTitle(props: TextProps) {
  return <Text accessibilityRole="header" variant="title" {...props} />;
}
export function CardDescription(props: TextProps) {
  return <Text variant="muted" {...props} />;
}

export function CardAction(props: ViewProps) {
  return <View {...props} style={[{ alignSelf: 'flex-end' }, props.style]} />;
}
