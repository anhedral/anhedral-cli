import React from 'react';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  NativeComponentStyleProvider,
  NativeRegistryPalette,
} from './.generated/src/native/_registry-context';
import { RegistryView } from './.generated/src/native/registry-styles';
import { withAlpha } from './.generated/src/native/_core';
beforeEach(() => jest.clearAllMocks());
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);
const presets = {
  vega: 6.4,
  nova: 6.4,
  maia: 11.2,
  lyra: 0,
  mira: 6.4,
  luma: 14.4,
  sera: 0,
  rhea: 14.4,
  default: 6,
  'new-york': 6,
  'new-york-v4': 6.4,
} as const;
for (const [style, radius] of Object.entries(presets))
  test(`${style} Skeleton retains source geometry and explicit native overrides`, async () => {
    await mount(
      <NativeComponentStyleProvider style={style as keyof typeof presets}>
        <UI.Skeleton testID="source" />
        <UI.Skeleton
          testID="override"
          style={{ height: 17, borderRadius: 3, backgroundColor: '#123456' }}
        />
      </NativeComponentStyleProvider>,
    );
    const source = StyleSheet.flatten(screen.getByTestId('source').props.style);
    expect(source.borderRadius).toBeCloseTo(radius);
    expect(source.minHeight).toBeUndefined();
    expect(screen.getByTestId('override')).toHaveStyle({
      height: 17,
      borderRadius: 3,
      backgroundColor: '#123456',
    });
  });
test('frozen Skeleton generations retain their distinct colors and source scopes override outer component styles', async () => {
  function Sample() {
    const { colors } = UI.useTheme();
    return (
      <>
        <UI.Text testID="palette">{JSON.stringify(colors)}</UI.Text>
        <NativeComponentStyleProvider style="maia">
          {(['default', 'new-york', 'new-york-v4'] as const).map((source) => (
            <NativeRegistryPalette
              key={source}
              source={source}
              generation={source === 'new-york-v4' ? 'modern' : 'legacy'}
            >
              <UI.Skeleton testID={source} />
            </NativeRegistryPalette>
          ))}
        </NativeComponentStyleProvider>
      </>
    );
  }
  await mount(<Sample />);
  const colors = JSON.parse(String(screen.getByTestId('palette').props.children));
  expect(screen.getByTestId('default')).toHaveStyle({
    backgroundColor: colors.muted,
    borderRadius: 6,
  });
  expect(screen.getByTestId('new-york')).toHaveStyle({
    backgroundColor: withAlpha(colors.primary, 0.1),
  });
  expect(screen.getByTestId('new-york-v4')).toHaveStyle({
    backgroundColor: colors.accent,
    borderRadius: 6.4,
  });
});
test('Skeleton pulse uses the source duration and opacity, stops for reduced motion and releases its animation', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const subscribe = jest.spyOn(AccessibilityInfo, 'addEventListener');
  const timing = jest.spyOn(Animated, 'timing'),
    loop = jest.spyOn(Animated, 'loop');
  try {
    const tree = await mount(<UI.Skeleton testID="pulse" />);
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0.5, duration: 1000, useNativeDriver: true }),
    );
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1, duration: 1000, useNativeDriver: true }),
    );
    const stop = jest.spyOn(loop.mock.results[0]!.value, 'stop');
    const update = (subscribe.mock.calls as unknown as [string, (value: boolean) => void][]).find(
      ([name]) => name === 'reduceMotionChanged',
    )![1] as (value: boolean) => void;
    await act(() => update(true));
    expect(stop).toHaveBeenCalled();
    const calls = loop.mock.calls.length;
    await act(() => update(false));
    expect(loop.mock.calls).toHaveLength(calls + 1);
    const finalStop = jest.spyOn(loop.mock.results.at(-1)!.value, 'stop');
    await tree.unmount();
    expect(finalStop).toHaveBeenCalled();
  } finally {
    jest.restoreAllMocks();
  }
});
test('live motion preference wins over an older pending query and failed preference reads stay static', async () => {
  let resolve!: (value: boolean) => void;
  const query = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const subscribe = jest.spyOn(AccessibilityInfo, 'addEventListener'),
    loop = jest.spyOn(Animated, 'loop');
  try {
    const tree = await mount(<UI.Skeleton />);
    const update = (subscribe.mock.calls as unknown as [string, (value: boolean) => void][]).find(
      ([name]) => name === 'reduceMotionChanged',
    )![1] as (value: boolean) => void;
    await act(() => update(true));
    await act(() => resolve(false));
    expect(loop).not.toHaveBeenCalled();
    await tree.unmount();
    query.mockRejectedValueOnce(Error('Unavailable native preference'));
    const failed = await mount(<UI.Skeleton />);
    expect(loop).not.toHaveBeenCalled();
    await failed.unmount();
  } finally {
    jest.restoreAllMocks();
  }
});
test('authored raw pulse utilities animate on native hosts and an explicit opacity remains authoritative', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const loop = jest.spyOn(Animated, 'loop');
  try {
    await mount(
      <>
        <RegistryView testID="raw" className="animate-pulse bg-muted" />
        <RegistryView testID="opacity" className="animate-pulse" style={{ opacity: 0.7 }} />
      </>,
    );
    expect(loop).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('opacity')).toHaveStyle({ opacity: 0.7 });
  } finally {
    jest.restoreAllMocks();
  }
});

test.each(['light', 'dark'] as const)(
  'Skeleton source colors retain every style in %s mode',
  (mode) => {
    const { nativePresetSkeletonStyle } = require('./.generated/src/native/_preset-skeleton-style');
    const colors = {
      muted: mode === 'light' ? '#cccccc' : '#222222',
      primary: mode === 'light' ? '#112233' : '#ddeeff',
      accent: mode === 'light' ? '#aabbcc' : '#223344',
    };
    for (const style of Object.keys(presets)) {
      const result = nativePresetSkeletonStyle(style, { mode, colors, radius: 8 });
      expect(result.view.backgroundColor).toBe(
        style === 'new-york'
          ? withAlpha(colors.primary, 0.1)
          : style === 'new-york-v4'
            ? colors.accent
            : colors.muted,
      );
      expect(result.paint.pulse).toBe(1);
    }
  },
);
for (const generation of ['default', 'new-york', 'new-york-v4'])
  test(`${generation} authored SkeletonCard retains source dimensions and caller radius`, async () => {
    const Component = require(`./.generated/src/examples/${generation}/skeleton-card`).default;
    await mount(<Component />);
    const shapes = screen.getAllByLabelText('Loading content');
    expect(shapes).toHaveLength(3);
    expect(shapes[0]).toHaveStyle({
      width: 250,
      height: 125,
      borderRadius: generation === 'new-york-v4' ? 11.2 : 12,
    });
    expect(shapes[1]).toHaveStyle({ width: 250, height: 16 });
    expect(shapes[2]).toHaveStyle({ width: 200, height: 16 });
  });
for (const base of ['base', 'radix', 'aria'])
  for (const style of ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
    test(`${base}/${style} authored Skeleton sections render with native source presets`, async () => {
      const Component = require(`./.generated/src/examples/${base}/skeleton-example`).default;
      await mount(
        <NativeComponentStyleProvider style={style}>
          <Component />
        </NativeComponentStyleProvider>,
      );
      for (const title of ['Avatar', 'Card', 'Text', 'Form', 'Table'])
        expect(screen.getByText(title)).toBeOnTheScreen();
      expect(screen.getAllByLabelText('Loading content').length).toBeGreaterThan(5);
    });

test('Skeleton safely renders authored native text children', async () => {
  await mount(<UI.Skeleton>Pending content</UI.Skeleton>);
  expect(screen.getByText('Pending content')).toBeOnTheScreen();
});
