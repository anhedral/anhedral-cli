import {
  Children,
  Fragment,
  cloneElement,
  createContext,
  createElement,
  isValidElement,
  useContext,
  type ReactNode,
  type Ref,
  type ComponentProps,
} from 'react';
import {
  View,
  Text as NativeText,
  StyleSheet,
  useWindowDimensions,
  type ViewProps,
  type TextProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import {
  LabelText,
  content,
  nativeComponent,
  NativeTextStyleContext,
  NativeTextStyleProvider,
  NativeDescendantStyleContext,
} from './_core';
import { useTheme } from '../theme';
import { useNativeComponentStyle, useNativeRegistrySource } from './_registry-context';
import {
  nativePresetEmptyStyle,
  type NativeEmptySlot,
  type NativeEmptyState,
} from './_preset-empty-style';
import { NativeInputGroupHostBoundary } from './_input-group-context';
import { NativeLink } from './navigation';
import { NativeRegistryBackground } from './_gradient';
import { withRegistryStyles, useNativeRegistryPaint } from './registry-styles';
import type { NativeFontRole } from './fonts';
type TextPaint = Record<string, string | number | undefined>;
type Metrics = { fontSize?: number; lineHeight?: number; lineHeightMultiplier?: number };
const Context = createContext<Metrics>({});
const StyledLink = withRegistryStyles(NativeLink, 'link');
function flat(children: ReactNode, result: ReactNode[] = []): ReactNode[] {
  Children.forEach(children, (node) => {
    if (
      isValidElement<{ children?: ReactNode }>(node) &&
      (node.type === Fragment ||
        ((typeof node.type === 'function' || typeof node.type === 'object') &&
          'nativeRegistryTransparent' in node.type &&
          node.type.nativeRegistryTransparent === true))
    )
      flat(node.props.children, result);
    else if (node !== null && typeof node !== 'boolean') result.push(node);
  });
  return Children.toArray(result);
}
function inline(node: ReactNode) {
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return true;
  if (!isValidElement(node)) return false;
  const owner = nativeComponent(node.type);
  if (
    owner &&
    (typeof owner === 'function' || typeof owner === 'object') &&
    'nativeRegistryParagraph' in owner &&
    owner.nativeRegistryParagraph === true
  )
    return false;
  if (owner === LabelText || owner === NativeText) return true;
  if (
    (typeof node.type === 'function' || typeof node.type === 'object') &&
    'nativeRegistryKind' in node.type
  )
    return ['text', 'link', 'span'].includes(String(node.type.nativeRegistryKind));
  return (
    !!owner &&
    (typeof owner === 'function' || typeof owner === 'object') &&
    'nativeTextSlot' in owner &&
    owner.nativeTextSlot === true &&
    owner !== EmptyTitle
  );
}
function flow(children: ReactNode) {
  const result: ReactNode[] = [],
    run: ReactNode[] = [];
  const flush = () => {
    if (run.length)
      result.push(
        <LabelText key={'text-' + result.length}>{Children.toArray(run.splice(0))}</LabelText>,
      );
  };
  for (const node of flat(children)) {
    if (inline(node)) run.push(node);
    else {
      flush();
      result.push(node);
    }
  }
  flush();
  return Children.toArray(result);
}
function directLinks(children: ReactNode) {
  return flat(children).map((node) => {
    if (!isValidElement<ComponentProps<typeof NativeLink> & { className?: string }>(node))
      return node;
    const kind =
      (typeof node.type === 'function' || typeof node.type === 'object') &&
      'nativeRegistryKind' in node.type
        ? node.type.nativeRegistryKind
        : undefined;
    if (kind !== 'link' && nativeComponent(node.type) !== NativeLink) return node;
    const props = {
      ...node.props,
      className: ['underline underline-offset-4 hover:text-primary', node.props.className]
        .filter(Boolean)
        .join(' '),
    };
    return node.type === NativeLink
      ? createElement(StyledLink, { ...props, key: node.key })
      : cloneElement(node, props);
  });
}
function useStyle(slot: NativeEmptySlot, extra: Partial<NativeEmptyState> = {}) {
  const theme = useTheme(),
    requested = useNativeComponentStyle(),
    origin = useNativeRegistrySource(),
    window = useWindowDimensions(),
    parent = useContext(Context),
    text = useContext(NativeTextStyleContext);
  const preset =
    origin === 'default' || origin === 'new-york' || origin === 'new-york-v4'
      ? origin
      : (requested ?? 'nova');
  return nativePresetEmptyStyle(preset, slot, {
    ...theme,
    source: origin,
    width: window.width,
    fontScale: window.fontScale,
    ...parent,
    fontSize: parent.fontSize ?? StyleSheet.flatten(text.style)?.fontSize,
    lineHeight: parent.lineHeight ?? StyleSheet.flatten(text.style)?.lineHeight,
    ...extra,
  });
}
function useTypography(
  paint: ReturnType<typeof useStyle>,
  ownStyle: StyleProp<TextStyle>,
  nativeTextPaint?: TextPaint,
) {
  const inherited = useContext(NativeTextStyleContext),
    own = StyleSheet.flatten(ownStyle),
    text = StyleSheet.flatten([inherited.style, paint.text, own]),
    effects = { ...paint.paint, ...nativeTextPaint };
  if (
    own?.lineHeight === undefined &&
    typeof effects.lineHeightMultiplier === 'number' &&
    effects.lineHeightMultiplier > 0
  )
    text.lineHeight = (text.fontSize ?? 14) * effects.lineHeightMultiplier;
  if (own?.letterSpacing === undefined && typeof effects.letterSpacingEm === 'number')
    text.letterSpacing = (text.fontSize ?? 14) * effects.letterSpacingEm;
  const requested = effects.fontRole;
  const fontRole: NativeFontRole | undefined =
    requested === 'sans' || requested === 'serif' || requested === 'mono' || requested === 'heading'
      ? requested
      : (paint.fontRole ?? inherited.fontRole);
  const ratio =
    own?.lineHeight === undefined &&
    typeof effects.lineHeightMultiplier === 'number' &&
    effects.lineHeightMultiplier > 0
      ? effects.lineHeightMultiplier
      : undefined;
  return {
    context: {
      ...inherited,
      style: text,
      fontRole,
      textBreakStrategy:
        effects.textBreakStrategy === 'balanced'
          ? ('balanced' as const)
          : effects.textBreakStrategy === 'highQuality'
            ? ('highQuality' as const)
            : inherited.textBreakStrategy,
    },
    metrics: { fontSize: text.fontSize, lineHeight: text.lineHeight, lineHeightMultiplier: ratio },
  };
}
type ContainerProps = ViewProps & {
  textStyle?: StyleProp<TextStyle>;
  nativeTextPaint?: TextPaint;
  ref?: Ref<View>;
};
function Container({
  slot,
  variant,
  style,
  textStyle,
  nativeTextPaint,
  children,
  ...props
}: ContainerProps & { slot: NativeEmptySlot; variant?: 'default' | 'icon' }) {
  const paint = useStyle(slot, { variant }),
    typography = useTypography(paint, textStyle, nativeTextPaint),
    scope = useContext(NativeDescendantStyleContext),
    localPaint = useNativeRegistryPaint();
  let body =
    slot === 'EmptyDescription'
      ? flow(paint.links ? directLinks(children) : children)
      : content(children);
  if (slot === 'EmptyMedia')
    body = (
      <NativeDescendantStyleContext.Provider
        value={{
          ...scope,
          ...(paint.iconSize !== undefined ? { iconSize: paint.iconSize } : {}),
          ...(typeof typography.context.style.color === 'string'
            ? { iconColor: typography.context.style.color }
            : {}),
          ...(paint.glyphPointerEvents ? { iconPointerEvents: 'none' as const } : {}),
        }}
      >
        {body}
      </NativeDescendantStyleContext.Provider>
    );
  return (
    <Context.Provider value={typography.metrics}>
      <NativeTextStyleProvider value={typography.context}>
        <View {...props} style={[paint.view, style]}>
          {slot === 'Empty' && (
            <NativeRegistryBackground paint={localPaint} style={[paint.view, style]} />
          )}
          <NativeInputGroupHostBoundary>{body}</NativeInputGroupHostBoundary>
        </View>
      </NativeTextStyleProvider>
    </Context.Provider>
  );
}
export function Empty(props: ContainerProps) {
  return <Container {...props} slot="Empty" />;
}
export function EmptyHeader(props: ContainerProps) {
  return <Container {...props} slot="EmptyHeader" />;
}
export function EmptyContent(props: ContainerProps) {
  return <Container {...props} slot="EmptyContent" />;
}
export function EmptyDescription(props: ContainerProps) {
  return <Container {...props} slot="EmptyDescription" />;
}
export function EmptyMedia(props: ContainerProps & { variant?: 'default' | 'icon' }) {
  return <Container {...props} slot="EmptyMedia" />;
}
export function EmptyTitle({
  style,
  textStyle,
  nativeTextPaint,
  ...props
}: TextProps & {
  textStyle?: StyleProp<TextStyle>;
  nativeTextPaint?: TextPaint;
  ref?: Ref<NativeText>;
}) {
  const paint = useStyle('EmptyTitle'),
    typography = useTypography(paint, [style, textStyle], nativeTextPaint);
  return (
    <Context.Provider value={typography.metrics}>
      <NativeTextStyleProvider value={typography.context}>
        <NativeInputGroupHostBoundary>
          <LabelText
            accessibilityRole="header"
            {...props}
            style={[paint.view, typography.context.style]}
          />
        </NativeInputGroupHostBoundary>
      </NativeTextStyleProvider>
    </Context.Provider>
  );
}
for (const component of [Empty, EmptyHeader, EmptyContent, EmptyDescription, EmptyMedia])
  Object.assign(component, { nativeContainerTextSlot: true, nativeTextPaintSlot: true });
Object.assign(Empty, { nativeExampleContainer: true, nativeRegistryGradientHost: true });
Object.assign(EmptyTitle, { nativeTextSlot: true, nativeTextPaintSlot: true });
