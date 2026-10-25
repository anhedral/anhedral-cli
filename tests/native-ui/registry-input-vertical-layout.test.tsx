import React from 'react';
import { Dimensions, Platform, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  NativeRegistryPalette,
  NativeComponentStyleProvider,
} from './.generated/src/native/_registry-context';
const window = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...window, fontScale: 1, width: 390 } }));
afterEach(() => Dimensions.set({ window }));
test('single-line Android input uses an unpadded centered native text layout while source geometry and explicit caller alignment remain owned', async () => {
  await render(
    <UI.ThemeProvider>
      <NativeRegistryPalette generation="modern" source="base">
        <NativeComponentStyleProvider style="nova">
          <UI.Input testID="single" value="native" />
          <UI.Input
            testID="custom"
            style={{ includeFontPadding: true, textAlignVertical: 'top' }}
          />
          <UI.Textarea testID="multi" />
          <UI.Input testID="native-alignment" textAlignVertical="bottom" />
        </NativeComponentStyleProvider>
      </NativeRegistryPalette>
    </UI.ThemeProvider>,
  );
  const style = StyleSheet.flatten(screen.getByTestId('single').props.style);
  expect(style.height).toBe(32);
  expect(style.fontSize).toBe(16);
  expect(style.lineHeight).toBe(24);
  if (Platform.OS === 'android') {
    expect(style.includeFontPadding).toBe(false);
    expect(style.textAlignVertical).toBe('center');
    expect(style.paddingTop).toBe(3);
    expect(style.paddingBottom).toBe(3);
  } else {
    expect(style.includeFontPadding).toBeUndefined();
    expect(style.textAlignVertical).toBeUndefined();
  }
  expect(StyleSheet.flatten(screen.getByTestId('custom').props.style)).toMatchObject({
    includeFontPadding: true,
    textAlignVertical: 'top',
  });
  expect(
    StyleSheet.flatten(screen.getByTestId('multi').props.style).includeFontPadding,
  ).toBeUndefined();
  expect(screen.getByTestId('native-alignment').props.textAlignVertical).toBe('bottom');
  expect(
    StyleSheet.flatten(screen.getByTestId('native-alignment').props.style).textAlignVertical,
  ).toBeUndefined();
});

import { nativeSingleLineInputStyle } from './.generated/src/native/_input-border';
test('Android line boxes fit source insets without changing dimensions, scaling or explicit native padding', () => {
  const source = { height: 32, lineHeight: 24, paddingVertical: 4, borderWidth: 1 };
  expect(nativeSingleLineInputStyle(source, undefined, 'android', false, 1)).toMatchObject({
    height: 32,
    lineHeight: 24,
    paddingTop: 3,
    paddingBottom: 3,
  });
  expect(nativeSingleLineInputStyle(source, undefined, 'android', false, 1.2)).toMatchObject({
    paddingTop: expect.closeTo(0.6),
    paddingBottom: expect.closeTo(0.6),
  });
  expect(
    nativeSingleLineInputStyle(source, { paddingVertical: 4 }, 'android', false, 1),
  ).not.toHaveProperty('paddingTop');
  expect(nativeSingleLineInputStyle(source, undefined, 'ios', false, 1)).toBe(source);
  expect(nativeSingleLineInputStyle(source, undefined, 'android', true, 1)).toBe(source);
});

test('Android shadow frames keep native editing mounted across focus and invalid paint, transfer outer layout and preserve layout callbacks', async () => {
  const ref = React.createRef<import('react-native').TextInput>();
  const layout = jest.fn();
  const Example = ({ invalid = false }) => (
    <UI.ThemeProvider>
      <NativeRegistryPalette generation="modern" source="base">
        <NativeComponentStyleProvider style="nova">
          <UI.Input
            ref={ref}
            testID="shadow-input"
            value="native"
            invalid={invalid}
            onLayout={layout}
            style={{ width: 180, marginLeft: 7, flexGrow: 1 }}
          />
        </NativeComponentStyleProvider>
      </NativeRegistryPalette>
    </UI.ThemeProvider>
  );
  const mounted = await render(<Example />);
  const original = ref.current;
  if (Platform.OS === 'android') {
    const input = screen.getByTestId('shadow-input');
    expect(StyleSheet.flatten(input.props.style)).not.toHaveProperty('boxShadow');
    let frame = input.parent;
    while (frame && frame.type !== 'View') frame = frame.parent;
    expect(StyleSheet.flatten(frame!.props.style)).toMatchObject({
      width: 180,
      marginLeft: 7,
      flexGrow: 1,
      height: 32,
    });
    const event = { nativeEvent: { layout: { x: 7, y: 0, width: 180, height: 32 } } };
    await fireEvent(frame!, 'layout', event);
    expect(layout).toHaveBeenLastCalledWith(event);
    await fireEvent(input, 'focus', { nativeEvent: {} });
    expect(StyleSheet.flatten(frame!.props.style).boxShadow).toBeTruthy();
    expect(ref.current).toBe(original);
    expect(screen.getByTestId('shadow-input').props.value).toBe('native');
  }
  await mounted.rerender(<Example invalid />);
  expect(ref.current).toBe(original);
  expect(screen.getByTestId('shadow-input').props.value).toBe('native');
});
