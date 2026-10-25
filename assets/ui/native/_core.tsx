import {
  Children,
  isValidElement,
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  View,
  I18nManager,
  Platform,
  Text as NativeText,
  type ViewProps,
  type TextProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

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
        : isValidElement<{ children?: ReactNode }>(child)
          ? plainText(child.props.children)
          : '',
    )
    .join('');
}
export function content(children: ReactNode) {
  return Children.map(children, (child) =>
    typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint' ? (
      <LabelText>{String(child)}</LabelText>
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
export function LabelText({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return (
    <NativeText
      {...props}
      style={[{ color: colors.foreground, fontSize: 14, lineHeight: 21 }, style]}
    />
  );
}
export function Muted({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <LabelText {...props} style={[{ color: colors['muted-foreground'] }, style]} />;
}
export function Surface({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <Box
      {...props}
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 10,
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
