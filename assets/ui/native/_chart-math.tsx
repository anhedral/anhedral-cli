import { scaleLinear } from 'd3-scale';
import {
  arc,
  curveLinear,
  curveMonotoneX,
  curveMonotoneY,
  curveNatural,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  type CurveFactory,
} from 'd3-shape';
export type ChartRow = Readonly<Record<string, unknown>>;
export type DataKey = string | ((row: ChartRow) => unknown);
export type SeriesKind = 'line' | 'area' | 'bar' | 'pie' | 'radar' | 'radial';
export type SeriesSpec = { kind: SeriesKind; dataKey: DataKey; stackId?: string | number };
export type Plot = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};
export function datum(row: ChartRow | undefined, key: DataKey | undefined): unknown {
  return row && key !== undefined ? (typeof key === 'function' ? key(row) : row[key]) : undefined;
}
export function numeric(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim())
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  return 0;
}
export function percent(
  value: number | string | undefined,
  total: number,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  const result =
    typeof value === 'string' && value.endsWith('%')
      ? (parseFloat(value) * total) / 100
      : typeof value === 'number'
        ? value
        : parseFloat(value);
  return Number.isFinite(result) ? result : fallback;
}
export function curve(kind: string | undefined, vertical = false): CurveFactory {
  return kind === 'linear'
    ? curveLinear
    : kind === 'natural'
      ? curveNatural
      : kind === 'step'
        ? curveStep
        : kind === 'stepBefore'
          ? curveStepBefore
          : kind === 'stepAfter'
            ? curveStepAfter
            : vertical
              ? curveMonotoneY
              : curveMonotoneX;
}
export function cartesianFrame(
  rows: readonly ChartRow[],
  series: readonly SeriesSpec[],
  width: number,
  height: number,
  options: {
    kind: 'line' | 'area' | 'bar';
    vertical?: boolean;
    margin?: Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
    xAxis?: boolean;
    yAxis?: boolean;
    expand?: boolean;
  },
) {
  const margin = Object.fromEntries(
    ['top', 'right', 'bottom', 'left'].map((key) => [
      key,
      Number.isFinite(options.margin?.[key as 'top']) ? options.margin![key as 'top']! : 5,
    ]),
  ) as Record<'top' | 'right' | 'bottom' | 'left', number>;
  const plot: Plot = {
    left: margin.left + (options.yAxis ? 60 : 0),
    top: margin.top,
    right: Math.max(margin.left + 1, width - margin.right),
    bottom: Math.max(margin.top + 1, height - margin.bottom - (options.xAxis ? 30 : 0)),
    width: 1,
    height: 1,
  };
  plot.right = Math.max(plot.left + 1, plot.right);
  plot.width = Math.max(1, plot.right - plot.left);
  plot.height = Math.max(1, plot.bottom - plot.top);
  const intervals = series.map(() => rows.map(() => [0, 0] as [number, number]));
  for (let index = 0; index < rows.length; index++) {
    const totals = new Map<string | number, number>(),
      positive = new Map<string | number, number>(),
      negative = new Map<string | number, number>();
    for (const spec of series)
      if (spec.stackId !== undefined)
        totals.set(
          spec.stackId,
          (totals.get(spec.stackId) ?? 0) + Math.abs(numeric(datum(rows[index], spec.dataKey))),
        );
    series.forEach((spec, seriesIndex) => {
      let value = numeric(datum(rows[index], spec.dataKey)),
        base = 0;
      if (spec.stackId !== undefined) {
        if (options.expand) value /= totals.get(spec.stackId) || 1;
        const group = value < 0 ? negative : positive;
        base = group.get(spec.stackId) ?? 0;
        group.set(spec.stackId, base + value);
      }
      intervals[seriesIndex]![index] = [base, base + value];
    });
  }
  const all = intervals.flat(2),
    min = Math.min(0, ...all),
    max = Math.max(options.expand ? 1 : 0, ...all);
  const scale = scaleLinear()
    .domain(min === max ? [min, min + 1] : [min, max])
    .nice(5)
    .range(options.vertical ? [plot.left, plot.right] : [plot.bottom, plot.top]);
  const span = options.vertical ? plot.height : plot.width,
    band = span / Math.max(1, rows.length);
  const category = (index: number) =>
    (options.vertical ? plot.top : plot.left) +
    (options.kind === 'bar'
      ? (index + 0.5) * band
      : rows.length <= 1
        ? span / 2
        : (index * span) / (rows.length - 1));
  const groups = [
    ...new Set(
      series
        .filter((spec) => spec.kind === 'bar')
        .map((spec) =>
          spec.stackId === undefined ? 'single-' + series.indexOf(spec) : 'stack-' + spec.stackId,
        ),
    ),
  ];
  return { plot, scale, intervals, category, band, groups, vertical: !!options.vertical };
}
export function roundedRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | readonly number[] = 0,
): string {
  const limit = Math.min(Math.abs(width), Math.abs(height)) / 2;
  const corners = typeof radius === 'number' ? [radius, radius, radius, radius] : radius;
  const [a, b, c, d] = [0, 1, 2, 3].map((index) =>
    Math.max(0, Math.min(limit, corners[index] ?? 0)),
  ) as [number, number, number, number];
  return `M${x + a},${y}H${x + width - b}Q${x + width},${y} ${x + width},${y + b}V${y + height - c}Q${x + width},${y + height} ${x + width - c},${y + height}H${x + d}Q${x},${y + height} ${x},${y + height - d}V${y + a}Q${x},${y} ${x + a},${y}Z`;
}
export function sectorPath(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  cornerRadius = 0,
  paddingAngle = 0,
): string {
  return (
    arc().cornerRadius(cornerRadius)({
      innerRadius: Math.max(0, innerRadius),
      outerRadius: Math.max(0, outerRadius),
      startAngle: Math.PI / 2 - (startAngle * Math.PI) / 180,
      endAngle: Math.PI / 2 - (endAngle * Math.PI) / 180,
      padAngle: (Math.max(0, paddingAngle) * Math.PI) / 180,
    }) ?? ''
  );
}

/** An open circular path for native SVG text; split full turns into valid arc segments. */
export function polarTextPath(cx: number, cy: number, radius: number, start: number, end: number) {
  const coordinate = (angle: number) => {
    const theta = (-angle * Math.PI) / 180;
    return `${cx + radius * Math.cos(theta)},${cy + radius * Math.sin(theta)}`;
  };
  const segments = Math.max(1, Math.ceil(Math.abs(end - start) / 179));
  let path = `M${coordinate(start)}`;
  for (let i = 1; i <= segments; i++)
    path += `A${radius},${radius},0,0,${end > start ? 0 : 1},${coordinate(start + ((end - start) * i) / segments)}`;
  return path;
}
