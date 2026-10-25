import {
  Children,
  Fragment,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
  useId,
  type ReactNode,
  type Ref,
} from 'react';
import {
  View,
  StyleSheet,
  Text as NativeText,
  useWindowDimensions,
  type ViewProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
  type StyleProp,
  AccessibilityInfo,
} from 'react-native';
import {
  LabelText,
  nativeComponent,
  NativeTextStyleContext,
  NativeTextStyleProvider,
  NativeDescendantStyleContext,
} from './_core';
import { useTheme } from '../theme';
import {
  useNativeComponentStyle,
  useNativeRegistrySource,
  NativeIconForcedSize,
} from './_registry-context';
import { nativePresetAlertStyle, type NativeAlertState } from './_preset-alert-style';
type AlertContextState = {
  variant: 'default' | 'destructive';
  fontSize: number;
  lineHeight: number;
  lineHeightMultiplier?: number;
  registerAction: (id: string) => () => void;
};
const Context = createContext<AlertContextState | null>(null);
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
function glyph(node: ReactNode) {
  return (
    isValidElement(node) &&
    (typeof node.type === 'function' || typeof node.type === 'object') &&
    'nativeRegistryIcon' in node.type &&
    node.type.nativeRegistryIcon === true
  );
}
function part(node: ReactNode, owner: unknown) {
  return isValidElement(node) && nativeComponent(node.type) === owner;
}
/** Preserve block boundaries while leaving authored inline word spacing intact. */
function announcement(children: ReactNode): string {
  const visit = (nodes: ReactNode): string =>
    Children.toArray(nodes)
      .map((node) => {
        if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint')
          return String(node);
        if (
          !isValidElement<{
            children?: ReactNode;
            accessibilityElementsHidden?: boolean;
            'aria-hidden'?: boolean;
            importantForAccessibility?: string;
          }>(node)
        )
          return '';
        if (
          part(node, AlertAction) ||
          node.props.accessibilityElementsHidden ||
          node.props['aria-hidden'] ||
          node.props.importantForAccessibility === 'no-hide-descendants'
        )
          return '';
        const owner = nativeComponent(node.type);
        const marker =
          owner && (typeof owner === 'function' || typeof owner === 'object')
            ? (owner as Record<string, unknown>)
            : {};
        const wrapper =
          typeof node.type === 'function' || typeof node.type === 'object'
            ? (node.type as unknown as Record<string, unknown>)
            : {};
        const block =
          owner === AlertTitle ||
          owner === AlertDescription ||
          owner === View ||
          marker.nativeRegistryParagraph === true ||
          (wrapper.nativeRegistryKind === 'view' &&
            !marker.nativeTextSlot &&
            !marker.nativeBadgeSlot);
        const text = visit(node.props.children);
        return block ? text.trim() + ' ' : text;
      })
      .join('');
  return visit(children).replace(/\s+/g, ' ').trim();
}
function hasAction(children: ReactNode): boolean {
  return flat(children).some(
    (node) =>
      part(node, AlertAction) ||
      (isValidElement<{ children?: ReactNode }>(node) && hasAction(node.props.children)),
  );
}
function useStyle(
  slot: Parameters<typeof nativePresetAlertStyle>[1],
  extra: Partial<NativeAlertState> = {},
) {
  const theme = useTheme(),
    requested = useNativeComponentStyle(),
    origin = useNativeRegistrySource(),
    window = useWindowDimensions(),
    context = useContext(Context);
  const preset =
    origin === 'default' || origin === 'new-york' || origin === 'new-york-v4'
      ? origin
      : (requested ?? 'nova');
  return {
    ...nativePresetAlertStyle(preset, slot, {
      ...theme,
      source: origin,
      fontScale: window.fontScale,
      width: window.width,
      variant: context?.variant,
      fontSize: context?.fontSize,
      lineHeight: context?.lineHeight,
      lineHeightMultiplier: context?.lineHeightMultiplier,
      ...extra,
    }),
    theme,
  };
}
const textKeys = new Set([
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'fontVariant',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textDecorationLine',
  'textDecorationColor',
  'textDecorationStyle',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'textTransform',
  'writingDirection',
  'includeFontPadding',
  'textAlignVertical',
]);
function splitStyle(style: StyleProp<TextStyle>) {
  const view: ViewStyle = {},
    text: TextStyle = {};
  for (const [key, value] of Object.entries(StyleSheet.flatten(style) ?? {}))
    Object.assign(textKeys.has(key) ? text : view, { [key]: value });
  return { view, text };
}
function sourceTypography(
  inherited: StyleProp<TextStyle>,
  paint: ReturnType<typeof useStyle>,
  ownStyle?: StyleProp<TextStyle>,
) {
  const own = StyleSheet.flatten(ownStyle),
    text = StyleSheet.flatten([inherited, paint.text, own]);
  if (
    own?.lineHeight === undefined &&
    typeof paint.paint.lineHeightMultiplier === 'number' &&
    paint.paint.lineHeightMultiplier > 0
  )
    text.lineHeight = (text.fontSize ?? 14) * paint.paint.lineHeightMultiplier;
  if (own?.letterSpacing === undefined && typeof paint.paint.letterSpacingEm === 'number')
    text.letterSpacing = (text.fontSize ?? 14) * paint.paint.letterSpacingEm;
  return text;
}
function inline(node: ReactNode): boolean {
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
  if (owner === AlertTitle) return false;
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
    owner.nativeTextSlot === true
  );
}
function flow(children: ReactNode) {
  const result: ReactNode[] = [],
    run: ReactNode[] = [];
  const flush = () => {
    if (run.length) {
      result.push(
        <LabelText key={'text-' + result.length}>{Children.toArray(run.splice(0))}</LabelText>,
      );
    }
  };
  const nodes = flat(children);
  for (const [index, original] of nodes.entries()) {
    const owner = isValidElement(original) ? nativeComponent(original.type) : null;
    const node =
      isValidElement(original) &&
      owner &&
      (typeof owner === 'function' || typeof owner === 'object') &&
      'nativeRegistryParagraph' in owner &&
      owner.nativeRegistryParagraph === true
        ? cloneElement(
            original as React.ReactElement<{ registryIndex?: number; registryCount?: number }>,
            { registryIndex: index, registryCount: nodes.length },
          )
        : original;
    if (inline(node)) run.push(node);
    else {
      flush();
      result.push(node);
    }
  }
  flush();
  return Children.toArray(result);
}
export function Alert({
  variant = 'default',
  children,
  style,
  textStyle,
  ...props
}: ViewProps & {
  variant?: 'default' | 'destructive';
  textStyle?: StyleProp<TextStyle>;
  ref?: Ref<View>;
}) {
  const inherited = useContext(NativeTextStyleContext),
    nodes = flat(children),
    icons = nodes.filter(glyph),
    [actions, setActions] = useState<Record<string, true>>({});
  const registerAction = useCallback((id: string) => {
    setActions((previous) => (previous[id] ? previous : { ...previous, [id]: true }));
    return () =>
      setActions((previous) => {
        if (!previous[id]) return previous;
        const next = { ...previous };
        delete next[id];
        return next;
      });
  }, []);
  const paint = useStyle('root', {
    variant,
    hasIcon: icons.length > 0,
    hasAction: hasAction(children) || Object.keys(actions).length > 0,
    fontSize: StyleSheet.flatten(inherited.style)?.fontSize,
    lineHeight: StyleSheet.flatten(inherited.style)?.lineHeight,
  });
  const typography = sourceTypography(inherited.style, paint, textStyle),
    foreground =
      typeof typography?.color === 'string' ? typography.color : paint.theme.colors.foreground;
  const state: AlertContextState = {
    variant,
    fontSize: typography?.fontSize ?? 14,
    lineHeight: typography?.lineHeight ?? 21,
    lineHeightMultiplier:
      StyleSheet.flatten(textStyle)?.lineHeight === undefined &&
      typeof paint.paint.lineHeightMultiplier === 'number' &&
      paint.paint.lineHeightMultiplier > 0
        ? paint.paint.lineHeightMultiplier
        : undefined,
    registerAction,
  };
  const text = announcement(children);
  useEffect(() => {
    if (text) AccessibilityInfo.announceForAccessibility(text);
  }, [text]);
  const renderIcon = (node: ReactNode, index: number) => {
    if (!isValidElement<{ className?: string; style?: StyleProp<ViewStyle> }>(node)) return node;
    const forced =
      paint.icon.forcedSize ??
      (!node.props.className?.includes('size-') ? paint.icon.size : undefined);
    const color = paint.icon.current
      ? foreground
      : typeof paint.icon.text.color === 'string'
        ? paint.icon.text.color
        : foreground;
    return (
      <NativeIconForcedSize.Provider key={'icon-' + index} value={forced}>
        <NativeDescendantStyleContext.Provider value={{ iconColor: color }}>
          {cloneElement(node, { style: [paint.icon.view, node.props.style] })}
        </NativeDescendantStyleContext.Provider>
      </NativeIconForcedSize.Provider>
    );
  };
  const body = nodes.filter((node) => !glyph(node)),
    actionNodes = body.filter((node) => part(node, AlertAction)),
    contentNodes = body.filter((node) => !part(node, AlertAction));
  let previousIcon = false,
    afterIcon = false;
  const block = nodes.map((node, index) => {
    if (glyph(node)) {
      previousIcon = true;
      afterIcon = true;
      return renderIcon(node, index);
    }
    const owner = isValidElement(node) ? nativeComponent(node.type) : null;
    const sourceDiv =
      owner === AlertDescription ||
      owner === AlertAction ||
      (owner === AlertTitle && !paint.legacy) ||
      owner === View;
    const shift = previousIcon && sourceDiv ? paint.firstSiblingY : 0;
    previousIcon = false;
    return isValidElement<{ style?: StyleProp<TextStyle> }>(node) ? (
      cloneElement(node, {
        key: node.key ?? 'part-' + index,
        style: [
          afterIcon && { paddingLeft: paint.indent },
          shift !== 0 && { transform: [{ translateY: shift }] },
          node.props.style,
        ],
      })
    ) : (
      <LabelText key={'part-' + index}>{node}</LabelText>
    );
  });
  return (
    <Context.Provider value={state}>
      <NativeTextStyleProvider value={{ ...inherited, style: typography }}>
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          {...props}
          style={[paint.view, style]}
        >
          {paint.layout === 'grid' ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  columnGap: paint.columnGap,
                  width: '100%',
                }}
              >
                {icons.map(renderIcon)}
                <View style={{ flex: 1, minWidth: 0, gap: paint.rowGap }}>
                  {flow(contentNodes)}
                </View>
              </View>
              {Children.toArray(actionNodes)}
            </>
          ) : (
            block
          )}
          {paint.accent.view.width !== undefined && (
            <View
              accessible={false}
              accessibilityElementsHidden
              pointerEvents="none"
              style={paint.accent.view}
            />
          )}
        </View>
      </NativeTextStyleProvider>
    </Context.Provider>
  );
}
export function AlertTitle({
  style,
  textStyle,
  numberOfLines,
  ...props
}: TextProps & { textStyle?: StyleProp<TextStyle>; ref?: Ref<NativeText> }) {
  const inherited = useContext(NativeTextStyleContext),
    scope = useContext(NativeDescendantStyleContext),
    paint = useStyle('title'),
    typography = sourceTypography(inherited.style, paint, [style, textStyle]);
  return (
    <NativeDescendantStyleContext.Provider
      value={{
        ...scope,
        ...(paint.links
          ? { linkUnderline: true, linkHoverColor: paint.theme.colors.foreground }
          : {}),
      }}
    >
      <NativeTextStyleProvider value={{ ...inherited, style: typography }}>
        <LabelText
          accessibilityRole="header"
          {...props}
          numberOfLines={
            numberOfLines ?? (typeof paint.paint.lines === 'number' ? paint.paint.lines : undefined)
          }
          style={[paint.view, typography]}
        />
      </NativeTextStyleProvider>
    </NativeDescendantStyleContext.Provider>
  );
}
export function AlertDescription({
  style,
  textStyle,
  children,
  ...props
}: Omit<ViewProps, 'style'> & {
  style?: StyleProp<TextStyle>;
  textStyle?: StyleProp<TextStyle>;
  ref?: Ref<View>;
}) {
  const inherited = useContext(NativeTextStyleContext),
    scope = useContext(NativeDescendantStyleContext),
    paint = useStyle('description'),
    caller = splitStyle(style),
    typography = sourceTypography(inherited.style, paint, [caller.text, textStyle]);
  return (
    <NativeDescendantStyleContext.Provider
      value={{
        ...scope,
        ...(paint.links
          ? { linkUnderline: true, linkHoverColor: paint.theme.colors.foreground }
          : {}),
        ...(paint.paragraphGap !== undefined ? { paragraphGap: paint.paragraphGap } : {}),
        ...(paint.paragraphLeading !== undefined
          ? { paragraphLeading: paint.paragraphLeading }
          : {}),
      }}
    >
      <NativeTextStyleProvider
        value={{
          ...inherited,
          style: typography,
          textBreakStrategy:
            (paint.paint.textBreakStrategy as 'simple' | 'highQuality' | 'balanced' | undefined) ??
            inherited.textBreakStrategy,
        }}
      >
        <View
          {...props}
          style={[paint.view, paint.layout === 'grid' && { alignItems: 'flex-start' }, caller.view]}
        >
          {flow(children)}
        </View>
      </NativeTextStyleProvider>
    </NativeDescendantStyleContext.Provider>
  );
}
export function AlertAction({ style, children, ...props }: ViewProps & { ref?: Ref<View> }) {
  const context = useContext(Context),
    id = useId(),
    paint = useStyle('action');
  useLayoutEffect(() => context?.registerAction(id), [context?.registerAction, id]);
  return (
    <View {...props} style={[paint.view, style]}>
      {flow(children)}
    </View>
  );
}
Object.assign(AlertTitle, { nativeTextSlot: true });
Object.assign(AlertDescription, { nativeContainerTextSlot: true });
