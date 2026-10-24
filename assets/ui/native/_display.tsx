import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  Animated,
  AccessibilityInfo,
  type ImageProps,
  type ViewProps,
  type TextProps,
} from 'react-native';
import { useTheme } from '../theme';
import { Box, LabelText, Muted, Surface, row, monospace } from './_core';
import { Button, type ButtonProps } from './button';

export function Alert({
  variant = 'default',
  style,
  ...props
}: ViewProps & { variant?: 'default' | 'destructive' }) {
  const { colors } = useTheme();
  return (
    <Surface
      accessibilityRole="alert"
      {...props}
      style={[
        { borderColor: variant === 'destructive' ? colors.destructive : colors.border },
        style,
      ]}
    />
  );
}
export const AlertTitle = ({ style, ...props }: TextProps) => (
  <LabelText accessibilityRole="header" {...props} style={[{ fontWeight: '600' }, style]} />
);
export const AlertDescription = Muted;
export const AlertAction = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={[{ position: 'absolute', right: 12, top: 12 }, style]} />
);
export function AspectRatio({ ratio = 1, style, ...props }: ViewProps & { ratio?: number }) {
  return (
    <View
      {...props}
      style={[
        { aspectRatio: Number.isFinite(ratio) && ratio > 0 ? ratio : 1, width: '100%' },
        style,
      ]}
    />
  );
}
export function Badge({
  variant = 'default',
  children,
  style,
  ...props
}: ViewProps & {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
}) {
  const { colors } = useTheme();
  const filled = ['default', 'secondary', 'destructive'].includes(variant);
  const backgroundColor =
    variant === 'destructive'
      ? colors.destructive
      : variant === 'secondary'
        ? colors.secondary
        : colors.primary;
  return (
    <View
      {...props}
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: filled
            ? backgroundColor
            : variant === 'outline'
              ? colors.border
              : 'transparent',
          backgroundColor: filled ? backgroundColor : colors.background,
        },
        style,
      ]}
    >
      <LabelText
        style={{
          color:
            filled && variant !== 'secondary' ? colors['primary-foreground'] : colors.foreground,
          fontSize: 12,
        }}
      >
        {children}
      </LabelText>
    </View>
  );
}
const AvatarContext = createContext({ loaded: false, setLoaded: (_value: boolean) => {} });
export function Avatar({ children, style, ...props }: ViewProps) {
  const [loaded, setLoaded] = useState(false);
  const { colors } = useTheme();
  return (
    <AvatarContext.Provider value={{ loaded, setLoaded }}>
      <View
        {...props}
        style={[
          {
            width: 40,
            height: 40,
            borderRadius: 20,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.muted,
          },
          style,
        ]}
      >
        {children}
      </View>
    </AvatarContext.Provider>
  );
}
export function AvatarImage({ onLoad, onError, source, style, ...props }: ImageProps) {
  const { loaded, setLoaded } = useContext(AvatarContext);
  useEffect(() => {
    setLoaded(false);
  }, [source, setLoaded]);
  return (
    <Image
      {...props}
      source={source}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      onError={(event) => {
        setLoaded(false);
        onError?.(event);
      }}
      accessibilityElementsHidden={!loaded}
      style={[
        { position: 'absolute', width: '100%', height: '100%', opacity: loaded ? 1 : 0 },
        style,
      ]}
    />
  );
}
export function AvatarFallback(props: TextProps) {
  return useContext(AvatarContext).loaded ? null : <LabelText {...props} />;
}
export const AvatarBadge = Badge;
export const AvatarGroup = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const AvatarGroupCount = Badge;
export function Separator({
  orientation = 'horizontal',
  decorative = true,
  style,
  ...props
}: ViewProps & { orientation?: 'horizontal' | 'vertical'; decorative?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : 'Separator'}
      {...props}
      style={[
        { backgroundColor: colors.border },
        orientation === 'horizontal'
          ? { height: 1, alignSelf: 'stretch' }
          : { width: 1, alignSelf: 'stretch' },
        style,
      ]}
    />
  );
}
export const ButtonGroup = ({
  orientation = 'horizontal',
  style,
  ...props
}: ViewProps & { orientation?: 'horizontal' | 'vertical' }) => (
  <Box
    {...props}
    style={[{ flexDirection: orientation === 'horizontal' ? 'row' : 'column', gap: 2 }, style]}
  />
);
export const ButtonGroupText = LabelText;
export const ButtonGroupSeparator = Separator;
export const Empty = ({ style, ...props }: ViewProps) => (
  <Surface {...props} style={[{ alignItems: 'center', padding: 24 }, style]} />
);
export const EmptyHeader = Box;
export const EmptyTitle = AlertTitle;
export const EmptyDescription = Muted;
export const EmptyContent = Box;
export const EmptyMedia = Box;
export const Item = Surface;
export const ItemGroup = Box;
export const ItemContent = Box;
export const ItemTitle = AlertTitle;
export const ItemDescription = Muted;
export const ItemActions = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const ItemMedia = Box;
export const ItemHeader = Box;
export const ItemFooter = ItemActions;
export const ItemSeparator = Separator;
export const Kbd = ({ style, ...props }: TextProps) => {
  const { colors } = useTheme();
  return (
    <LabelText
      {...props}
      style={[
        {
          backgroundColor: colors.muted,
          fontFamily: monospace,
          paddingHorizontal: 6,
          borderRadius: 4,
        },
        style,
      ]}
    />
  );
};
export const KbdGroup = ItemActions;
export const Typography = LabelText;
export const TypographyH1 = ({ style, ...props }: TextProps) => (
  <LabelText
    accessibilityRole="header"
    {...props}
    style={[{ fontSize: 32, lineHeight: 40, fontWeight: '700' }, style]}
  />
);
export const TypographyH2 = ({ style, ...props }: TextProps) => (
  <TypographyH1 {...props} style={[{ fontSize: 26, lineHeight: 34 }, style]} />
);
export const TypographyH3 = ({ style, ...props }: TextProps) => (
  <TypographyH1 {...props} style={[{ fontSize: 22, lineHeight: 30 }, style]} />
);
export const TypographyH4 = AlertTitle;
export const TypographyP = LabelText;
export const TypographyMuted = Muted;
export const TypographyLead = ({ style, ...props }: TextProps) => (
  <Muted {...props} style={[{ fontSize: 18, lineHeight: 27 }, style]} />
);
export const TypographyLarge = AlertTitle;
export const TypographySmall = ({ style, ...props }: TextProps) => (
  <LabelText {...props} style={[{ fontSize: 12 }, style]} />
);
export const TypographyBlockquote = ({ style, ...props }: TextProps) => {
  const { colors } = useTheme();
  return (
    <LabelText
      {...props}
      style={[
        { borderStartWidth: 2, borderColor: colors.border, paddingStart: 12, fontStyle: 'italic' },
        style,
      ]}
    />
  );
};
export const TypographyInlineCode = Kbd;
export const TypographyList = Box;
export function Spinner({
  size = 'small',
  ...props
}: React.ComponentProps<typeof ActivityIndicator>) {
  const { colors } = useTheme();
  return (
    <ActivityIndicator
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      color={colors.primary}
      size={size}
      {...props}
    />
  );
}
export function Skeleton({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    const update = (reduce: boolean) => {
      animation?.stop();
      opacity.setValue(1);
      if (!reduce && active) {
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
        );
        animation.start();
      }
    };
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (active) update(reduce);
      })
      .catch(() => {
        /* Keep the static placeholder if the native preference is unavailable. */
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => {
      active = false;
      animation?.stop();
      subscription.remove();
    };
  }, [opacity]);
  return (
    <Animated.View
      accessibilityLabel="Loading content"
      {...props}
      style={[{ minHeight: 20, backgroundColor: colors.muted, borderRadius: 6, opacity }, style]}
    />
  );
}
export const Breadcrumb = ({ style, ...props }: ViewProps) => (
  <Box accessibilityLabel="Breadcrumb" {...props} style={row(style)} />
);
export const BreadcrumbList = ItemActions;
export const BreadcrumbItem = Box;
export const BreadcrumbLink = (props: ButtonProps) => (
  <Button variant="link" {...props} accessibilityRole="link" />
);
export const BreadcrumbPage = ({ style, ...props }: TextProps) => (
  <LabelText
    {...props}
    accessibilityState={{ selected: true }}
    style={[{ fontWeight: '600' }, style]}
  />
);
export const BreadcrumbSeparator = () => <Muted accessibilityElementsHidden>›</Muted>;
export const BreadcrumbEllipsis = () => <Muted accessibilityLabel="More breadcrumb items">…</Muted>;
export const Marker = ({ style, ...props }: ViewProps) => <Box {...props} style={row(style)} />;
export const MarkerContent = Muted;
export const MarkerIcon = Box;
export const Message = ({
  from = 'assistant',
  align,
  style,
  ...props
}: ViewProps & { from?: 'user' | 'assistant' | 'system'; align?: 'start' | 'end' }) => (
  <Box
    {...props}
    style={[{ alignItems: align === 'end' || from === 'user' ? 'flex-end' : 'stretch' }, style]}
  />
);
export const MessageGroup = Box;
export const MessageContent = Box;
export const MessageHeader = ItemActions;
export const MessageFooter = ItemActions;
export const MessageActions = ItemActions;
export const MessageAction = Button;
export const MessageAvatar = Avatar;
export const MessageTimestamp = Muted;
