import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { NativeSlot } from './.generated/src/native/_slot';
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);
test('native button composition delegates to one interactive link while preserving outline foreground and navigation', async () => {
  const navigate = jest.fn(),
    press = jest.fn();
  await mount(
    <UI.Button asChild variant="outline" onPress={press}>
      <UI.LinkButton href="/projects" onNavigate={navigate}>
        Projects
      </UI.LinkButton>
    </UI.Button>,
  );
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText('Projects')).toHaveStyle({ color: 'hsl(0, 0%, 9%)' });
  expect(screen.getByRole('link')).toHaveStyle({ backgroundColor: 'hsl(0, 0%, 100%)' });
  await fireEvent.press(screen.getByRole('link'));
  expect(press).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('/projects');
});
test('native render-element triggers preserve child handlers, styles, actual focus refs and controlled overlay state', async () => {
  const child = jest.fn(),
    parent = jest.fn();
  await mount(
    <UI.Dialog>
      <UI.DialogTrigger onPress={parent} render={<UI.Button variant="outline" onPress={child} />}>
        Open
      </UI.DialogTrigger>
      <UI.DialogContent>
        <UI.DialogTitle>Details</UI.DialogTitle>
        <UI.DialogClose asChild>
          <UI.Button variant="secondary">Done</UI.Button>
        </UI.DialogClose>
      </UI.DialogContent>
    </UI.Dialog>,
  );
  expect(screen.getAllByRole('button')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Open' })).toHaveStyle({
    backgroundColor: 'hsl(0, 0%, 100%)',
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Open' }));
  expect(child).toHaveBeenCalledTimes(1);
  expect(parent).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('header', { name: 'Details' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('header', { name: 'Details' })).toBeNull();
});
test('a native child can cancel composed activation without opening its overlay', async () => {
  const parent = jest.fn();
  await mount(
    <UI.Dialog>
      <UI.DialogTrigger asChild onPress={parent}>
        <UI.Button onPress={(event) => event.preventDefault()}>Cancelled</UI.Button>
      </UI.DialogTrigger>
      <UI.DialogContent>
        <UI.DialogTitle>Hidden</UI.DialogTitle>
      </UI.DialogContent>
    </UI.Dialog>,
  );
  let cancelled = false;
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelled' }), {
    preventDefault: () => {
      cancelled = true;
    },
    isDefaultPrevented: () => cancelled,
  });
  expect(parent).not.toHaveBeenCalled();
  expect(screen.queryByRole('header', { name: 'Hidden' })).toBeNull();
});
test('composed native refs retain React 19 cleanup and do not overwrite object/callback owners', async () => {
  const first = jest.fn(),
    cleanup = jest.fn(),
    second = jest.fn((_node: unknown) => cleanup);
  const mounted = await mount(
    <NativeSlot ref={first}>
      <UI.Button ref={second}>Focus target</UI.Button>
    </NativeSlot>,
  );
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  expect(first.mock.calls[0]?.[0]).toBe(second.mock.calls[0]?.[0]);
  await mounted.unmount();
  expect(first).toHaveBeenLastCalledWith(null);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
});
test('disabled composed controls cannot bypass their parent disabled state', async () => {
  const press = jest.fn();
  await mount(
    <UI.Button disabled asChild>
      <UI.Button disabled={false} onPress={press}>
        Disabled
      </UI.Button>
    </UI.Button>,
  );
  expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Disabled' }));
  expect(press).not.toHaveBeenCalled();
});

test('native Button View composition creates one real pressable with source typography and native callbacks', async () => {
  const { View, StyleSheet } = require('react-native');
  const press = jest.fn(),
    child = jest.fn(),
    parentTouch = jest.fn();
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <UI.Button asChild onPress={press} onTouchStart={parentTouch}>
        <View onTouchStart={child}>
          <UI.Text>View action</UI.Text>
        </View>
      </UI.Button>
    </UI.NativeComponentStyleProvider>,
  );
  const button = screen.getByRole('button', { name: 'View action' });
  expect(screen.getAllByRole('button')).toHaveLength(1);
  await fireEvent(button, 'touchStart', {});
  expect(child).toHaveBeenCalledTimes(1);
  expect(parentTouch).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(screen.getByText('View action').props.style)).toMatchObject({
    fontWeight: '500',
    fontSize: 14,
  });
  await fireEvent.press(button);
  expect(press).toHaveBeenCalledTimes(1);
});

test('static slot press feedback preserves mounted native refs until the actual unmount', async () => {
  const ref = jest.fn(),
    released = jest.fn();
  ref.mockImplementation((node: unknown) => (node ? released : undefined));
  await mount(
    <UI.Badge
      onPress={() => {}}
      render={(props) => <UI.Text {...props} ref={ref} testID="ref-text" />}
    >
      Stable ref
    </UI.Badge>,
  );
  expect(ref).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByTestId('ref-text'), 'pressIn', {});
  await fireEvent(screen.getByTestId('ref-text'), 'pressOut', {});
  expect(ref).toHaveBeenCalledTimes(1);
  expect(released).not.toHaveBeenCalled();
  await screen.unmount();
  expect(released).toHaveBeenCalledTimes(1);
});
