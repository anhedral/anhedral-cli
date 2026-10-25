import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet, processColor } from 'react-native';
import * as UI from './.generated';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import * as presets from './.generated/src/native/_preset-progress-style';
import { nativeProgressPresetSource as source } from './.generated/src/native/_progress-presets';
const window = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...window, fontScale: 1, width: 390 } }));
afterEach(() => Dimensions.set({ window }));
const mount = (element: React.ReactNode) => render(<UI.ThemeProvider>{element}</UI.ThemeProvider>);
const palette = (
  family: React.ComponentProps<typeof NativeRegistryPalette>['source'],
  children: React.ReactNode,
) => (
  <NativeRegistryPalette
    source={family}
    generation={family === 'default' || family === 'new-york' ? 'legacy' : 'modern'}
  >
    {children}
  </NativeRegistryPalette>
);
const state = {
  mode: 'light' as const,
  radius: 10,
  fontScale: 1,
  colors: {
    background: '#ffffff',
    foreground: '#111111',
    primary: '#111111',
    secondary: '#dddddd',
    muted: '#eeeeee',
    'muted-foreground': '#777777',
    input: '#dddddd',
    border: '#dddddd',
    ring: '#555555',
    destructive: '#ff0000',
  },
};
test('Progress retains six definitions, eighteen source slots and strict paint for every source/style/mode', () => {
  expect(Object.keys(source.sources)).toHaveLength(6);
  expect(Object.values(source.sources).flatMap((s) => Object.values(s.slots).flat())).toHaveLength(
    18,
  );
  const errors = new Set<string>();
  for (const name of [
    ...Object.keys(source.presets),
    'default',
    'new-york',
    'new-york-v4',
  ] as any[])
    for (const family of ['base', 'aria', 'radix'] as const)
      for (const mode of ['light', 'dark'] as const)
        for (const fontScale of [1, 2])
          for (const slot of ['root', 'track', 'indicator', 'label', 'value'] as const)
            try {
              presets.nativePresetProgressStyle(name, slot, {
                ...state,
                mode,
                fontScale,
                source: family,
              });
            } catch (error) {
              errors.add(name + '/' + family + '/' + slot + ': ' + (error as Error).message);
            }
  expect([...errors]).toEqual([]);
});
test('source track heights remain thin under font scaling and frozen track colors stay distinct', () => {
  const heights = {
    nova: 4,
    vega: 6,
    maia: 12,
    lyra: 4,
    mira: 4,
    luma: 12,
    sera: 2,
    rhea: 8,
    default: 16,
    'new-york': 8,
    'new-york-v4': 8,
  };
  for (const [name, height] of Object.entries(heights))
    for (const fontScale of [1, 2])
      expect(
        presets.nativePresetProgressStyle(name as any, 'track', { ...state, fontScale }).view
          .height,
      ).toBe(height);
  expect(presets.nativePresetProgressStyle('default', 'track', state).view.backgroundColor).toBe(
    '#dddddd',
  );
  expect(
    processColor(
      presets.nativePresetProgressStyle('new-york', 'track', state).view.backgroundColor,
    ),
  ).toBe(processColor('rgba(17,17,17,0.2)'));
  expect(presets.nativePresetProgressStyle('sera', 'label', state).text).toMatchObject({
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  });
  expect(presets.nativePresetProgressStyle('sera', 'label', state).text.letterSpacing).toBeCloseTo(
    0.3,
  );
});
test('Base source retains raw-value formatting separately from normalized visual progress', async () => {
  const format = jest.fn((formatted: string, value: number | null) => formatted + ' / ' + value);
  await mount(
    <UI.Progress value={25} max={50} testID="base">
      <UI.ProgressLabel>Uploading</UI.ProgressLabel>
      <UI.ProgressValue>{format}</UI.ProgressValue>
    </UI.Progress>,
  );
  expect(screen.getByRole('progressbar', { name: 'Uploading' })).toHaveAccessibilityValue({
    now: 25,
    max: 50,
    text: '25%',
  });
  expect(format).toHaveBeenLastCalledWith('25%', 25);
  expect(screen.getByText('25% / 25', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(StyleSheet.flatten(screen.getByTestId('base-indicator').props.style)).toMatchObject({
    width: '50%',
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  });
  expect(StyleSheet.flatten(screen.getByTestId('base-track').props.style)).toMatchObject({
    height: 4,
    width: '100%',
  });
});
test('Aria formatting and its single-argument callback retain normalized custom ranges', async () => {
  const format = jest.fn((value: string) => 'Done ' + value);
  await mount(
    palette(
      'aria',
      <UI.Progress value={25} maxValue={50} testID="aria">
        <UI.ProgressLabel>Aria upload</UI.ProgressLabel>
        <UI.ProgressValue>{format}</UI.ProgressValue>
      </UI.Progress>,
    ),
  );
  expect(format).toHaveBeenLastCalledWith('50%');
  expect(screen.getByText('Done 50%')).toBeOnTheScreen();
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({
    now: 25,
    max: 50,
    text: '50%',
  });
  expect(StyleSheet.flatten(screen.getByTestId('aria-indicator').props.style).width).toBe('50%');
});
test.each(['base', 'aria', 'radix', 'default', 'new-york', 'new-york-v4'] as const)(
  '%s unknown progress retains source indicator behavior without substituting a spinner',
  async (family) => {
    const callback = jest.fn((value: string) => value);
    await mount(
      palette(
        family,
        <UI.Progress value={null} testID="unknown" accessibilityLabel="Waiting">
          <UI.ProgressValue>{callback}</UI.ProgressValue>
        </UI.Progress>,
      ),
    );
    expect(screen.getByRole('progressbar', { name: 'Waiting' })).toBeBusy();
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('unknown-indicator').props.style).width).toBe(
      family === 'aria' ? '100%' : '0%',
    );
    if (family === 'base') expect(callback).toHaveBeenCalledWith('indeterminate', null);
    else expect(callback).not.toHaveBeenCalled();
    if (family === 'aria')
      expect(screen.getByRole('progressbar').props.accessibilityValue.text).toBe('');
  },
);
test('Aria zero ranges remain finite, and known value labels and custom formats are retained', async () => {
  const view = await mount(
    palette(
      'aria',
      <UI.Progress value={0} minValue={0} maxValue={0} testID="range">
        <UI.ProgressValue />
      </UI.Progress>,
    ),
  );
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({
    min: 0,
    max: 0,
    now: 0,
    text: '0%',
  });
  expect(StyleSheet.flatten(screen.getByTestId('range-indicator').props.style).width).toBe('0%');
  await view.rerender(
    <UI.ThemeProvider>
      {palette(
        'aria',
        <UI.Progress value={25} maxValue={50} valueLabel="One of two">
          <UI.ProgressValue />
        </UI.Progress>,
      )}
    </UI.ThemeProvider>,
  );
  expect(screen.getByText('One of two')).toBeOnTheScreen();
  await view.rerender(
    <UI.ThemeProvider>
      {palette(
        'aria',
        <UI.Progress
          value={25}
          maxValue={50}
          locale="en-US"
          formatOptions={{ style: 'currency', currency: 'USD' }}
        >
          <UI.ProgressValue />
        </UI.Progress>,
      )}
    </UI.ThemeProvider>,
  );
  expect(screen.getByText('$25.00')).toBeOnTheScreen();
});
test('Base custom Intl formatting and accessible value text keep their source callbacks', async () => {
  const describe = jest.fn(
    (formatted: string, value: number | null) => `${formatted} of 50 (${value})`,
  );
  await mount(
    <UI.Progress
      value={25}
      max={50}
      format={{ style: 'decimal', minimumFractionDigits: 1 }}
      getAriaValueText={describe}
    >
      <UI.ProgressValue />
    </UI.Progress>,
  );
  expect(describe).toHaveBeenCalledWith('25.0', 25);
  expect(screen.getByText('25.0', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ text: '25.0 of 50 (25)' });
});
test('custom label components register reactively and unregister cleanly', async () => {
  const Label = ({ text }: { text: string }) => <UI.ProgressLabel>{text}</UI.ProgressLabel>;
  const view = await mount(
    <UI.Progress value={25}>
      <Label text="First upload" />
    </UI.Progress>,
  );
  expect(screen.getByRole('progressbar', { name: 'First upload' })).toBeOnTheScreen();
  await view.rerender(
    <UI.ThemeProvider>
      <UI.Progress value={25}>
        <Label text="Second upload" />
      </UI.Progress>
    </UI.ThemeProvider>,
  );
  expect(screen.getByRole('progressbar', { name: 'Second upload' })).toBeOnTheScreen();
  await view.rerender(
    <UI.ThemeProvider>
      <UI.Progress value={25} accessibilityLabel="Standalone" />
    </UI.ThemeProvider>,
  );
  expect(screen.getByRole('progressbar', { name: 'Standalone' })).toBeOnTheScreen();
});
test('Aria indicator computed width overrides caller paint, while Base retains the primitive override contract', async () => {
  const view = await mount(
    palette(
      'aria',
      <UI.Progress value={25}>
        <UI.ProgressTrack>
          <UI.ProgressIndicator testID="custom" style={{ width: '80%' }} />
        </UI.ProgressTrack>
      </UI.Progress>,
    ),
  );
  expect(StyleSheet.flatten(screen.getByTestId('custom').props.style).width).toBe('25%');
  await view.rerender(
    <UI.ThemeProvider>
      <UI.Progress value={25}>
        <UI.ProgressTrack>
          <UI.ProgressIndicator testID="custom" style={{ width: '80%' }} />
        </UI.ProgressTrack>
      </UI.Progress>
    </UI.ThemeProvider>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('custom').props.style).width).toBe('80%');
});
test('Radix and frozen source fills retain physical left anchoring and cannot flex-grow beyond their percentage', async () => {
  await mount(
    <UI.DirectionProvider dir="rtl">
      {palette('radix', <UI.Progress value={25} testID="radix" />)}
    </UI.DirectionProvider>,
  );
  expect(StyleSheet.flatten(screen.getByRole('progressbar').props.style).direction).toBe('ltr');
  expect(StyleSheet.flatten(screen.getByTestId('radix-indicator').props.style)).toMatchObject({
    width: '25%',
    flexGrow: 0,
  });
});
test('all eighteen reviewed source class slots are consumed by the native renderer', async () => {
  const seen = new Set<string>(),
    actual = presets.nativePresetProgressStyle;
  const spy = jest.spyOn(presets, 'nativePresetProgressStyle').mockImplementation((...args) => {
    const result = actual(...args),
      slot = args[1];
    const owner =
      slot === 'root'
        ? 'Progress'
        : slot === 'track'
          ? result.compound
            ? 'ProgressTrack'
            : 'Progress'
          : slot === 'indicator'
            ? result.compound
              ? 'ProgressIndicator'
              : 'Progress'
            : slot === 'label'
              ? 'ProgressLabel'
              : 'ProgressValue';
    seen.add(
      result.source + '/' + owner + '/' + (slot === 'indicator' && !result.compound ? 1 : 0),
    );
    return result;
  });
  try {
    for (const family of Object.keys(source.sources) as (keyof typeof source.sources)[]) {
      const view = await mount(
        palette(
          family,
          <UI.Progress value={25}>
            <UI.ProgressLabel>Upload</UI.ProgressLabel>
            <UI.ProgressValue />
          </UI.Progress>,
        ),
      );
      await view.unmount();
    }
    for (const [family, definition] of Object.entries(source.sources))
      for (const [owner, slots] of Object.entries(definition.slots))
        for (let index = 0; index < slots.length; index++)
          expect(seen.has(family + '/' + owner + '/' + index)).toBe(true);
    expect(seen.size).toBe(18);
  } finally {
    spy.mockRestore();
  }
});

test('native field labels name a non-interactive progress target and preserve its description', async () => {
  await mount(
    <UI.Field>
      <UI.Label controlID="upload">File upload</UI.Label>
      <UI.FieldDescription>Keep this page open</UI.FieldDescription>
      <UI.Progress value={25} nativeID="upload" />
    </UI.Field>,
  );
  expect(screen.getByRole('progressbar', { name: 'File upload' })).toHaveProp(
    'accessibilityHint',
    'Keep this page open',
  );
});
test('empty Aria value labels use its formatted percentage and native locale context remains scoped', async () => {
  await mount(
    <UI.I18nProvider locale="de-DE">
      {palette(
        'aria',
        <UI.Progress value={1} maxValue={2} valueLabel="">
          <UI.ProgressValue />
        </UI.Progress>,
      )}
    </UI.I18nProvider>,
  );
  expect(screen.getByText('50 %')).toBeOnTheScreen();
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ text: '50 %' });
});
test('native label and value styles remain caller owned after source paint', async () => {
  await mount(
    <UI.Progress value={25}>
      <UI.ProgressLabel style={{ color: '#123456', fontSize: 18 }}>Upload</UI.ProgressLabel>
      <UI.ProgressValue style={{ color: '#654321', fontSize: 20 }} />
    </UI.Progress>,
  );
  expect(screen.getByText('Upload')).toHaveStyle({ color: '#123456', fontSize: 18 });
  expect(screen.getByText('25%', { includeHiddenElements: true })).toHaveStyle({
    color: '#654321',
    fontSize: 20,
  });
});

test('a supporting progress bar cannot steal an untargeted field label from its input', async () => {
  await mount(
    <UI.Field>
      <UI.Label>Password</UI.Label>
      <UI.FieldDescription>Password requirements</UI.FieldDescription>
      <UI.Input />
      <UI.Progress value={25} />
    </UI.Field>,
  );
  expect(screen.getByLabelText('Password').props.editable).not.toBe(false);
  expect(screen.getByRole('progressbar').props.accessibilityLabel).toBeUndefined();
  expect(screen.getByRole('progressbar').props.accessibilityHint).toBeUndefined();
});

test('unknown Aria transitions explicitly clear native value text and restore the next known value', async () => {
  const node = (unknown: boolean, value: number) => (
    <UI.ThemeProvider>
      {palette('aria', <UI.Progress value={value} isIndeterminate={unknown} testID="transition" />)}
    </UI.ThemeProvider>
  );
  const view = await render(node(false, 25));
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 25, text: '25%' });
  await view.rerender(node(true, 25));
  expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({
    min: 0,
    max: 100,
    text: '',
  });
  expect(screen.getByRole('progressbar')).toBeBusy();
  await view.rerender(node(false, 50));
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 50, text: '50%' });
  expect(screen.getByRole('progressbar')).not.toBeBusy();
});
test('default progress formatting follows the runtime locale without requiring a provider', async () => {
  const original = Intl.DateTimeFormat.prototype.resolvedOptions;
  const locale = jest
    .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
    .mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...original.call(this), locale: 'de-DE' };
    });
  try {
    await mount(
      <UI.Progress value={25}>
        <UI.ProgressValue />
      </UI.Progress>,
    );
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ text: '25 %' });
  } finally {
    locale.mockRestore();
  }
});
