import {
  useState,
  useContext,
  useId,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
  type Ref,
} from 'react';
import { View, Pressable, type ViewProps, type TextStyle, type StyleProp } from 'react-native';
import Svg, { Rect, Path, Circle, Polygon } from 'react-native-svg';
import {
  Box,
  LabelText,
  Muted,
  row,
  useControllable,
  content,
  NativeTextStyleProvider,
  TextToneProvider,
} from './_core';
import { useNativeChartStyle } from './_preset-chart-style';
import { NativeIconForcedSize } from './_registry-context';
type ChartViewProps = ViewProps & { ref?: Ref<View>; textStyle?: StyleProp<TextStyle> };
import { useTheme } from '../theme';
export type ChartPoint = { label: string; value: number };
import {
  ChartContext,
  ChartDataContext,
  payloadConfig,
  type ChartConfig,
  type ChartPayload,
} from './_chart-context';
export type { ChartConfig, ChartPayload } from './_chart-context';
export function ChartContainer({
  config = {},
  initialDimension = { width: 320, height: 200 },
  onLayout,
  textStyle,
  children,
  style,
  ...props
}: ChartViewProps & {
  config?: ChartConfig;
  initialDimension?: { width: number; height: number };
}) {
  const typography = useNativeChartStyle(textStyle);
  const id = useId(),
    { colors, mode } = useTheme(),
    [dimension, setDimension] = useState(initialDimension);
  const resolveColor = (
    value: string | undefined,
    fallback: string = colors.primary ?? colors.foreground,
    seen = new Set<string>(),
  ): string => {
    if (!value) return fallback;
    if (seen.has(value)) throw Error('Cyclic native chart color reference: ' + value);
    seen.add(value);
    const match = value.match(/^(?:hsla?\()?var\(--([A-Za-z0-9-]+)\)\)?$/);
    if (!match) return value;
    const key = match[1]!;
    if (key.startsWith('color-')) {
      const entry = config[key.slice(6)];
      return resolveColor(entry?.theme?.[mode] ?? entry?.color, fallback, seen);
    }
    return resolveColor(colors[key], fallback, seen);
  };
  return (
    <ChartContext.Provider value={{ config, ...dimension, resolveColor }}>
      <NativeTextStyleProvider value={{ ...typography.textContext, style: typography.text }}>
        <TextToneProvider
          value={typeof typography.text.color === 'string' ? typography.text.color : undefined}
        >
          <View
            {...props}
            style={[{ aspectRatio: 16 / 9, justifyContent: 'center' }, style]}
            nativeID={props.nativeID ?? 'chart-' + id.replace(/:/g, '')}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setDimension((previous) => {
                const nextWidth = Number.isFinite(width) && width > 0 ? width : previous.width,
                  nextHeight = Number.isFinite(height) && height > 0 ? height : previous.height;
                return nextWidth === previous.width && nextHeight === previous.height
                  ? previous
                  : { width: nextWidth, height: nextHeight };
              });
              onLayout?.(event);
            }}
          >
            {children}
          </View>
        </TextToneProvider>
      </NativeTextStyleProvider>
    </ChartContext.Provider>
  );
}
export function Chart({
  data,
  type = 'bar',
  height = 200,
  value,
  onValueChange,
  accessibilityLabel = 'Chart',
  children,
}: {
  data: readonly ChartPoint[];
  type?: 'bar' | 'line' | 'area' | 'pie' | 'radar' | 'radial';
  height?: number;
  value?: number;
  onValueChange?: (index: number) => void;
  accessibilityLabel?: string;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(320);
  const [selected, set] = useControllable(value, -1, onValueChange);
  const points = data.map((point) => ({
    ...point,
    value: Number.isFinite(point.value) ? point.value : 0,
  }));
  const h = Math.max(44, Number.isFinite(height) ? height : 200);
  const padding = 16;
  const plotWidth = Math.max(1, width - padding * 2);
  const plotHeight = h - padding * 2;
  const minimum = Math.min(0, ...points.map((point) => point.value));
  const maximum = Math.max(1, ...points.map((point) => point.value));
  const y = (number: number) => padding + ((maximum - number) / (maximum - minimum)) * plotHeight;
  const x = (index: number) => padding + ((index + 0.5) / Math.max(1, points.length)) * plotWidth;
  const path = points
    .map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.value)}`)
    .join(' ');
  const palette = [
    colors.primary,
    colors['chart-1'] ?? colors.secondary,
    colors['chart-2'] ?? colors.primary,
    colors['chart-3'] ?? colors.muted,
  ];
  const total = points.reduce((sum, point) => sum + Math.max(0, point.value), 0);
  let angle = -Math.PI / 2;
  const radius = Math.max(1, Math.min(plotWidth, plotHeight) / 2);
  const centerX = width / 2;
  const centerY = h / 2;
  const radar = points
    .map((point, index) => {
      const theta = (index / Math.max(1, points.length)) * Math.PI * 2 - Math.PI / 2;
      const size = (Math.max(0, point.value) / maximum) * radius;
      return `${centerX + Math.cos(theta) * size},${centerY + Math.sin(theta) * size}`;
    })
    .join(' ');
  return (
    <Box
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setWidth(Math.max(44, event.nativeEvent.layout.width))}
    >
      {!points.length ? (
        <Muted>No chart data</Muted>
      ) : (
        <Svg width={width} height={h} accessibilityElementsHidden>
          {type === 'bar' &&
            points.map((point, index) => (
              <Rect
                key={index}
                x={x(index) - (plotWidth / points.length) * 0.3}
                y={Math.min(y(point.value), y(0))}
                width={(plotWidth / points.length) * 0.6}
                height={Math.abs(y(point.value) - y(0))}
                fill={palette[index % palette.length]}
              />
            ))}
          {(type === 'line' || type === 'area') && (
            <Path
              d={
                type === 'area'
                  ? `${path} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
                  : path
              }
              stroke={colors.primary}
              strokeWidth={2}
              fill={type === 'area' ? colors.secondary : 'none'}
            />
          )}
          {type === 'radar' && (
            <Polygon
              points={radar}
              fill={colors.secondary}
              stroke={colors.primary}
              strokeWidth={2}
            />
          )}
          {type === 'pie' &&
            total > 0 &&
            points.map((point, index) => {
              const arc = (Math.max(0, point.value) / total) * Math.PI * 2;
              const start = angle;
              angle += arc;
              if (arc >= Math.PI * 2 - 0.000001)
                return (
                  <Circle
                    key={index}
                    cx={centerX}
                    cy={centerY}
                    r={radius}
                    fill={palette[index % palette.length]}
                  />
                );
              return (
                <Path
                  key={index}
                  d={`M${centerX},${centerY} L${centerX + radius * Math.cos(start)},${centerY + radius * Math.sin(start)} A${radius},${radius} 0 ${arc > Math.PI ? 1 : 0} 1 ${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)} Z`}
                  fill={palette[index % palette.length]}
                />
              );
            })}
          {type === 'radial' &&
            points.map((point, index) => {
              const r = (radius * (index + 1)) / points.length;
              return (
                <Circle
                  key={index}
                  cx={centerX}
                  cy={centerY}
                  r={r}
                  fill="none"
                  stroke={palette[index % palette.length]}
                  strokeWidth={Math.max(1, radius / points.length - 3)}
                  strokeDasharray={`${(Math.max(0, point.value) / maximum) * 2 * Math.PI * r} ${2 * Math.PI * r}`}
                  transform={`rotate(-90 ${centerX} ${centerY})`}
                />
              );
            })}
        </Svg>
      )}
      <View style={row()}>
        {points.map((point, index) => (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`${point.label}: ${point.value}`}
            accessibilityState={{ selected: selected === index }}
            onPress={() => set(index)}
            style={{ minHeight: 44, justifyContent: 'center', padding: 4 }}
          >
            <LabelText>
              {point.label}: {point.value}
            </LabelText>
          </Pressable>
        ))}
      </View>
      {selected >= 0 && points[selected] && <ChartTooltipContent point={points[selected]} />}
      {children}
    </Box>
  );
}
ChartContainer.nativeExampleContainer = true;
ChartContainer.nativeContainerTextSlot = true;
type TooltipProps = ChartViewProps & {
  labelStyle?: StyleProp<TextStyle>;
  point?: ChartPoint;
  cursor?: boolean | { fill?: string; stroke?: string };
  defaultIndex?: number;
  active?: boolean;
  payload?: readonly ChartPayload[];
  label?: ReactNode;
  indicator?: 'dot' | 'line' | 'dashed';
  hideLabel?: boolean;
  hideIndicator?: boolean;
  nameKey?: string;
  labelKey?: string;
  color?: string;
  labelFormatter?: (label: ReactNode, payload: readonly ChartPayload[]) => ReactNode;
  formatter?: (
    value: NonNullable<ChartPayload['value']>,
    name: string | number,
    item: ChartPayload,
    index: number,
    payload: Record<string, unknown> | undefined,
  ) => ReactNode;
};
export function ChartTooltipContent({
  point,
  cursor: _cursor,
  defaultIndex: _defaultIndex,
  active,
  payload,
  label,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  nameKey,
  labelKey,
  color,
  labelFormatter,
  labelStyle,
  formatter,
  textStyle,
  style,
  ...props
}: TooltipProps) {
  const typography = useNativeChartStyle(textStyle);
  const chart = useContext(ChartContext),
    data = useContext(ChartDataContext),
    { colors } = useTheme(),
    config = chart?.config ?? {};
  if (point)
    return (
      <LabelText accessibilityLiveRegion="polite">
        {point.label}: {point.value}
      </LabelText>
    );
  const items = payload ?? data?.payload ?? [],
    enabled = active ?? data?.active;
  if (!enabled || !items.length) return null;
  const first = items[0],
    labelConfig = payloadConfig(
      config,
      first,
      String(labelKey ?? first?.dataKey ?? first?.name ?? 'value'),
    );
  const rawLabel =
    !labelKey && typeof label === 'string' ? (config[label]?.label ?? label) : labelConfig?.label;
  const headerValue = hideLabel
    ? null
    : labelFormatter
      ? labelFormatter(rawLabel, items)
      : rawLabel;
  // Source formatter creates its label wrapper even for zero or an empty child.
  const hasHeader = !hideLabel && (!!labelFormatter || !!rawLabel);
  const nested = items.length === 1 && indicator !== 'dot';
  const header = hasHeader ? (
    <LabelText
      style={[
        { fontWeight: '500' },
        nested && { lineHeight: typography.tooltipText.fontSize ?? 12 },
        labelStyle,
      ]}
    >
      {headerValue}
    </LabelText>
  ) : null;
  return (
    <NativeTextStyleProvider value={{ ...typography.textContext, style: typography.tooltipText }}>
      <TextToneProvider
        value={
          typeof typography.tooltipText.color === 'string'
            ? typography.tooltipText.color
            : undefined
        }
      >
        <View
          {...props}
          accessibilityLiveRegion="polite"
          style={[
            { minWidth: 128, gap: 6, alignItems: 'flex-start' },
            typography.tooltip.view,
            style,
          ]}
        >
          {!nested && header}
          <View style={{ gap: 6, alignSelf: 'stretch' }}>
            {items
              .filter((item) => item.type !== 'none')
              .map((item, index) => {
                const entry = payloadConfig(
                    config,
                    item,
                    String(nameKey ?? item.name ?? item.dataKey ?? 'value'),
                  ),
                  Icon = entry?.icon;
                const rawColor =
                  color ??
                  (typeof item.payload?.fill === 'string' ? item.payload.fill : undefined) ??
                  item.color ??
                  entry?.color;
                const fill = chart?.resolveColor(rawColor) ?? rawColor ?? colors.primary;
                return (
                  <Box
                    key={index}
                    style={{
                      width: '100%',
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: indicator === 'dot' ? 'center' : 'stretch',
                      gap: 8,
                    }}
                  >
                    {formatter && item.value !== undefined && item.name ? (
                      content(formatter(item.value, item.name, item, index, item.payload))
                    ) : (
                      <>
                        {Icon ? (
                          <NativeIconForcedSize.Provider value={10}>
                            <TextToneProvider value={colors['muted-foreground']}>
                              <Icon size={10} color={colors['muted-foreground']} />
                            </TextToneProvider>
                          </NativeIconForcedSize.Provider>
                        ) : (
                          !hideIndicator && (
                            <View
                              testID={
                                props.testID ? props.testID + '-indicator-' + index : undefined
                              }
                              style={
                                indicator === 'dot'
                                  ? {
                                      width: 10,
                                      height: 10,
                                      flexShrink: 0,
                                      backgroundColor: fill,
                                      borderRadius: 2,
                                    }
                                  : indicator === 'line'
                                    ? {
                                        width: 4,
                                        alignSelf: 'stretch',
                                        flexShrink: 0,
                                        backgroundColor: fill,
                                        borderRadius: 2,
                                      }
                                    : {
                                        width: 0,
                                        alignSelf: 'stretch',
                                        flexShrink: 0,
                                        borderWidth: 1.5,
                                        borderRadius: 2,
                                        marginVertical: nested ? 2 : 0,
                                        backgroundColor: 'transparent',
                                        borderColor: fill,
                                        borderStyle: 'dashed',
                                      }
                              }
                            />
                          )
                        )}
                        <Box
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: nested ? 'flex-end' : 'center',
                          }}
                        >
                          <Box style={{ gap: 6 }}>
                            {nested && header && header}
                            <Muted style={{ lineHeight: typography.tooltipText.fontSize ?? 12 }}>
                              {entry?.label ?? item.name}
                            </Muted>
                          </Box>
                          {item.value != null && (
                            <LabelText
                              fontRole="mono"
                              style={{
                                color: colors.foreground,
                                lineHeight: typography.tooltipText.fontSize ?? 12,
                                fontWeight: '500',
                                fontVariant: ['tabular-nums'],
                              }}
                            >
                              {typeof item.value === 'number'
                                ? item.value.toLocaleString()
                                : String(item.value)}
                            </LabelText>
                          )}
                        </Box>
                      </>
                    )}
                  </Box>
                );
              })}
          </View>
        </View>
      </TextToneProvider>
    </NativeTextStyleProvider>
  );
}
ChartTooltipContent.nativeExampleContainer = true;
ChartTooltipContent.nativeContainerTextSlot = true;
export function ChartTooltip({
  content: element,
  ...props
}: TooltipProps & { content?: ReactElement<TooltipProps> | ((props: TooltipProps) => ReactNode) }) {
  const data = useContext(ChartDataContext);
  const values = { active: data?.active, payload: data?.payload, label: data?.label, ...props };
  return typeof element === 'function' ? (
    element(values)
  ) : isValidElement(element) ? (
    cloneElement(element, values)
  ) : (
    <ChartTooltipContent {...values} />
  );
}
export function ChartLegendContent({
  items,
  payload,
  hideIcon = false,
  verticalAlign = 'bottom',
  nameKey,
  textStyle,
  style,
  ...props
}: ChartViewProps & {
  items?: { label: ReactNode; color?: string }[];
  payload?: readonly ChartPayload[];
  hideIcon?: boolean;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  nameKey?: string;
}) {
  const typography = useNativeChartStyle(textStyle);
  const chart = useContext(ChartContext),
    data = useContext(ChartDataContext),
    { colors } = useTheme(),
    config = chart?.config ?? {};
  const records =
    items?.map((item) => ({ label: item.label, color: item.color })) ??
    payload ??
    data?.legend ??
    [];
  if (!records.length) return null;
  return (
    <NativeTextStyleProvider value={{ ...typography.textContext, style: typography.text }}>
      <TextToneProvider
        value={typeof typography.text.color === 'string' ? typography.text.color : undefined}
      >
        <Box
          {...props}
          style={[
            row(),
            {
              justifyContent: 'center',
              gap: 16,
              ...(verticalAlign === 'top' ? { paddingBottom: 12 } : { paddingTop: 12 }),
            },
            style,
          ]}
        >
          {records
            .filter((item: ChartPayload) => item.type !== 'none')
            .map((item: ChartPayload, index: number) => {
              const entry = payloadConfig(config, item, String(nameKey ?? item.dataKey ?? 'value')),
                Icon = entry?.icon;
              const fill = chart?.resolveColor(item.color) ?? item.color ?? colors.primary;
              return (
                <Box key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {Icon && !hideIcon ? (
                    <NativeIconForcedSize.Provider value={12}>
                      <TextToneProvider value={colors['muted-foreground']}>
                        <Icon size={12} color={colors['muted-foreground']} />
                      </TextToneProvider>
                    </NativeIconForcedSize.Provider>
                  ) : (
                    <View
                      accessible={false}
                      style={{
                        width: 8,
                        height: 8,
                        flexShrink: 0,
                        borderRadius: 2,
                        backgroundColor: fill,
                      }}
                    />
                  )}
                  <LabelText>{entry?.label ?? item.label}</LabelText>
                </Box>
              );
            })}
        </Box>
      </TextToneProvider>
    </NativeTextStyleProvider>
  );
}
ChartLegendContent.nativeExampleContainer = true;
ChartLegendContent.nativeContainerTextSlot = true;
export function ChartLegend({
  content: element,
  ...props
}: React.ComponentProps<typeof ChartLegendContent> & {
  content?:
    | ReactElement<React.ComponentProps<typeof ChartLegendContent>>
    | ((props: React.ComponentProps<typeof ChartLegendContent>) => ReactNode);
}) {
  const data = useContext(ChartDataContext);
  const values = { payload: data?.legend, ...props };
  return typeof element === 'function' ? (
    element(values)
  ) : isValidElement(element) ? (
    cloneElement(element, values)
  ) : (
    <ChartLegendContent {...values} />
  );
}
