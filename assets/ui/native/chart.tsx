import {
  useState,
  useContext,
  useId,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from 'react';
import { View, Pressable, type ViewProps } from 'react-native';
import Svg, { Rect, Path, Circle, Polygon } from 'react-native-svg';
import { Box, LabelText, Muted, row, useControllable, content } from './_core';
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
  children,
  style,
  ...props
}: ViewProps & { config?: ChartConfig; initialDimension?: { width: number; height: number } }) {
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
      <Box
        {...props}
        style={[{ aspectRatio: 16 / 9 }, style]}
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
      </Box>
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
type TooltipProps = ViewProps & {
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
  formatter,
  style,
  ...props
}: TooltipProps) {
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
  const header = hideLabel ? null : labelFormatter ? labelFormatter(rawLabel, items) : rawLabel;
  const nested = items.length === 1 && indicator !== 'dot';
  return (
    <Box
      {...props}
      accessibilityLiveRegion="polite"
      style={[
        {
          minWidth: 128,
          gap: 6,
          padding: 12,
          backgroundColor: colors.popover,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
        },
        style,
      ]}
    >
      {!nested && header && <LabelText style={{ fontWeight: '500' }}>{header}</LabelText>}
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
            <Box key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {formatter && item.value !== undefined && item.name ? (
                content(formatter(item.value, item.name, item, index, item.payload))
              ) : (
                <>
                  {Icon ? (
                    <Icon size={12} color={colors['muted-foreground']} />
                  ) : (
                    !hideIndicator && (
                      <View
                        testID={props.testID ? props.testID + '-indicator-' + index : undefined}
                        style={
                          indicator === 'dot'
                            ? { width: 10, height: 10, backgroundColor: fill, borderRadius: 2 }
                            : indicator === 'line'
                              ? {
                                  width: 4,
                                  alignSelf: 'stretch',
                                  minHeight: 12,
                                  backgroundColor: fill,
                                  borderRadius: 2,
                                }
                              : {
                                  width: 0,
                                  alignSelf: 'stretch',
                                  minHeight: 12,
                                  borderLeftWidth: 1.5,
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
                      gap: 12,
                    }}
                  >
                    <Box style={{ gap: 6 }}>
                      {nested && header && (
                        <LabelText style={{ fontWeight: '500' }}>{header}</LabelText>
                      )}
                      <Muted>{entry?.label ?? item.name}</Muted>
                    </Box>
                    {item.value != null && (
                      <LabelText
                        fontRole="mono"
                        style={{ fontWeight: '500', fontVariant: ['tabular-nums'] }}
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
    </Box>
  );
}
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
  style,
  ...props
}: ViewProps & {
  items?: { label: ReactNode; color?: string }[];
  payload?: readonly ChartPayload[];
  hideIcon?: boolean;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  nameKey?: string;
}) {
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
    <Box
      {...props}
      style={[
        row(),
        {
          flexWrap: 'wrap',
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
                <Icon size={12} color={colors['muted-foreground']} />
              ) : (
                <View
                  accessible={false}
                  style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: fill }}
                />
              )}
              <LabelText>{entry?.label ?? item.label}</LabelText>
            </Box>
          );
        })}
    </Box>
  );
}
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
