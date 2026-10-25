import {
  cloneElement,
  useId,
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type ReactElement,
} from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  Animated,
  AccessibilityInfo,
  type ImageProps,
  type ViewProps,
  type PressableProps,
  Pressable,
  type TextProps,
} from 'react-native';
import { useTheme } from '../theme';
import { Badge, type BadgeProps } from './_badge';
export { Badge } from './_badge';
import { NativeButtonGroupContext } from './_registry-context';
import { useNativeFontStyle } from './fonts';
import { Box, LabelText, Muted, Surface, row, monospace, withAlpha, plainText } from './_core';
import { Button, LinkButton, type ButtonProps } from './button';
import { NativeSlot } from './_slot';
import Svg, { Defs, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';

const AlertTone = createContext<'default' | 'destructive'>('default');
export function Alert({
  variant = 'default',
  children,
  style,
  ...props
}: ViewProps & { variant?: 'default' | 'destructive' }) {
  const { colors } = useTheme();
  const text = plainText(children);
  useEffect(() => {
    if (text) AccessibilityInfo.announceForAccessibility(text);
  }, [text]);
  return (
    <AlertTone.Provider value={variant}>
      <Surface
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        {...props}
        style={[{ borderColor: colors.border }, style]}
      >
        {children}
      </Surface>
    </AlertTone.Provider>
  );
}
export function AlertTitle({ style, ...props }: TextProps) {
  const variant = useContext(AlertTone),
    { colors } = useTheme();
  return (
    <LabelText
      accessibilityRole="header"
      {...props}
      style={[
        { fontWeight: '500' },
        variant === 'destructive' && { color: colors.destructive },
        style,
      ]}
    />
  );
}
export function AlertDescription({ style, ...props }: TextProps) {
  const variant = useContext(AlertTone),
    { colors } = useTheme();
  return (
    <Muted {...props} style={[variant === 'destructive' && { color: colors.destructive }, style]} />
  );
}
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
const AvatarContext = createContext({
  loaded: false,
  grayscale: false,
  setLoaded: (_value: boolean) => {},
});
export function Avatar({
  children,
  style,
  size = 'default',
  grayscale = false,
  ...props
}: ViewProps & { size?: 'default' | 'lg' | 'sm'; grayscale?: boolean }) {
  const extent = size === 'lg' ? 40 : size === 'sm' ? 24 : 32;
  const [loaded, setLoaded] = useState(false);
  const { colors } = useTheme();
  return (
    <AvatarContext.Provider value={{ loaded, setLoaded, grayscale }}>
      <View
        {...props}
        style={[
          {
            width: extent,
            height: extent,
            borderRadius: extent / 2,
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
Avatar.nativeRegistryImage = true;
export function AvatarImage({
  onLoad,
  onError,
  source,
  style,
  grayscale: ownGrayscale,
  ...props
}: ImageProps & { grayscale?: boolean }) {
  const avatar = useContext(AvatarContext),
    grayscale = ownGrayscale ?? avatar.grayscale,
    { setLoaded } = avatar,
    filter = useId();
  const identity = JSON.stringify([source, props.src, props.srcSet]),
    latest = useRef(identity);
  latest.current = identity;
  const [ready, setReady] = useState({ identity, bitmap: false, filtered: false });
  const current =
    ready.identity === identity ? ready : { identity, bitmap: false, filtered: false };
  const visible = grayscale ? current.filtered : current.bitmap;
  useLayoutEffect(() => setLoaded(visible), [visible, setLoaded]);
  const mark = (kind: 'bitmap' | 'filtered' | 'error') => {
    if (latest.current !== identity) return;
    setReady((previous) => {
      const value =
        previous.identity === identity ? previous : { identity, bitmap: false, filtered: false };
      if (kind === 'error') return { identity, bitmap: false, filtered: false };
      return value[kind] ? value : { ...value, [kind]: true };
    });
  };
  const image = (
    <Image
      {...props}
      source={source}
      accessible={grayscale ? false : props.accessible}
      onLoad={(event) => {
        if (latest.current !== identity) return;
        mark('bitmap');
        onLoad?.(event);
      }}
      onError={(event) => {
        if (latest.current !== identity) return;
        mark('error');
        onError?.(event);
      }}
      accessibilityElementsHidden={!current.bitmap || grayscale}
      style={[
        {
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: current.bitmap && !grayscale ? 1 : 0,
        },
        style,
      ]}
    />
  );
  return (
    <>
      {image}
      {grayscale && (
        <Svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0, opacity: visible ? 1 : 0 }}
          accessibilityElementsHidden={!visible}
          testID={props.testID ? props.testID + '-grayscale' : undefined}
          accessible={visible}
          accessibilityRole="image"
          accessibilityLabel={props.accessibilityLabel ?? props.alt}
        >
          <Defs>
            <Filter id={filter}>
              <FeColorMatrix type="saturate" values={0} />
            </Filter>
          </Defs>
          <SvgImage
            width="100%"
            height="100%"
            href={props.src ?? source}
            testID={props.testID ? props.testID + '-svg-source' : undefined}
            onLoad={() => mark('filtered')}
            preserveAspectRatio={
              props.resizeMode === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'
            }
            filter={'url(#' + filter + ')'}
          />
        </Svg>
      )}
    </>
  );
}
AvatarImage.nativeRegistryImage = true;
export function AvatarFallback(props: TextProps) {
  return useContext(AvatarContext).loaded ? null : <LabelText {...props} />;
}
export const AvatarBadge = (props: BadgeProps) => <Badge {...props} nativePreset={false} />;
export const AvatarGroup = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export const AvatarGroupCount = AvatarBadge;
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
  <NativeButtonGroupContext.Provider value={true}>
    <Box
      {...props}
      style={[{ flexDirection: orientation === 'horizontal' ? 'row' : 'column', gap: 2 }, style]}
    />
  </NativeButtonGroupContext.Provider>
);
export function ButtonGroupText({
  asChild = false,
  render,
  ...props
}: React.ComponentProps<typeof LabelText> & {
  asChild?: boolean;
  render?: React.ReactElement<{ children?: React.ReactNode }>;
}) {
  return asChild || render ? (
    <NativeSlot
      {...props}
      children={
        render
          ? cloneElement(render, { children: props.children ?? render.props.children })
          : props.children
      }
    />
  ) : (
    <LabelText {...props} />
  );
}
export const ButtonGroupSeparator = Separator;
export const Empty = ({ style, ...props }: ViewProps) => (
  <Surface {...props} style={[{ alignItems: 'center', padding: 24 }, style]} />
);
export const EmptyHeader = Box;
export const EmptyTitle = AlertTitle;
export const EmptyDescription = Muted;
export const EmptyContent = Box;
export function EmptyMedia({
  variant = 'default',
  style,
  ...props
}: ViewProps & { variant?: 'default' | 'icon' }) {
  const { colors, radius } = useTheme();
  return (
    <Box
      {...props}
      style={[
        { alignItems: 'center', justifyContent: 'center' },
        variant === 'icon' && {
          width: 32,
          height: 32,
          borderRadius: radius,
          backgroundColor: colors.muted,
        },
        style,
      ]}
    />
  );
}
const ItemSize = createContext<'default' | 'sm' | 'xs'>('default');
export function Item({
  variant = 'default',
  size = 'default',
  style,
  ...props
}: ViewProps & { variant?: 'default' | 'outline' | 'muted'; size?: 'default' | 'sm' | 'xs' }) {
  const { colors, radius } = useTheme();
  return (
    <ItemSize.Provider value={size}>
      <Box
        {...props}
        style={[
          {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            borderRadius: radius,
            borderWidth: 1,
            borderColor: variant === 'outline' ? colors.border : 'transparent',
            backgroundColor:
              variant === 'muted'
                ? withAlpha(colors.muted ?? colors.background, 0.5)
                : 'transparent',
            paddingHorizontal: size === 'xs' ? 10 : 12,
            paddingVertical: size === 'xs' ? 8 : 10,
            gap: size === 'xs' ? 8 : 10,
          },
          style,
        ]}
      />
    </ItemSize.Provider>
  );
}
export const ItemGroup = Box;
export function ItemContent({ style, ...props }: ViewProps) {
  const size = useContext(ItemSize);
  return <Box {...props} style={[{ flex: 1, minWidth: 0, gap: size === 'xs' ? 0 : 4 }, style]} />;
}
export const ItemTitle = ({ style, ...props }: TextProps) => (
  <LabelText {...props} style={[{ fontWeight: '500' }, style]} />
);
export function ItemDescription({ style, ...props }: TextProps) {
  const size = useContext(ItemSize);
  return <Muted {...props} style={[{ fontSize: size === 'xs' ? 12 : 14 }, style]} />;
}
export const ItemActions = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export function ItemMedia({
  variant = 'default',
  style,
  ...props
}: ViewProps & { variant?: 'default' | 'icon' | 'image' }) {
  const { radius } = useTheme();
  const size = useContext(ItemSize);
  const extent = size === 'xs' ? 24 : size === 'sm' ? 32 : 40;
  return (
    <Box
      {...props}
      style={[
        { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        variant === 'image' && {
          width: extent,
          height: extent,
          borderRadius: Math.max(0, radius - 4),
          overflow: 'hidden',
        },
        variant === 'icon' && { width: 16, height: 16 },
        style,
      ]}
    />
  );
}
export const ItemHeader = Box;
export const ItemFooter = ItemActions;
export const ItemSeparator = Separator;
export const Kbd = ({ style, ...props }: TextProps) => {
  const { colors } = useTheme();
  const font = useNativeFontStyle('mono');
  return (
    <LabelText
      {...props}
      style={[
        {
          backgroundColor: colors.muted,
          fontFamily: font.fontFamily ?? monospace,
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
    fontRole="heading"
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
export const TypographyH4 = ({ style, ...props }: TextProps) => (
  <TypographyH1 {...props} style={[{ fontSize: 18, lineHeight: 26, fontWeight: '600' }, style]} />
);
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
export function BreadcrumbLink({
  href,
  onNavigate,
  onError,
  render,
  children,
  ...props
}: Omit<ButtonProps, 'render'> & {
  href?: string;
  onNavigate?: (href: string) => void | Promise<void>;
  onError?: (error: unknown) => void;
  render?:
    | ReactElement<{ children?: ReactNode }>
    | ((
        props: { href: string; children?: ReactNode } | { children?: ReactNode },
      ) => ReactElement<{ children?: ReactNode }>);
}) {
  if (typeof render === 'function') {
    const element = render(href && !props.disabled ? { href, children } : { children });
    return href ? (
      <Button
        nativePreset={false}
        variant="link"
        {...props}
        render={element}
        accessibilityRole="link"
      />
    ) : (
      element
    );
  }
  return href && !render ? (
    <LinkButton
      nativePreset={false}
      variant="link"
      {...props}
      href={href}
      onNavigate={onNavigate}
      onError={onError}
    >
      {children}
    </LinkButton>
  ) : (
    <Button nativePreset={false} variant="link" {...props} render={render} accessibilityRole="link">
      {children}
    </Button>
  );
}

export const BreadcrumbPage = ({ style, ...props }: TextProps) => (
  <LabelText
    {...props}
    accessibilityState={{ selected: true }}
    style={[{ fontWeight: '600' }, style]}
  />
);
export const BreadcrumbSeparator = ({ children, ...props }: ViewProps) => (
  <Box {...props} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {children ?? <Muted>›</Muted>}
  </Box>
);
export const BreadcrumbEllipsis = () => <Muted accessibilityLabel="More breadcrumb items">…</Muted>;
export function Marker({
  variant = 'default',
  children,
  style,
  ...props
}: ViewProps & { variant?: 'default' | 'border' | 'separator' }) {
  const { colors } = useTheme();
  return (
    <Box
      {...props}
      style={[
        row(),
        { width: '100%' },
        variant === 'border' && {
          borderBottomWidth: 1,
          borderColor: colors.border,
          paddingBottom: 8,
        },
        style,
      ]}
    >
      {variant === 'separator' && (
        <View
          testID={props.testID ? props.testID + '-before' : undefined}
          accessible={false}
          style={{ height: 1, flex: 1, backgroundColor: colors.border }}
        />
      )}
      {children}
      {variant === 'separator' && (
        <View
          testID={props.testID ? props.testID + '-after' : undefined}
          accessible={false}
          style={{ height: 1, flex: 1, backgroundColor: colors.border }}
        />
      )}
    </Box>
  );
}
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
