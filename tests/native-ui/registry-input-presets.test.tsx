import React from 'react';
import { Dimensions, Platform, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import { nativePresetInputStyle } from './.generated/src/native/_preset-input-style';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
import { styling } from './.generated/styling/src';
const window = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...window, fontScale: 1, width: 390 } }));
afterEach(() => Dimensions.set({ window }));
const styles = [
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
const mount = (node: React.ReactNode) => render(<UI.ThemeProvider>{node}</UI.ThemeProvider>);
for (const name of styles) {
  test(`${name} Input and Textarea retain source modes, responsive typography and state combinations`, () => {
    for (const component of ['input', 'textarea'] as const)
      for (const mode of ['light', 'dark'] as const)
        for (const width of [390, 800])
          for (const state of [{}, { focused: true }, { invalid: true }, { disabled: true }]) {
            const result = nativePresetInputStyle(component, name, {
              colors: {
                ...styling.registryThemes['theme-neutral'].native[mode],
                'destructive-foreground': '#ffffff',
              },
              radius: 10,
              mode,
              width,
              fontScale: 1,
              ...state,
            });
            expect(result.text.fontSize).toBeGreaterThanOrEqual(12);
            expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/);
            expect(result.placeholderTextColor).toBeTruthy();
          }
  });
  test(`${name} real native fields retain source dimensions and authoritative caller styles`, async () => {
    await mount(
      <NativeRegistryPalette
        source={name === 'default' || name === 'new-york' || name === 'new-york-v4' ? name : 'base'}
        generation={name === 'default' || name === 'new-york' ? 'legacy' : 'modern'}
      >
        <UI.NativeComponentStyleProvider style={name}>
          <UI.Input testID="field" />
          <UI.Textarea testID="area" />
          <UI.Input
            testID="override"
            style={{ height: 57, paddingLeft: 19, color: '#123456' }}
            placeholderTextColor="#654321"
            selectionColor="#121212"
          />
        </UI.NativeComponentStyleProvider>
      </NativeRegistryPalette>,
    );
    const heights = {
      vega: 36,
      nova: 32,
      maia: 36,
      lyra: 32,
      mira: 28,
      luma: 36,
      sera: 40,
      rhea: 32,
      default: 40,
      'new-york': 36,
      'new-york-v4': 36,
    };
    expect(screen.getByTestId('field')).toHaveStyle({ height: heights[name], minHeight: 0 });
    expect(screen.getByTestId('area')).toHaveStyle({
      minHeight: name === 'default' ? 80 : name === 'new-york' ? 60 : 64,
    });
    expect(screen.getByTestId('override')).toHaveStyle({
      height: 57,
      color: '#123456',
    });
    const painted = StyleSheet.flatten(screen.getByTestId('override').props.style);
    expect(painted.paddingLeft + (painted.borderLeftWidth ?? painted.borderWidth ?? 0)).toBe(20);
    expect(screen.getByTestId('override').props.placeholderTextColor).toBe('#654321');
    expect(screen.getByTestId('override').props.selectionColor).toBe('#121212');
  });
}
test('native field focus retains callbacks and the source focus/invalid border state', async () => {
  const focus = jest.fn(),
    blur = jest.fn();
  await mount(
    <UI.NativeComponentStyleProvider style="sera">
      <UI.Input testID="input" onFocus={focus} onBlur={blur} />
    </UI.NativeComponentStyleProvider>,
  );
  const initial = StyleSheet.flatten(screen.getByTestId('input').props.style);
  const nativeColor = (key: '--input' | '--ring') =>
    'hsl(' + styling.themes.light[key]!.replaceAll(' ', ', ') + ')';
  const edge = Platform.OS === 'android' ? 'borderColor' : 'borderBottomColor';
  expect(initial[edge]).toBe(nativeColor('--input'));
  if (Platform.OS === 'ios') expect(initial.borderColor).toBe('transparent');
  if (Platform.OS === 'android')
    expect(initial).toMatchObject({
      borderWidth: 0,
      borderTopWidth: 0,
      borderRightWidth: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 1,
      paddingLeft: 1,
      paddingRight: 1,
      paddingTop: 5,
    });
  await fireEvent(screen.getByTestId('input'), 'focus');
  expect(focus).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(screen.getByTestId('input').props.style)[edge]).toBe(
    nativeColor('--ring'),
  );
  await fireEvent(screen.getByTestId('input'), 'blur');
  expect(blur).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(screen.getByTestId('input').props.style)[edge]).toBe(
    nativeColor('--input'),
  );
});
test('modern textarea follows measured native content, shrinks and preserves explicit height plus consumer callbacks', async () => {
  const measure = jest.fn();
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <UI.Textarea testID="auto" onContentSizeChange={measure} />
      <UI.Textarea testID="fixed" style={{ height: 91 }} />
    </UI.NativeComponentStyleProvider>,
  );
  await fireEvent(screen.getByTestId('auto'), 'contentSizeChange', {
    nativeEvent: { contentSize: { width: 180, height: 140 } },
  });
  expect(screen.getByTestId('auto')).toHaveStyle({ minHeight: 64 });
  expect(StyleSheet.flatten(screen.getByTestId('auto').props.style).height).toBeUndefined();
  expect(screen.getByTestId('auto').props.scrollEnabled).toBe(false);
  expect(measure).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByTestId('auto'), 'contentSizeChange', {
    nativeEvent: { contentSize: { width: 180, height: 20 } },
  });
  expect(StyleSheet.flatten(screen.getByTestId('auto').props.style).height).toBeUndefined();
  await fireEvent(screen.getByTestId('fixed'), 'contentSizeChange', {
    nativeEvent: { contentSize: { width: 180, height: 170 } },
  });
  expect(screen.getByTestId('fixed')).toHaveStyle({ height: 91 });
  expect(screen.getByTestId('fixed').props.scrollEnabled).toBe(true);
});
test('registry field text classes reach actual TextInput paint and explicit props/styles win', async () => {
  const StyledInput = withRegistryStyles(UI.Input);
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <StyledInput testID="field" className="text-red-500 text-xl" style={{ fontSize: 23 }} />
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.getByTestId('field')).toHaveStyle({ fontSize: 23 });
  expect(StyleSheet.flatten(screen.getByTestId('field').props.style).color).not.toBeUndefined();
});

test('disabled fields expose native disabled state and expanded touch bounds without treating read-only fields as disabled', async () => {
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <UI.Input testID="disabled" editable={false} />
      <UI.Input testID="readonly" readOnly />
      <UI.Input testID="small" />
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.getByTestId('disabled')).toBeDisabled();
  expect(screen.getByTestId('disabled').props.pointerEvents).toBe('none');
  expect(screen.getByTestId('readonly')).not.toBeDisabled();
  expect(screen.getByTestId('small').props.hitSlop).toEqual({
    top: 6,
    bottom: 6,
    left: 0,
    right: 0,
  });
});

test('intrinsic native Textarea mirrors uncontrolled editing and retains controlled ownership and explicit line counts', async () => {
  const change = jest.fn(),
    node = (value?: string) => (
      <UI.NativeComponentStyleProvider style="nova">
        <UI.Textarea testID="editing" defaultValue="Initial" value={value} onChangeText={change} />
        <UI.Textarea testID="lines" numberOfLines={6} />
      </UI.NativeComponentStyleProvider>
    );
  const view = await mount(node());
  await fireEvent.changeText(screen.getByTestId('editing'), 'one\ntwo\nthree');
  expect(screen.getByTestId('editing').props.value).toBe('one\ntwo\nthree');
  expect(change).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('lines').props.numberOfLines).toBe(6);
  await view.rerender(<UI.ThemeProvider>{node('Application value')}</UI.ThemeProvider>);
  await fireEvent.changeText(screen.getByTestId('editing'), 'Other');
  expect(screen.getByTestId('editing').props.value).toBe('Application value');
});

for (const preset of ['nova', 'new-york-v4', 'default', 'new-york'] as const)
  test(`${preset} authored HTML rows follows its source sizing mode while native line props remain explicit`, async () => {
    const { Textarea } = require('./.generated/src/native/registry-form-controls');
    await mount(
      <NativeRegistryPalette
        source={preset === 'nova' ? 'base' : preset}
        generation={preset === 'default' || preset === 'new-york' ? 'legacy' : 'modern'}
      >
        <UI.NativeComponentStyleProvider style={preset}>
          <Textarea testID="source-rows" rows={6} />
        </UI.NativeComponentStyleProvider>
      </NativeRegistryPalette>,
    );
    if (preset === 'default' || preset === 'new-york')
      expect(screen.getByTestId('source-rows')).toHaveStyle({ height: 162 });
    expect(screen.getByTestId('source-rows').props.numberOfLines).toBe(
      preset === 'default' || preset === 'new-york' ? 6 : undefined,
    );
  });

test('explicit native input font sizes preserve source line ratios and disabled font scaling keeps source geometry', async () => {
  Dimensions.set({ window: { ...window, fontScale: 2, width: 390 } });
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <UI.Input testID="font-override" style={{ fontSize: 24 }} allowFontScaling={false} />
      <UI.Input testID="no-scale" allowFontScaling={false} />
      <UI.Input testID="scale" />
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.getByTestId('font-override')).toHaveStyle({
    fontSize: 24,
    lineHeight: 36,
    height: 44,
  });
  expect(screen.getByTestId('no-scale')).toHaveStyle({ height: 32 });
  expect(screen.getByTestId('scale')).toHaveStyle({ height: 56 });
});
