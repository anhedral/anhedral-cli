import { createContext, useContext, Children, isValidElement } from 'react';
import { View, type ViewProps } from 'react-native';
import { Text, type TextProps } from './text';
import { content, withAlpha, nativeComponent } from './_core';
import { useTheme } from '../theme';
const CardSize = createContext<'default' | 'sm'>('default');
export function Card({
  style,
  children,
  size = 'default',
  ...props
}: ViewProps & { size?: 'default' | 'sm' }) {
  const { colors, radius } = useTheme();
  return (
    <CardSize.Provider value={size}>
      <View
        {...props}
        style={[
          {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius + 4,
            overflow: 'hidden',
            paddingVertical: size === 'sm' ? 12 : 16,
            gap: size === 'sm' ? 12 : 16,
          },
          style,
        ]}
      >
        {content(children)}
      </View>
    </CardSize.Provider>
  );
}
export function CardContent({ style, children, ...props }: ViewProps) {
  const size = useContext(CardSize);
  return (
    <View {...props} style={[{ paddingHorizontal: size === 'sm' ? 12 : 16, gap: 12 }, style]}>
      {content(children)}
    </View>
  );
}
export function CardHeader({ children, style, ...props }: ViewProps) {
  const nodes = Children.toArray(children),
    actions = nodes.filter(
      (node) => isValidElement(node) && nativeComponent(node.type) === CardAction,
    ),
    body = nodes.filter(
      (node) => !isValidElement(node) || nativeComponent(node.type) !== CardAction,
    );
  return (
    <CardContent
      {...props}
      style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, style]}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>{content(body)}</View>
      {actions}
    </CardContent>
  );
}
export function CardFooter({ style, ...props }: ViewProps) {
  const size = useContext(CardSize),
    { colors } = useTheme(),
    spacing = size === 'sm' ? 12 : 16;
  return (
    <CardContent
      {...props}
      style={[
        {
          paddingVertical: spacing,
          marginBottom: -spacing,
          backgroundColor: withAlpha(colors.muted ?? colors.background, 0.5),
          borderTopWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    />
  );
}

export function CardTitle({ style, ...props }: TextProps) {
  const size = useContext(CardSize);
  return (
    <Text
      accessibilityRole="header"
      variant="title"
      {...props}
      style={[{ fontSize: size === 'sm' ? 14 : 16 }, style]}
    />
  );
}
export function CardDescription(props: TextProps) {
  return <Text variant="muted" {...props} />;
}

export function CardAction(props: ViewProps) {
  return <View {...props} style={[{ alignSelf: 'flex-start' }, props.style]} />;
}
