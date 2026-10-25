import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useState,
  useRef,
  useEffect,
  type ComponentType,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  View,
  Animated,
  Easing,
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type ViewProps,
  type PressableProps,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../theme';
import { ChartContext } from './_chart-context';
import {
  content,
  LabelText,
  NativeTextStyleContext,
  NativeTextStyleProvider,
  TextToneProvider,
  useTextTone,
  withAlpha,
} from './_core';
import { registryStyle } from './_registry-css';

const RegistryLocalPaint = createContext<Record<string, string | number>>({});
export const RegistryPaintContext = createContext<Record<string, string | number>>({});
const RegistryVariables = createContext<Record<string, string>>({});
const DescendantStyle = createContext<string[]>([]);
type RecipeProps = {
  className?: string;
  children?: ReactNode;
  style?: unknown;
  'data-active'?: boolean;
  registryIndex?: number;
  registryCount?: number;
};
/** Keeps the original component identity for compound-component collectors. */
export function withRegistryStyles<C extends ComponentType<any>>(Component: C, kind = 'view') {
  function Styled({
    className,
    registryIndex,
    registryCount,
    ...props
  }: Omit<ComponentProps<C>, keyof RecipeProps> & RecipeProps) {
    const theme = useTheme(),
      window = useWindowDimensions(),
      [measuredWidth, setMeasuredWidth] = useState<number>(),
      width = measuredWidth ?? window.width,
      chart = useContext(ChartContext),
      variables = useContext(RegistryVariables),
      inherited = useContext(NativeTextStyleContext),
      inheritedPaint = useContext(RegistryPaintContext),
      descendant = useContext(DescendantStyle),
      tone = useTextTone();
    const localVariables = { ...variables };
    const inline = StyleSheet.flatten(props.style as never) as Record<string, unknown> | undefined;
    const nativeInline: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inline ?? {})) {
      if (key.startsWith('--')) {
        if (typeof value !== 'string')
          throw Error(`Native recipe variable ${key} must be a color string.`);
        localVariables[key] = value;
      } else nativeInline[key] = value;
    }
    const color = (value: string, seen = new Set<string>()): string => {
      if (seen.has(value)) throw Error(`Cyclic native recipe color: ${value}`);
      seen.add(value);
      const variable =
        /^(?:\[|\()?(--[\w-]+)(?:\]|\))?$/.exec(value) ?? /^var\((--[\w-]+)\)$/.exec(value);
      if (variable) {
        const resolved = localVariables[variable[1]!];
        if (resolved) return color(resolved, seen);
        if (theme.colors[variable[1]!.slice(2)]) return theme.colors[variable[1]!.slice(2)]!;
        if (chart) return chart.resolveColor(`var(${variable[1]})`);
        throw Error(`Unbound native recipe variable: ${variable[1]}`);
      }
      const [name, opacity] = value.split('/');
      const resolved =
        theme.colors[name!] ??
        (name === 'white' ? '#ffffff' : name === 'transparent' ? 'transparent' : undefined);
      if (resolved)
        return opacity === undefined ? resolved : withAlpha(resolved, Number(opacity) / 100);
      if (/^(#|rgb|hsl|oklch)/.test(value)) return chart?.resolveColor(value) ?? value;
      throw Error(`Unbound native recipe color: ${value}`);
    };
    const translated = registryStyle(
      [className, kind === 'span' && descendant.includes('span:flex') ? 'flex' : '']
        .filter(Boolean)
        .join(' '),
      {
        width: window.width,
        radius: theme.radius,
        color,
        index: registryIndex,
        count: registryCount,
        active: props['data-active'],
      },
    );
    const paint = { ...inheritedPaint, ...translated.paint };
    const text = { ...StyleSheet.flatten(inherited.style), ...translated.text };
    if (paint.lineHeightMultiplier === 1) text.lineHeight = text.fontSize ?? 14;
    const children = Children.map(props.children, (child, index) => {
      if (!isValidElement<RecipeProps>(child)) return child;
      if (
        (typeof child.type !== 'function' && typeof child.type !== 'object') ||
        !('nativeRegistryComponent' in child.type)
      )
        return child;
      const childClasses = [
        ...translated.children,
        ...('nativeRegistryKind' in child.type &&
        (child.type.nativeRegistryKind === 'svg' || child.type.nativeRegistryKind === 'svg-root')
          ? translated.svgChildren
          : []),
      ].join(' ');
      const columns = Number(translated.paint.columns);
      const gridStyle =
        columns > 1
          ? {
              width:
                Math.max(
                  0,
                  width -
                    Number(translated.view.paddingLeft ?? translated.view.padding ?? 0) -
                    Number(translated.view.paddingRight ?? translated.view.padding ?? 0) -
                    Number(translated.view.borderLeftWidth ?? translated.view.borderWidth ?? 0) -
                    Number(translated.view.borderRightWidth ?? translated.view.borderWidth ?? 0) -
                    Number(translated.view.gap ?? 0) * (columns - 1),
                ) / columns,
            }
          : undefined;
      const gradientStop =
        kind === 'svg' && 'stopColor' in child.props && typeof child.props.stopColor === 'string'
          ? { stopColor: color(child.props.stopColor) }
          : {};
      return cloneElement(child, {
        ...gradientStop,
        className: [childClasses, child.props.className].filter(Boolean).join(' '),
        style: [gridStyle, child.props.style],
        registryIndex: index,
        registryCount: Children.count(props.children),
      });
    });
    const forwarded: Record<string, unknown> = { ...props, children };
    if (kind !== 'svg' && kind !== 'svg-root')
      forwarded.onLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
        const next = event.nativeEvent.layout.width;
        if (Number.isFinite(next) && next > 0) setMeasuredWidth(next);
        props.onLayout?.(event);
      };
    delete forwarded['data-active'];
    if (kind === 'svg' || kind === 'svg-root') {
      Object.assign(forwarded, translated.paint, translated.text, nativeInline);
      if (translated.view.width !== undefined) forwarded.width = translated.view.width;
      if (translated.view.height !== undefined) forwarded.height = translated.view.height;
      for (const key of ['fill', 'stroke', 'color', 'stopColor']) {
        const value = forwarded[key];
        if (typeof value === 'string' && value.includes('var(')) forwarded[key] = color(value);
      }
      for (const key of ['dx', 'dy', 'fontSize', 'x', 'y']) {
        const value = forwarded[key];
        if (typeof value === 'string' && /^-?\d+(\.\d+)?rem$/.test(value))
          forwarded[key] = parseFloat(value) * 16;
      }
      if (forwarded.color === undefined)
        forwarded.color = tone ?? text.color ?? theme.colors.foreground;
      if (kind === 'svg-root') forwarded.style = [translated.view, nativeInline];
      else delete forwarded.style;
    } else {
      forwarded.style =
        kind === 'text'
          ? [translated.view, translated.text, nativeInline]
          : [translated.view, nativeInline];
      if (kind === 'button' && props['data-active'] !== undefined)
        forwarded.accessibilityState = {
          ...props.accessibilityState,
          selected: props['data-active'],
        };
    }
    return (
      <RegistryVariables.Provider value={localVariables}>
        <RegistryLocalPaint.Provider value={translated.paint}>
          <RegistryPaintContext.Provider value={paint}>
            <DescendantStyle.Provider value={[...descendant, ...translated.descendants]}>
              <NativeTextStyleProvider
                value={{ style: text, fontRole: translated.fontRole ?? inherited.fontRole }}
              >
                <TextToneProvider
                  value={typeof translated.text.color === 'string' ? translated.text.color : tone}
                >
                  <Component {...(forwarded as ComponentProps<C>)} />
                </TextToneProvider>
              </NativeTextStyleProvider>
            </DescendantStyle.Provider>
          </RegistryPaintContext.Provider>
        </RegistryLocalPaint.Provider>
      </RegistryVariables.Provider>
    );
  }
  return Object.assign(Styled, { nativeRegistryComponent: Component, nativeRegistryKind: kind });
}
function RecipeHover({ children, style, ...props }: ViewProps) {
  const effect = useContext(RegistryLocalPaint),
    position = useRef(new Animated.Value(0)).current,
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      subscription.remove();
      position.stopAnimation();
    };
  }, [position]);
  const animate = (active: boolean) =>
    Animated.timing(position, {
      toValue: active ? Number(effect.hoverTranslateY) : 0,
      duration: reduced ? 0 : Number(effect.transitionDuration ?? 0),
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  const transform = StyleSheet.flatten(style)?.transform;
  return (
    <Animated.View
      {...props}
      style={[
        style,
        { transform: [...(Array.isArray(transform) ? transform : []), { translateY: position }] },
      ]}
      onPointerEnter={(event) => {
        props.onPointerEnter?.(event);
        animate(true);
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        animate(false);
      }}
      onTouchStart={(event) => {
        props.onTouchStart?.(event);
        animate(true);
      }}
      onTouchEnd={(event) => {
        props.onTouchEnd?.(event);
        animate(false);
      }}
      onTouchCancel={(event) => {
        props.onTouchCancel?.(event);
        animate(false);
      }}
    >
      {content(children)}
    </Animated.View>
  );
}
function RecipeView({ children, ...props }: ViewProps) {
  const effects = useContext(RegistryLocalPaint);
  return effects.hoverTranslateY !== undefined ? (
    <RecipeHover {...props}>{children}</RecipeHover>
  ) : (
    <View {...props}>{content(children)}</View>
  );
}
function RecipeButton({ children, ...props }: PressableProps) {
  return (
    <Pressable accessibilityRole="button" {...props}>
      {typeof children === 'function' ? (state) => content(children(state)) : content(children)}
    </Pressable>
  );
}
export const RegistryView = withRegistryStyles(RecipeView);
export const RegistryText = withRegistryStyles(LabelText, 'text');
export const RegistryButton = withRegistryStyles(RecipeButton, 'button');

type RegistryClassName =
  string | false | null | undefined | Record<string, unknown> | readonly RegistryClassName[];
/** Recipe-local conditional utility composition; all results are translated before reaching native hosts. */
export function registryClassNames(...values: RegistryClassName[]): string {
  const output: string[] = [];
  const visit = (value: RegistryClassName) => {
    if (!value) return;
    if (typeof value === 'string') output.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else for (const [key, enabled] of Object.entries(value)) if (enabled) output.push(key);
  };
  values.forEach(visit);
  return output.join(' ');
}
