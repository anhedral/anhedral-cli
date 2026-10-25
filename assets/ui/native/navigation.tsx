import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Linking,
  Pressable,
  type Text,
  type View,
  type TextProps,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LabelText, content, type NativeTextPointerProps } from './_core';
import { useTheme } from '../theme';

export type NativeNavigationOptions = { replace?: boolean; scroll?: boolean };
export type NativeNavigationHandlers = {
  onNavigate?: (href: string, options: NativeNavigationOptions) => void | Promise<void>;
  onAnchor?: (anchor: string, options: NativeNavigationOptions) => void | Promise<void>;
};
const Navigation = createContext<NativeNavigationHandlers>({});
/** App routes and document anchors belong to the consuming application's router/scroll surface. */
export function NativeNavigationProvider({
  children,
  ...handlers
}: NativeNavigationHandlers & {
  children?: ReactNode;
}) {
  const parent = useContext(Navigation);
  return <Navigation.Provider value={{ ...parent, ...handlers }}>{children}</Navigation.Provider>;
}
export const useNativeNavigation = () => useContext(Navigation);
export async function openNativeLink(
  href: string,
  handlers: NativeNavigationHandlers,
  options: NativeNavigationOptions = {},
) {
  if (!href || href.trim() !== href || /[\u0000-\u001f\u007f]/.test(href))
    throw Error('A native link requires a valid destination.');
  if (href.startsWith('#')) {
    if (!handlers.onAnchor) throw Error('This native screen has no anchor handler.');
    await handlers.onAnchor(decodeURIComponent(href.slice(1)), options);
    return;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) {
    const parsed = new URL(href);
    if (!['http:', 'https:', 'mailto:', 'tel:', 'sms:'].includes(parsed.protocol))
      throw Error('Unsupported native link protocol.');
    await Linking.openURL(href);
    return;
  }
  if (href.startsWith('//')) throw Error('Native external links require an explicit protocol.');
  if (!handlers.onNavigate) throw Error('This native application has no route handler.');
  await handlers.onNavigate(href, options);
}

type NativeLinkProps = Omit<
  TextProps,
  | 'style'
  | 'children'
  | 'onPress'
  | 'onPressIn'
  | 'onPressOut'
  | 'onLongPress'
  | 'pressRetentionOffset'
  | 'disabled'
> &
  NativeTextPointerProps & {
    href: string;
    children?: ReactNode;
    inline?: boolean;
    disabled?: boolean | null;
    replace?: boolean;
    scroll?: boolean;
    onNavigate?: NativeNavigationHandlers['onNavigate'];
    onError?: (error: unknown) => void;
    onPress?: PressableProps['onPress'];
    onLongPress?: PressableProps['onLongPress'];
    onHoverIn?: PressableProps['onHoverIn'];
    onHoverOut?: PressableProps['onHoverOut'];
    onPressIn?: PressableProps['onPressIn'];
    onPressOut?: PressableProps['onPressOut'];
    hitSlop?: PressableProps['hitSlop'];
    pressRetentionOffset?: PressableProps['pressRetentionOffset'];
    style?:
      | StyleProp<TextStyle | ViewStyle>
      | ((state: { pressed: boolean }) => StyleProp<TextStyle | ViewStyle>);
    ref?: Ref<Text | View>;
  };
/** Inline links remain native Text spans; composed controls explicitly select a Pressable. */
export function NativeLink({
  href,
  children,
  inline = true,
  disabled,
  replace,
  scroll,
  onNavigate,
  onError,
  onPress,
  onLongPress,
  pressRetentionOffset,
  style,
  ref,
  accessibilityState,
  onHoverIn,
  onHoverOut,
  onPressIn,
  onPressOut,
  ...props
}: NativeLinkProps) {
  const handlers = useNativeNavigation();
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false),
    [pressed, setPressed] = useState(false);
  const lifetime = useRef({ alive: true, operation: 0 });
  useEffect(() => {
    const state = lifetime.current;
    state.alive = true;
    state.operation++;
    setFailed(false);
    return () => {
      state.alive = false;
      state.operation++;
    };
  }, [href]);
  const blocked = !!(disabled || accessibilityState?.disabled);
  const activate: NonNullable<PressableProps['onPress']> = async (event) => {
    if (blocked) return;
    onPress?.(event);
    if (event.isDefaultPrevented()) return;
    const operation = ++lifetime.current.operation;
    setFailed(false);
    try {
      if (onNavigate) await onNavigate(href, { replace, scroll });
      else await openNativeLink(href, handlers, { replace, scroll });
    } catch (error) {
      if (!lifetime.current.alive || operation !== lifetime.current.operation) return;
      setFailed(true);
      onError?.(error);
    }
  };
  const label = (
    <>
      {children}
      {failed && (
        <LabelText accessibilityRole="alert" style={{ color: colors.destructive }}>
          {' '}
          Unable to open link.
        </LabelText>
      )}
    </>
  );
  const common = {
    ...props,
    accessibilityRole: 'link' as const,
    disabled: blocked,
    onLongPress: blocked ? undefined : (onLongPress ?? undefined),
    accessibilityState: { ...accessibilityState, disabled: !!blocked },
    onPress: activate,
    onPressIn: (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (!blocked) {
        setPressed(true);
        onPressIn?.(event);
      }
    },
    onPressOut: (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      setPressed(false);
      onPressOut?.(event);
    },
  };
  return inline ? (
    <LabelText
      {...common}
      ref={ref as Ref<Text>}
      onPointerEnter={(event) => {
        props.onPointerEnter?.(event);
        if (!blocked) onHoverIn?.(event as never);
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        onHoverOut?.(event as never);
      }}
      pressRetentionOffset={
        pressRetentionOffset == null
          ? undefined
          : typeof pressRetentionOffset === 'number'
            ? {
                top: pressRetentionOffset,
                left: pressRetentionOffset,
                bottom: pressRetentionOffset,
                right: pressRetentionOffset,
              }
            : {
                top: pressRetentionOffset.top ?? 0,
                left: pressRetentionOffset.left ?? 0,
                bottom: pressRetentionOffset.bottom ?? 0,
                right: pressRetentionOffset.right ?? 0,
              }
      }
      suppressHighlighting={blocked || props.suppressHighlighting}
      style={typeof style === 'function' ? style({ pressed }) : style}
    >
      {label}
    </LabelText>
  ) : (
    <Pressable
      {...common}
      ref={ref as Ref<View>}
      disabled={blocked}
      pressRetentionOffset={pressRetentionOffset}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      style={(state) => (typeof style === 'function' ? style(state) : style)}
    >
      {content(label)}
    </Pressable>
  );
}
Object.assign(NativeLink, { nativeLinkSlot: true });
