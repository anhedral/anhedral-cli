import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet, Platform } from 'react-native';
import * as UI from './.generated';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
import { IconPlaceholder } from './.generated/src/native/registry-example';
const Glyph = withRegistryStyles(IconPlaceholder, 'icon');
const mount = (
  children: React.ReactNode,
  family: 'base' | 'aria' | 'radix' | 'default' | 'new-york' | 'new-york-v4' = 'base',
) =>
  render(
    <UI.ThemeProvider>
      <NativeRegistryPalette
        source={family}
        generation={family === 'default' || family === 'new-york' ? 'legacy' : 'modern'}
      >
        {children}
      </NativeRegistryPalette>
    </UI.ThemeProvider>,
  );
const bitmap = (id = 'photo') => screen.getByTestId(id, { includeHiddenElements: true });
async function finishFilter(id = 'photo') {
  if (Platform.OS === 'android') {
    expect(screen.getByTestId(id + '-native-filter')).toBeTruthy();
    return;
  }
  await fireEvent(screen.getByTestId(id + '-svg-source', { includeHiddenElements: true }), 'load', {
    nativeEvent: { source: { width: 80, height: 40 } },
  });
}
const loaded = { nativeEvent: { source: { width: 80, height: 40 } } },
  failed = { nativeEvent: { error: 'offline' } };
test.each(['base', 'radix', 'aria'] as const)(
  '%s Avatar retains its source image loading and fallback policy',
  async (family) => {
    const status = jest.fn();
    await mount(
      <UI.Avatar testID="avatar">
        <UI.AvatarImage
          source={{ uri: 'https://example.test/avatar.png' }}
          alt="Portrait"
          testID="photo"
          onLoadingStatusChange={status}
        />
        <UI.AvatarFallback testID="fallback">AB</UI.AvatarFallback>
        <UI.AvatarBadge testID="badge">
          <Glyph lucide="CheckIcon" testID="glyph" />
        </UI.AvatarBadge>
      </UI.Avatar>,
      family,
    );
    expect(!!screen.queryByText('AB')).toBe(family !== 'aria');
    if (family !== 'aria') expect(status).toHaveBeenLastCalledWith('loading');
    else expect(status).not.toHaveBeenCalled();
    await fireEvent(bitmap(), 'load', loaded);
    expect(screen.queryByText('AB')).toBeNull();
    expect(screen.getByRole('image', { name: 'Portrait' })).toBeTruthy();
    await fireEvent(bitmap(), 'error', failed);
    expect(screen.getByText('AB')).toBeTruthy();
    if (family !== 'aria')
      expect(status.mock.calls.map((args) => args[0])).toEqual(['loading', 'loaded', 'error']);
    expect(StyleSheet.flatten(screen.getByTestId('badge').props.style)).toMatchObject({
      width: 10,
      height: 10,
      bottom: 0,
      right: 0,
    });
  },
);
test('Aria peer fallback depends only on preceding direct images and remains visible without a peer', async () => {
  await mount(
    <>
      <UI.Avatar>
        <UI.AvatarFallback>Before</UI.AvatarFallback>
        <UI.AvatarImage source={{ uri: 'https://example.test/avatar.png' }} testID="photo" />
        <UI.AvatarFallback>After</UI.AvatarFallback>
      </UI.Avatar>
      <UI.Avatar>
        <UI.AvatarFallback>No peer</UI.AvatarFallback>
      </UI.Avatar>
    </>,
    'aria',
  );
  expect(screen.getByText('Before')).toBeTruthy();
  expect(screen.getByText('No peer')).toBeTruthy();
  expect(screen.queryByText('After')).toBeNull();
  await fireEvent(bitmap(), 'error', failed);
  expect(screen.getByText('After')).toBeTruthy();
});
test.each([
  ['base', 'delay'],
  ['radix', 'delayMs'],
] as const)(
  '%s fallback retains its actual primitive delay prop and cleans up timers',
  async (family, prop) => {
    jest.useFakeTimers();
    try {
      const scheduled = jest.spyOn(globalThis, 'setTimeout'),
        cleared = jest.spyOn(globalThis, 'clearTimeout');
      const view = await mount(
        <UI.Avatar>
          <UI.AvatarFallback {...{ [prop]: 100 }}>Delayed</UI.AvatarFallback>
        </UI.Avatar>,
        family,
      );
      expect(screen.queryByText('Delayed')).toBeNull();
      await act(() => jest.advanceTimersByTime(99));
      expect(screen.queryByText('Delayed')).toBeNull();
      await act(() => jest.advanceTimersByTime(1));
      expect(screen.getByText('Delayed')).toBeTruthy();
      await view.unmount();
      const index = scheduled.mock.calls.findIndex((args) => args[1] === 100);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(cleared).toHaveBeenCalledWith(scheduled.mock.results[index]!.value);
      scheduled.mockRestore();
      cleared.mockRestore();
    } finally {
      jest.useRealTimers();
    }
  },
);
test('Base resets primitive image status on image unmount so fallback returns', async () => {
  const frame = (image: boolean) => (
    <UI.ThemeProvider>
      <UI.Avatar>
        {image && (
          <UI.AvatarImage source={{ uri: 'https://example.test/avatar.png' }} testID="photo" />
        )}
        <UI.AvatarFallback>Fallback</UI.AvatarFallback>
      </UI.Avatar>
    </UI.ThemeProvider>
  );
  const view = await render(frame(true));
  await fireEvent(bitmap(), 'load', loaded);
  expect(screen.queryByText('Fallback')).toBeNull();
  await view.rerender(frame(false));
  expect(screen.getByText('Fallback')).toBeTruthy();
});
test('native source replacement, filtered completion ordering and stale callbacks cannot hide the wrong fallback', async () => {
  const onLoad = jest.fn();
  const frame = (uri: string) => (
    <UI.ThemeProvider>
      <UI.Avatar>
        <UI.AvatarImage source={{ uri }} grayscale testID="photo" alt="Portrait" onLoad={onLoad} />
        <UI.AvatarFallback>Fallback</UI.AvatarFallback>
      </UI.Avatar>
    </UI.ThemeProvider>
  );
  const view = await render(frame('https://example.test/first.png')),
    oldLoad = bitmap().props.onLoad,
    oldFilter =
      Platform.OS === 'android'
        ? undefined
        : screen.getByTestId('photo-svg-source', { includeHiddenElements: true }).props.onLoad;
  await finishFilter();
  expect(screen.getByText('Fallback')).toBeTruthy();
  await fireEvent(bitmap(), 'load', loaded);
  expect(screen.queryByText('Fallback')).toBeNull();
  await view.rerender(frame('https://example.test/second.png'));
  await act(() => {
    oldLoad(loaded);
    oldFilter?.(loaded);
  });
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Fallback')).toBeTruthy();
  await fireEvent(bitmap(), 'error', failed);
  await finishFilter();
  expect(screen.getByText('Fallback')).toBeTruthy();
});
test.each([
  'nova',
  'vega',
  'maia',
  'lyra',
  'mira',
  'luma',
  'sera',
  'rhea',
  'default',
  'new-york',
  'new-york-v4',
] as const)(
  '%s Avatar group count, direct root rings and all source sizes retain geometry',
  async (style) => {
    await mount(
      <UI.NativeComponentStyleProvider style={style}>
        <UI.AvatarGroup testID="group">
          <UI.Avatar size="lg" testID="large">
            <UI.AvatarFallback>Large</UI.AvatarFallback>
          </UI.Avatar>
          <UI.Avatar size="sm" testID="small">
            <UI.AvatarFallback>Small</UI.AvatarFallback>
            <UI.AvatarBadge testID="small-badge">
              <Glyph lucide="CheckIcon" testID="small-icon" />
            </UI.AvatarBadge>
          </UI.Avatar>
          <UI.AvatarGroupCount testID="count">
            <Glyph lucide="PlusIcon" testID="count-icon" />
          </UI.AvatarGroupCount>
        </UI.AvatarGroup>
      </UI.NativeComponentStyleProvider>,
      style === 'default' || style === 'new-york' || style === 'new-york-v4' ? style : 'base',
    );
    const frozen = style === 'default' || style === 'new-york';
    expect(screen.getByTestId('large')).toHaveStyle({ width: 40, height: 40 });
    expect(screen.getByTestId('small')).toHaveStyle({
      width: frozen ? 40 : 24,
      height: frozen ? 40 : 24,
      marginStart: -8,
    });
    expect(screen.getByTestId('count')).toHaveStyle({ width: 24, height: 24, marginStart: -8 });
    expect(screen.queryByTestId('small-icon')).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('large').props.style).boxShadow).toEqual(
      expect.arrayContaining([expect.objectContaining({ spreadDistance: 2 })]),
    );
  },
);
test('a stalled native Avatar filter returns to its fallback at the native renderer deadline and clears its timer', async () => {
  jest.useFakeTimers();
  try {
    await mount(
      <UI.Avatar>
        <UI.AvatarImage
          source={{ uri: 'https://example.test/avatar.png' }}
          grayscale
          testID="photo"
          alt="Portrait"
        />
        <UI.AvatarFallback>Fallback</UI.AvatarFallback>
      </UI.Avatar>,
    );
    await fireEvent(bitmap(), 'load', loaded);
    await act(() => jest.advanceTimersByTime(30_000));
    if (Platform.OS === 'android') expect(screen.queryByText('Fallback')).toBeNull();
    else {
      expect(screen.getByText('Fallback')).toBeTruthy();
      await finishFilter();
      expect(screen.getByText('Fallback')).toBeTruthy();
    }
  } finally {
    jest.useRealTimers();
  }
});
test('decorative Avatar bitmaps and grayscale images stay outside native accessibility', async () => {
  await mount(
    <>
      <UI.Avatar>
        <UI.AvatarImage
          source={{ uri: 'https://example.test/avatar.png' }}
          testID="decorative"
          alt=""
        />
      </UI.Avatar>
      <UI.Avatar>
        <UI.AvatarImage
          source={{ uri: 'https://example.test/avatar.png' }}
          testID="decorative-gray"
          alt=""
          grayscale
        />
      </UI.Avatar>
    </>,
  );
  await fireEvent(bitmap('decorative'), 'load', loaded);
  await fireEvent(bitmap('decorative-gray'), 'load', loaded);
  await finishFilter('decorative-gray');
  expect(screen.queryAllByRole('image')).toHaveLength(0);
});
test('frozen Avatar text inherits source body metrics and image fit differs from explicit modern object-cover', async () => {
  for (const family of ['default', 'new-york', 'new-york-v4', 'base'] as const) {
    const view = await mount(
      <UI.Avatar>
        <UI.AvatarImage testID="photo" source={{ uri: 'https://example.test/avatar.png' }} />
        <UI.AvatarFallback>Initials</UI.AvatarFallback>
      </UI.Avatar>,
      family,
    );
    expect(bitmap().props.resizeMode).toBe(family === 'base' ? 'cover' : 'stretch');
    expect(StyleSheet.flatten(screen.getByText('Initials').props.style)).toMatchObject({
      fontSize: family === 'default' || family === 'new-york' ? 16 : 14,
      lineHeight: family === 'default' || family === 'new-york' ? 24 : 20,
    });
    await view.unmount();
  }
});
test('unmounted native image callbacks cannot call the consumer or register completion into a removed Avatar', async () => {
  const onLoad = jest.fn(),
    onError = jest.fn();
  const view = await mount(
    <UI.Avatar>
      <UI.AvatarImage
        testID="photo"
        source={{ uri: 'https://example.test/avatar.png' }}
        onLoad={onLoad}
        onError={onError}
      />
    </UI.Avatar>,
  );
  const load = bitmap().props.onLoad,
    error = bitmap().props.onError;
  await view.unmount();
  await act(() => {
    load(loaded);
    error(failed);
  });
  expect(onLoad).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
});
test('all thirty reviewed Avatar class slots are consumed by the native renderer', async () => {
  const presets = require('./.generated/src/native/_preset-avatar-style'),
    { nativeAvatarPresetSource: source } = require('./.generated/src/native/_avatar-presets'),
    actual = presets.nativePresetAvatarStyle,
    seen = new Set<string>();
  const spy = jest
    .spyOn(presets, 'nativePresetAvatarStyle')
    .mockImplementation((...args: any[]) => {
      const result = actual(...args);
      seen.add(result.source + '/' + args[1]);
      return result;
    });
  try {
    for (const family of Object.keys(source.sources)) {
      const view = await mount(
        <UI.AvatarGroup>
          <UI.Avatar>
            <UI.AvatarImage source={{ uri: 'https://example.test/avatar.png' }} />
            <UI.AvatarFallback>AB</UI.AvatarFallback>
            <UI.AvatarBadge>
              <Glyph lucide="CheckIcon" />
            </UI.AvatarBadge>
          </UI.Avatar>
          <UI.AvatarGroupCount>+3</UI.AvatarGroupCount>
        </UI.AvatarGroup>,
        family as any,
      );
      await view.unmount();
    }
    for (const [family, definition] of Object.entries(source.sources) as any[])
      for (const slot of Object.keys(definition.slots))
        expect(seen.has(family + '/' + slot)).toBe(true);
    expect(seen.size).toBe(30);
  } finally {
    spy.mockRestore();
  }
});
test('native Avatar image brightness and cropping compose with grayscale in one filtered renderer', async () => {
  await mount(
    <UI.Avatar>
      <UI.AvatarImage
        source={{ uri: 'https://example.test/avatar.png' }}
        testID="photo"
        alt="Portrait"
        grayscale
        brightness={0.2}
        objectFit="contain"
        style={{ borderRadius: 4 }}
      />
      <UI.AvatarFallback>Fallback</UI.AvatarFallback>
    </UI.Avatar>,
  );
  expect(bitmap().props.resizeMode).toBe('contain');
  if (Platform.OS !== 'android') expect(JSON.stringify(screen.toJSON())).toContain('0.04252');
  else
    expect(screen.getByTestId('photo-native-filter')).toHaveStyle({
      filter: [{ grayscale: 1 }, { brightness: 0.2 }],
      borderRadius: 4,
    });
  await fireEvent(bitmap(), 'load', loaded);
  await finishFilter();
  expect(screen.getByRole('image', { name: 'Portrait' })).toBeTruthy();
  expect(screen.queryByText('Fallback')).toBeNull();
  if (Platform.OS !== 'android') {
    const rect = screen.container.queryAll((node) => node.type === 'RNSVGRect')[0]!;
    expect(rect.props.rx).toBe(4);
  }
});
