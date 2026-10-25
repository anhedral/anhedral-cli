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
  type Ref,
} from 'react';
import {
  View,
  Image,
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
import {
  NativeButtonGroupContext,
  useNativeComponentStyle,
  useNativeRegistrySource,
  useRegistryPalette,
} from './_registry-context';
import { useNativeReducedMotion, useNativePulse } from './_animation';
import { nativePresetSkeletonStyle } from './_preset-skeleton-style';
import { useNativeFontStyle } from './fonts';
import {
  Box,
  LabelText,
  Muted,
  Surface,
  row,
  monospace,
  withAlpha,
  plainText,
  content,
} from './_core';
import { Button, LinkButton, type NativeControlButtonProps as ButtonProps } from './button';
import { NativeSlot } from './_slot';
import { NativeLayout, type NativeLayoutProps } from './_layout';
import Svg, { Defs, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';

export { Alert, AlertTitle, AlertDescription, AlertAction } from './_alert';
/** Generic display aliases do not inherit Alert-specific typography or ownership. */
function NativeDisplayTitle({ style, ...props }: TextProps) {
  return <LabelText accessibilityRole="header" {...props} style={[{ fontWeight: '500' }, style]} />;
}
export type AspectRatioProps = NativeLayoutProps & { ratio?: number };
export function AspectRatio({ ratio = 1, style, ...props }: AspectRatioProps) {
  return (
    <NativeLayout
      {...props}
      style={[
        {
          position: 'relative',
          aspectRatio: Number.isFinite(ratio) && ratio > 0 ? ratio : 1,
          width: '100%',
        },
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
export type SeparatorProps = NativeLayoutProps & {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
};
export function Separator({
  orientation = 'horizontal',
  decorative,
  style,
  ...props
}: SeparatorProps) {
  const { colors } = useTheme(),
    source = useNativeRegistrySource(),
    requested = useNativeComponentStyle(),
    generation = useRegistryPalette();
  const selected = source ?? (generation === 'legacy' ? 'default' : requested);
  const legacy = selected === 'default' || selected === 'new-york' || selected === 'new-york-v4';
  const hidden = decorative ?? (selected !== 'base' && selected !== 'aria');
  return (
    <NativeLayout
      {...props}
      accessible={hidden ? false : (props.accessible ?? true)}
      role={hidden ? 'presentation' : (props.role ?? 'separator')}
      accessibilityLabel={
        hidden
          ? undefined
          : (props.accessibilityLabel ??
            (orientation === 'vertical' ? 'Vertical separator' : 'Separator'))
      }
      accessibilityElementsHidden={hidden || props.accessibilityElementsHidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : props.importantForAccessibility}
      style={[
        { backgroundColor: colors.border, flexShrink: 0 },
        selected === 'aria' && { borderWidth: 0 },
        orientation === 'horizontal'
          ? { height: 1, width: '100%' }
          : legacy
            ? { width: 1, height: '100%' }
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
export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from './_empty';
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
Object.assign(ItemTitle, { nativeTextSlot: true });
Object.assign(ItemDescription, { nativeTextSlot: true });
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
const InlineCode = ({ style, ...props }: TextProps) => {
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
export { Kbd, KbdGroup } from './_kbd';
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
export const TypographyLarge = NativeDisplayTitle;
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
export const TypographyInlineCode = InlineCode;
export const TypographyList = Box;
export { Spinner } from './_spinner';
export function Skeleton({ style, children, ...props }: ViewProps & { ref?: Ref<View> }) {
  const { colors, mode, radius } = useTheme(),
    source = useNativeRegistrySource(),
    requested = useNativeComponentStyle(),
    generation = useRegistryPalette();
  const preset =
    source === 'default' || source === 'new-york' || source === 'new-york-v4'
      ? source
      : generation === 'legacy'
        ? 'default'
        : (requested ?? 'nova');
  const sourceStyle = nativePresetSkeletonStyle(preset, { colors, mode, radius });
  const reduced = useNativeReducedMotion(),
    opacity = useNativePulse(reduced);
  return (
    <Animated.View
      accessibilityLabel="Loading content"
      {...props}
      style={[{ borderRadius: 0 }, sourceStyle.view, { opacity }, style]}
    >
      {content(children)}
    </Animated.View>
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
