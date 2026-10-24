import { useState, type ReactNode } from 'react';
import { View, Pressable, type ViewProps } from 'react-native';
import Svg, { Rect, Path, Circle, Polygon } from 'react-native-svg';
import { Box, LabelText, Muted, row, useControllable } from './_core';
import { useTheme } from '../theme';
export type ChartPoint = { label: string; value: number };
export type ChartConfig = Record<string, { label: string; color?: string }>;
export const ChartContainer = ({
  config: _config,
  ...props
}: ViewProps & { config?: ChartConfig }) => <Box {...props} />;
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
export function ChartTooltipContent({ point }: { point?: ChartPoint }) {
  return point ? (
    <LabelText accessibilityLiveRegion="polite">
      {point.label}: {point.value}
    </LabelText>
  ) : null;
}
export const ChartTooltip = ChartTooltipContent;
export function ChartLegendContent({
  items = [],
}: {
  items?: { label: string; color?: string }[];
}) {
  return (
    <Box style={row()}>
      {items.map((item, index) => (
        <View key={index} style={row()}>
          <View style={{ width: 12, height: 12, backgroundColor: item.color }} />
          <LabelText>{item.label}</LabelText>
        </View>
      ))}
    </Box>
  );
}
export const ChartLegend = ChartLegendContent;
