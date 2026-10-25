import {
  Children,
  Fragment,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useState,
  useEffect,
  useId,
  type ReactNode,
  type ReactElement,
} from 'react';
import { View, type ViewProps, type TextStyle } from 'react-native';
import Svg, {
  Path,
  Line as SvgLine,
  Circle,
  Text as SvgText,
  Rect,
  G,
  Polygon,
  Defs,
  TextPath,
  TSpan as SvgTSpan,
  type TSpanProps,
  type TextProps as SvgTextProps,
} from 'react-native-svg';
import { line as linePath, area as areaPath } from 'd3-shape';
import { Box, useControllable, nativeComponent, NativeTextStyleContext, withAlpha } from './_core';
import { useNativeFontStyle, type NativeFontRole } from './fonts';
import { useTheme } from '../theme';
import { RegistryPaintContext } from './registry-styles';
import { ChartTooltip, ChartLegend } from './chart';
import { ChartContext, ChartDataContext, type ChartPayload } from './_chart-context';
import {
  cartesianFrame,
  datum,
  numeric,
  percent,
  curve,
  roundedRectangle,
  sectorPath,
  polarTextPath,
  type ChartRow,
  type DataKey,
  type SeriesKind,
  type SeriesSpec,
} from './_chart-math';
export type { ChartRow, DataKey } from './_chart-math';
export { Defs, LinearGradient, Stop, ClipPath } from 'react-native-svg';
type Point = {
  x: number;
  y: number;
  cx: number;
  cy: number;
  value: number;
  index: number;
  payload: ChartRow;
  low: number;
  high: number;
  width: number;
  height: number;
  polar?: { inner: number; outer: number; start: number; end: number };
};
export type BarShapeProps = Point & {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number | readonly number[];
};
export type PieSectorDataItem = {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  percent: number;
  value: number;
  index: number;
  payload: ChartRow;
  fill?: string;
};
export type PieSectorShapeProps = PieSectorDataItem;
type ShapeStyle = {
  fill?: string;
  stroke?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  strokeDasharray?: string | number;
  strokeDashoffset?: number;
};
type Decoration<T> = boolean | Partial<T> | ReactElement | ((props: T) => ReactNode);
type CommonSeries = ShapeStyle & {
  layout?: 'horizontal' | 'vertical' | 'radial';
  children?: ReactNode;
  dataKey: DataKey;
  stackId?: string | number;
  name?: string;
  data?: readonly ChartRow[];
  _index?: number;
  onPress?: (point: ChartRow, index: number) => void;
};
type CartesianSeriesProps = CommonSeries & {
  type?:
    | 'monotone'
    | 'monotoneX'
    | 'monotoneY'
    | 'natural'
    | 'linear'
    | 'step'
    | 'stepBefore'
    | 'stepAfter';
  dot?: Decoration<Point & ShapeStyle & { r: number }>;
  activeDot?: Decoration<Point & ShapeStyle & { r: number }>;
  radius?: number | readonly number[];
  activeBar?: Decoration<BarShapeProps>;
  activeIndex?: number;
  shape?: Decoration<BarShapeProps>;
  barSize?: number;
  connectNulls?: boolean;
};
type PolarSeriesProps = CommonSeries & {
  nameKey?: DataKey;
  cx?: number | string;
  cy?: number | string;
  innerRadius?: number | string;
  outerRadius?: number | string;
  startAngle?: number;
  endAngle?: number;
  cornerRadius?: number;
  paddingAngle?: number;
  label?:
    | boolean
    | ((
        props: PieSectorShapeProps & {
          x: number;
          y: number;
          textAnchor: 'middle';
          dominantBaseline: 'central';
        },
      ) => ReactNode);
  labelLine?: boolean;
  shape?: Decoration<PieSectorShapeProps>;
  activeShape?: Decoration<PieSectorShapeProps>;
  activeIndex?: number;
  background?: boolean;
  dot?: Decoration<Point & ShapeStyle & { r: number }>;
};
type AxisProps = {
  children?: ReactNode;
  dataKey?: DataKey;
  hide?: boolean;
  type?: 'category' | 'number';
  tickLine?: boolean;
  axisLine?: boolean;
  tickMargin?: number;
  tickCount?: number;
  tickFormatter?: (value: unknown, index: number) => ReactNode;
  tick?:
    | boolean
    | ((props: {
        x: number;
        y: number;
        index: number;
        value: unknown;
        textAnchor: 'middle' | 'start' | 'end';
        payload: { value: unknown; index: number };
      }) => ReactNode);
  minTickGap?: number;
  stroke?: string;
  angle?: number;
  orientation?: string;
};
type Frame = {
  kind: SeriesKind;
  rows: readonly ChartRow[];
  specs: SeriesSpec[];
  elements: ReactElement<CommonSeries>[];
  width: number;
  height: number;
  cart: ReturnType<typeof cartesianFrame>;
  active: number;
  activeSeries: number;
  select: (index: number, series?: number) => void;
  color: (value: string | undefined, index?: number) => string;
  cx: number;
  cy: number;
  inner: number;
  outer: number;
  start: number;
  end: number;
  categoryKey?: DataKey;
};
const FrameContext = createContext<Frame | null>(null),
  GeometryContext = createContext<{ points: Point[]; viewBox?: PieSectorDataItem }>({ points: [] });
function useFrame() {
  const value = useContext(FrameContext);
  if (!value) throw Error('Native chart primitives require a chart canvas.');
  return value;
}
function flatChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && nativeComponent(child.type) === Fragment
      ? flatChildren(child.props.children)
      : [child],
  );
}
function seriesKind(type: unknown): SeriesKind | undefined {
  type = nativeComponent(type);
  return type === Line
    ? 'line'
    : type === Area
      ? 'area'
      : type === Bar
        ? 'bar'
        : type === Pie
          ? 'pie'
          : type === Radar
            ? 'radar'
            : type === RadialBar
              ? 'radial'
              : undefined;
}
function shape<T extends object>(
  value: Decoration<T> | undefined,
  props: T,
  fallback: (props: T) => ReactNode,
): ReactNode {
  return typeof value === 'function'
    ? value(props)
    : isValidElement(value)
      ? cloneElement(value as ReactElement<T>, { ...props, key: value.key })
      : value === false
        ? null
        : fallback(typeof value === 'object' && value ? { ...props, ...value } : props);
}
type CanvasProps = Omit<ViewProps, 'onPress'> & {
  data?: readonly ChartRow[];
  width?: number;
  height?: number;
  children?: ReactNode;
  margin?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
  layout?: 'horizontal' | 'vertical';
  stackOffset?: 'none' | 'expand';
  accessibilityLayer?: boolean;
  value?: number;
  defaultValue?: number;
  onValueChange?: (index: number) => void;
  startAngle?: number;
  endAngle?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
};
function Canvas({
  kind,
  data = [],
  width: requestedWidth,
  height: requestedHeight,
  margin,
  layout = 'horizontal',
  stackOffset,
  accessibilityLayer = true,
  value,
  defaultValue,
  onValueChange,
  innerRadius,
  outerRadius,
  startAngle = 0,
  endAngle = 360,
  children,
  onLayout,
  ...props
}: CanvasProps & { kind: SeriesKind }) {
  const container = useContext(ChartContext),
    { colors } = useTheme(),
    [measuredWidth, setWidth] = useState(320),
    nodes = flatChildren(children);
  const hasLegend = nodes.some(
    (node) => isValidElement(node) && nativeComponent(node.type) === ChartLegend,
  );
  const [legendHeight, setLegendHeight] = useState(hasLegend ? 40 : 0);
  const width = Math.max(44, numeric(requestedWidth ?? container?.width ?? measuredWidth) || 320),
    height = Math.max(
      44,
      (numeric(requestedHeight ?? container?.height ?? 200) || 200) - legendHeight,
    );
  const tooltip = nodes.find(
    (node) => isValidElement(node) && nativeComponent(node.type) === ChartTooltip,
  ) as ReactElement<{ defaultIndex?: number; cursor?: boolean }> | undefined;
  const [selected, setSelected] = useControllable(
    value,
    defaultValue ?? tooltip?.props.defaultIndex ?? -1,
    onValueChange,
  );
  const tooltipIndex = tooltip?.props.defaultIndex;
  useEffect(() => {
    if (value === undefined && tooltipIndex !== undefined) setSelected(tooltipIndex);
  }, [tooltipIndex, value]);
  const [activeSeries, setActiveSeries] = useState(0);
  const elements = nodes.filter(
    (node) => isValidElement(node) && seriesKind(node.type),
  ) as ReactElement<CommonSeries>[];
  const selectedSeries = Math.min(activeSeries, Math.max(0, elements.length - 1));
  const initialRows = data.length
    ? data
    : (elements.find((element) => element.props.data?.length)?.props.data ?? []);
  const rows = kind === 'pie' ? (elements[selectedSeries]?.props.data ?? initialRows) : initialRows;
  const specs = elements.map((element) => ({
    kind: seriesKind(element.type)!,
    dataKey: element.props.dataKey,
    stackId: element.props.stackId,
  }));
  const xAxis = nodes.find(
      (node) => isValidElement(node) && nativeComponent(node.type) === XAxis,
    ) as ReactElement<AxisProps> | undefined,
    yAxis = nodes.find((node) => isValidElement(node) && nativeComponent(node.type) === YAxis) as
      ReactElement<AxisProps> | undefined;
  const cart = cartesianFrame(rows, specs, width, height, {
    kind: kind === 'line' ? 'line' : kind === 'area' ? 'area' : 'bar',
    vertical: layout === 'vertical',
    margin,
    xAxis: !!xAxis && !xAxis.props.hide,
    yAxis: !!yAxis && !yAxis.props.hide,
    expand: stackOffset === 'expand',
  });
  const radius = Math.min(width, height) / 2 - 5;
  const fallbackKey = ['month', 'browser', 'name', 'label'].find(
    (key) => typeof rows[0]?.[key] === 'string',
  );
  const categoryKey =
    (layout === 'vertical' ? yAxis?.props.dataKey : xAxis?.props.dataKey) ??
    (
      nodes.find(
        (node) => isValidElement(node) && nativeComponent(node.type) === PolarAngleAxis,
      ) as ReactElement<AxisProps> | undefined
    )?.props.dataKey ??
    fallbackKey;
  const active = elements.find(
    (element) => typeof (element.props as PolarSeriesProps).activeIndex === 'number',
  )?.props as PolarSeriesProps | undefined;
  const activeIndex = active?.activeIndex ?? selected;
  const color = (input: string | undefined, index = 0) =>
    container?.resolveColor(
      input,
      colors[`chart-${(index % 5) + 1}`] ?? colors.primary ?? colors.foreground,
    ) ??
    input ??
    colors[`chart-${(index % 5) + 1}`] ??
    colors.primary ??
    colors.foreground;
  const frame: Frame = {
    kind,
    rows,
    specs,
    elements,
    width,
    height,
    cart,
    active: activeIndex,
    activeSeries: selectedSeries,
    select: (index, series = selectedSeries) => {
      setActiveSeries(series);
      setSelected(index);
    },
    color,
    cx: width / 2,
    cy: height / 2,
    inner: Math.max(0, percent(innerRadius, radius, 0)),
    outer: Math.max(0, percent(outerRadius, radius, radius * 0.8)),
    start: startAngle,
    end: endAngle,
    categoryKey,
  };
  const entry = rows[activeIndex],
    polar = kind === 'pie' || kind === 'radial';
  const payload: ChartPayload[] = entry
    ? elements
        .filter((_, index) => kind !== 'pie' || index === selectedSeries)
        .map((element) => {
          const index = elements.indexOf(element);
          const point = element.props.data?.[activeIndex] ?? entry;
          const name = polar
            ? datum(point, (element.props as PolarSeriesProps).nameKey ?? categoryKey)
            : (element.props.name ??
              (typeof element.props.dataKey === 'string' ? element.props.dataKey : 'value'));
          return {
            name: typeof name === 'string' || typeof name === 'number' ? name : String(activeIndex),
            dataKey: typeof element.props.dataKey === 'string' ? element.props.dataKey : 'value',
            value: datum(point, element.props.dataKey) as ChartPayload['value'],
            color: color(
              typeof point.fill === 'string'
                ? point.fill
                : (element.props.fill ?? element.props.stroke),
              index,
            ),
            payload: point,
          };
        })
    : [];
  const legend: ChartPayload[] =
    kind === 'pie' && elements[0]
      ? rows.map((row, index) => ({
          dataKey:
            typeof (elements[0]!.props as PolarSeriesProps).nameKey === 'string'
              ? String((elements[0]!.props as PolarSeriesProps).nameKey)
              : (categoryKey as string),
          value: String(
            datum(row, (elements[0]!.props as PolarSeriesProps).nameKey ?? categoryKey) ?? index,
          ),
          payload: row,
          color: color(typeof row.fill === 'string' ? row.fill : elements[0]!.props.fill, index),
        }))
      : elements.map((element, index) => ({
          dataKey: typeof element.props.dataKey === 'string' ? element.props.dataKey : 'value',
          value: element.props.name ?? String(element.props.dataKey),
          color: color(element.props.stroke ?? element.props.fill, index),
        }));
  const label = entry ? datum(entry, categoryKey) : undefined;
  const accessibleValue = entry
    ? [
        String(label ?? activeIndex),
        ...payload.map((point) => `${point.name}: ${point.value}`),
      ].join('. ')
    : `${rows.length} data points`;
  return (
    <FrameContext.Provider value={frame}>
      <ChartDataContext.Provider
        value={{
          active: !!entry,
          payload,
          label: typeof label === 'string' || typeof label === 'number' ? label : undefined,
          legend,
        }}
      >
        <Box
          {...props}
          onLayout={(event) => {
            setWidth(event.nativeEvent.layout.width || 320);
            onLayout?.(event);
          }}
        >
          <View
            accessible={accessibilityLayer}
            accessibilityRole="adjustable"
            accessibilityLabel={props.accessibilityLabel ?? 'Chart data'}
            accessibilityValue={{
              min: 0,
              max: Math.max(0, rows.length - 1),
              now: Math.max(0, Math.min(rows.length - 1, activeIndex)),
              text: accessibleValue,
            }}
            accessibilityActions={[
              { name: 'increment', label: 'Next data point' },
              { name: 'decrement', label: 'Previous data point' },
            ]}
            onAccessibilityAction={(event) =>
              setSelected(
                Math.max(
                  0,
                  Math.min(
                    rows.length - 1,
                    activeIndex + (event.nativeEvent.actionName === 'decrement' ? -1 : 1),
                  ),
                ),
              )
            }
          >
            <Svg
              width={width}
              height={height}
              color={colors.foreground}
              testID={props.testID ? props.testID + '-svg' : undefined}
              onPress={(event) => {
                if ((kind === 'bar' || kind === 'line' || kind === 'area') && rows.length) {
                  const coordinate =
                    layout === 'vertical'
                      ? event.nativeEvent.locationY
                      : event.nativeEvent.locationX;
                  let nearest = 0;
                  for (let i = 1; i < rows.length; i++)
                    if (
                      Math.abs(cart.category(i) - coordinate) <
                      Math.abs(cart.category(nearest) - coordinate)
                    )
                      nearest = i;
                  setSelected(nearest);
                }
              }}
              accessibilityElementsHidden
            >
              {activeIndex >= 0 &&
                activeIndex < rows.length &&
                tooltip?.props.cursor !== false &&
                (kind === 'bar' ? (
                  <Rect
                    x={cart.vertical ? cart.plot.left : cart.category(activeIndex) - cart.band / 2}
                    y={cart.vertical ? cart.category(activeIndex) - cart.band / 2 : cart.plot.top}
                    width={cart.vertical ? cart.plot.width : cart.band}
                    height={cart.vertical ? cart.band : cart.plot.height}
                    fill={colors.muted}
                  />
                ) : kind === 'line' || kind === 'area' ? (
                  <SvgLine
                    testID="chart-tooltip-cursor"
                    x1={cart.vertical ? cart.plot.left : cart.category(activeIndex)}
                    x2={cart.vertical ? cart.plot.right : cart.category(activeIndex)}
                    y1={cart.vertical ? cart.category(activeIndex) : cart.plot.top}
                    y2={cart.vertical ? cart.category(activeIndex) : cart.plot.bottom}
                    stroke={colors.border}
                  />
                ) : null)}
              {nodes
                .filter(
                  (node) =>
                    !isValidElement(node) ||
                    (nativeComponent(node.type) !== ChartTooltip &&
                      nativeComponent(node.type) !== ChartLegend),
                )
                .map((node, index) =>
                  isValidElement(node) && seriesKind(node.type)
                    ? cloneElement(node as ReactElement<CommonSeries>, {
                        _index: elements.indexOf(node as ReactElement<CommonSeries>),
                        key: node.key ?? index,
                      })
                    : node,
                )}
            </Svg>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: 8, top: 8, zIndex: 1 }}>
            {nodes.filter(
              (node) => isValidElement(node) && nativeComponent(node.type) === ChartTooltip,
            )}
          </View>
          {hasLegend && (
            <View onLayout={(event) => setLegendHeight(event.nativeEvent.layout.height)}>
              {nodes.filter(
                (node) => isValidElement(node) && nativeComponent(node.type) === ChartLegend,
              )}
            </View>
          )}
        </Box>
      </ChartDataContext.Provider>
    </FrameContext.Provider>
  );
}
export const AreaChart = (props: CanvasProps) => <Canvas {...props} kind="area" />;
export const LineChart = (props: CanvasProps) => <Canvas {...props} kind="line" />;
export const BarChart = (props: CanvasProps) => <Canvas {...props} kind="bar" />;
export const PieChart = (props: CanvasProps) => <Canvas {...props} kind="pie" />;
export const RadarChart = (props: CanvasProps) => <Canvas {...props} kind="radar" />;
export const RadialBarChart = (props: CanvasProps) => <Canvas {...props} kind="radial" />;
function pointsFor(frame: Frame, index: number, props: CommonSeries): Point[] {
  return frame.rows.map((payload, pointIndex) => {
    const [low, high] = frame.cart.intervals[index]?.[pointIndex] ?? [0, 0],
      category = frame.cart.category(pointIndex),
      value = numeric(datum(payload, props.dataKey));
    const x = frame.cart.vertical ? frame.cart.scale(high) : category,
      y = frame.cart.vertical ? category : frame.cart.scale(high);
    return {
      x,
      y,
      cx: x,
      cy: y,
      value,
      index: pointIndex,
      payload,
      low,
      high,
      width: 0,
      height: 0,
    };
  });
}
export function Rectangle({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  radius = 0,
  fill,
  fillOpacity,
  stroke,
  strokeWidth,
  strokeDasharray,
  strokeDashoffset,
  onPress,
  testID,
}: Partial<BarShapeProps> & ShapeStyle & { onPress?: () => void; testID?: string }) {
  const frame = useFrame();
  return (
    <Path
      testID={testID}
      d={roundedRectangle(x, y, width, height, radius)}
      fill={frame.color(fill)}
      fillOpacity={fillOpacity}
      stroke={stroke ? frame.color(stroke) : undefined}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      strokeDashoffset={strokeDashoffset}
      onPress={onPress}
    />
  );
}
export function Dot({
  cx = 0,
  cy = 0,
  r = 3,
  fill,
  stroke,
  strokeWidth,
  onPress,
  testID,
}: Partial<Point> & ShapeStyle & { r?: number; onPress?: () => void; testID?: string }) {
  const frame = useFrame();
  return (
    <Circle
      testID={testID}
      cx={cx}
      cy={cy}
      r={r}
      fill={frame.color(fill)}
      stroke={stroke === '#fff' ? 'transparent' : stroke ? frame.color(stroke) : undefined}
      strokeWidth={strokeWidth}
      onPress={onPress}
    />
  );
}
export function Bar(props: CartesianSeriesProps) {
  const frame = useFrame(),
    index = props._index ?? 0,
    key = props.stackId === undefined ? 'single-' + index : 'stack-' + props.stackId,
    group = Math.max(0, frame.cart.groups.indexOf(key)),
    band = (frame.cart.band * 0.8) / Math.max(1, frame.cart.groups.length),
    size = props.barSize ?? Math.max(1, band - 4),
    points = pointsFor(frame, index, props).map((point) => {
      const a = frame.cart.scale(point.low),
        b = frame.cart.scale(point.high),
        category = frame.cart.category(point.index) - frame.cart.band * 0.4 + group * band + 2;
      return {
        ...point,
        x: frame.cart.vertical ? Math.min(a, b) : category,
        y: frame.cart.vertical ? category : Math.min(a, b),
        width: frame.cart.vertical ? Math.abs(a - b) : size,
        height: frame.cart.vertical ? size : Math.abs(a - b),
      };
    });
  const cells = flatChildren(props.children).filter(
    (node) => isValidElement(node) && nativeComponent(node.type) === Cell,
  ) as ReactElement<ShapeStyle>[];
  return (
    <GeometryContext.Provider value={{ points }}>
      {points.map((point) => {
        const fill = frame.color(
            cells[point.index]?.props.fill ??
              props.fill ??
              (typeof point.payload.fill === 'string' ? point.payload.fill : undefined),
            index,
          ),
          geometry: BarShapeProps = {
            ...point,
            fill,
            stroke: props.stroke,
            strokeWidth: props.strokeWidth,
            radius: props.radius,
          };
        const fallback = (next: BarShapeProps = geometry) => (
          <Rectangle {...next} testID={`chart-bar-${index}-${point.index}`} />
        );
        return (
          <G
            key={point.index}
            onPress={() => {
              frame.select(point.index);
              props.onPress?.(point.payload, point.index);
            }}
          >
            {shape(
              point.index === (props.activeIndex ?? frame.active)
                ? (props.activeBar ?? props.shape)
                : props.shape,
              geometry,
              fallback,
            )}
          </G>
        );
      })}
      {props.children}
    </GeometryContext.Provider>
  );
}
function CartesianCurve(props: CartesianSeriesProps & { area: boolean }) {
  const frame = useFrame(),
    index = props._index ?? 0,
    points = pointsFor(frame, index, props),
    defined = (point: Point) => props.connectNulls || datum(point.payload, props.dataKey) != null;
  const values = props.connectNulls
    ? points.filter((point) => datum(point.payload, props.dataKey) != null)
    : points;
  const path = props.area
    ? (frame.cart.vertical
        ? areaPath<Point>()
            .defined(defined)
            .y((point) => point.y)
            .x0((point) => frame.cart.scale(point.low))
            .x1((point) => point.x)
        : areaPath<Point>()
            .defined(defined)
            .x((point) => point.x)
            .y0((point) => frame.cart.scale(point.low))
            .y1((point) => point.y)
      ).curve(curve(props.type, frame.cart.vertical))(values)
    : linePath<Point>()
        .defined(defined)
        .x((point) => point.x)
        .y((point) => point.y)
        .curve(curve(props.type, frame.cart.vertical))(values);
  const stroke = frame.color(props.stroke ?? props.fill, index);
  return (
    <GeometryContext.Provider value={{ points }}>
      <Path
        testID={`chart-${props.area ? 'area' : 'line'}-${index}`}
        d={path ?? ''}
        fill={props.area ? frame.color(props.fill, index) : 'none'}
        fillOpacity={props.fillOpacity ?? (props.area ? 0.4 : 1)}
        stroke={stroke}
        strokeWidth={props.strokeWidth ?? 2}
      />
      {points
        .filter((point) => datum(point.payload, props.dataKey) != null)
        .map((point) => {
          const selected = frame.active === point.index,
            decoration = selected
              ? props.activeDot
              : props.dot === undefined
                ? !props.area
                : props.dot;
          const visual = { ...point, fill: stroke, stroke: stroke, r: selected ? 5 : 3 };
          const override =
            typeof decoration === 'object' && !isValidElement(decoration) ? decoration : {};
          return (
            <G key={point.index}>
              {shape(decoration, { ...visual, ...override }, () => (
                <Dot
                  {...visual}
                  {...override}
                  testID={`chart-dot-${index}-${point.index}`}
                  onPress={() => {
                    frame.select(point.index);
                    props.onPress?.(point.payload, point.index);
                  }}
                />
              ))}
            </G>
          );
        })}
      {props.children}
    </GeometryContext.Provider>
  );
}
export const Line = (props: CartesianSeriesProps) => <CartesianCurve {...props} area={false} />;
export const Area = (props: CartesianSeriesProps) => <CartesianCurve {...props} area />;
export const Cell = (_props: ShapeStyle) => null;

function svgChildren(children: ReactNode, transform?: TextStyle['textTransform']) {
  return Children.toArray(children).map((child) => {
    if (typeof child === 'string' || typeof child === 'bigint') {
      const text = String(child);
      return transform === 'uppercase'
        ? text.toLocaleUpperCase()
        : transform === 'lowercase'
          ? text.toLocaleLowerCase()
          : transform === 'capitalize'
            ? text.replace(/(^|\s)\p{L}/gu, (value) => value.toLocaleUpperCase())
            : text;
    }
    if (typeof child === 'number' || isValidElement(child)) return child;
    throw Error('Native SVG labels require text or synchronous SVG elements.');
  });
}
const SvgFontContext = createContext<{
  role: NativeFontRole;
  weight: number;
  italic: boolean;
  family?: string;
  transform?: TextStyle['textTransform'];
}>({ role: 'sans', weight: 400, italic: false });
function useChartFont(
  fontRole: NativeFontRole | undefined,
  fontWeight: SvgTextProps['fontWeight'],
  fontFamily: string | undefined,
  fontStyle: SvgTextProps['fontStyle'],
  textTransform?: TextStyle['textTransform'],
) {
  const inherited = useContext(SvgFontContext),
    text = useContext(NativeTextStyleContext),
    role = fontRole ?? text.fontRole ?? inherited.role;
  const weight = fontWeight === 'bold' ? 700 : Number(fontWeight ?? inherited.weight) || 400,
    italic = fontStyle === undefined ? inherited.italic : fontStyle === 'italic',
    font = useNativeFontStyle(role, weight, italic),
    family = fontFamily ?? inherited.family;
  return {
    value: { role, weight, italic, family, transform: textTransform ?? inherited.transform },
    family: family ?? font.fontFamily,
    weight: !family && font.fontFamily ? ('normal' as const) : fontWeight,
    style: font.fontStyle ?? fontStyle,
  };
}
export function ChartText({
  children,
  textTransform,
  fill,
  fontWeight,
  fontFamily,
  fontStyle,
  fontRole,
  ...props
}: SvgTextProps & { fontRole?: NativeFontRole; textTransform?: TextStyle['textTransform'] }) {
  const container = useContext(ChartContext),
    paint = useContext(RegistryPaintContext),
    { colors } = useTheme(),
    font = useChartFont(fontRole, fontWeight, fontFamily, fontStyle, textTransform);
  return (
    <SvgFontContext.Provider value={font.value}>
      <SvgText
        {...props}
        fill={
          fill === undefined
            ? String(paint.labelFill ?? 'currentColor')
            : (container?.resolveColor(String(fill)) ?? fill)
        }
        fontFamily={font.family}
        fontWeight={font.weight}
        fontStyle={font.style}
        color={colors.foreground}
      >
        {svgChildren(children, font.value.transform)}
      </SvgText>
    </SvgFontContext.Provider>
  );
}
export function TSpan({
  children,
  textTransform,
  fill,
  fontWeight,
  fontFamily,
  fontStyle,
  fontRole,
  ...props
}: Omit<TSpanProps, 'children'> & {
  children?: ReactNode;
  fontRole?: NativeFontRole;
  textTransform?: TextStyle['textTransform'];
}) {
  const container = useContext(ChartContext),
    font = useChartFont(fontRole, fontWeight, fontFamily, fontStyle, textTransform);
  return (
    <SvgFontContext.Provider value={font.value}>
      <SvgTSpan
        {...props}
        fill={typeof fill === 'string' ? (container?.resolveColor(fill) ?? fill) : fill}
        fontFamily={font.family}
        fontWeight={font.weight}
        fontStyle={font.style}
      >
        {svgChildren(children, font.value.transform)}
      </SvgTSpan>
    </SvgFontContext.Provider>
  );
}
function CartesianAxis({ axis, ...props }: AxisProps & { axis: 'x' | 'y' }) {
  const frame = useFrame(),
    { colors } = useTheme();
  if (props.hide) return null;
  const category = axis === 'x' ? !frame.cart.vertical : frame.cart.vertical;
  const ticks = category
    ? frame.rows.map((row, index) => ({
        value: datum(row, props.dataKey ?? frame.categoryKey) ?? index,
        index,
        position: frame.cart.category(index),
      }))
    : frame.cart.scale
        .ticks(props.tickCount ?? 5)
        .map((value, index) => ({ value, index, position: frame.cart.scale(value) }));
  return (
    <G>
      {props.axisLine !== false && (
        <SvgLine
          x1={frame.cart.plot.left}
          y1={frame.cart.plot.bottom}
          x2={axis === 'x' ? frame.cart.plot.right : frame.cart.plot.left}
          y2={axis === 'x' ? frame.cart.plot.bottom : frame.cart.plot.top}
          stroke={frame.color(props.stroke ?? colors['muted-foreground'])}
        />
      )}
      {props.tick !== false &&
        ticks.map((tick) => {
          const x = axis === 'x' ? tick.position : frame.cart.plot.left - (props.tickMargin ?? 8),
            y =
              axis === 'x'
                ? frame.cart.plot.bottom + (props.tickMargin ?? 8) + 12
                : tick.position + 4;
          return (
            <G key={tick.index}>
              {typeof props.tick === 'function' ? (
                props.tick({
                  x,
                  y,
                  index: tick.index,
                  value: tick.value,
                  textAnchor: axis === 'x' ? 'middle' : 'end',
                  payload: { value: tick.value, index: tick.index },
                })
              ) : (
                <ChartText
                  x={x}
                  y={y}
                  textAnchor={axis === 'x' ? 'middle' : 'end'}
                  fontSize={12}
                  fill={colors['muted-foreground']}
                >
                  {props.tickFormatter
                    ? props.tickFormatter(tick.value, tick.index)
                    : String(tick.value)}
                </ChartText>
              )}
              {props.tickLine !== false && (
                <SvgLine
                  x1={axis === 'x' ? tick.position : frame.cart.plot.left - 4}
                  x2={axis === 'x' ? tick.position : frame.cart.plot.left}
                  y1={axis === 'x' ? frame.cart.plot.bottom : tick.position}
                  y2={axis === 'x' ? frame.cart.plot.bottom + 4 : tick.position}
                  stroke={colors.border}
                />
              )}
            </G>
          );
        })}
      {props.children}
    </G>
  );
}
export const XAxis = (props: AxisProps) => <CartesianAxis {...props} axis="x" />;
export const YAxis = (props: AxisProps) => <CartesianAxis {...props} axis="y" />;
export function CartesianGrid({
  horizontal = true,
  vertical = true,
  stroke,
  strokeWidth = 1,
  strokeDasharray,
}: ShapeStyle & { horizontal?: boolean; vertical?: boolean }) {
  const frame = useFrame(),
    { colors } = useTheme(),
    plot = frame.cart.plot;
  const numericTicks = frame.cart.scale.ticks(5).map((value) => frame.cart.scale(value)),
    categoryTicks = frame.rows.map((_, index) => frame.cart.category(index));
  const xs = frame.cart.vertical ? numericTicks : categoryTicks,
    ys = frame.cart.vertical ? categoryTicks : numericTicks;
  return (
    <G>
      {horizontal &&
        ys.map((y, index) => (
          <SvgLine
            key={'h' + index}
            testID={'chart-grid-h-' + index}
            x1={plot.left}
            x2={plot.right}
            y1={y}
            y2={y}
            stroke={
              stroke === undefined || stroke === '#ccc'
                ? withAlpha(colors.border!, 0.5)
                : frame.color(stroke)
            }
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
        ))}
      {vertical &&
        xs.map((x, index) => (
          <SvgLine
            key={'v' + index}
            testID={'chart-grid-v-' + index}
            x1={x}
            x2={x}
            y1={plot.top}
            y2={plot.bottom}
            stroke={
              stroke === undefined || stroke === '#ccc'
                ? withAlpha(colors.border!, 0.5)
                : frame.color(stroke)
            }
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
        ))}
    </G>
  );
}
export function Sector({
  cx = 0,
  cy = 0,
  innerRadius = 0,
  outerRadius = 0,
  startAngle = 0,
  endAngle = 360,
  cornerRadius = 0,
  paddingAngle = 0,
  fill,
  fillOpacity,
  stroke,
  strokeWidth,
  onPress,
  testID,
}: Partial<PieSectorShapeProps> &
  ShapeStyle & {
    cornerRadius?: number;
    paddingAngle?: number;
    onPress?: () => void;
    testID?: string;
  }) {
  const frame = useFrame();
  return (
    <Path
      testID={testID}
      transform={`translate(${cx},${cy})`}
      d={sectorPath(innerRadius, outerRadius, startAngle, endAngle, cornerRadius, paddingAngle)}
      fill={frame.color(fill)}
      fillOpacity={fillOpacity}
      stroke={stroke === '#fff' ? 'transparent' : stroke ? frame.color(stroke) : undefined}
      strokeWidth={strokeWidth}
      onPress={onPress}
    />
  );
}
export function Pie(props: PolarSeriesProps) {
  const frame = useFrame(),
    data = props.data ?? frame.rows,
    index = props._index ?? 0,
    radius = Math.min(frame.width, frame.height) / 2 - 5,
    cx = percent(props.cx, frame.width, frame.cx),
    cy = percent(props.cy, frame.height, frame.cy),
    inner = Math.max(0, percent(props.innerRadius, radius, frame.inner)),
    outer = Math.max(0, percent(props.outerRadius, radius, frame.outer)),
    start = props.startAngle ?? frame.start,
    end = props.endAngle ?? frame.end,
    total = data.reduce((sum, row) => sum + Math.max(0, numeric(datum(row, props.dataKey))), 0);
  let angle = start;
  const sectors = data.map((payload, pointIndex) => {
    const value = Math.max(0, numeric(datum(payload, props.dataKey))),
      fraction = total ? value / total : 0,
      next = angle + (end - start) * fraction,
      sector: PieSectorShapeProps = {
        cx,
        cy,
        innerRadius: inner,
        outerRadius: outer,
        startAngle: angle,
        endAngle: next,
        midAngle: (angle + next) / 2,
        percent: fraction,
        value,
        index: pointIndex,
        payload,
        fill: frame.color(typeof payload.fill === 'string' ? payload.fill : props.fill, pointIndex),
      };
    angle = next;
    return sector;
  });
  const cells = flatChildren(props.children).filter(
    (node) => isValidElement(node) && nativeComponent(node.type) === Cell,
  ) as ReactElement<ShapeStyle>[];
  const points = sectors.map((sector) => {
    const theta = (-sector.midAngle * Math.PI) / 180,
      x = cx + Math.cos(theta) * (outer + 12),
      y = cy + Math.sin(theta) * (outer + 12);
    return {
      x,
      y,
      cx: x,
      cy: y,
      value: sector.value,
      index: sector.index,
      payload: sector.payload,
      low: 0,
      high: sector.value,
      width: 0,
      height: 0,
    };
  });
  return (
    <GeometryContext.Provider value={{ points, viewBox: sectors[0] }}>
      {sectors
        .filter((sector) => sector.percent > 0)
        .map((sector) => {
          const geometry = {
              ...sector,
              fill: cells[sector.index]?.props.fill
                ? frame.color(cells[sector.index]!.props.fill)
                : sector.fill,
            },
            chosen =
              sector.index === (props.activeIndex ?? frame.active)
                ? (props.activeShape ?? props.shape)
                : props.shape;
          return (
            <G
              key={sector.index}
              onPress={() => {
                frame.select(sector.index, index);
                props.onPress?.(sector.payload, sector.index);
              }}
            >
              {shape(chosen, geometry, () => (
                <Sector
                  {...geometry}
                  cornerRadius={props.cornerRadius}
                  paddingAngle={props.paddingAngle}
                  stroke={props.stroke}
                  strokeWidth={props.strokeWidth}
                  testID={`chart-pie-${index}-${sector.index}`}
                />
              ))}
              {props.label && props.labelLine !== false && (
                <SvgLine
                  x1={cx + Math.cos((-sector.midAngle * Math.PI) / 180) * outer}
                  y1={cy + Math.sin((-sector.midAngle * Math.PI) / 180) * outer}
                  x2={points[sector.index]!.x}
                  y2={points[sector.index]!.y}
                  stroke={geometry.fill}
                />
              )}
              {props.label &&
                (typeof props.label === 'function' ? (
                  props.label({
                    ...geometry,
                    x: points[sector.index]!.x,
                    y: points[sector.index]!.y,
                    textAnchor: 'middle',
                    dominantBaseline: 'central',
                  })
                ) : (
                  <ChartText
                    x={points[sector.index]!.x}
                    y={points[sector.index]!.y}
                    textAnchor="middle"
                    fontSize={12}
                  >
                    {String(datum(sector.payload, props.nameKey) ?? sector.value)}
                  </ChartText>
                ))}
            </G>
          );
        })}
      {props.children}
    </GeometryContext.Provider>
  );
}
export function Radar(props: PolarSeriesProps) {
  const frame = useFrame(),
    index = props._index ?? 0,
    maximum = Math.max(1, ...frame.cart.scale.domain()),
    points: Point[] = frame.rows.map((payload, pointIndex) => {
      const value = numeric(datum(payload, props.dataKey)),
        theta = (pointIndex / Math.max(1, frame.rows.length)) * Math.PI * 2 - Math.PI / 2,
        radius = (Math.max(0, value) / maximum) * frame.outer,
        x = frame.cx + Math.cos(theta) * radius,
        y = frame.cy + Math.sin(theta) * radius;
      return {
        x,
        y,
        cx: x,
        cy: y,
        value,
        index: pointIndex,
        payload,
        low: 0,
        high: value,
        width: 0,
        height: 0,
      };
    });
  return (
    <GeometryContext.Provider value={{ points }}>
      <Polygon
        testID={`chart-radar-${index}`}
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        fill={frame.color(props.fill, index)}
        fillOpacity={props.fillOpacity ?? 0.6}
        stroke={frame.color(props.stroke ?? props.fill, index)}
        strokeWidth={props.strokeWidth ?? 2}
      />
      {props.dot &&
        points.map((point) => (
          <G
            key={point.index}
            onPress={() => {
              frame.select(point.index);
              props.onPress?.(point.payload, point.index);
            }}
          >
            {shape(
              props.dot,
              { ...point, r: 3, fill: frame.color(props.stroke ?? props.fill, index) },
              () => (
                <Dot {...point} r={3} fill={frame.color(props.stroke ?? props.fill, index)} />
              ),
            )}
          </G>
        ))}
      {props.children}
    </GeometryContext.Provider>
  );
}
export function RadialBar(props: PolarSeriesProps) {
  const { colors } = useTheme();
  const frame = useFrame(),
    index = props._index ?? 0,
    span = frame.outer - frame.inner,
    band = span / Math.max(1, frame.rows.length),
    groups = [
      ...new Set(
        frame.specs.map((spec, i) =>
          spec.stackId === undefined ? 'single-' + i : 'stack-' + spec.stackId,
        ),
      ),
    ],
    group = Math.max(
      0,
      groups.indexOf(props.stackId === undefined ? 'single-' + index : 'stack-' + props.stackId),
    ),
    parts = Math.max(1, groups.length),
    maximum = Math.max(1, ...frame.cart.intervals.flat(2)),
    points: Point[] = frame.rows.map((payload, pointIndex) => {
      const low = frame.cart.intervals[index]?.[pointIndex]?.[0] ?? 0,
        high = frame.cart.intervals[index]?.[pointIndex]?.[1] ?? 0,
        inner = frame.inner + pointIndex * band + (group * band) / parts,
        outer = inner + (band / parts) * 0.85,
        start = frame.start + ((frame.end - frame.start) * Math.max(0, low)) / maximum,
        end = frame.start + ((frame.end - frame.start) * Math.max(0, high)) / maximum;
      return {
        x: frame.cx,
        y: frame.cy,
        cx: frame.cx,
        cy: frame.cy,
        value: numeric(datum(payload, props.dataKey)),
        index: pointIndex,
        payload,
        low,
        high,
        width: 0,
        height: 0,
        polar: { inner, outer, start, end },
      };
    });
  return (
    <GeometryContext.Provider value={{ points }}>
      {points.map((point) => {
        const { inner, outer, start, end } = point.polar!,
          fill = frame.color(
            props.fill ?? (typeof point.payload.fill === 'string' ? point.payload.fill : undefined),
            point.index,
          );
        return (
          <G
            key={point.index}
            onPress={() => {
              frame.select(point.index);
              props.onPress?.(point.payload, point.index);
            }}
          >
            {props.background && (
              <Sector
                cx={frame.cx}
                cy={frame.cy}
                innerRadius={inner}
                outerRadius={outer}
                startAngle={frame.start}
                endAngle={frame.end}
                fill={colors.muted}
                fillOpacity={1}
              />
            )}
            <Sector
              testID={`chart-radial-${index}-${point.index}`}
              cx={frame.cx}
              cy={frame.cy}
              innerRadius={inner}
              outerRadius={outer}
              startAngle={start}
              endAngle={end}
              fill={fill}
              cornerRadius={props.cornerRadius}
            />
          </G>
        );
      })}
      {props.children}
    </GeometryContext.Provider>
  );
}
export function PolarGrid({
  gridType = 'polygon',
  radialLines = true,
  polarRadius,
  stroke,
  strokeWidth = 1,
  fill,
  fillOpacity,
  firstFill,
  lastFill,
}: ShapeStyle & {
  gridType?: 'polygon' | 'circle';
  radialLines?: boolean;
  polarRadius?: readonly number[];
  firstFill?: string;
  lastFill?: string;
}) {
  const frame = useFrame(),
    { colors } = useTheme(),
    recipePaint = useContext(RegistryPaintContext),
    radii = polarRadius ?? [0.2, 0.4, 0.6, 0.8, 1].map((fraction) => frame.outer * fraction),
    count = Math.max(1, frame.rows.length);
  const ring = (radius: number, key: string, paint: string, outline: string) => {
    const props = {
      testID: `chart-polar-grid-${key}`,
      stroke: outline,
      strokeWidth,
      fill: frame.color(paint),
      fillOpacity,
    };
    return gridType === 'circle' ? (
      <Circle key={key} {...props} cx={frame.cx} cy={frame.cy} r={radius} />
    ) : (
      <Polygon
        key={key}
        {...props}
        points={Array.from({ length: count }, (_, i) => {
          const theta = (i / count) * Math.PI * 2 - Math.PI / 2;
          return `${frame.cx + Math.cos(theta) * radius},${frame.cy + Math.sin(theta) * radius}`;
        }).join(' ')}
      />
    );
  };
  return (
    <G>
      {fill && ring(Math.max(0, ...radii), 'background', fill, 'none')}
      {radii.map((radius, index) =>
        ring(
          radius,
          String(index),
          (index === radii.length - 1
            ? (lastFill ?? String(recipePaint.lastFill ?? 'none'))
            : undefined) ??
            (index === 0 ? (firstFill ?? String(recipePaint.firstFill ?? 'none')) : undefined) ??
            'none',
          frame.color(stroke === '#ccc' ? colors.border : (stroke ?? colors.border)),
        ),
      )}
      {radialLines &&
        Array.from({ length: count }, (_, index) => {
          const theta = (index / count) * Math.PI * 2 - Math.PI / 2;
          return (
            <SvgLine
              key={index}
              x1={frame.cx}
              y1={frame.cy}
              x2={frame.cx + Math.cos(theta) * frame.outer}
              y2={frame.cy + Math.sin(theta) * frame.outer}
              stroke={frame.color(stroke === '#ccc' ? colors.border : (stroke ?? colors.border))}
              strokeWidth={strokeWidth}
            />
          );
        })}
    </G>
  );
}
export function PolarAngleAxis(props: AxisProps) {
  const frame = useFrame(),
    { colors } = useTheme();
  if (props.hide || props.tick === false) return null;
  return (
    <G>
      {frame.rows.map((row, index) => {
        const theta = (index / Math.max(1, frame.rows.length)) * Math.PI * 2 - Math.PI / 2,
          x = frame.cx + Math.cos(theta) * (frame.outer + 16),
          y = frame.cy + Math.sin(theta) * (frame.outer + 16),
          value = datum(row, props.dataKey ?? frame.categoryKey) ?? index;
        return (
          <G key={index}>
            {typeof props.tick === 'function' ? (
              props.tick({ x, y, index, value, textAnchor: 'middle', payload: { value, index } })
            ) : (
              <ChartText
                x={x}
                y={y + 4}
                fontSize={12}
                fill={colors['muted-foreground']}
                textAnchor="middle"
              >
                {props.tickFormatter ? props.tickFormatter(value, index) : String(value)}
              </ChartText>
            )}
          </G>
        );
      })}
      {props.children}
    </G>
  );
}
export function PolarRadiusAxis({ children, ...props }: AxisProps) {
  const frame = useFrame();
  return (
    <G>
      {props.axisLine !== false && (
        <SvgLine
          x1={frame.cx}
          y1={frame.cy}
          x2={frame.cx + frame.outer}
          y2={frame.cy}
          stroke={frame.color(props.stroke)}
        />
      )}
      {props.tick !== false &&
        [0, 0.25, 0.5, 0.75, 1].map((fraction, index) => (
          <ChartText
            key={index}
            x={frame.cx + frame.outer * fraction}
            y={frame.cy - 4}
            fontSize={10}
          >
            {String(Math.round(Math.max(1, ...frame.cart.intervals.flat(2)) * fraction))}
          </ChartText>
        ))}
      {children}
    </G>
  );
}
export function Label({
  content: renderer,
  value,
  children,
  ...style
}: ShapeStyle & {
  content?: (props: {
    viewBox: {
      cx: number;
      cy: number;
      innerRadius: number;
      outerRadius: number;
      width: number;
      height: number;
    };
  }) => ReactNode;
  value?: ReactNode;
  children?: ReactNode;
}) {
  const frame = useFrame(),
    geometry = useContext(GeometryContext);
  const viewBox = {
    cx: geometry.viewBox?.cx ?? frame.cx,
    cy: geometry.viewBox?.cy ?? frame.cy,
    innerRadius: geometry.viewBox?.innerRadius ?? frame.inner,
    outerRadius: geometry.viewBox?.outerRadius ?? frame.outer,
    width: frame.width,
    height: frame.height,
  };
  return renderer ? (
    renderer({ viewBox })
  ) : (
    <ChartText x={viewBox.cx} y={viewBox.cy} textAnchor="middle" fill={style.fill}>
      {value ?? children}
    </ChartText>
  );
}
export { Label as ChartLabel };
export function LabelList({
  dataKey,
  position = 'top',
  offset = 5,
  formatter,
  fontSize = 12,
  fill,
  fillOpacity,
  stroke,
  textTransform,
}: ShapeStyle & {
  dataKey?: DataKey;
  position?:
    | 'top'
    | 'bottom'
    | 'inside'
    | 'insideTop'
    | 'insideBottom'
    | 'insideLeft'
    | 'insideRight'
    | 'center'
    | 'outside'
    | 'right'
    | 'insideStart';
  offset?: number;
  formatter?: (value: unknown) => ReactNode;
  fontSize?: number;
  textTransform?: TextStyle['textTransform'];
}) {
  const { points } = useContext(GeometryContext);
  const id = useId().replace(/:/g, '');
  return (
    <G>
      {points.map((point) => {
        const value = dataKey ? datum(point.payload, dataKey) : point.value,
          x =
            position === 'right'
              ? point.x + point.width + offset
              : position === 'insideLeft'
                ? point.x + offset
                : position === 'insideRight'
                  ? point.x + point.width - offset
                  : point.x + point.width / 2,
          y =
            position === 'bottom'
              ? point.y + point.height + offset + fontSize
              : position === 'insideBottom'
                ? point.y + point.height - offset
                : position === 'inside' ||
                    position === 'center' ||
                    position === 'insideLeft' ||
                    position === 'insideRight' ||
                    position === 'right' ||
                    position === 'insideStart'
                  ? point.y + point.height / 2 + fontSize / 3
                  : position === 'insideTop'
                    ? point.y + offset + fontSize
                    : point.y - offset;
        if (position === 'insideStart' && point.polar) {
          const polar = point.polar,
            pathId = `radial-label-${id}-${point.index}`;
          return (
            <G key={point.index}>
              <Defs>
                <Path
                  id={pathId}
                  d={polarTextPath(
                    point.cx,
                    point.cy,
                    (polar.inner + polar.outer) / 2,
                    polar.start,
                    polar.end,
                  )}
                />
              </Defs>
              <ChartText
                textTransform={textTransform}
                fill={fill}
                fontSize={fontSize}
                fillOpacity={fillOpacity}
                stroke={stroke}
              >
                <TextPath
                  testID={`chart-radial-label-${point.index}`}
                  href={'#' + pathId}
                  startOffset={offset}
                >
                  <TSpan>{formatter ? formatter(value) : String(value ?? '')}</TSpan>
                </TextPath>
              </ChartText>
            </G>
          );
        }
        return (
          <ChartText
            key={point.index}
            x={x}
            y={y}
            fontSize={fontSize}
            textTransform={textTransform}
            textAnchor={
              position === 'insideLeft' || position === 'right'
                ? 'start'
                : position === 'insideRight'
                  ? 'end'
                  : 'middle'
            }
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
          >
            {formatter ? formatter(value) : String(value ?? '')}
          </ChartText>
        );
      })}
    </G>
  );
}
