import React from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, processColor } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import * as UI from './.generated';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
import { NativeTextStyleProvider } from './.generated/src/native/_core';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
const StyledSpinner = withRegistryStyles(UI.Spinner);
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);
type Node = { type: string; props: Record<string, unknown>; children?: unknown[] };
function nodes(value: unknown): Node[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(nodes);
  const node = value as Node;
  return [node, ...(node.children ?? []).flatMap(nodes)];
}
const glyphs = () =>
  nodes(screen.toJSON()).filter((n) => n.props.d === 'M21 12a9 9 0 1 1-6.219-8.56');
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());
for (const style of ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
  for (const mode of ['light', 'dark'] as const)
    test(`${style} ${mode} Spinner uses the authored glyph, default dimensions and semantic foreground`, async () => {
      let expected: string | undefined;
      function Sample() {
        const theme = UI.useTheme();
        expected = theme.colors.foreground;
        React.useLayoutEffect(() => theme.setPreference(mode), []);
        return <UI.Spinner testID="spinner" />;
      }
      await render(
        <UI.ThemeProvider>
          <UI.NativeComponentStyleProvider style={style}>
            <Sample />
          </UI.NativeComponentStyleProvider>
        </UI.ThemeProvider>,
      );
      expect(screen.getByRole('progressbar', { name: 'Loading' })).toHaveStyle({
        width: 16,
        height: 16,
      });
      expect(glyphs()).toHaveLength(1);
      expect(glyphs()[0]!.props.stroke).toEqual({ type: 0, payload: processColor(expected) });
      expect(
        nodes(screen.toJSON()).some(
          (n) => n.props.importantForAccessibility === 'no-hide-descendants',
        ),
      ).toBe(true);
    });
for (const source of ['default', 'new-york', 'new-york-v4'] as const)
  test(`${source} Spinner retains the frozen source size without introducing component preset paint`, async () => {
    await mount(
      <NativeRegistryPalette
        source={source}
        generation={source === 'new-york-v4' ? 'modern' : 'legacy'}
      >
        <UI.Spinner testID="spinner" />
      </NativeRegistryPalette>,
    );
    expect(screen.getByTestId('spinner')).toHaveStyle({ width: 16, height: 16 });
    expect(glyphs()).toHaveLength(1);
  });
test('Spinner keeps explicit colors, inherited text paint, real glyph sizes, stroke and native refs', async () => {
  const release = jest.fn(),
    ref = jest.fn(() => release);
  const tree = await mount(
    <NativeTextStyleProvider value={{ style: { color: '#123456' } }}>
      <UI.Spinner testID="inherited" />
      <UI.Spinner
        testID="explicit"
        size={37}
        color="rgba(4, 5, 6, 0.3)"
        strokeWidth={3}
        ref={ref}
      />
      <StyledSpinner
        testID="classes"
        className="size-8 text-red-500 stroke-1"
        style={{ width: 41, height: 29 }}
      />
    </NativeTextStyleProvider>,
  );
  expect(screen.getByTestId('explicit')).toHaveStyle({ width: 37, height: 37 });
  expect(screen.getByTestId('classes')).toHaveStyle({ width: 41, height: 29 });
  expect(glyphs()[0]!.props.stroke).toEqual({ type: 0, payload: processColor('#123456') });
  expect(glyphs()[1]!.props.stroke).toEqual({
    type: 0,
    payload: processColor('rgba(4, 5, 6, 0.3)'),
  });
  expect(Number(glyphs()[1]!.props.strokeWidth)).toBe(3);
  expect(Number(glyphs()[2]!.props.strokeWidth)).toBe(1);
  expect(glyphs()[2]!.props.stroke).not.toEqual({ type: 0, payload: processColor('#123456') });
  expect(ref).toHaveBeenCalledTimes(1);
  await tree.unmount();
  expect(release).toHaveBeenCalledTimes(1);
});
test('Spinner source animation has one one-second linear rotation, reacts to reduced motion and releases resources', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const subscribe = jest.spyOn(AccessibilityInfo, 'addEventListener'),
    loop = jest.spyOn(Animated, 'loop'),
    timing = jest.spyOn(Animated, 'timing');
  const tree = await mount(<StyledSpinner className="animate-spin" testID="spinner" />);
  expect(loop).toHaveBeenCalledTimes(1);
  expect(timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }),
  );
  const stop = jest.spyOn(loop.mock.results[0]!.value, 'stop');
  const update = (subscribe.mock.calls as unknown as [string, (value: boolean) => void][]).find(
    ([name]) => name === 'reduceMotionChanged',
  )![1];
  await act(() => update(true));
  expect(stop).toHaveBeenCalled();
  expect(StyleSheet.flatten(screen.getByTestId('spinner').props.style).transform).toBeUndefined();
  await act(() => update(false));
  expect(loop).toHaveBeenCalledTimes(2);
  const finalStop = jest.spyOn(loop.mock.results.at(-1)!.value, 'stop');
  await tree.unmount();
  expect(finalStop).toHaveBeenCalled();
});
test('animate-none keeps loading visible while logical stop/hide remains explicit', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const loop = jest.spyOn(Animated, 'loop');
  const tree = await mount(
    <>
      <StyledSpinner testID="static" className="animate-none" />
      <UI.Spinner animating={false} />
      <UI.Spinner
        testID="stopped"
        animating={false}
        hidesWhenStopped={false}
        accessibilityLabel="Waiting for connection"
      />
    </>,
  );
  expect(loop).not.toHaveBeenCalled();
  expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  expect(screen.getByRole('progressbar', { name: 'Waiting for connection' })).toBeOnTheScreen();
  expect(screen.getByTestId('static')).toBeOnTheScreen();
  await tree.unmount();
});
test.each([
  ['small', 20],
  ['large', 36],
  [0, 0],
] as const)('native compatibility size %s has real glyph geometry', async (size, dimension) => {
  await mount(<UI.Spinner size={size} testID="spinner" />);
  expect(screen.getByTestId('spinner')).toHaveStyle({ width: dimension, height: dimension });
});
test('Spinner is a real source icon inside Button and Badge with explicit native dimensions authoritative', async () => {
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <UI.Button>
        <StyledSpinner testID="button" />
        Working
      </UI.Button>
      <UI.Badge>
        <StyledSpinner testID="badge" className="size-6" />
        Badge
      </UI.Badge>
      <UI.Badge>
        <StyledSpinner testID="override" style={{ width: 19, height: 19 }} />
        Badge
      </UI.Badge>
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.getByTestId('button')).toHaveStyle({ width: 16, height: 16 });
  expect(screen.getByTestId('badge')).toHaveStyle({ width: 12, height: 12 });
  expect(screen.getByTestId('override')).toHaveStyle({ width: 19, height: 19 });
});

test('authored spinner sizes and colors control actual glyph geometry and paint', async () => {
  const Sizes = require('./.generated/src/examples/new-york-v4/spinner-size').default;
  const Colors = require('./.generated/src/examples/new-york-v4/spinner-color').default;
  const view = await mount(<Sizes />);
  expect(
    screen.getAllByRole('progressbar').map((n) => StyleSheet.flatten(n.props.style).width),
  ).toEqual([12, 16, 24, 32]);
  await view.rerender(
    <UI.ThemeProvider>
      <Colors />
    </UI.ThemeProvider>,
  );
  expect(
    screen.getAllByRole('progressbar').map((n) => StyleSheet.flatten(n.props.style).width),
  ).toEqual([24, 24, 24, 24, 24]);
  expect(new Set(glyphs().map((n) => JSON.stringify(n.props.stroke))).size).toBe(5);
});
test('authored custom glyph retains native loading semantics and one reduced-motion-aware spin', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const loop = jest.spyOn(Animated, 'loop');
  const Custom = require('./.generated/src/examples/new-york-v4/spinner-custom').default;
  await mount(<Custom />);
  expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeOnTheScreen();
  expect(loop).toHaveBeenCalledTimes(1);
});

test('a custom spinner fails static on unavailable motion preferences and ignores an older query after a live event', async () => {
  let resolve!: (value: boolean) => void;
  const query = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const subscribe = jest.spyOn(AccessibilityInfo, 'addEventListener'),
    loop = jest.spyOn(Animated, 'loop');
  const Custom = require('./.generated/src/examples/new-york-v4/spinner-custom').default;
  const tree = await mount(<Custom />);
  const update = (subscribe.mock.calls as unknown as [string, (value: boolean) => void][])
    .filter(([name]) => name === 'reduceMotionChanged')
    .at(-1)![1];
  await act(() => update(true));
  await act(() => resolve(false));
  expect(loop).not.toHaveBeenCalled();
  await tree.unmount();
  query.mockRejectedValue(Error('Native preference unavailable'));
  await mount(<Custom />);
  expect(loop).not.toHaveBeenCalled();
});

for (const [name, count] of [
  ['spinner-basic', 1],
  ['spinner-button', 3],
  ['spinner-badge', 3],
] as const)
  test(`${name} retains every authored glyph with its component dimensions and colors`, async () => {
    const Component = require(`./.generated/src/examples/new-york-v4/${name}`).default;
    await mount(<Component />);
    expect(glyphs()).toHaveLength(count);
    const indicators = screen.getAllByRole('progressbar');
    expect(indicators).toHaveLength(count);
    expect(indicators.map((n) => StyleSheet.flatten(n.props.style).width)).toEqual(
      Array(count).fill(name === 'spinner-badge' ? 12 : 16),
    );
    for (const [index, text] of (name === 'spinner-button'
      ? ['Loading...', 'Please wait', 'Processing']
      : name === 'spinner-badge'
        ? ['Syncing', 'Updating', 'Processing']
        : []
    ).entries()) {
      const color = StyleSheet.flatten(screen.getByText(text).props.style).color;
      expect(glyphs()[index]!.props.stroke).toEqual({ type: 0, payload: processColor(color) });
    }
  });

test('Badge sizes only direct glyphs and transparent fragments; nested native containers retain authored sizes', async () => {
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <UI.Badge>
        <>
          <StyledSpinner testID="direct" className="size-6" />
        </>
        <View>
          <StyledSpinner testID="nested" className="size-6" />
        </View>
      </UI.Badge>
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.getByTestId('direct')).toHaveStyle({ width: 12, height: 12 });
  expect(screen.getByTestId('nested')).toHaveStyle({ width: 24, height: 24 });
});
