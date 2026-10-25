import React, { createRef } from 'react';
import { TrendingUp } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import * as UI from './.generated';
import { nativePresetChartStyle } from './.generated/src/native/_preset-chart-style';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
import { styling } from './.generated/styling/src';
const names = [
  'vega',
  'nova',
  'maia',
  'lyra',
  'mira',
  'luma',
  'sera',
  'rhea',
  'default',
  'new-york',
  'new-york-v4',
] as const;
const records = [{ name: 'desktop', dataKey: 'desktop', value: 1234, color: '#123456' }];
for (const name of names) {
  test(`${name} tooltip retains source surface, radius, type and theme ring`, () => {
    for (const mode of ['light', 'dark'] as const) {
      const colors = {
        ...styling.registryThemes['theme-neutral'].native[mode],
        'destructive-foreground': '#ffffff',
      };
      const result = nativePresetChartStyle(name, { mode, radius: 10, colors });
      expect(result.view.paddingLeft ?? result.view.paddingHorizontal).toBe(10);
      expect(result.view.paddingTop ?? result.view.paddingVertical).toBe(6);
      expect(result.text.fontSize).toBe(12);
      expect(result.text.lineHeight).toBe(name === 'mira' ? 19.5 : 16);
      const ring = name === 'luma' || name === 'rhea' || name === 'sera';
      expect(result.view.backgroundColor).toBe(ring ? colors.popover : colors.background);
      expect(result.view.borderWidth ?? 0).toBe(ring ? 0 : 1);
      const radius =
        name === 'lyra' || name === 'sera'
          ? 0
          : name === 'luma' || name === 'rhea'
            ? 14
            : name === 'default' || name === 'new-york'
              ? 10
              : 10;
      expect(result.view.borderRadius ?? 0).toBeCloseTo(radius);
      expect((result.view.boxShadow as unknown[]).length).toBe(ring ? 3 : 2);
    }
  });
  test(`${name} rendered tooltip keeps formatter zero, small icons and source indicator typography`, async () => {
    const Icon = jest.fn(({ size }: { size?: number }) => <UI.Text>{'Icon ' + size}</UI.Text>),
      ref = createRef<View>();
    await render(
      <UI.ThemeProvider>
        <UI.NativeComponentStyleProvider style={name}>
          <UI.ChartContainer config={{ desktop: { label: 'Desktop', icon: Icon } }}>
            <UI.ChartTooltipContent
              ref={ref}
              testID="tip"
              active
              payload={records}
              label="January"
              labelFormatter={() => 0}
            />
            <UI.ChartLegendContent payload={records} />
          </UI.ChartContainer>
        </UI.NativeComponentStyleProvider>
      </UI.ThemeProvider>,
    );
    expect(ref.current).not.toBeNull();
    expect(screen.getByText('0')).toHaveStyle({
      fontWeight: '500',
      fontSize: 12,
      lineHeight: name === 'mira' ? 19.5 : 16,
    });
    expect(screen.getByText('Icon 10')).toBeOnTheScreen();
    expect(screen.getByText('Icon 12')).toBeOnTheScreen();
    expect(screen.getByText((1234).toLocaleString())).toHaveStyle({
      fontSize: 12,
      lineHeight: 12,
      fontWeight: '500',
      fontVariant: ['tabular-nums'],
    });
  });
}
test('chart roots, tooltip labels and legend accept caller native text styles and refs', async () => {
  const Container = withRegistryStyles(UI.ChartContainer),
    Tooltip = withRegistryStyles(UI.ChartTooltipContent),
    Legend = withRegistryStyles(UI.ChartLegendContent),
    ref = createRef<View>();
  await render(
    <UI.ThemeProvider>
      <Container
        ref={ref}
        testID="chart"
        config={{ desktop: { label: 'Desktop' } }}
        className="text-lg"
      >
        <UI.Text>Inherited chart type</UI.Text>
        <Tooltip
          testID="tip"
          active
          payload={records}
          label="January"
          className="text-sm p-0"
          labelStyle={{ fontSize: 20 }}
          textStyle={{ fontSize: 18 }}
        />
        <Legend payload={records} textStyle={{ fontSize: 17, lineHeight: 25 }} />
      </Container>
    </UI.ThemeProvider>,
  );
  expect(ref.current).not.toBeNull();
  expect(screen.getByText('Inherited chart type')).toHaveStyle({ fontSize: 18, lineHeight: 28 });
  expect(screen.getByText('January')).toHaveStyle({ fontSize: 20 });
  expect(screen.getByText((1234).toLocaleString())).toHaveStyle({ fontSize: 18, lineHeight: 18 });
  expect(StyleSheet.flatten(screen.getByTestId('tip').props.style).paddingTop).toBe(0);
  expect(
    screen
      .getAllByText('Desktop')
      .some((node) => StyleSheet.flatten(node.props.style).fontSize === 17),
  ).toBe(true);
});
test.each(['line', 'dashed'] as const)(
  '%s nested indicator retains stretched source geometry and label line-height',
  async (indicator) => {
    await render(
      <UI.ThemeProvider>
        <UI.ChartContainer config={{ desktop: { label: 'Desktop' } }}>
          <UI.ChartTooltipContent
            testID="tip"
            active
            payload={records}
            label="January"
            indicator={indicator}
          />
        </UI.ChartContainer>
      </UI.ThemeProvider>,
    );
    expect(screen.getByText('January')).toHaveStyle({ lineHeight: 12 });
    const style = StyleSheet.flatten(screen.getByTestId('tip-indicator-0').props.style);
    expect(style.alignSelf).toBe('stretch');
    expect(style.minHeight).toBeUndefined();
    expect(style.flexShrink).toBe(0);
    if (indicator === 'dashed')
      expect(style).toMatchObject({
        width: 0,
        borderWidth: 1.5,
        marginVertical: 2,
        backgroundColor: 'transparent',
        borderStyle: 'dashed',
      });
  },
);

test('custom chart icon functions inherit source glyph size even when they ignore component props', async () => {
  const Glyph = withRegistryStyles(TrendingUp, 'icon');
  function Icon() {
    return <Glyph testID="source-chart-icon" />;
  }
  await render(
    <UI.ThemeProvider>
      <UI.ChartContainer config={{ desktop: { label: 'Desktop', icon: Icon } }}>
        <UI.ChartTooltipContent active payload={records} />
        <UI.ChartLegendContent payload={records} />
      </UI.ChartContainer>
    </UI.ThemeProvider>,
  );
  const glyphs = screen.getAllByTestId('source-chart-icon', { includeHiddenElements: true });
  expect([
    ...new Set(
      glyphs
        .filter((node) => node.props.width !== undefined || node.props.height !== undefined)
        .map((node) => node.props.width + 'x' + node.props.height),
    ),
  ]).toEqual(['10x10', '12x12']);
});
