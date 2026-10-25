import React, { useState, createRef, Fragment } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { nativePresetLabelStyle } from './.generated/src/native/_preset-label-style';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import { NativeTextStyleProvider } from './.generated/src/native/_core';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
import { styling } from './.generated/styling/src';
beforeEach(() => jest.clearAllMocks());
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
  test(`${name} Label retains source type and all group/peer state combinations`, () => {
    for (const mode of ['light', 'dark'] as const)
      for (const source of ['base', 'radix', 'aria'] as const)
        for (const groupDisabled of [false, true])
          for (const peerDisabled of [false, true])
            for (const peerSlot of ['input', 'checkbox', 'switch', 'radio-group-item'] as const) {
              const colors = {
                ...styling.registryThemes['theme-neutral'].native[mode],
                'destructive-foreground': '#ffffff',
              };
              const result = nativePresetLabelStyle(name, {
                colors,
                radius: 10,
                mode,
                source,
                groupDisabled,
                peerDisabled,
                peerSlot,
              });
              const choice = peerSlot !== 'input',
                old = name === 'default' || name === 'new-york';
              expect(result.text.fontSize).toBe(
                name === 'mira' || name === 'lyra' || (name === 'sera' && !choice) ? 12 : 14,
              );
              expect(result.text.fontWeight).toBe(
                name === 'lyra' ? undefined : name === 'sera' ? (choice ? '400' : '600') : '500',
              );
              expect(result.text.lineHeight).toBe(
                name === 'sera'
                  ? (choice ? 14 : 12) * 1.625
                  : name === 'mira' || name === 'lyra'
                    ? 12
                    : 14,
              );
              expect(result.view.opacity).toBe(
                peerDisabled ? (old ? 0.7 : 0.5) : groupDisabled && !old ? 0.5 : undefined,
              );
              expect(result.blocksPointerEvents).toBe(groupDisabled && !old);
              if (name === 'sera') {
                expect(result.text.textTransform).toBe(choice ? 'none' : 'uppercase');
                expect(result.text.letterSpacing).toBeCloseTo(choice ? 0 : 0.3, 12);
              }
            }
  });
  test(`${name} real Label uses source typography, native refs and caller overrides`, async () => {
    const ref = createRef<View>();
    await mount(
      <NativeRegistryPalette
        source={name === 'default' || name === 'new-york' || name === 'new-york-v4' ? name : 'base'}
        generation={name === 'default' || name === 'new-york' ? 'legacy' : 'modern'}
      >
        <UI.NativeComponentStyleProvider style={name}>
          <UI.Label testID="plain" ref={ref}>
            Name
          </UI.Label>
          <UI.Label
            testID="custom"
            style={{
              fontSize: 18,
              lineHeight: 31,
              fontWeight: '700',
              letterSpacing: 2,
              color: '#123456',
              paddingLeft: 17,
            }}
          >
            Custom
          </UI.Label>
        </UI.NativeComponentStyleProvider>
      </NativeRegistryPalette>,
    );
    expect(ref.current).not.toBeNull();
    expect(screen.getByText('Name')).toHaveStyle({
      fontSize: name === 'mira' || name === 'lyra' || name === 'sera' ? 12 : 14,
    });
    expect(screen.getByTestId('plain')).toHaveStyle({ flexDirection: 'row', alignItems: 'center' });
    expect(screen.getByText('Custom')).toHaveStyle({
      fontSize: 18,
      lineHeight: 31,
      fontWeight: '700',
      letterSpacing: 2,
      color: '#123456',
    });
    expect(screen.getByTestId('custom')).toHaveStyle({ paddingLeft: 17 });
    expect(StyleSheet.flatten(screen.getByTestId('custom').props.style).fontSize).toBeUndefined();
  });
}
test('Sera label follows associated choice kinds, live disabled state and explicit native field ownership', async () => {
  function Example() {
    const [disabled, setDisabled] = useState(false);
    return (
      <UI.NativeComponentStyleProvider style="sera">
        <UI.Field>
          <UI.Checkbox nativeID="terms" disabled={disabled} />
          <UI.Label controlID="terms" testID="label">
            Accept terms
          </UI.Label>
        </UI.Field>
        <UI.Button onPress={() => setDisabled(!disabled)}>Disable</UI.Button>
      </UI.NativeComponentStyleProvider>
    );
  }
  await mount(<Example />);
  expect(screen.getByText('Accept terms')).toHaveStyle({
    fontSize: 14,
    lineHeight: 22.75,
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
  });
  await fireEvent.press(screen.getByText('Accept terms'));
  expect(
    screen.getByRole('checkbox', { name: 'Accept terms' }).props.accessibilityState.checked,
  ).toBe(true);
  await fireEvent.press(screen.getByText('Disable'));
  expect(screen.getByTestId('label')).toHaveStyle({ opacity: 0.5 });
  await fireEvent.press(screen.getByText('Accept terms'));
  expect(
    screen.getByRole('checkbox', { name: 'Accept terms' }).props.accessibilityState.checked,
  ).toBe(true);
  await fireEvent.press(screen.getByText('Disable'));
  expect(StyleSheet.flatten(screen.getByTestId('label').props.style).opacity).toBeUndefined();
});
test('native field disabled metadata blocks group label activation and can recover without disabling the input', async () => {
  let input: TextInput | null = null;
  const press = jest.fn();
  function Example() {
    const [disabled, setDisabled] = useState(true);
    return (
      <UI.Field disabled={disabled}>
        <UI.Label testID="label" onPress={press}>
          Username
        </UI.Label>
        <UI.Input
          ref={(node) => {
            input = node;
          }}
        />
        <UI.Button onPress={() => setDisabled(false)}>Enable label</UI.Button>
      </UI.Field>
    );
  }
  await mount(<Example />);
  const focus = jest.spyOn(input!, 'focus');
  expect(screen.getByTestId('label')).toHaveStyle({ opacity: 0.5 });
  await fireEvent.press(screen.getByText('Username'));
  expect(press).not.toHaveBeenCalled();
  expect(focus).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Enable label'));
  await fireEvent.press(screen.getByText('Username'));
  expect(press).toHaveBeenCalledTimes(1);
  expect(focus).toHaveBeenCalledTimes(1);
});
test('explicit control IDs preserve separate state, cancellation, read-only focus and unmount cleanup', async () => {
  let first: TextInput | null = null,
    second: TextInput | null = null;
  const callback = jest.fn((event) => event.preventDefault());
  function Example() {
    const [show, setShow] = useState(true);
    return (
      <UI.Field>
        <UI.Label testID="first-label" controlID="first">
          First
        </UI.Label>
        <UI.Label controlID="second" onPress={callback}>
          Second
        </UI.Label>
        {show && (
          <UI.Input
            nativeID="first"
            editable={false}
            ref={(node) => {
              first = node;
            }}
          />
        )}
        <UI.Input
          nativeID="second"
          editable={false}
          readOnly
          ref={(node) => {
            second = node;
          }}
        />
        <UI.Button onPress={() => setShow(false)}>Remove</UI.Button>
      </UI.Field>
    );
  }
  await mount(<Example />);
  const focus = jest.fn(),
    disabledFocus = jest.fn();
  second!.focus = focus;
  first!.focus = disabledFocus;
  expect(screen.getByTestId('first-label')).toHaveStyle({ opacity: 0.5 });
  await fireEvent.press(screen.getByText('First'));
  expect(disabledFocus).not.toHaveBeenCalled();
  let prevented = false;
  await fireEvent.press(screen.getByText('Second'), {
    preventDefault: () => {
      prevented = true;
    },
    isDefaultPrevented: () => prevented,
  });
  expect(callback).toHaveBeenCalledTimes(1);
  expect(focus).not.toHaveBeenCalled();
  callback.mockImplementation(() => {});
  await fireEvent.press(screen.getByText('Second'));
  expect(focus).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText('Remove'));
  expect(first).toBeNull();
  expect(StyleSheet.flatten(screen.getByTestId('first-label').props.style).opacity).toBeUndefined();
  await fireEvent.press(screen.getByText('First'));
  expect(focus).toHaveBeenCalledTimes(1);
});
test('source letter spacing follows explicit type size and native utility overrides beat source slots', async () => {
  const Styled = withRegistryStyles(UI.Label);
  await mount(
    <UI.NativeComponentStyleProvider style="sera">
      <UI.Label style={{ fontSize: 18 }}>Scaled</UI.Label>
      <Styled className="text-lg tracking-normal normal-case" testID="utility">
        Utility
      </Styled>
      <NativeTextStyleProvider value={{ fontRole: 'serif', style: { fontWeight: '800' } }}>
        <UI.Label>
          <Fragment>Fragment {3n}</Fragment>
        </UI.Label>
      </NativeTextStyleProvider>
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.getByText('Scaled')).toHaveStyle({
    fontSize: 18,
    lineHeight: 29.25,
    letterSpacing: 0.45,
  });
  expect(screen.getByText('Utility')).toHaveStyle({
    fontSize: 18,
    lineHeight: 28,
    textTransform: 'none',
    letterSpacing: 0,
  });
  expect(screen.getByText('Fragment ')).toHaveStyle({ fontWeight: '600' });
  expect(screen.getByText('3')).toBeOnTheScreen();
});

test('Sera switch and radio associations retain normal case and activate only their own native controls', async () => {
  const toggle = jest.fn(),
    radio = jest.fn();
  await mount(
    <UI.NativeComponentStyleProvider style="sera">
      <UI.Field>
        <UI.Switch nativeID="switch" onCheckedChange={toggle} />
        <UI.Label controlID="switch">Notifications</UI.Label>
      </UI.Field>
      <UI.RadioGroup defaultValue="first" onValueChange={radio}>
        <UI.Field>
          <UI.RadioGroupItem nativeID="radio" value="second" />
          <UI.Label controlID="radio">Second choice</UI.Label>
        </UI.Field>
      </UI.RadioGroup>
    </UI.NativeComponentStyleProvider>,
  );
  for (const name of ['Notifications', 'Second choice'])
    expect(screen.getByText(name)).toHaveStyle({
      fontSize: 14,
      fontWeight: '400',
      textTransform: 'none',
      letterSpacing: 0,
    });
  await fireEvent.press(screen.getByText('Notifications'));
  expect(toggle).toHaveBeenCalledWith(true);
  expect(radio).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Second choice'));
  expect(radio).toHaveBeenCalledWith('second');
  expect(toggle).toHaveBeenCalledTimes(1);
});
test('unbound labels and keyboard groups inherit native text tone without replacing source-owned key colors', async () => {
  const { TextToneProvider } = require('./.generated/src/native/_core');
  await mount(
    <TextToneProvider value="#123456">
      <UI.Label>Inherited label</UI.Label>
      <UI.KbdGroup>
        Inherited group<UI.Kbd>Own key</UI.Kbd>
      </UI.KbdGroup>
    </TextToneProvider>,
  );
  expect(screen.getByText('Inherited label')).toHaveStyle({ color: '#123456' });
  expect(screen.getByText('Inherited group')).toHaveStyle({ color: '#123456' });
  expect(StyleSheet.flatten(screen.getByText('Own key').props.style).color).not.toBe('#123456');
});
