import {
  Children,
  Fragment,
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
  ScrollView,
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
import { useTheme, NativeThemeScope } from '../theme';
import { styling } from '@workspace/styling';
import { ChartContext } from './_chart-context';
import {
  content,
  plainText,
  monospace,
  LabelText,
  NativeTextStyleContext,
  NativeTextStyleProvider,
  TextToneProvider,
  useTextTone,
  withAlpha,
} from './_core';
import { useNativeFontStyle } from './fonts';
import { tokenizeCode } from './code-block';
import { useOptionalOverlay } from './_overlay';
import {
  useNativeRecipeState,
  useNativeExampleStyle,
  useRegistryPalette,
  NativeButtonIconSize,
} from './_registry-context';
import { registryStyle } from './_registry-css';
import { NativeRegistryImage } from './registry-image';
import { NativeLink } from './navigation';
import { LinkButton } from './button';

const RegistryLocalPaint = createContext<Record<string, string | number>>({});
export const RegistryPaintContext = createContext<Record<string, string | number>>({});
const RegistryVariables = createContext<Record<string, string>>({});
const DescendantStyle = createContext<string[]>([]);
export type RegistryIcon = ComponentType<
  import('lucide-react-native').LucideProps & Pick<RecipeProps, 'className' | 'registryIcon'>
>;
type RecipeProps = {
  className?: string;
  children?: ReactNode;
  style?: unknown;
  'data-active'?: boolean;
  registryIndex?: number;
  registryCount?: number;
  registryIcon?: 'inline-start' | 'inline-end';
};
type StyledProps<P> = P extends unknown
  ? Omit<P, Exclude<keyof RecipeProps, 'children'>> &
      Omit<RecipeProps, 'children'> & { children?: unknown }
  : never;
function transparentRegistryNode(
  child: ReactNode,
): child is React.ReactElement<{ children?: ReactNode }> {
  return (
    isValidElement<{ children?: ReactNode }>(child) &&
    (child.type === Fragment ||
      ((typeof child.type === 'function' || typeof child.type === 'object') &&
        'nativeRegistryTransparent' in child.type &&
        child.type.nativeRegistryTransparent === true))
  );
}
function registryChildCount(children: ReactNode): number {
  return Children.toArray(children).reduce<number>(
    (count, child) =>
      count + (transparentRegistryNode(child) ? registryChildCount(child.props.children) : 1),
    0,
  );
}
function mapRegistryChildren(
  children: ReactNode,
  transform: (child: ReactNode, index: number, count: number) => ReactNode,
): ReactNode {
  const count = registryChildCount(children);
  let index = 0;
  const map = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) =>
      transparentRegistryNode(child)
        ? cloneElement(child, { children: map(child.props.children) })
        : transform(child, index++, count),
    );
  return map(children);
}
/** Keeps original component identity and discriminated prop unions for compound collectors. */
export function withRegistryStyles<C extends ComponentType<any>>(Component: C, kind = 'view') {
  function Styled(input: StyledProps<ComponentProps<C>>) {
    const {
      className,
      registryIndex,
      registryCount,
      registryIcon: _registryIcon,
      ...props
    } = input as Omit<ComponentProps<C>, Exclude<keyof RecipeProps, 'children'>> &
      Omit<RecipeProps, 'children'> & { children?: unknown };
    const buttonIconSize = useContext(NativeButtonIconSize);
    const theme = useTheme(),
      window = useWindowDimensions(),
      [measuredWidth, setMeasuredWidth] = useState<number>(),
      [interaction, setInteraction] = useState({ hovered: false, pressed: false }),
      [localSelected, setLocalSelected] = useState(Boolean(props.defaultPressed)),
      width = measuredWidth ?? window.width,
      chart = useContext(ChartContext),
      variables = useContext(RegistryVariables),
      inherited = useContext(NativeTextStyleContext),
      inheritedPaint = useContext(RegistryPaintContext),
      descendant = useContext(DescendantStyle),
      tone = useTextTone();
    const localVariables = { ...variables };
    const inline = (
      typeof props.style === 'function' ? undefined : StyleSheet.flatten(props.style as never)
    ) as Record<string, unknown> | undefined;
    const nativeInline: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inline ?? {})) {
      if (key.startsWith('--')) {
        if (typeof value !== 'string')
          throw Error(`Native recipe variable ${key} must be a color string.`);
        localVariables[key] = value;
      } else nativeInline[key] = value;
    }
    const generation = useRegistryPalette();
    const palette = generation === 'legacy' ? styling.registryColors : styling.utilityColors;
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
        (palette as Record<string, string>)[name!] ??
        (name === 'code'
          ? theme.colors.muted
          : name === 'code-foreground'
            ? theme.colors.foreground
            : undefined) ??
        (name === 'white'
          ? '#ffffff'
          : name === 'transparent'
            ? 'transparent'
            : name === 'current'
              ? (tone ??
                String(StyleSheet.flatten(inherited.style)?.color ?? theme.colors.foreground))
              : undefined);
      if (resolved)
        return opacity === undefined ? resolved : withAlpha(resolved, Number(opacity) / 100);
      if (/^(#|rgb|hsl|oklch)/.test(value)) return chart?.resolveColor(value) ?? value;
      throw Error(`Unbound native recipe color: ${value}`);
    };
    const styleName = useNativeExampleStyle();
    const recipeState = useNativeRecipeState();
    const overlay = useOptionalOverlay();
    const translated = registryStyle(
      [
        ...(kind === 'icon' || kind === 'svg-root'
          ? descendant.flatMap((rule) =>
              rule.startsWith('svg:')
                ? [rule.slice(4)]
                : rule.startsWith('svg-default:') &&
                    !className?.includes('size-') &&
                    props.size === undefined &&
                    props.width === undefined &&
                    props.height === undefined
                  ? [rule.slice(12)]
                  : [],
            )
          : []),
        className,
        kind === 'span' && descendant.includes('span:flex') ? 'flex' : '',
      ]
        .filter(Boolean)
        .join(' '),
      {
        styleName,
        generation,
        svg: kind === 'icon' || kind === 'svg-root',
        slot: Component.name?.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
        selected:
          props.pressed ??
          (className?.includes('data-[state=on]:') ? localSelected : recipeState.selected),
        expanded: recipeState.expanded,
        width: window.width,
        height: window.height,
        mode: theme.mode,
        radius: theme.radius,
        color,
        index: registryIndex,
        count: registryCount,
        active: props['data-active'],
      },
    );
    if (translated.paint.subgrid) translated.paint.columns = Number(inheritedPaint.columns ?? 1);
    if (translated.paint.triggerWidth) {
      if (!overlay) throw Error('Native trigger width requires an overlay root.');
      if (overlay.triggerSize.width > 0) translated.view.width = overlay.triggerSize.width;
    }
    const paint = { ...inheritedPaint, ...translated.paint };
    const text = { ...StyleSheet.flatten(inherited.style), ...translated.text };
    if (typeof paint.lineHeightMultiplier === 'number')
      text.lineHeight = (text.fontSize ?? 14) * paint.lineHeightMultiplier;
    if (typeof paint.letterSpacingEm === 'number')
      text.letterSpacing = (text.fontSize ?? 14) * paint.letterSpacingEm;
    const children =
      typeof props.children === 'function'
        ? props.children
        : mapRegistryChildren(props.children as ReactNode, (child, index, count) => {
            if (!isValidElement<RecipeProps>(child)) return child;
            if (
              (typeof child.type !== 'function' && typeof child.type !== 'object') ||
              !('nativeRegistryComponent' in child.type)
            )
              return child;
            const childClasses = [
              ...translated.children,
              ...('nativeRegistryKind' in child.type &&
              (child.type.nativeRegistryKind === 'svg' ||
                child.type.nativeRegistryKind === 'svg-root' ||
                child.type.nativeRegistryKind === 'icon')
                ? translated.svgChildren
                : []),
            ].join(' ');
            const columns = Number(translated.paint.columns);
            const spanMatch = /(?:^|\s)col-span-(full|[1-9])(?:\s|$)/.exec(
              child.props.className ?? '',
            );
            const span = spanMatch
              ? spanMatch[1] === 'full'
                ? columns
                : Math.min(columns, Number(spanMatch[1]))
              : 1;
            const gridStyle =
              columns > 1
                ? {
                    width:
                      (Math.max(
                        0,
                        width -
                          Number(translated.view.paddingLeft ?? translated.view.padding ?? 0) -
                          Number(translated.view.paddingRight ?? translated.view.padding ?? 0) -
                          Number(
                            translated.view.borderLeftWidth ?? translated.view.borderWidth ?? 0,
                          ) -
                          Number(
                            translated.view.borderRightWidth ?? translated.view.borderWidth ?? 0,
                          ) -
                          Number(translated.view.gap ?? 0) * (columns - 1),
                      ) /
                        columns) *
                        span +
                      Number(translated.view.gap ?? 0) * (span - 1),
                  }
                : undefined;
            const gradientStop =
              kind === 'svg' &&
              'stopColor' in child.props &&
              typeof child.props.stopColor === 'string'
                ? { stopColor: color(child.props.stopColor) }
                : {};
            return cloneElement(child, {
              ...gradientStop,
              className: [childClasses, child.props.className].filter(Boolean).join(' '),
              style: [
                gridStyle,
                index > 0 &&
                  typeof translated.paint.childMarginStart === 'number' && {
                    marginStart: translated.paint.childMarginStart,
                  },
                child.props.style,
              ],
              registryIndex: index,
              registryCount: count,
            });
          });
    const interacting = interaction.hovered || interaction.pressed;
    const forwarded: Record<string, unknown> = {
      ...props,
      children:
        isValidElement(props.children) && Array.isArray(children) && children.length === 1
          ? children[0]
          : children,
    };
    if (className?.includes('data-[state=on]:'))
      forwarded.onPressedChange = (value: boolean) => {
        setLocalSelected(value);
        props.onPressedChange?.(value);
      };
    const nativeLayoutProp =
      Component.name === 'ResizablePanelGroup' ? 'onContainerLayout' : 'onLayout';
    if (kind !== 'svg' && kind !== 'svg-root' && kind !== 'icon')
      forwarded[nativeLayoutProp] = (event: { nativeEvent: { layout: { width: number } } }) => {
        const next = event.nativeEvent.layout.width;
        if (Number.isFinite(next) && next > 0) setMeasuredWidth(next);
        props[nativeLayoutProp]?.(event);
      };
    delete forwarded['data-active'];
    if (translated.paint.pointerEvents && props.pointerEvents === undefined)
      forwarded.pointerEvents = translated.paint.pointerEvents;
    if (translated.paint.brightness !== undefined || translated.paint.objectFit !== undefined) {
      if (!('nativeRegistryMedia' in Component))
        throw Error('Native image paint requires a supported media component.');
      if (translated.paint.brightness !== undefined)
        forwarded.brightness = translated.paint.brightness;
      if (translated.paint.objectFit !== undefined)
        forwarded.objectFit = translated.paint.objectFit;
    }
    if (translated.paint.grayscale) {
      if (!('nativeRegistryImage' in Component))
        throw Error('Native grayscale requires a supported image component.');
      forwarded.grayscale = true;
    }
    if (kind === 'svg' || kind === 'svg-root' || kind === 'icon') {
      Object.assign(forwarded, translated.paint, translated.text, nativeInline);
      if (
        kind === 'icon' &&
        props.size === undefined &&
        props.width === undefined &&
        props.height === undefined &&
        translated.view.width === undefined &&
        translated.view.height === undefined &&
        buttonIconSize !== undefined
      )
        forwarded.size = buttonIconSize;
      if (kind === 'icon' && buttonIconSize !== undefined && props.pointerEvents === undefined)
        forwarded.pointerEvents = 'none';
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
      if (kind === 'svg-root' || kind === 'icon') {
        forwarded.style = [translated.view, nativeInline];
        delete forwarded.transform;
      } else delete forwarded.style;
    } else {
      forwarded.style =
        kind === 'text' || kind === 'link'
          ? [translated.view, translated.text, nativeInline]
          : [translated.view, nativeInline];
      if (kind === 'button') {
        forwarded.textStyle = translated.text;
        if (translated.text.color) forwarded.textColor = translated.text.color;
        if (interacting && translated.paint.hoverForeground)
          forwarded.textColor = translated.paint.hoverForeground;
      }
      if (
        typeof props.style === 'function' ||
        translated.paint.hoverBackground ||
        translated.paint.hoverForeground
      ) {
        const base = forwarded.style;
        forwarded.style = (state: { pressed: boolean }) => [
          base,
          kind === 'link' &&
            (interaction.hovered || state.pressed) &&
            translated.paint.hoverForeground && { color: translated.paint.hoverForeground },
          (interaction.hovered || state.pressed) &&
            translated.paint.hoverBackground && {
              backgroundColor: translated.paint.hoverBackground,
            },
          typeof props.style === 'function' ? props.style(state) : undefined,
        ];
      }
      if (translated.paint.hoverBackground || translated.paint.hoverForeground) {
        for (const [event, key, value] of [
          ['onHoverIn', 'hovered', true],
          ['onHoverOut', 'hovered', false],
          ['onPressIn', 'pressed', true],
          ['onPressOut', 'pressed', false],
        ] as const)
          forwarded[event] = (eventValue: unknown) => {
            props[event]?.(eventValue);
            setInteraction((previous) =>
              previous[key] === value ? previous : { ...previous, [key]: value },
            );
          };
      }
      if (kind === 'button' && props['data-active'] !== undefined)
        forwarded.accessibilityState = {
          ...props.accessibilityState,
          selected: props['data-active'],
        };
    }
    const result = (
      <RegistryVariables.Provider value={localVariables}>
        <RegistryLocalPaint.Provider value={translated.paint}>
          <RegistryPaintContext.Provider value={paint}>
            <DescendantStyle.Provider value={[...descendant, ...translated.descendants]}>
              <NativeTextStyleProvider
                value={{
                  style: text,
                  fontRole: translated.fontRole ?? inherited.fontRole,
                  textBreakStrategy:
                    translated.paint.textBreakStrategy === 'balanced'
                      ? 'balanced'
                      : translated.paint.textBreakStrategy === 'highQuality'
                        ? 'highQuality'
                        : inherited.textBreakStrategy,
                  numberOfLines:
                    typeof translated.paint.lines === 'number'
                      ? translated.paint.lines
                      : inherited.numberOfLines,
                }}
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
    const scoped =
      typeof translated.paint.radius === 'number' ? (
        <NativeThemeScope radius={translated.paint.radius}>{result}</NativeThemeScope>
      ) : (
        result
      );
    return translated.paint.spin ? (
      <RegistrySpin>{scoped}</RegistrySpin>
    ) : translated.paint.turnTransition ? (
      <RegistryTurn
        degrees={Number(translated.paint.turnAngle ?? 0)}
        duration={Number(translated.paint.transitionDuration ?? 150)}
      >
        {scoped}
      </RegistryTurn>
    ) : (
      scoped
    );
  }
  return Object.assign(Styled, {
    nativeRegistryComponent: Component,
    nativeRegistryKind: kind,
    nativeRegistryIcon:
      kind === 'icon' ||
      kind === 'svg-root' ||
      ('nativeRegistryIcon' in Component && Component.nativeRegistryIcon === true),
  });
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
function primitiveText(children: ReactNode): boolean {
  return (
    Children.count(children) > 0 &&
    Children.toArray(children).every(
      (child) =>
        typeof child === 'string' ||
        typeof child === 'number' ||
        typeof child === 'bigint' ||
        (isValidElement<{ children?: ReactNode }>(child) &&
          child.type === Fragment &&
          primitiveText(child.props.children)),
    )
  );
}
function RecipeView({ children, ...props }: ViewProps) {
  const effects = useContext(RegistryLocalPaint);
  return effects.hoverTranslateY !== undefined ? (
    <RecipeHover {...props}>{children}</RecipeHover>
  ) : (
    <View {...props}>
      {primitiveText(children) ? <LabelText>{children}</LabelText> : content(children)}
    </View>
  );
}
function RecipeButton({ children, ...props }: PressableProps) {
  return (
    <Pressable accessibilityRole="button" {...props}>
      {typeof children === 'function' ? (state) => content(children(state)) : content(children)}
    </Pressable>
  );
}
export const RegistryButtonLink = withRegistryStyles(LinkButton, 'button');
export const RegistryLink = withRegistryStyles(NativeLink, 'link');
export const RegistryImage = withRegistryStyles(NativeRegistryImage);
export const RegistryView = withRegistryStyles(RecipeView);
export const RegistryText = withRegistryStyles(LabelText, 'text');
const Heading = ({ style, ...props }: ComponentProps<typeof LabelText>) => (
  <LabelText accessibilityRole="header" {...props} style={[{ fontWeight: '700' }, style]} />
);
export const RegistryH1 = withRegistryStyles(Heading, 'text');
export const RegistryH2 = withRegistryStyles(Heading, 'text');
export const RegistryH3 = withRegistryStyles(Heading, 'text');
export const RegistryH4 = withRegistryStyles(Heading, 'text');
export const RegistryStrong = withRegistryStyles(
  ({ style, ...props }: ComponentProps<typeof LabelText>) => (
    <LabelText {...props} style={[{ fontWeight: '700' }, style]} />
  ),
  'text',
);
export const RegistrySmall = withRegistryStyles(
  ({ style, ...props }: ComponentProps<typeof LabelText>) => (
    <LabelText {...props} style={[{ fontSize: 12 }, style]} />
  ),
  'text',
);
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

function RecipePre({ children, style, ...props }: React.ComponentProps<typeof ScrollView>) {
  return (
    <ScrollView {...props} horizontal style={[{ maxWidth: '100%' }, style]}>
      {content(children)}
    </ScrollView>
  );
}
function RecipeCode({ children, style, ...props }: React.ComponentProps<typeof LabelText>) {
  const { colors } = useTheme(),
    current = StyleSheet.flatten(style),
    weight = current?.fontWeight === 'bold' ? 700 : Number(current?.fontWeight) || 400,
    font = useNativeFontStyle('mono', weight, current?.fontStyle === 'italic'),
    family = current?.fontFamily ?? font.fontFamily ?? monospace,
    tokens = tokenizeCode(plainText(children), 'json');
  return (
    <LabelText {...props} fontRole="mono" style={[font, { fontFamily: family }, style]}>
      {tokens.map((token, index) => (
        <LabelText
          key={index}
          fontRole="mono"
          style={{
            fontFamily: family,
            fontWeight: font.fontWeight ?? current?.fontWeight,
            color:
              token.kind === 'string'
                ? colors.primary
                : token.kind === 'number'
                  ? (colors['chart-2'] ?? colors.primary)
                  : token.kind === 'keyword'
                    ? (colors['chart-3'] ?? colors.primary)
                    : colors.foreground,
          }}
        >
          {token.text}
        </LabelText>
      ))}
    </LabelText>
  );
}
export const RegistryPre = withRegistryStyles(RecipePre);
export const RegistryCode = withRegistryStyles(RecipeCode, 'text');

function RegistrySpin({ children }: { children: ReactNode }) {
  const position = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | undefined;
    const update = (reduced: boolean) => {
      animation?.stop();
      position.setValue(0);
      if (!reduced && mounted) {
        animation = Animated.loop(
          Animated.timing(position, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        );
        animation.start();
      }
    };
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) update(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => {
      mounted = false;
      animation?.stop();
      subscription.remove();
    };
  }, [position]);
  return (
    <Animated.View
      style={{
        transform: [
          { rotate: position.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function RegistryTurn({
  children,
  degrees,
  duration,
}: {
  children: ReactNode;
  degrees: number;
  duration: number;
}) {
  const position = useRef(new Animated.Value(degrees)).current;
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(position, {
      toValue: degrees,
      duration: reduced ? 0 : duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [degrees, duration, reduced, position]);
  return (
    <Animated.View
      style={{
        transform: [
          {
            rotate: position.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
