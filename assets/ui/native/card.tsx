import {
  createContext,
  useContext,
  useState,
  useCallback,
  useLayoutEffect,
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  View,
  Image,
  StyleSheet,
  type ViewProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { type TextProps } from './text';
import {
  content,
  nativeComponent,
  LabelText,
  NativeTextStyleContext,
  NativeTextStyleProvider,
  TextToneProvider,
} from './_core';
import { useTheme } from '../theme';
import {
  NativeCardSpacingContext,
  useNativeComponentStyle,
  useNativeRegistrySource,
  useRegistryPalette,
} from './_registry-context';
import { nativePresetCardStyle, type NativeCardSlot } from './_preset-card-style';
const CardSize = createContext<'default' | 'sm'>('default');
const CardFooters = createContext<(() => () => void) | undefined>(undefined);
type CardTextPaint = { letterSpacingEm?: number; lineHeightMultiplier?: number };
type CardViewProps = ViewProps & { ref?: Ref<View> };
type CardRootStyleProps = CardViewProps & {
  nativeTextPaint?: CardTextPaint;
  textStyle?: StyleProp<TextStyle>;
};
function nodesOf(children: ReactNode, prefix = ''): ReactNode[] {
  return Children.toArray(children).flatMap((node) => {
    if (!isValidElement<{ children?: ReactNode }>(node)) return [node];
    const key = prefix + String(node.key);
    return node.type === Fragment
      ? nodesOf(node.props.children, key + '/')
      : [cloneElement(node, { key })];
  });
}
function hasMarker(node: ReactNode, marker: string) {
  if (!isValidElement(node)) return false;
  const type = nativeComponent(node.type);
  return !!type && (typeof type === 'function' || typeof type === 'object') && marker in type;
}
function isPart(node: ReactNode, part: unknown) {
  return isValidElement(node) && nativeComponent(node.type) === part;
}
function isImage(node: ReactNode) {
  return isPart(node, Image) || hasMarker(node, 'nativeRegistryMedia');
}
function useCardStyle(
  slot: NativeCardSlot,
  props: CardRootStyleProps,
  state: {
    size?: 'default' | 'sm';
    spacing?: number;
    hasFooter?: boolean;
    firstImage?: boolean;
    lastImage?: boolean;
    hasChoices?: boolean;
  } = {},
) {
  const theme = useTheme(),
    source = useNativeRegistrySource(),
    requested = useNativeComponentStyle(),
    generation = useRegistryPalette(),
    size = useContext(CardSize),
    spacing = useContext(NativeCardSpacingContext);
  const preset =
    source === 'default' || source === 'new-york' || source === 'new-york-v4'
      ? source
      : generation === 'legacy'
        ? 'default'
        : (requested ?? 'nova');
  const inline = StyleSheet.flatten(props.style);
  const result = nativePresetCardStyle(preset, slot, {
    ...theme,
    size,
    spacing,
    ...state,
    borderTop: Number(inline?.borderTopWidth ?? inline?.borderWidth ?? 0) > 0,
    borderBottom: Number(inline?.borderBottomWidth ?? inline?.borderWidth ?? 0) > 0,
  });
  const inherited = useContext(NativeTextStyleContext);
  const text = StyleSheet.flatten([inherited.style, result.text, props.textStyle]);
  const ownText = StyleSheet.flatten(props.textStyle);
  const paint = { ...result.paint, ...props.nativeTextPaint };
  if (
    ownText?.lineHeight === undefined &&
    typeof paint.lineHeightMultiplier === 'number' &&
    paint.lineHeightMultiplier > 0
  )
    text.lineHeight = (text.fontSize ?? 14) * Number(paint.lineHeightMultiplier);
  if (ownText?.letterSpacing === undefined && typeof paint.letterSpacingEm === 'number')
    text.letterSpacing = (text.fontSize ?? 14) * Number(paint.letterSpacingEm);
  return {
    ...result,
    text,
    textContext: inherited,
    fontRole: result.fontRole ?? inherited.fontRole,
  };
}
export function Card({
  style,
  textStyle,
  nativeTextPaint,
  children,
  size = 'default',
  spacing,
  ...props
}: CardRootStyleProps & { size?: 'default' | 'sm'; spacing?: number }) {
  const [footerCount, setFooterCount] = useState(0);
  const registerFooter = useCallback(() => {
    setFooterCount((count) => count + 1);
    return () => setFooterCount((count) => Math.max(0, count - 1));
  }, []);
  const nodes = nodesOf(children);
  const source = useCardStyle(
    'Card',
    { style, textStyle, nativeTextPaint },
    {
      size,
      spacing,
      hasFooter: footerCount > 0 || nodes.some((node) => isPart(node, CardFooter)),
      firstImage: isImage(nodes[0]),
      lastImage: isImage(nodes.at(-1)),
    },
  );
  const elements = nodes.map((node, index) => {
    if (
      !isImage(node) ||
      !isValidElement<{ style?: StyleProp<import('react-native').ImageStyle> }>(node)
    )
      return node;
    return cloneElement(node, {
      style: [
        index === 0 && source.imageCorners.first,
        index === nodes.length - 1 && source.imageCorners.last,
        node.props.style,
      ],
    });
  });
  return (
    <CardSize.Provider value={size}>
      <CardFooters.Provider value={registerFooter}>
        <NativeCardSpacingContext.Provider value={source.spacing}>
          <NativeTextStyleProvider
            value={{ ...source.textContext, style: source.text, fontRole: source.fontRole }}
          >
            <TextToneProvider
              value={typeof source.text.color === 'string' ? source.text.color : undefined}
            >
              <View {...props} style={[source.view, style]}>
                {content(elements)}
              </View>
            </TextToneProvider>
          </NativeTextStyleProvider>
        </NativeCardSpacingContext.Provider>
      </CardFooters.Provider>
    </CardSize.Provider>
  );
}
Card.nativeCardSlot = true;
function CardBox({ slot, children, style, ...props }: CardViewProps & { slot: NativeCardSlot }) {
  const source = useCardStyle(
    slot,
    { style },
    { hasChoices: nodesOf(children).some((node) => hasMarker(node, 'nativeCardChoices')) },
  );
  return (
    <View {...props} style={[source.view, style]}>
      {content(children)}
    </View>
  );
}
export function CardContent(props: CardViewProps) {
  return <CardBox slot="CardContent" {...props} />;
}
export function CardHeader({ children, style, ...props }: CardViewProps) {
  const source = useCardStyle('CardHeader', { style });
  const nodes = nodesOf(children),
    actions = nodes.filter((node) => isPart(node, CardAction)),
    body = nodes.filter((node) => !isPart(node, CardAction));
  return (
    <View {...props} style={[source.view, actions.length > 0 && { flexDirection: 'row' }, style]}>
      {actions.length > 0 ? (
        <>
          <View style={{ flex: 1, minWidth: 0, gap: source.view.gap ?? source.view.rowGap }}>
            {content(body)}
          </View>
          {actions}
        </>
      ) : (
        content(body)
      )}
    </View>
  );
}
export function CardFooter(props: CardViewProps) {
  const register = useContext(CardFooters);
  useLayoutEffect(() => register?.(), [register]);
  return <CardBox slot="CardFooter" {...props} />;
}
function CardText({
  slot,
  style,
  nativeTextPaint,
  ...props
}: TextProps & {
  nativeTextPaint?: { letterSpacingEm?: number; lineHeightMultiplier?: number };
  slot: 'CardTitle' | 'CardDescription';
}) {
  const source = useCardStyle(slot, {});
  const text = StyleSheet.flatten([source.text, style]);
  if (typeof nativeTextPaint?.letterSpacingEm === 'number')
    text.letterSpacing = (text.fontSize ?? 14) * nativeTextPaint.letterSpacingEm;
  if (
    typeof nativeTextPaint?.lineHeightMultiplier === 'number' &&
    nativeTextPaint.lineHeightMultiplier > 0
  )
    text.lineHeight = (text.fontSize ?? 14) * nativeTextPaint.lineHeightMultiplier;
  return (
    <LabelText
      accessibilityRole={slot === 'CardTitle' ? 'header' : undefined}
      {...props}
      fontRole={source.fontRole}
      style={text}
    />
  );
}
export function CardTitle(props: TextProps) {
  return <CardText slot="CardTitle" {...props} />;
}
CardTitle.nativeCardTextSlot = true;
export function CardDescription(props: TextProps) {
  return <CardText slot="CardDescription" {...props} />;
}
CardDescription.nativeCardTextSlot = true;
export function CardAction(props: CardViewProps) {
  return <CardBox slot="CardAction" {...props} />;
}
