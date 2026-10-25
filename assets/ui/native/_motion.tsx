import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  PanResponder,
  AccessibilityInfo,
  findNodeHandle,
  type ViewProps,
} from 'react-native';
import { Box, clamp, useControllable, useDirection, nativeComponent } from './_core';
import { Button, type ButtonProps } from './button';
import { useTheme } from '../theme';
import { useNativeField } from './_field-context';
export function Slider({
  value,
  defaultValue = [0],
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  minStepsBetweenThumbs = 0,
  accessibilityLabel,
  orientation = 'horizontal',
  style,
  onLayout,
  ...props
}: ViewProps & {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  minStepsBetweenThumbs?: number;
  orientation?: 'horizontal' | 'vertical';
}) {
  const lower = Number.isFinite(min) ? min : 0;
  const upper = Number.isFinite(max) && max > lower ? max : lower + 100;
  const increment = Number.isFinite(step) && step > 0 ? step : 1;
  const [values, set] = useControllable(value, defaultValue, onValueChange);
  const { colors } = useTheme();
  const field = useNativeField(),
    firstThumb = useRef<View | null>(null),
    control = useMemo(
      () => ({
        focus: () => {
          const handle = firstThumb.current && findNodeHandle(firstThumb.current);
          if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
        },
      }),
      [],
    );
  const target = field?.control,
    targets = field?.controls,
    id = props.nativeID;
  useLayoutEffect(() => {
    if (target) target.current = control;
    if (id) targets?.current.set(id, control);
    return () => {
      if (target?.current === control) target.current = null;
      if (id && targets?.current.get(id) === control) targets.current.delete(id);
    };
  }, [target, targets, id, control]);
  const label = accessibilityLabel ?? (field?.labelFor(id) || 'Value');
  const hint =
    props.accessibilityHint ?? [field?.description, field?.error].filter(Boolean).join('. ');
  const direction = useDirection();
  const gap =
    Math.max(0, Number.isFinite(minStepsBetweenThumbs) ? minStepsBetweenThumbs : 0) * increment;
  const numbers = values.length
    ? values.map((item) => clamp(item, lower, upper)).sort((a, b) => a - b)
    : [lower];
  if (gap * (numbers.length - 1) > upper - lower)
    throw new RangeError('Slider thumb spacing exceeds the available range.');
  const current: number[] = [];
  for (let index = 0; index < numbers.length; index++)
    current.push(
      clamp(
        numbers[index]!,
        index ? current[index - 1]! + gap : lower,
        upper - (numbers.length - index - 1) * gap,
      ),
    );
  const latest = useRef(current);
  latest.current = current;
  const extent = useRef(1);
  const active = useRef(0);
  const initial = useRef(lower);
  function update(index: number, next: number, commit = false) {
    const start = index === 0 ? lower : latest.current[index - 1]! + gap;
    const end = index === latest.current.length - 1 ? upper : latest.current[index + 1]! - gap;
    const rounded = Math.round((next - lower) / increment) * increment + lower;
    const result = latest.current.map((item, i) =>
      i === index ? Number(clamp(rounded, start, end).toFixed(10)) : item,
    );
    latest.current = result;
    set(result);
    if (commit) onValueCommit?.(result);
  }
  const config = useRef({ disabled, orientation, direction, lower, upper, update, onValueCommit });
  config.current = { disabled, orientation, direction, lower, upper, update, onValueCommit };
  const pan = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  if (!pan.current)
    pan.current = PanResponder.create({
      onStartShouldSetPanResponder: () => !config.current.disabled,
      onMoveShouldSetPanResponder: () => !config.current.disabled,
      onPanResponderGrant: (event) => {
        const current = config.current;
        const ratio = clamp(
          (current.orientation === 'vertical'
            ? event.nativeEvent.locationY
            : event.nativeEvent.locationX) / extent.current,
          0,
          1,
        );
        const reversed = current.orientation === 'vertical' || current.direction === 'rtl';
        const next =
          current.lower + (reversed ? 1 - ratio : ratio) * (current.upper - current.lower);
        active.current = latest.current.reduce(
          (best, item, index) =>
            Math.abs(item - next) < Math.abs(latest.current[best]! - next) ? index : best,
          0,
        );
        current.update(active.current, next);
        initial.current = latest.current[active.current]!;
      },
      onPanResponderMove: (_event, gesture) => {
        const current = config.current;
        const distance =
          current.orientation === 'vertical'
            ? -gesture.dy
            : gesture.dx * (current.direction === 'rtl' ? -1 : 1);
        current.update(
          active.current,
          initial.current + (distance / extent.current) * (current.upper - current.lower),
        );
      },
      onPanResponderRelease: () => config.current.onValueCommit?.(latest.current),
      onPanResponderTerminate: () => config.current.onValueCommit?.(latest.current),
    });
  const vertical = orientation === 'vertical';
  const position = (number: number) => ((number - lower) / (upper - lower)) * 100;
  const beginning = current.length > 1 ? position(current[0]!) : 0;
  const length = position(current[current.length - 1]!) - beginning;
  return (
    <View
      {...props}
      {...pan.current.panHandlers}
      onLayout={(event) => {
        extent.current = Math.max(1, event.nativeEvent.layout[vertical ? 'height' : 'width']);
        onLayout?.(event);
      }}
      style={[
        vertical
          ? { width: 44, height: 180, alignItems: 'center' }
          : { height: 44, justifyContent: 'center' },
        { opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <View
        style={[
          vertical ? { width: 4, height: '100%' } : { height: 4, width: '100%' },
          { borderRadius: 2, backgroundColor: colors.secondary },
        ]}
      >
        <View
          style={[
            { position: 'absolute', backgroundColor: colors.primary },
            vertical
              ? { bottom: `${beginning}%`, height: `${length}%`, width: 4 }
              : {
                  [direction === 'rtl' ? 'right' : 'left']: `${beginning}%`,
                  width: `${length}%`,
                  height: 4,
                },
          ]}
        />
      </View>
      {current.map((item, index) => (
        <View
          key={index}
          ref={index === 0 ? firstThumb : undefined}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={current.length === 1 ? label : `${label} ${index + 1}`}
          accessibilityState={{ disabled }}
          accessibilityHint={hint}
          accessibilityValue={{
            min: index ? current[index - 1]! + gap : lower,
            max: index < current.length - 1 ? current[index + 1]! - gap : upper,
            now: item,
          }}
          accessibilityActions={disabled ? [] : [{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            if (!disabled && ['increment', 'decrement'].includes(event.nativeEvent.actionName))
              update(
                index,
                item + (event.nativeEvent.actionName === 'increment' ? increment : -increment),
                true,
              );
          }}
          style={[
            {
              position: 'absolute',
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: colors.primary,
              backgroundColor: colors.background,
            },
            vertical
              ? { bottom: `${position(item)}%`, marginBottom: -11 }
              : {
                  [direction === 'rtl' ? 'right' : 'left']: `${position(item)}%`,
                  marginStart: -11,
                },
          ]}
        />
      ))}
    </View>
  );
}
export type NativePanelSize = number | `${number}%`;
export type Layout = Record<string, number>;
function panelPercent(value: NativePanelSize | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const numeric = typeof value === 'number' ? value : Number(value.slice(0, -1));
  if (
    (typeof value === 'string' && !/^(?:\d+(?:\.\d+)?)%$/.test(value)) ||
    !Number.isFinite(numeric) ||
    numeric < 0 ||
    numeric > 100
  )
    throw new RangeError('Native panel sizes must be percentages from 0 to 100.');
  return numeric;
}
type ResizeState = {
  sizes: number[];
  width: number;
  direction: 'horizontal' | 'vertical';
  resize: (index: number, delta: number) => void;
};
const ResizeContext = createContext<ResizeState | null>(null);
export function ResizablePanelGroup({
  direction: requestedDirection,
  orientation,
  onLayoutChange,
  onContainerLayout,
  onLayout: onSizes,
  children,
  style,
  ...props
}: Omit<ViewProps, 'onLayout'> & {
  direction?: 'horizontal' | 'vertical';
  orientation?: 'horizontal' | 'vertical';
  onLayoutChange?: (layout: Layout) => void;
  onContainerLayout?: ViewProps['onLayout'];
  onLayout?: (sizes: number[]) => void;
}) {
  const direction = orientation ?? requestedDirection ?? 'horizontal';
  const panels = Children.toArray(children).filter(
    (child) => isValidElement(child) && nativeComponent(child.type) === ResizablePanel,
  ) as React.ReactElement<{
    defaultSize?: NativePanelSize;
    minSize?: NativePanelSize;
    maxSize?: NativePanelSize;
    id?: string;
    nativeID?: string;
  }>[];
  const initial = panels.map((panel) =>
    panelPercent(panel.props.defaultSize, 100 / Math.max(1, panels.length)),
  );
  const total = initial.reduce((sum, item) => sum + item, 0) || 100;
  const [sizes, set] = useState(initial.map((item) => (item / total) * 100));
  const [width, setWidth] = useState(1);
  const liveSizes = useRef(sizes);
  liveSizes.current = sizes;
  const layoutOf = (values: number[]): Layout =>
    Object.fromEntries(
      values.map((size, index) => [
        panels[index]?.props.nativeID ?? panels[index]?.props.id ?? String(index),
        size,
      ]),
    );
  const layoutCallback = useRef(onLayoutChange);
  layoutCallback.current = onLayoutChange;
  const layoutKey = JSON.stringify(layoutOf(sizes));
  useEffect(() => {
    layoutCallback.current?.(JSON.parse(layoutKey) as Layout);
  }, [layoutKey]);
  const resize = (index: number, delta: number) => {
    if (!panels[index + 1]) return;
    const before = liveSizes.current;
    const available = before[index]! + before[index + 1]!;
    const min = Math.max(
      panelPercent(panels[index]!.props.minSize, 10),
      available - panelPercent(panels[index + 1]!.props.maxSize, 100),
    );
    const max = Math.min(
      panelPercent(panels[index]!.props.maxSize, 100),
      available - panelPercent(panels[index + 1]!.props.minSize, 10),
    );
    if (min > max) return;
    const next = [...before];
    next[index] = clamp(before[index]! + delta, min, max);
    next[index + 1] = available - next[index];
    liveSizes.current = next;
    set(next);
    onSizes?.(next);
  };
  let index = -1;
  return (
    <ResizeContext.Provider value={{ sizes, width, direction, resize }}>
      <View
        {...props}
        onLayout={(event) => {
          onContainerLayout?.(event);
          setWidth(
            Math.max(
              1,
              event.nativeEvent.layout[direction === 'horizontal' ? 'width' : 'height'] -
                Math.max(0, panels.length - 1) * 24,
            ),
          );
        }}
        style={[
          { flexDirection: direction === 'horizontal' ? 'row' : 'column', minHeight: 120 },
          style,
        ]}
      >
        {Children.map(children, (child) => {
          if (!isValidElement<{ panelIndex?: number }>(child)) return child;
          if (
            nativeComponent(child.type) !== ResizablePanel &&
            nativeComponent(child.type) !== ResizableHandle
          )
            return child;
          if (nativeComponent(child.type) === ResizablePanel) index++;
          return cloneElement(child, { panelIndex: Math.max(0, index) });
        })}
      </View>
    </ResizeContext.Provider>
  );
}
export function ResizablePanel({
  defaultSize: _default,
  minSize: _min,
  maxSize: _max,
  panelIndex = 0,
  style,
  ...props
}: ViewProps & {
  defaultSize?: NativePanelSize;
  minSize?: NativePanelSize;
  maxSize?: NativePanelSize;
  panelIndex?: number;
  id?: string;
}) {
  const state = useContext(ResizeContext);
  if (!state) throw Error('ResizablePanel requires ResizablePanelGroup.');
  return (
    <Box
      {...props}
      style={[
        { flex: state.sizes[panelIndex], minWidth: 0, minHeight: 0, overflow: 'hidden' },
        style,
      ]}
    />
  );
}
export function ResizableHandle({
  withHandle = false,
  panelIndex = 0,
  accessibilityLabel = 'Resize panels',
}: {
  panelIndex?: number;
  accessibilityLabel?: string;
  withHandle?: boolean;
}) {
  const state = useContext(ResizeContext);
  const previous = useRef(0);
  const liveState = useRef(state);
  liveState.current = state;
  const pan = useRef<ReturnType<typeof PanResponder.create> | null>(null);
  const { colors } = useTheme();
  if (!state) throw Error('ResizableHandle requires ResizablePanelGroup.');
  if (!pan.current)
    pan.current = PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        previous.current = 0;
      },
      onPanResponderMove: (_event, gesture) => {
        const current = liveState.current;
        if (!current) return;
        const distance = current.direction === 'horizontal' ? gesture.dx : gesture.dy;
        current.resize(panelIndex, ((distance - previous.current) / current.width) * 100);
        previous.current = distance;
      },
    });
  return (
    <View
      {...pan.current.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: state.sizes[panelIndex] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (['increment', 'decrement'].includes(event.nativeEvent.actionName))
          state.resize(panelIndex, event.nativeEvent.actionName === 'increment' ? 5 : -5);
      }}
      style={
        state.direction === 'horizontal'
          ? { width: 24, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' }
          : { height: 24, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' }
      }
    >
      {withHandle && (
        <View
          testID="resize-grip"
          style={{
            width: state.direction === 'horizontal' ? 4 : 28,
            height: state.direction === 'horizontal' ? 28 : 4,
            borderRadius: 2,
            backgroundColor: colors.border,
          }}
        />
      )}
    </View>
  );
}
export type NativeCarouselApi = {
  selectedScrollSnap: () => number;
  scrollSnapList: () => number[];
  canScrollNext: () => boolean;
  canScrollPrev: () => boolean;
  scrollNext: () => void;
  scrollPrev: () => void;
  scrollTo: (index: number) => void;
  on: (event: 'select' | 'reInit', listener: (api: NativeCarouselApi) => void) => NativeCarouselApi;
  off: (
    event: 'select' | 'reInit',
    listener: (api: NativeCarouselApi) => void,
  ) => NativeCarouselApi;
};
export type CarouselApi = NativeCarouselApi | undefined;
type CarouselState = {
  index: number;
  count: number;
  setCount: (count: number) => void;
  size: number;
  setSize: (size: number) => void;
  offsets: number[];
  setItemSize: (index: number, size: number) => void;
  move: (index: number) => void;
  selected: (index: number) => void;
  loop: boolean;
  orientation: 'horizontal' | 'vertical';
  scroll: React.RefObject<ScrollView | null>;
};
const CarouselContext = createContext<CarouselState | null>(null);
export function useCarousel() {
  const value = useContext(CarouselContext);
  if (!value) throw Error('Carousel parts require Carousel.');
  return value;
}
export function Carousel({
  index,
  defaultIndex = 0,
  onIndexChange,
  setApi,
  opts,
  loop = opts?.loop ?? false,
  orientation = 'horizontal',
  ...props
}: ViewProps & {
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  setApi?: (api: NativeCarouselApi) => void;
  loop?: boolean;
  opts?: { align?: 'start'; loop?: boolean };
  orientation?: 'horizontal' | 'vertical';
}) {
  if (opts?.align && opts.align !== 'start') throw Error('Unreviewed native carousel alignment.');
  const [selected, set] = useControllable(index, defaultIndex, onIndexChange);
  const [items, setCount] = useState(0),
    [size, setSize] = useState(1),
    [itemSizes, setItemSizes] = useState<Record<number, number>>({});
  const scroll = useRef<ScrollView>(null);
  let total = 0;
  const starts: number[] = [];
  for (let item = 0; item < items; item++) {
    starts.push(total);
    total += itemSizes[item] ?? size;
  }
  const maximum = Math.max(0, total - size),
    offsets = [...new Set(starts.map((start) => Math.min(maximum, start)))];
  const count = offsets.length,
    current = clamp(selected, 0, Math.max(0, count - 1));
  const live = useRef({ index: current, count, offsets, maximum, loop, orientation, set });
  live.current = { index: current, count, offsets, maximum, loop, orientation, set };
  function move(next: number) {
    const state = live.current;
    if (!state.count) return;
    const target = state.loop
      ? ((next % state.count) + state.count) % state.count
      : clamp(next, 0, state.count - 1);
    state.set(target);
    scroll.current?.scrollTo({
      [state.orientation === 'horizontal' ? 'x' : 'y']: state.offsets[target] ?? 0,
      animated: false,
    });
  }
  const listeners = useRef({
    select: new Set<(api: NativeCarouselApi) => void>(),
    reInit: new Set<(api: NativeCarouselApi) => void>(),
  });
  const apiRef = useRef<NativeCarouselApi | null>(null);
  const api: NativeCarouselApi = apiRef.current ?? {
    selectedScrollSnap: () => live.current.index,
    scrollSnapList: () =>
      live.current.offsets.map((offset) => offset / Math.max(1, live.current.maximum)),
    canScrollNext: () =>
      live.current.count > 0 && (live.current.loop || live.current.index < live.current.count - 1),
    canScrollPrev: () => live.current.count > 0 && (live.current.loop || live.current.index > 0),
    scrollNext: () => move(live.current.index + 1),
    scrollPrev: () => move(live.current.index - 1),
    scrollTo: move,
    on: (event, listener) => {
      listeners.current[event].add(listener);
      return api;
    },
    off: (event, listener) => {
      listeners.current[event].delete(listener);
      return api;
    },
  };
  apiRef.current = api;
  useEffect(() => {
    if (count > 0) setApi?.(api);
  }, [count > 0, setApi, api]);
  useEffect(() => {
    for (const listener of listeners.current.select) listener(api);
  }, [current, api]);
  const geometry = offsets.join(',');
  useEffect(() => {
    for (const listener of listeners.current.reInit) listener(api);
  }, [geometry, api]);
  useEffect(
    () => () => {
      listeners.current.select.clear();
      listeners.current.reInit.clear();
    },
    [],
  );
  useEffect(() => {
    if (count > 0 && selected !== current) set(current);
    if (size > 1)
      scroll.current?.scrollTo({
        [orientation === 'horizontal' ? 'x' : 'y']: offsets[current] ?? 0,
        animated: false,
      });
  }, [current, selected, count, size, geometry, orientation]);
  const setItemSize = (index: number, value: number) =>
    setItemSizes((previous) =>
      previous[index] === value ? previous : { ...previous, [index]: value },
    );
  return (
    <CarouselContext.Provider
      value={{
        index: current,
        count,
        setCount,
        size,
        setSize,
        offsets,
        setItemSize,
        move,
        selected: (next) => set(clamp(next, 0, Math.max(0, count - 1))),
        loop,
        orientation,
        scroll,
      }}
    >
      <Box accessibilityLabel="Carousel" {...props} />
    </CarouselContext.Provider>
  );
}
export function CarouselContent({
  children,
  style,
  onLayout,
  onMomentumScrollEnd,
  ...props
}: React.ComponentProps<typeof ScrollView>) {
  const carousel = useCarousel(),
    count = Children.count(children);
  useEffect(() => carousel.setCount(count), [count, carousel.setCount]);
  return (
    <ScrollView
      {...props}
      ref={carousel.scroll}
      horizontal={carousel.orientation === 'horizontal'}
      snapToOffsets={carousel.offsets}
      decelerationRate="fast"
      onLayout={(event) => {
        onLayout?.(event);
        carousel.setSize(
          Math.max(
            1,
            event.nativeEvent.layout[carousel.orientation === 'horizontal' ? 'width' : 'height'],
          ),
        );
      }}
      onMomentumScrollEnd={(event) => {
        onMomentumScrollEnd?.(event);
        const offset =
          event.nativeEvent.contentOffset[carousel.orientation === 'horizontal' ? 'x' : 'y'];
        const closest = carousel.offsets.reduce(
          (best, value, index) =>
            Math.abs(value - offset) < Math.abs(carousel.offsets[best]! - offset) ? index : best,
          0,
        );
        carousel.selected(closest);
      }}
      showsHorizontalScrollIndicator={false}
      style={[{ flexGrow: 0 }, style]}
    >
      {Children.map(children, (child, index) =>
        isValidElement<{ carouselIndex?: number }>(child) &&
        nativeComponent(child.type) === CarouselItem
          ? cloneElement(child, { carouselIndex: index })
          : child,
      )}
    </ScrollView>
  );
}
export function CarouselItem({
  style,
  carouselIndex = 0,
  onLayout,
  ...props
}: ViewProps & { carouselIndex?: number }) {
  const carousel = useCarousel(),
    inline = StyleSheet.flatten(style) ?? {};
  const axis = carousel.orientation === 'horizontal' ? 'width' : 'height',
    basis = inline.flexBasis;
  const fraction =
    typeof basis === 'string' && /^\d+(?:\.\d+)?%$/.test(basis)
      ? parseFloat(basis) / 100
      : undefined;
  const authored = inline[axis];
  const extent =
    typeof authored === 'number'
      ? authored
      : typeof basis === 'number'
        ? basis
        : carousel.size * (fraction ?? 1);
  const { flexBasis: _basis, ...rest } = inline;
  useEffect(() => carousel.setItemSize(carouselIndex, extent), [carouselIndex, extent]);
  return (
    <Box
      {...props}
      onLayout={(event) => {
        onLayout?.(event);
        const measured = event.nativeEvent.layout[axis];
        if (measured > 0) carousel.setItemSize(carouselIndex, measured);
      }}
      style={[{ [axis]: extent, flexShrink: 0 }, rest]}
    />
  );
}
export function CarouselPrevious({
  children = 'Previous',
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const carousel = useCarousel();
  return (
    <Button
      nativePreset={false}
      accessibilityLabel="Previous slide"
      {...props}
      disabled={!carousel.count || (!carousel.loop && carousel.index <= 0) || props.disabled}
      onPress={() => carousel.move(carousel.index - 1)}
    >
      {children}
    </Button>
  );
}
export function CarouselNext({
  children = 'Next',
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const carousel = useCarousel();
  return (
    <Button
      nativePreset={false}
      accessibilityLabel="Next slide"
      {...props}
      disabled={
        !carousel.count ||
        (!carousel.loop && carousel.index >= carousel.count - 1) ||
        props.disabled
      }
      onPress={() => carousel.move(carousel.index + 1)}
    >
      {children}
    </Button>
  );
}
