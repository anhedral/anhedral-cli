import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  View,
  StyleSheet,
  processColor,
  I18nManager,
  Platform,
  Text as NativeText,
  type ViewProps,
  type TextProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../theme';
import { useNativeFontStyle, type NativeFontRole } from './fonts';

/** Identity protocol used by native registry styling wrappers; no DOM inspection is involved. */
export function nativeComponent(component: unknown): unknown {
  const seen = new Set<unknown>();
  let current = component;
  while (
    current &&
    (typeof current === 'function' || typeof current === 'object') &&
    'nativeRegistryComponent' in current
  ) {
    if (seen.has(current)) throw Error('Cyclic native component wrapper.');
    seen.add(current);
    current = current.nativeRegistryComponent;
  }
  return current;
}
export function useControllable<T>(value: T | undefined, initial: T, change?: (value: T) => void) {
  const [internal, setInternal] = useState(initial);
  const current = value === undefined ? internal : value;
  const latest = useRef(current);
  latest.current = current;
  const set = (next: T | ((previous: T) => T)) => {
    const resolved =
      typeof next === 'function' ? (next as (previous: T) => T)(latest.current) : next;
    if (Object.is(resolved, latest.current)) return;
    if (value === undefined) {
      latest.current = resolved;
      setInternal(resolved);
    }
    change?.(resolved);
  };
  return [current, set] as const;
}
export const monospace = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
export function plainText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint'
        ? String(child)
        : isValidElement<{
              children?: ReactNode;
              accessibilityElementsHidden?: boolean;
              'aria-hidden'?: boolean;
              importantForAccessibility?: string;
            }>(child)
          ? child.props.accessibilityElementsHidden ||
            child.props['aria-hidden'] ||
            child.props.importantForAccessibility === 'no-hide-descendants'
            ? ''
            : plainText(child.props.children)
          : '',
    )
    .join('');
}
export function content(children: ReactNode): ReactNode {
  return Children.map(children, (child) =>
    typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint' ? (
      <LabelText>{String(child)}</LabelText>
    ) : isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? (
      cloneElement(child, { children: content(child.props.children) })
    ) : (
      child
    ),
  );
}
export function Box({ children, style, ...props }: ViewProps) {
  return (
    <View {...props} style={[{ gap: 8 }, style]}>
      {content(children)}
    </View>
  );
}
export function withAlpha(color: string, opacity: number) {
  const parsed = processColor(color);
  if (typeof parsed !== 'number') return color;
  const alpha = (Math.min(1, Math.max(0, opacity)) * (parsed >>> 24)) / 255;
  return `rgba(${(parsed >>> 16) & 255}, ${(parsed >>> 8) & 255}, ${parsed & 255}, ${alpha})`;
}
const TextToneContext = createContext<string | undefined>(undefined);
export const TextToneProvider = TextToneContext.Provider;
export const useTextTone = () => useContext(TextToneContext);
export const NativeTextStyleContext = createContext<{
  style?: StyleProp<TextStyle>;
  fontRole?: NativeFontRole;
  numberOfLines?: number;
  textBreakStrategy?: TextProps['textBreakStrategy'];
}>({});
export const NativeTextStyleProvider = NativeTextStyleContext.Provider;
export function LabelText({
  style,
  fontRole,
  ...props
}: TextProps & { fontRole?: NativeFontRole }) {
  const { colors } = useTheme();
  const tone = useTextTone();
  const inherited = useContext(NativeTextStyleContext);
  const current = StyleSheet.flatten([inherited.style, style]);
  const weight = current?.fontWeight === 'bold' ? 700 : Number(current?.fontWeight) || 400;
  const selected = useNativeFontStyle(
    fontRole ?? inherited.fontRole ?? 'sans',
    weight,
    current?.fontStyle === 'italic',
  );
  return (
    <NativeText
      {...props}
      textBreakStrategy={props.textBreakStrategy ?? inherited.textBreakStrategy}
      lineBreakStrategyIOS={
        props.lineBreakStrategyIOS ?? (inherited.textBreakStrategy ? 'standard' : undefined)
      }
      numberOfLines={props.numberOfLines ?? inherited.numberOfLines}
      ellipsizeMode={props.ellipsizeMode ?? (inherited.numberOfLines ? 'tail' : undefined)}
      style={[
        { color: colors.foreground, fontSize: 14, lineHeight: 21 },
        inherited.style,
        tone && { color: tone },
        style,
        !current?.fontFamily && selected,
      ]}
    />
  );
}
export function Muted({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <LabelText {...props} style={[{ color: colors['muted-foreground'] }, style]} />;
}
export function Surface({ style, ...props }: ViewProps) {
  const { colors, radius } = useTheme();
  return (
    <Box
      {...props}
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius + 2,
          padding: 12,
        },
        style,
      ]}
    />
  );
}
export function row(style?: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  return [{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, style];
}
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
const DirectionContext = createContext<'ltr' | 'rtl'>(I18nManager.isRTL ? 'rtl' : 'ltr');
export function DirectionProvider({
  dir = 'ltr',
  children,
}: {
  dir?: 'ltr' | 'rtl';
  children: ReactNode;
}) {
  return (
    <DirectionContext.Provider value={dir}>
      <View style={{ direction: dir }}>{children}</View>
    </DirectionContext.Provider>
  );
}
export const useDirection = () => useContext(DirectionContext);
