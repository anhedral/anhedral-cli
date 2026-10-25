import {
  Children,
  Fragment,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  View,
  Image,
  StyleSheet,
  type ViewProps,
  type ImageProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import Svg, {
  Defs,
  Filter,
  FeColorMatrix,
  Image as SvgImage,
  ClipPath,
  Rect,
} from 'react-native-svg';
import { useTheme } from '../theme';
import { nativeBitmapLayerFilter, nativeBitmapFilterStyle } from './_image-filter';
import { useNativeComponentStyle, useNativeRegistrySource } from './_registry-context';
import { nativePresetAvatarStyle, type NativeAvatarSlot } from './_preset-avatar-style';
import {
  nativeComponent,
  content,
  NativeTextStyleContext,
  NativeTextStyleProvider,
  TextToneProvider,
  useTextTone,
} from './_core';
import { NativeInputGroupHostBoundary } from './_input-group-context';
export type AvatarImageStatus = 'idle' | 'loading' | 'loaded' | 'error';
type Size = 'default' | 'sm' | 'lg';
const Context = createContext({
  size: 'default' as Size,
  grayscale: false,
  status: 'idle' as AvatarImageStatus,
  statuses: {} as Record<string, AvatarImageStatus>,
  setStatus: (_id: string, _status: AvatarImageStatus) => {},
});
const Group = createContext({ hasSmall: false, hasLarge: false });
function useStyle(slot: NativeAvatarSlot, size?: Size) {
  const theme = useTheme(),
    requested = useNativeComponentStyle(),
    origin = useNativeRegistrySource(),
    group = useContext(Group),
    parent = useContext(NativeTextStyleContext),
    flat = StyleSheet.flatten(parent.style);
  let name =
    origin === 'default' || origin === 'new-york' || origin === 'new-york-v4'
      ? origin
      : (requested ?? 'nova');
  if (
    (name === 'default' || name === 'new-york') &&
    ['AvatarBadge', 'AvatarGroup', 'AvatarGroupCount'].includes(slot)
  )
    name = 'new-york-v4';
  return nativePresetAvatarStyle(name, slot, {
    ...theme,
    source: origin,
    size,
    ...group,
    fontSize: flat?.fontSize,
    lineHeight: flat?.lineHeight,
  });
}
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
type TextContainer = ViewProps & { ref?: Ref<View>; textStyle?: StyleProp<TextStyle> };
function TextScope({
  children,
  paint,
  textStyle,
}: {
  children: ReactNode;
  paint: ReturnType<typeof useStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const parent = useContext(NativeTextStyleContext),
    inheritedTone = useTextTone();
  const color = StyleSheet.flatten(textStyle)?.color ?? paint.text.color;
  return (
    <NativeTextStyleProvider value={{ ...parent, style: [parent.style, paint.text, textStyle] }}>
      <TextToneProvider
        value={color === undefined ? inheritedTone : typeof color === 'string' ? color : undefined}
      >
        {children}
      </TextToneProvider>
    </NativeTextStyleProvider>
  );
}
export function Avatar({
  children,
  style,
  size = 'default',
  grayscale = false,
  textStyle,
  ref,
  nativeGroupRing = false,
  ...props
}: TextContainer & { size?: Size; grayscale?: boolean; nativeGroupRing?: boolean }) {
  const paint = useStyle('Avatar', size),
    theme = useTheme(),
    [status, setCurrent] = useState<AvatarImageStatus>('idle'),
    [statuses, setStatuses] = useState<Record<string, AvatarImageStatus>>({});
  const setStatus = useCallback((id: string, next: AvatarImageStatus) => {
    setCurrent(next);
    setStatuses((previous) => (previous[id] === next ? previous : { ...previous, [id]: next }));
  }, []);
  const peers: string[] = [];
  const slots = flat(children).map((node, index) => {
    if (!isValidElement<{ nativeImageOrder?: string; nativePeerOrders?: string[] }>(node))
      return node;
    const owner = nativeComponent(node.type);
    if (owner === AvatarImage) {
      const id = node.key ?? String(index);
      peers.push(id);
      return cloneElement(node, { nativeImageOrder: id });
    }
    if (owner === AvatarFallback) return cloneElement(node, { nativePeerOrders: [...peers] });
    return node;
  });
  const own = StyleSheet.flatten([paint.view, style]),
    radius = own?.borderRadius;
  return (
    <Context.Provider value={{ size, grayscale, status, statuses, setStatus }}>
      <TextScope paint={paint} textStyle={textStyle}>
        <View
          {...props}
          ref={ref}
          style={[
            paint.view,
            nativeGroupRing && {
              boxShadow: [
                {
                  offsetX: 0,
                  offsetY: 0,
                  blurRadius: 0,
                  spreadDistance: 2,
                  color: theme.colors.background,
                },
              ],
            },
            style,
          ]}
        >
          <NativeInputGroupHostBoundary>{content(slots)}</NativeInputGroupHostBoundary>
          {paint.borderOverlay && (
            <View
              pointerEvents="none"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID={props.testID ? props.testID + '-border' : undefined}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: radius,
                  mixBlendMode: theme.mode === 'dark' ? 'lighten' : 'darken',
                },
              ]}
            />
          )}
        </View>
      </TextScope>
    </Context.Provider>
  );
}
Object.assign(Avatar, { nativeRegistryImage: true, nativeContainerTextSlot: true });
export function AvatarFallback({
  children,
  delay,
  delayMs,
  nativePeerOrders,
  style,
  textStyle,
  ref,
  ...props
}: TextContainer & { delay?: number; delayMs?: number; nativePeerOrders?: string[] }) {
  const avatar = useContext(Context),
    paint = useStyle('AvatarFallback', avatar.size),
    aria = paint.source === 'aria',
    duration = paint.source === 'base' ? delay : delayMs;
  const [ready, setReady] = useState(duration === undefined);
  useEffect(() => {
    if (duration === undefined) {
      if (paint.source === 'base') setReady(true);
      return;
    }
    if (!Number.isFinite(duration) || duration < 0)
      throw Error('Avatar fallback delay must be finite and nonnegative.');
    const timeout = setTimeout(() => setReady(true), duration);
    return () => clearTimeout(timeout);
  }, [duration, paint.source]);
  const visible = aria
    ? nativePeerOrders?.length
      ? nativePeerOrders.some((id) => avatar.statuses[id] === 'error')
      : true
    : avatar.status !== 'loaded' && ((duration === undefined && paint.source === 'base') || ready);
  if (!visible) return null;
  return (
    <TextScope paint={paint} textStyle={textStyle}>
      <View {...props} ref={ref} style={[paint.view, style]}>
        <NativeInputGroupHostBoundary>{content(children)}</NativeInputGroupHostBoundary>
      </View>
    </TextScope>
  );
}
Object.assign(AvatarFallback, { nativeContainerTextSlot: true });
function glyphs(children: ReactNode, size: number | undefined, hidden: boolean): ReactNode {
  return flat(children).map((node) => {
    if (
      !isValidElement<{
        className?: string;
        size?: number;
        width?: number;
        height?: number;
        style?: unknown;
      }>(node)
    )
      return node;
    const owner = nativeComponent(node.type),
      kind =
        (typeof node.type === 'function' || typeof node.type === 'object') &&
        'nativeRegistryKind' in node.type
          ? node.type.nativeRegistryKind
          : undefined;
    const icon =
      kind === 'icon' ||
      kind === 'svg-root' ||
      owner === Svg ||
      (!!owner &&
        (typeof owner === 'function' || typeof owner === 'object') &&
        'nativeRegistryIcon' in owner &&
        owner.nativeRegistryIcon === true);
    if (!icon) return node;
    const classes = [
      node.props.className,
      size === undefined ? undefined : 'size-[' + size + 'px]',
      hidden ? 'hidden' : undefined,
    ]
      .filter(Boolean)
      .join(' ');
    if (kind === 'icon' || kind === 'svg-root')
      return cloneElement(node, {
        className: classes,
        ...(size === undefined ? {} : { size, width: size, height: size }),
      });
    return cloneElement(node, {
      ...(size === undefined ? {} : { width: size, height: size }),
      style: [hidden && { display: 'none' }, node.props.style],
    });
  });
}
export function AvatarBadge({ children, style, textStyle, ref, ...props }: TextContainer) {
  const avatar = useContext(Context),
    paint = useStyle('AvatarBadge', avatar.size);
  return (
    <TextScope paint={paint} textStyle={textStyle}>
      <View {...props} ref={ref} style={[paint.view, style]}>
        <NativeInputGroupHostBoundary>
          {content(glyphs(children, paint.iconSize, paint.hideIcon))}
        </NativeInputGroupHostBoundary>
      </View>
    </TextScope>
  );
}
Object.assign(AvatarBadge, { nativeContainerTextSlot: true });
export function AvatarGroup({ children, style, ref, ...props }: TextContainer) {
  const paint = useStyle('AvatarGroup'),
    nodes = flat(children),
    avatars = nodes.filter(
      (node): node is React.ReactElement<{ size?: Size }> =>
        isValidElement(node) && nativeComponent(node.type) === Avatar,
    ),
    value = {
      hasSmall: avatars.some((node) => node.props.size === 'sm'),
      hasLarge: avatars.some((node) => node.props.size === 'lg'),
    };
  return (
    <Group.Provider value={value}>
      <View {...props} ref={ref} style={[paint.view, style]}>
        <NativeInputGroupHostBoundary>
          {nodes.map((node, index) => {
            if (!isValidElement<{ style?: ViewProps['style']; nativeGroupRing?: boolean }>(node))
              return content(node);
            return cloneElement(node, {
              ...(nativeComponent(node.type) === Avatar && paint.groupRing
                ? { nativeGroupRing: true }
                : {}),
              style: [index > 0 && { marginStart: -paint.overlap }, node.props.style],
            });
          })}
        </NativeInputGroupHostBoundary>
      </View>
    </Group.Provider>
  );
}
export function AvatarGroupCount({ children, style, textStyle, ref, ...props }: TextContainer) {
  const paint = useStyle('AvatarGroupCount');
  return (
    <TextScope paint={paint} textStyle={textStyle}>
      <View {...props} ref={ref} style={[paint.view, style]}>
        <NativeInputGroupHostBoundary>
          {content(glyphs(children, paint.iconSize, false))}
        </NativeInputGroupHostBoundary>
      </View>
    </TextScope>
  );
}
Object.assign(AvatarGroupCount, { nativeContainerTextSlot: true });
export function AvatarImage({
  onLoad,
  onError,
  alt,
  accessibilityLabel,
  accessible,
  source,
  style,
  grayscale: ownGrayscale,
  nativeImageOrder,
  onLoadingStatusChange,
  objectFit,
  brightness = 1,
  ref,
  ...props
}: ImageProps & {
  grayscale?: boolean;
  nativeImageOrder?: string;
  onLoadingStatusChange?: (status: AvatarImageStatus) => void;
  objectFit?: string;
  brightness?: number;
  ref?: Ref<Image>;
}) {
  const avatar = useContext(Context),
    grayscale = ownGrayscale ?? avatar.grayscale,
    { setStatus } = avatar,
    generatedOrder = useId(),
    order = nativeImageOrder ?? generatedOrder,
    paint = useStyle('AvatarImage', avatar.size),
    filter = useId();
  if (!Number.isFinite(brightness) || brightness < 0)
    throw Error('Avatar image brightness must be finite and nonnegative.');
  const filtered = grayscale || brightness !== 1,
    nativeFilter = filtered && nativeBitmapLayerFilter;
  const identity = JSON.stringify([source, props.src, props.srcSet, grayscale, brightness]),
    latest = useRef(identity);
  latest.current = identity;
  const [ready, setReady] = useState({ identity, bitmap: false, filtered: false, failed: false });
  const current =
    ready.identity === identity
      ? ready
      : { identity, bitmap: false, filtered: false, failed: false };
  const visible =
    current.bitmap && (!filtered || nativeFilter || current.filtered) && !current.failed;
  const status: AvatarImageStatus = visible
    ? 'loaded'
    : current.failed || (!source && !props.src && !props.srcSet)
      ? 'error'
      : 'loading';
  const callback = useRef(onLoadingStatusChange);
  callback.current = onLoadingStatusChange;
  useLayoutEffect(() => {
    setStatus(order, status);
    if (paint.source !== 'aria') callback.current?.(status);
  }, [order, status, setStatus, paint.source]);
  useLayoutEffect(
    () => () => {
      if (paint.source === 'base') setStatus(order, 'idle');
    },
    [order, setStatus, paint.source],
  );
  useEffect(() => {
    latest.current = identity;
    return () => {
      if (latest.current === identity) latest.current = '';
    };
  }, [identity]);
  const mark = (kind: 'bitmap' | 'filtered' | 'error') => {
    if (latest.current !== identity) return;
    setReady((previous) => {
      const value =
        previous.identity === identity
          ? previous
          : { identity, bitmap: false, filtered: false, failed: false };
      if (kind === 'error') return { identity, bitmap: false, filtered: false, failed: true };
      return value[kind]
        ? value
        : { ...value, [kind]: true, ...(kind === 'bitmap' ? { failed: false } : {}) };
    });
  };
  useEffect(() => {
    if (!filtered || nativeFilter || !current.bitmap || visible || current.failed) return;
    const timeout = setTimeout(() => mark('error'), 30_000);
    return () => clearTimeout(timeout);
  }, [identity, filtered, nativeFilter, current.bitmap, current.failed, visible]);
  const fit = objectFit ?? paint.paint.objectFit ?? 'fill';
  const resizeMode =
    props.resizeMode ?? (fit === 'contain' ? 'contain' : fit === 'fill' ? 'stretch' : 'cover');
  const imageStyle = {
    ...paint.view,
    overflow: paint.view.overflow === 'hidden' ? ('hidden' as const) : undefined,
  };
  const image = (
    <Image
      {...props}
      key={identity}
      ref={ref}
      source={source}
      accessibilityRole={props.accessibilityRole ?? 'image'}
      accessibilityLabel={accessibilityLabel ?? alt}
      resizeMode={resizeMode}
      accessible={
        (!filtered || nativeFilter) &&
        visible &&
        !!(accessibilityLabel ?? alt) &&
        accessible !== false
      }
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
      accessibilityElementsHidden={
        !visible ||
        (filtered && !nativeFilter) ||
        !(accessibilityLabel ?? alt) ||
        accessible === false
      }
      importantForAccessibility={
        !visible ||
        (filtered && !nativeFilter) ||
        !(accessibilityLabel ?? alt) ||
        accessible === false
          ? 'no-hide-descendants'
          : props.importantForAccessibility
      }
      style={
        nativeFilter
          ? [
              { position: 'absolute', width: '100%', height: '100%', opacity: visible ? 1 : 0 },
              {
                tintColor: StyleSheet.flatten(style)?.tintColor,
                overlayColor: StyleSheet.flatten(style)?.overlayColor,
              },
            ]
          : [
              imageStyle,
              {
                position: 'absolute',
                width: '100%',
                height: '100%',
                opacity: visible && !filtered ? 1 : 0,
              },
              style,
            ]
      }
    />
  );
  if (nativeFilter)
    return (
      <View
        testID={props.testID ? props.testID + '-native-filter' : undefined}
        accessible={false}
        style={[
          paint.view,
          { position: 'absolute', width: '100%', height: '100%' },
          style as StyleProp<import('react-native').ViewStyle>,
          nativeBitmapFilterStyle(grayscale, brightness),
          { overflow: 'hidden' },
        ]}
      >
        {image}
      </View>
    );
  return (
    <>
      {image}
      {filtered && (
        <Svg
          width="100%"
          height="100%"
          style={[
            paint.view,
            { position: 'absolute', inset: 0, overflow: 'hidden', opacity: visible ? 1 : 0 },
            style,
          ]}
          accessibilityElementsHidden={!visible}
          testID={props.testID ? props.testID + '-grayscale' : undefined}
          accessible={visible && !!(accessibilityLabel ?? alt) && accessible !== false}
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel ?? alt}
        >
          <Defs>
            <ClipPath id={filter + '-clip'}>
              <Rect
                width="100%"
                height="100%"
                rx={
                  typeof StyleSheet.flatten([imageStyle, style])?.borderRadius === 'number'
                    ? (StyleSheet.flatten([imageStyle, style])?.borderRadius as number)
                    : 0
                }
              />
            </ClipPath>
            <Filter id={filter}>
              <FeColorMatrix
                type="matrix"
                values={[
                  ...(grayscale ? [0.2126, 0.7152, 0.0722] : [1, 0, 0]).map((n) => n * brightness),
                  0,
                  0,
                  ...(grayscale ? [0.2126, 0.7152, 0.0722] : [0, 1, 0]).map((n) => n * brightness),
                  0,
                  0,
                  ...(grayscale ? [0.2126, 0.7152, 0.0722] : [0, 0, 1]).map((n) => n * brightness),
                  0,
                  0,
                  0,
                  0,
                  0,
                  1,
                  0,
                ]}
              />
            </Filter>
          </Defs>
          <SvgImage
            width="100%"
            height="100%"
            href={props.src ?? source}
            clipPath={'url(#' + filter + '-clip)'}
            testID={props.testID ? props.testID + '-svg-source' : undefined}
            onLoad={() => mark('filtered')}
            preserveAspectRatio={
              resizeMode === 'contain'
                ? 'xMidYMid meet'
                : resizeMode === 'stretch'
                  ? 'none'
                  : 'xMidYMid slice'
            }
            filter={'url(#' + filter + ')'}
          />
        </Svg>
      )}
    </>
  );
}
Object.assign(AvatarImage, { nativeRegistryImage: true, nativeRegistryMedia: true });
