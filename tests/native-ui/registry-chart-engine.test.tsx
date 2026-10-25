import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  cartesianFrame,
  numeric,
  percent,
  sectorPath,
  roundedRectangle,
  datum,
  curve,
  polarTextPath,
} from './.generated/src/native/_chart-math';
import type { BarShapeProps, PieSectorShapeProps } from './.generated/src/native/charts';
const data = [
  { month: 'January', desktop: 10, mobile: 30 },
  { month: 'February', desktop: 20, mobile: 10 },
  { month: 'March', desktop: 5, mobile: 15 },
];
const config = {
  desktop: { label: 'Desktop', color: '#123456' },
  mobile: { label: 'Mobile', color: '#abcdef' },
  chrome: { label: 'Chrome', color: '#ff0000' },
  safari: { label: 'Safari', color: '#0000ff' },
};
const mount = (children: React.ReactNode) =>
  render(
    <UI.ThemeProvider>
      <UI.ChartContainer config={config}>{children}</UI.ChartContainer>
    </UI.ThemeProvider>,
  );
const node = (id: string) => screen.getByTestId(id, { includeHiddenElements: true });
function svgText(root: ReturnType<typeof screen.getByRole>): string {
  return (
    (typeof root.props.content === 'string' ? root.props.content : '') +
    root.children.map((child) => (typeof child === 'string' ? child : svgText(child))).join('')
  );
}

test('native chart geometry retains diverging stacks, percentage stacks, invalid-number bounds and native orientation', () => {
  const rows = [
      { a: 10, b: 30 },
      { a: -5, b: -10 },
    ],
    specs = [
      { kind: 'bar' as const, dataKey: 'a', stackId: 'a' },
      { kind: 'bar' as const, dataKey: 'b', stackId: 'a' },
    ];
  const frame = cartesianFrame(rows, specs, 320, 200, { kind: 'bar' });
  expect(frame.intervals).toEqual([
    [
      [0, 10],
      [0, -5],
    ],
    [
      [10, 40],
      [-5, -15],
    ],
  ]);
  expect(frame.scale(0)).toBeGreaterThan(frame.scale(10));
  const expanded = cartesianFrame(rows, specs, 320, 200, { kind: 'area', expand: true });
  expect(expanded.intervals[1]![0]).toEqual([0.25, 1]);
  expect(expanded.intervals[1]![1]![1]).toBe(-1);
  expect(
    cartesianFrame(rows, specs, 320, 200, { kind: 'bar', vertical: true }).scale(10),
  ).toBeGreaterThan(frame.plot.left);
  expect(numeric(NaN)).toBe(0);
  expect(numeric('Infinity')).toBe(0);
  expect(numeric('12')).toBe(12);
  expect(numeric('')).toBe(0);
  expect(percent('50%', 100, 0)).toBe(50);
  expect(percent('bad', 100, 42)).toBe(42);
  expect(datum({ x: 2 }, (row) => Number(row.x) * 2)).toBe(4);
  expect(roundedRectangle(0, 0, 20, 10, [8, 0, 0, 8])).not.toContain('NaN');
  expect(sectorPath(40, 80, 0, 360, 8)).toContain('A');
  for (const kind of ['linear', 'natural', 'step', 'stepBefore', 'stepAfter', undefined])
    expect(curve(kind)).toEqual(expect.any(Function));
  expect(curve(undefined, true)).toEqual(expect.any(Function));
});
test('native grouped/stacked bars render original values, expose shape geometry and show selected multi-series tooltips', async () => {
  const first = new Map<number, BarShapeProps>(),
    second = new Map<number, BarShapeProps>();
  await mount(
    <UI.BarChart data={data}>
      <UI.CartesianGrid vertical={false} />
      <UI.XAxis dataKey="month" tickLine={false} axisLine={false} />
      <UI.Bar
        dataKey="desktop"
        stackId="a"
        fill="var(--color-desktop)"
        shape={(props) => {
          first.set(props.index, props);
          return <UI.Rectangle {...props} />;
        }}
      />
      <UI.Bar
        dataKey="mobile"
        stackId="a"
        fill="var(--color-mobile)"
        shape={(props) => {
          second.set(props.index, props);
          return <UI.Rectangle {...props} />;
        }}
      />
      <UI.ChartTooltip content={<UI.ChartTooltipContent />} />
      <UI.ChartLegend />
    </UI.BarChart>,
  );
  expect(first.get(0)?.value).toBe(10);
  expect(second.get(0)?.value).toBe(30);
  expect(second.get(0)?.low).toBe(10);
  expect(second.get(0)?.high).toBe(40);
  expect(first.get(0)?.fill).toBe('#123456');
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  expect(screen.getByText('January')).toBeOnTheScreen();
  expect(screen.getByText('10')).toBeOnTheScreen();
  expect(screen.getByText('30')).toBeOnTheScreen();
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  expect(screen.getByText('February')).toBeOnTheScreen();
  expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ now: 1 });
});
test('negative horizontal bars retain signed values and independent group geometry', async () => {
  const points = new Map<number, BarShapeProps>();
  await mount(
    <UI.BarChart
      data={[
        { label: 'Negative', value: -10 },
        { label: 'Positive', value: 20 },
      ]}
      layout="vertical"
    >
      <UI.XAxis type="number" />
      <UI.YAxis dataKey="label" type="category" />
      <UI.CartesianGrid horizontal={false} />
      <UI.Bar
        dataKey="value"
        radius={[4, 4, 0, 0]}
        shape={(props) => {
          points.set(props.index, props);
          return <UI.Rectangle {...props} />;
        }}
      />
    </UI.BarChart>,
  );
  expect(points.get(0)?.value).toBe(-10);
  expect(points.get(0)!.x).toBeLessThan(points.get(1)!.x);
  expect(points.get(0)!.width).toBeGreaterThan(0);
  expect(points.get(1)!.width).toBeGreaterThan(points.get(0)!.width);
  expect(points.get(0)!.height).toBeGreaterThan(0);
});
test('native default bars deliver touch selection and preserve cell colors', async () => {
  const press = jest.fn();
  await mount(
    <UI.BarChart data={data}>
      <UI.Bar dataKey="desktop" onPress={press}>
        <UI.Cell fill="#ff0000" />
        <UI.Cell fill="#0000ff" />
      </UI.Bar>
      <UI.ChartTooltip />
    </UI.BarChart>,
  );
  expect(node('chart-bar-0-0').props.d).not.toContain('NaN');
  await fireEvent.press(node('chart-bar-0-1'));
  expect(press).toHaveBeenCalledWith(data[1], 1);
  expect(screen.getByText('20')).toBeOnTheScreen();
});
test.each(['linear', 'monotone', 'natural', 'step', 'stepBefore', 'stepAfter'] as const)(
  'native %s curve interpolation preserves all points for line and area paths',
  async (type) => {
    await mount(
      <UI.LineChart data={data}>
        <UI.Line dataKey="desktop" type={type} stroke="var(--color-desktop)" />
        <UI.Area dataKey="mobile" type={type} fill="var(--color-mobile)" />
        <UI.XAxis dataKey="month" />
        <UI.YAxis tickCount={3} />
      </UI.LineChart>,
    );
    expect(node('chart-line-0').props.d).toMatch(/^M/);
    expect(node('chart-area-1').props.d).toMatch(/Z$/);
    expect(node('chart-line-0').props.d).not.toContain('NaN');
  },
);
test('native line dots, label lists, missing values and tooltip default index remain functional', async () => {
  const press = jest.fn();
  await mount(
    <UI.LineChart data={[...data, { month: 'April', mobile: undefined, desktop: 0 }]}>
      <UI.Line dataKey="desktop" dot={{ r: 5 }} activeDot={{ r: 8 }} onPress={press}>
        <UI.LabelList position="top" formatter={(value) => 'Value ' + value} />
      </UI.Line>
      <UI.Area dataKey="mobile" connectNulls />
      <UI.ChartTooltip defaultIndex={1} />
    </UI.LineChart>,
  );
  expect(screen.getByText('20')).toBeOnTheScreen();
  await fireEvent.press(node('chart-dot-0-2'));
  expect(press).toHaveBeenCalledWith(data[2], 2);
  expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ now: 2 });
  expect(svgText(screen.getByRole('adjustable'))).toContain('Value 5');
});
test('native pie/donut sectors preserve angular shares, custom active shapes and data labels', async () => {
  const arcs = new Map<number, PieSectorShapeProps>();
  const rows = [
    { browser: 'chrome', visitors: 10, fill: 'var(--color-chrome)' },
    { browser: 'safari', visitors: 30, fill: 'var(--color-safari)' },
  ];
  await mount(
    <UI.PieChart>
      <UI.Pie
        data={rows}
        dataKey="visitors"
        nameKey="browser"
        innerRadius={30}
        outerRadius={70}
        labelLine
        label={(props) => (
          <UI.ChartText x={props.cx} y={props.cy}>
            {props.value}
          </UI.ChartText>
        )}
        shape={(props) => {
          arcs.set(props.index, props);
          return <UI.Sector {...props} testID={'arc-' + props.index} />;
        }}
      >
        <UI.LabelList dataKey="browser" position="outside" />
      </UI.Pie>
      <UI.ChartTooltip content={<UI.ChartTooltipContent hideLabel nameKey="browser" />} />
      <UI.ChartLegend nameKey="browser" />
    </UI.PieChart>,
  );
  expect(arcs.get(0)?.percent).toBe(0.25);
  expect(arcs.get(0)?.startAngle).toBe(0);
  expect(arcs.get(0)?.endAngle).toBe(90);
  expect(arcs.get(1)?.endAngle).toBe(360);
  expect(arcs.get(0)?.innerRadius).toBe(30);
  await fireEvent.press(node('arc-1'));
  expect(screen.getByText('30')).toBeOnTheScreen();
});
test('single full-circle pies and empty/zero data do not emit invalid SVG geometry', async () => {
  const mounted = await mount(
    <UI.PieChart>
      <UI.Pie data={[{ value: 5 }]} dataKey="value" />
    </UI.PieChart>,
  );
  expect(node('chart-pie-0-0').props.d).toContain('A');
  expect(node('chart-pie-0-0').props.d).not.toContain('NaN');
  await mounted.rerender(
    <UI.ThemeProvider>
      <UI.ChartContainer>
        <UI.PieChart>
          <UI.Pie data={[{ value: 0 }]} dataKey="value" />
        </UI.PieChart>
      </UI.ChartContainer>
    </UI.ThemeProvider>,
  );
  expect(screen.queryByTestId('chart-pie-0-0', { includeHiddenElements: true })).toBeNull();
});
test.each(['polygon', 'circle'] as const)(
  'native radar %s grids retain multiple series and source labels',
  async (gridType) => {
    await mount(
      <UI.RadarChart data={data}>
        <UI.PolarGrid gridType={gridType} radialLines={false} />
        <UI.PolarAngleAxis dataKey="month" />
        <UI.Radar dataKey="desktop" fill="var(--color-desktop)" dot />
        <UI.Radar dataKey="mobile" fill="var(--color-mobile)" />
        <UI.ChartLegend />
      </UI.RadarChart>,
    );
    expect(node('chart-radar-0')).toBeOnTheScreen();
    expect(node('chart-radar-1')).toBeOnTheScreen();
    expect(svgText(screen.getByRole('adjustable'))).toContain('January');
  },
);
test('native radial stacks retain independent sectors, backgrounds, center labels and native selection', async () => {
  await mount(
    <UI.RadialBarChart
      data={[{ month: 'January', desktop: 30, mobile: 10 }]}
      endAngle={180}
      innerRadius={40}
      outerRadius={70}
    >
      <UI.PolarGrid gridType="circle" polarRadius={[40, 70]} />
      <UI.RadialBar dataKey="desktop" stackId="a" cornerRadius={4} background />
      <UI.RadialBar dataKey="mobile" stackId="a" fill="var(--color-mobile)" />
      <UI.PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
        <UI.ChartLabel
          content={({ viewBox }) => (
            <UI.ChartText x={viewBox.cx} y={viewBox.cy}>
              Total 40
            </UI.ChartText>
          )}
        />
      </UI.PolarRadiusAxis>
      <UI.ChartTooltip />
    </UI.RadialBarChart>,
  );
  expect(node('chart-radial-0-0').props.d).toContain('A');
  expect(node('chart-radial-1-0').props.d).not.toContain('NaN');
  expect(svgText(screen.getByRole('adjustable'))).toContain('Total 40');
  await fireEvent.press(node('chart-radial-1-0'));
  expect(screen.getByText('30')).toBeOnTheScreen();
  expect(screen.getByText('10')).toBeOnTheScreen();
});

test('polar grid keeps source ring order and paints its translucent background only once', async () => {
  await mount(
    <UI.RadarChart data={data}>
      <UI.PolarGrid
        gridType="circle"
        radialLines={false}
        polarRadius={[86, 74]}
        fill="#123456"
        fillOpacity={0.25}
        firstFill="#112233"
        lastFill="#ffffff"
      />
      <UI.Radar dataKey="desktop" />
    </UI.RadarChart>,
  );
  expect(node('chart-polar-grid-background').props.r).toBe(86);
  expect(node('chart-polar-grid-0').props.r).toBe(86);
  expect(node('chart-polar-grid-1').props.r).toBe(74);
  expect(
    screen.getAllByTestId('chart-polar-grid-background', { includeHiddenElements: true }),
  ).toHaveLength(1);
});
test('radial inside-start labels follow open native SVG arc paths, including full turns', async () => {
  const path = polarTextPath(50, 50, 30, 0, 360);
  expect(path.match(/A/g)).toHaveLength(3);
  expect(path).not.toMatch(/NaN|Infinity|Z/);
  expect(polarTextPath(50, 50, 30, 90, -90)).toContain(',1,');
  await mount(
    <UI.RadialBarChart data={data} innerRadius={30} outerRadius={90}>
      <UI.RadialBar dataKey="desktop">
        <UI.LabelList dataKey="month" position="insideStart" />
      </UI.RadialBar>
    </UI.RadialBarChart>,
  );
  expect(node('chart-radial-label-0').props.href).toContain('radial-label-');
  expect(svgText(screen.getByRole('adjustable'))).toContain('January');
});

test('native SVG labels apply inherited casing and preserve explicit child overrides', async () => {
  const { TSpan } = require('./.generated/src/native/charts');
  await mount(
    <UI.PieChart>
      <UI.Pie data={[{ value: 1 }]} dataKey="value">
        <UI.ChartLabel
          content={({ viewBox }) => (
            <UI.ChartText textTransform="uppercase" x={viewBox.cx} y={viewBox.cy}>
              <TSpan>desktop</TSpan>
              <TSpan textTransform="capitalize">mobile visits</TSpan>
              <TSpan textTransform="none">camelCase</TSpan>
            </UI.ChartText>
          )}
        />
      </UI.Pie>
    </UI.PieChart>,
  );
  expect(svgText(screen.getByRole('adjustable'))).toContain('DESKTOPMobile VisitscamelCase');
});
