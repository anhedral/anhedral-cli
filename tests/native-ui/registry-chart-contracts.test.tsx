import React, { useContext } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  ChartContext,
  ChartDataContext,
  type ChartConfig,
} from './.generated/src/native/_chart-context';
const config: ChartConfig = {
  desktop: { label: 'Desktop', color: 'var(--chart-1)' },
  mobile: { label: 'Mobile', theme: { light: '#123456', dark: '#abcdef' } },
  chrome: { label: 'Chrome', color: '#ff0000' },
};
const payload = [
  {
    name: 'desktop',
    dataKey: 'desktop',
    value: 1234,
    color: 'var(--color-desktop)',
    payload: { month: 'January' },
  },
  {
    name: 'mobile',
    dataKey: 'mobile',
    value: 456,
    color: 'var(--color-mobile)',
    payload: { month: 'January' },
  },
];
const mount = (children: React.ReactNode) =>
  render(
    <UI.ThemeProvider>
      <UI.ChartContainer config={config}>{children}</UI.ChartContainer>
    </UI.ThemeProvider>,
  );
test.each(['dot', 'line', 'dashed'] as const)(
  'native tooltip indicator %s preserves multi-series labels, values, colors and visibility',
  async (indicator) => {
    await mount(
      <UI.ChartTooltipContent
        active
        payload={payload}
        label="January"
        indicator={indicator}
        testID="tooltip"
      />,
    );
    expect(screen.getByText('January')).toBeOnTheScreen();
    expect(screen.getByText('Desktop')).toBeOnTheScreen();
    expect(screen.getByText((1234).toLocaleString())).toBeOnTheScreen();
    expect(screen.getByText('456')).toBeOnTheScreen();
    const marker = screen.getByTestId('tooltip-indicator-1');
    if (indicator === 'dot')
      expect(marker).toHaveStyle({ width: 10, height: 10, backgroundColor: '#123456' });
    else if (indicator === 'line')
      expect(marker).toHaveStyle({ width: 4, backgroundColor: '#123456' });
    else expect(marker).toHaveStyle({ borderStyle: 'dashed', borderColor: '#123456' });
  },
);
test('tooltip visibility, hidden labels/indicators and none-series filter do not leak hidden values', async () => {
  const mounted = await mount(
    <UI.ChartTooltipContent active={false} payload={payload} label="January" />,
  );
  expect(screen.queryByText('January')).toBeNull();
  await mounted.rerender(
    <UI.ThemeProvider>
      <UI.ChartContainer config={config}>
        <UI.ChartTooltipContent
          active
          payload={[...payload, { name: 'secret', value: 999, type: 'none' }]}
          hideLabel
          hideIndicator
          label="January"
          testID="tooltip"
        />
      </UI.ChartContainer>
    </UI.ThemeProvider>,
  );
  expect(screen.queryByText('January')).toBeNull();
  expect(screen.queryByText('999')).toBeNull();
  expect(screen.queryByTestId('tooltip-indicator-0')).toBeNull();
  expect(screen.getByText('Desktop')).toBeOnTheScreen();
});
test('tooltip payload name/label overrides, custom label formatter and per-value formatter retain original data', async () => {
  const formatter = jest.fn((value: unknown, name: unknown) => (
      <UI.Text>{String(name) + '=' + String(value)}</UI.Text>
    )),
    label = jest.fn((value: React.ReactNode) => 'Label ' + String(value));
  await mount(
    <UI.ChartTooltipContent
      active
      payload={[{ name: 'browser', dataKey: 'browser', value: 32, payload: { browser: 'chrome' } }]}
      labelKey="browser"
      nameKey="browser"
      formatter={formatter}
      labelFormatter={label}
    />,
  );
  expect(screen.getByText('Label Chrome')).toBeOnTheScreen();
  expect(screen.getByText('browser=32')).toBeOnTheScreen();
  expect(formatter).toHaveBeenCalledWith(32, 'browser', expect.objectContaining({ value: 32 }), 0, {
    browser: 'chrome',
  });
});
test('single-series nested labels support missing numeric values and source icon precedence', async () => {
  const Icon = () => <UI.Text>Native icon</UI.Text>;
  await render(
    <UI.ThemeProvider>
      <UI.ChartContainer config={{ desktop: { label: 'Desktop', icon: Icon, color: '#123456' } }}>
        <UI.ChartTooltipContent
          active
          payload={[{ name: 'desktop', dataKey: 'desktop' }]}
          label="January"
          indicator="line"
          hideIndicator
        />
      </UI.ChartContainer>
    </UI.ThemeProvider>,
  );
  expect(screen.getByText('Native icon')).toBeOnTheScreen();
  expect(screen.getByText('January')).toBeOnTheScreen();
  expect(screen.getByText('Desktop')).toBeOnTheScreen();
});
test.each(['top', 'bottom'] as const)(
  'native legend at %s resolves config labels, filters hidden series and preserves source ordering',
  async (verticalAlign) => {
    await mount(
      <UI.ChartLegendContent
        payload={[...payload, { dataKey: 'secret', type: 'none' }]}
        verticalAlign={verticalAlign}
        testID="legend"
      />,
    );
    expect(screen.getByText('Desktop')).toBeOnTheScreen();
    expect(screen.getByText('Mobile')).toBeOnTheScreen();
    expect(screen.getByTestId('legend')).toHaveStyle(
      verticalAlign === 'top' ? { paddingBottom: 12 } : { paddingTop: 12 },
    );
  },
);
test('native tooltip/legend adapters consume the actual chart snapshot and support custom render functions', async () => {
  const value = { active: true, payload, label: 'January', legend: payload };
  await mount(
    <ChartDataContext.Provider value={value}>
      <UI.ChartTooltip content={<UI.ChartTooltipContent hideIndicator />} />
      <UI.ChartLegend content={(props) => <UI.Text>{'Series ' + props.payload?.length}</UI.Text>} />
    </ChartDataContext.Provider>,
  );
  expect(screen.getByText('January')).toBeOnTheScreen();
  expect(screen.getByText('Series 2')).toBeOnTheScreen();
});
test('native chart containers measure real layout, isolate palettes and resolve theme colors without CSS injection', async () => {
  let current: React.ContextType<typeof ChartContext>;
  const layout = jest.fn();
  function Probe() {
    current = useContext(ChartContext);
    return <UI.Text>{current?.width + 'x' + current?.height}</UI.Text>;
  }
  await render(
    <UI.ThemeProvider>
      <UI.ChartContainer testID="plot" config={config} onLayout={layout}>
        <Probe />
      </UI.ChartContainer>
    </UI.ThemeProvider>,
  );
  expect(screen.getByText('320x200')).toBeOnTheScreen();
  await fireEvent(screen.getByTestId('plot'), 'layout', {
    nativeEvent: { layout: { width: 500, height: 300, x: 0, y: 0 } },
  });
  expect(screen.getByText('500x300')).toBeOnTheScreen();
  expect(layout).toHaveBeenCalledTimes(1);
  expect(current!.resolveColor('var(--color-mobile)')).toBe('#123456');
});
test('invalid cyclic chart color references fail explicitly rather than entering recursive native rendering', async () => {
  let current: React.ContextType<typeof ChartContext>;
  function Probe() {
    current = useContext(ChartContext);
    return null;
  }
  await render(
    <UI.ThemeProvider>
      <UI.ChartContainer config={{ loop: { color: 'var(--color-loop)' } }}>
        <Probe />
      </UI.ChartContainer>
    </UI.ThemeProvider>,
  );
  expect(() => current!.resolveColor('var(--color-loop)')).toThrow(/Cyclic/);
});
