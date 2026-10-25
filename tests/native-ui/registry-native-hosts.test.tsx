import React, { useState } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { RegistryView, RegistryText } from './.generated/src/native/registry-styles';
const mount = (node: React.ReactNode) => render(<UI.ThemeProvider>{node}</UI.ThemeProvider>);
test('authored native view clicks retain real state transitions and native disabled handling', async () => {
  function Source() {
    const [open, setOpen] = useState(false);
    return (
      <RegistryView>
        <RegistryView onPress={() => setOpen(true)}>Open view</RegistryView>
        <RegistryView disabled onPress={() => setOpen(false)}>
          Disabled close
        </RegistryView>
        {open && <RegistryText>View opened</RegistryText>}
      </RegistryView>
    );
  }
  await mount(<Source />);
  await fireEvent.press(screen.getByRole('button', { name: 'Open view' }));
  expect(screen.getByText('View opened')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Disabled close', disabled: true }));
  expect(screen.getByText('View opened')).toBeTruthy();
});
test('static view hover resolves native style callbacks and composes native pointer and hover ownership', async () => {
  const enter = jest.fn(),
    hover = jest.fn(),
    leave = jest.fn();
  await mount(
    <RegistryView
      testID="static"
      className="bg-background hover:bg-muted"
      onPointerEnter={enter}
      onHoverIn={hover}
      onPointerLeave={leave}
    >
      Hover
    </RegistryView>,
  );
  const original = StyleSheet.flatten(screen.getByTestId('static').props.style).backgroundColor;
  expect(typeof screen.getByTestId('static').props.style).not.toBe('function');
  await fireEvent(screen.getByTestId('static'), 'pointerEnter', {});
  expect(enter).toHaveBeenCalledTimes(1);
  expect(hover).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(screen.getByTestId('static').props.style).backgroundColor).not.toBe(
    original,
  );
  await fireEvent(screen.getByTestId('static'), 'pointerLeave', {});
  expect(leave).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(screen.getByTestId('static').props.style).backgroundColor).toBe(
    original,
  );
});
test('native animated view controls retain actions and hover motion through a real pressable host', async () => {
  const press = jest.fn(),
    enter = jest.fn(),
    inside = jest.fn();
  const animation = jest.spyOn(Animated, 'timing');
  try {
    await mount(
      <RegistryView
        onPress={press}
        onPointerEnter={enter}
        onPressIn={inside}
        className="transition-all hover:-translate-y-0.5"
        accessibilityLabel="Moving action"
        style={({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.4 : 1 })}
      >
        Move
      </RegistryView>,
    );
    const button = screen.getByRole('button', { name: 'Moving action' });
    await fireEvent(button, 'pointerEnter', {});
    expect(enter).toHaveBeenCalledTimes(1);
    expect(animation).toHaveBeenCalled();
    await fireEvent(button, 'pressIn', {});
    expect(inside).toHaveBeenCalledTimes(1);
    expect(StyleSheet.flatten(screen.getByRole('button').props.style).opacity).toBe(0.4);
    await fireEvent.press(screen.getByRole('button'));
    expect(press).toHaveBeenCalledTimes(1);
  } finally {
    animation.mockRestore();
  }
});
test('registry views remain native pressable render hosts for source Button composition', async () => {
  const press = jest.fn();
  await mount(
    <UI.NativeComponentStyleProvider style="sera">
      <UI.Button render={<RegistryView />} onPress={press}>
        Source view
      </UI.Button>
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.getAllByRole('button')).toHaveLength(1);
  expect(StyleSheet.flatten(screen.getByText('Source view').props.style).textTransform).toBe(
    'uppercase',
  );
  await fireEvent.press(screen.getByRole('button'));
  expect(press).toHaveBeenCalledTimes(1);
});
