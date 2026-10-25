import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as UI from './.generated';
import { openNativeLink } from './.generated/src/native/navigation';
import { RegistryLink, RegistryText } from './.generated/src/native/registry-styles';

const mount = (children: React.ReactNode) =>
  render(<>{children}</>, {
    wrapper: ({ children }) => <UI.ThemeProvider>{children}</UI.ThemeProvider>,
  });
afterEach(() => jest.restoreAllMocks());
test('inline native links preserve text layout, route options and event cancellation', async () => {
  const navigate = jest.fn(),
    pressed = jest.fn();
  await mount(
    <UI.NativeNavigationProvider onNavigate={navigate}>
      <RegistryText>
        Read{' '}
        <RegistryLink href="/guide" replace scroll={false} onPress={pressed}>
          the guide
        </RegistryLink>{' '}
        now.
      </RegistryText>
    </UI.NativeNavigationProvider>,
  );
  const link = screen.getByRole('link', { name: 'the guide' });
  expect(link.type).toBe('Text');
  await fireEvent.press(link);
  expect(pressed).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('/guide', { replace: true, scroll: false });
  await screen.rerender(
    <UI.NativeLink href="/stop" onNavigate={navigate} onPress={(event) => event.preventDefault()}>
      Cancel
    </UI.NativeLink>,
  );
  let cancelled = false;
  await fireEvent.press(screen.getByRole('link'), {
    preventDefault: () => {
      cancelled = true;
    },
    isDefaultPrevented: () => cancelled,
  });
  expect(navigate).toHaveBeenCalledTimes(1);
});
test('OS links, routes, anchors and invalid protocols have distinct native dispatch', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const navigate = jest.fn(),
    anchor = jest.fn();
  for (const url of [
    'https://example.test/a#b',
    'http://example.test',
    'mailto:' + ['test', 'example.test'].join('@'),
    'tel:+15550100',
    'sms:+15550100',
  ])
    await openNativeLink(url, { onNavigate: navigate });
  expect(open).toHaveBeenCalledTimes(5);
  expect(navigate).not.toHaveBeenCalled();
  await openNativeLink('../settings', { onNavigate: navigate }, { replace: true });
  expect(navigate).toHaveBeenCalledWith('../settings', { replace: true });
  await openNativeLink('#part%20one', { onAnchor: anchor });
  expect(anchor).toHaveBeenCalledWith('part one', {});
  for (const url of [
    '',
    ' /route',
    '\n/route',
    '//example.test',
    'javascript:alert(1)',
    'data:text/plain,test',
    '#bad%ZZ',
  ])
    await expect(openNativeLink(url, { onNavigate: navigate, onAnchor: anchor })).rejects.toThrow();
  await expect(openNativeLink('#missing', {})).rejects.toThrow(/anchor handler/);
  await expect(openNativeLink('/missing', {})).rejects.toThrow(/route handler/);
});
test('navigation providers inherit application routes while local scopes own anchors', async () => {
  const navigate = jest.fn(),
    anchor = jest.fn();
  await mount(
    <UI.NativeNavigationProvider onNavigate={navigate}>
      <UI.NativeNavigationProvider onAnchor={anchor}>
        <UI.NativeLink href="/route">Route</UI.NativeLink>
        <UI.NativeLink href="#">Top</UI.NativeLink>
      </UI.NativeNavigationProvider>
    </UI.NativeNavigationProvider>,
  );
  await fireEvent.press(screen.getByRole('link', { name: 'Route' }));
  await fireEvent.press(screen.getByRole('link', { name: 'Top' }));
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(anchor).toHaveBeenCalledWith('', { replace: undefined, scroll: undefined });
});
test('link failures remain visible inline, clear on retry and ignore stale or unmounted requests', async () => {
  let reject!: (error: Error) => void;
  const pending = new Promise<void>((_, no) => {
    reject = no;
  });
  const error = jest.fn(),
    navigate = jest.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(undefined);
  await mount(
    <UI.NativeLink href="/retry" onNavigate={navigate} onError={error}>
      Retry
    </UI.NativeLink>,
  );
  await fireEvent.press(screen.getByRole('link'));
  expect(screen.getByRole('alert')).toHaveTextContent(' Unable to open link.');
  expect(error).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('link'));
  expect(screen.queryByRole('alert')).toBeNull();
  await screen.rerender(
    <UI.NativeLink href="/old" onNavigate={() => pending} onError={error}>
      Old
    </UI.NativeLink>,
  );
  let activation!: Promise<void>;
  await act(() => {
    activation = screen.getByRole('link').props.onPress({ isDefaultPrevented: () => false });
  });
  await screen.rerender(
    <UI.NativeLink href="/new" onNavigate={navigate} onError={error}>
      New
    </UI.NativeLink>,
  );
  await act(async () => {
    reject(Error('stale'));
    await activation;
  });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(error).toHaveBeenCalledTimes(1);
  const later = new Promise<void>((_, no) => {
    reject = no;
  });
  await screen.rerender(
    <UI.NativeLink href="/unmount" onNavigate={() => later} onError={error}>
      Unmount
    </UI.NativeLink>,
  );
  await act(() => {
    activation = screen.getByRole('link').props.onPress({ isDefaultPrevented: () => false });
  });
  await screen.unmount();
  await act(async () => {
    reject(Error('unmounted'));
    await activation;
  });
  expect(error).toHaveBeenCalledTimes(1);
});
test('disabled links cannot run callbacks and explicit consumer styles support native press state', async () => {
  const navigate = jest.fn(),
    pressed = jest.fn(),
    inside = jest.fn();
  await mount(
    <UI.NativeLink
      href="/blocked"
      disabled
      onNavigate={navigate}
      onPress={pressed}
      onPressIn={inside}
      style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}
    >
      Disabled
    </UI.NativeLink>,
  );
  await fireEvent.press(screen.getByRole('link', { disabled: true }));
  await fireEvent(screen.getByRole('link'), 'pressIn');
  expect(navigate).not.toHaveBeenCalled();
  expect(pressed).not.toHaveBeenCalled();
  expect(inside).not.toHaveBeenCalled();
  await screen.rerender(
    <UI.NativeLink
      href="/active"
      onNavigate={navigate}
      style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}
    >
      Active
    </UI.NativeLink>,
  );
  await fireEvent(screen.getByRole('link'), 'pressIn');
  expect(StyleSheet.flatten(screen.getByRole('link').props.style).opacity).toBe(0.4);
  await fireEvent(screen.getByRole('link'), 'pressOut');
  expect(StyleSheet.flatten(screen.getByRole('link').props.style).opacity).toBe(1);
});
test('Button composition retains native layout, label metrics, ref and child-first action ownership', async () => {
  const navigate = jest.fn(),
    first = jest.fn(),
    second = jest.fn();
  const ref = React.createRef<View | Text>();
  await mount(
    <UI.NativeNavigationProvider onNavigate={navigate}>
      <UI.NativeComponentStyleProvider style="sera">
        <UI.Button asChild onPress={second}>
          <RegistryLink href="/composed" ref={ref} onPress={first}>
            Composed
          </RegistryLink>
        </UI.Button>
      </UI.NativeComponentStyleProvider>
    </UI.NativeNavigationProvider>,
  );
  const link = screen.getByRole('link');
  expect(link.type).toBe('View');
  expect(ref.current).toBeTruthy();
  expect(StyleSheet.flatten(link.props.style).height).toBeGreaterThanOrEqual(40);
  expect(StyleSheet.flatten(screen.getByText('Composed').props.style).textTransform).toBe(
    'uppercase',
  );
  await fireEvent.press(link);
  expect(first.mock.invocationCallOrder[0]!).toBeLessThan(second.mock.invocationCallOrder[0]!);
  expect(navigate).toHaveBeenCalledWith('/composed', { replace: undefined, scroll: undefined });
});

test('inline link pointer and press feedback preserve authored foregrounds and callbacks', async () => {
  const enter = jest.fn(),
    leave = jest.fn(),
    pressIn = jest.fn(),
    pressOut = jest.fn();
  await mount(
    <RegistryLink
      href="/feedback"
      className="text-muted-foreground hover:text-primary"
      onHoverIn={enter}
      onHoverOut={leave}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      Feedback
    </RegistryLink>,
  );
  const link = screen.getByRole('link');
  const initial = StyleSheet.flatten(link.props.style).color;
  await fireEvent(link, 'pointerEnter', {});
  expect(enter).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(screen.getByRole('link').props.style).color).not.toBe(initial);
  await fireEvent(screen.getByRole('link'), 'pointerLeave', {});
  expect(leave).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(screen.getByRole('link').props.style).color).toBe(initial);
  await fireEvent(screen.getByRole('link'), 'pressIn', {});
  await fireEvent(screen.getByRole('link'), 'pressOut', {});
  expect(pressIn).toHaveBeenCalledTimes(1);
  expect(pressOut).toHaveBeenCalledTimes(1);
});
test('actual authored Next Link Button and breadcrumb callbacks reach the native application router', async () => {
  const Login = require('./.generated/src/examples/new-york-v4/button-as-child').default;
  const Breadcrumb = require('./.generated/src/examples/aria/breadcrumb-example').default;
  const navigate = jest.fn(),
    anchor = jest.fn();
  await mount(
    <UI.NativeNavigationProvider onNavigate={navigate}>
      <Login />
    </UI.NativeNavigationProvider>,
  );
  await fireEvent.press(screen.getByRole('link', { name: 'Login' }));
  expect(navigate).toHaveBeenCalledWith('/login', { replace: undefined, scroll: undefined });
  await screen.rerender(
    <UI.NativeNavigationProvider onAnchor={anchor}>
      <Breadcrumb />
    </UI.NativeNavigationProvider>,
  );
  const homes = screen.getAllByRole('link', { name: 'Home' });
  for (const link of homes) await fireEvent.press(link);
  expect(anchor).toHaveBeenCalledTimes(homes.length);
  expect(screen.queryByRole('alert')).toBeNull();
});
test('the native Screen supplies top scrolling while preserving application routes and rejects unknown anchors', async () => {
  const { SafeAreaInsetsContext } = require('react-native-safe-area-context');
  const navigate = jest.fn();
  await mount(
    <SafeAreaInsetsContext.Provider value={{ top: 0, bottom: 0, left: 0, right: 0 }}>
      <UI.NativeNavigationProvider onNavigate={navigate}>
        <UI.Screen>
          <UI.NativeLink href="#">Top</UI.NativeLink>
          <UI.NativeLink href="#missing">Missing</UI.NativeLink>
          <UI.NativeLink href="/screen">Route</UI.NativeLink>
        </UI.Screen>
      </UI.NativeNavigationProvider>
    </SafeAreaInsetsContext.Provider>,
  );
  await fireEvent.press(screen.getByRole('link', { name: 'Top' }));
  expect(screen.queryByRole('alert')).toBeNull();
  await fireEvent.press(screen.getByRole('link', { name: 'Missing' }));
  expect(screen.getByRole('alert')).toBeTruthy();
  await fireEvent.press(screen.getByRole('link', { name: 'Route' }));
  expect(navigate).toHaveBeenCalledTimes(1);
});
test('descendant SVG rules cross wrappers without overriding authored icon sizes', async () => {
  const { RegistryView, withRegistryStyles } = require('./.generated/src/native/registry-styles');
  const { Check } = require('lucide-react-native');
  const Icon = withRegistryStyles(Check, 'icon');
  await mount(
    <RegistryView className="[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5">
      <RegistryView>
        <Icon testID="default-icon" />
        <Icon testID="class-icon" className="size-6" />
        <Icon testID="prop-icon" size={32} />
      </RegistryView>
    </RegistryView>,
  );
  expect(screen.getAllByTestId('default-icon')[0]?.props.width).toBe(14);
  expect(screen.getAllByTestId('default-icon')[0]?.props.pointerEvents).toBe('none');
  expect(screen.getAllByTestId('class-icon')[0]?.props.width).toBe(24);
  expect(screen.getAllByTestId('prop-icon')[0]?.props.width).toBe(32);
});

test('inline links normalize native press retention bounds and honor nullable composed event callbacks', async () => {
  const long = jest.fn();
  await mount(
    <UI.NativeLink
      href="/bounds"
      pressRetentionOffset={12}
      onLongPress={long}
      onPressIn={null}
      onPressOut={null}
    >
      Bounds
    </UI.NativeLink>,
  );
  expect(screen.getByRole('link').props.pressRetentionOffset).toEqual({
    top: 12,
    left: 12,
    bottom: 12,
    right: 12,
  });
  await fireEvent(screen.getByRole('link'), 'longPress', {});
  expect(long).toHaveBeenCalledTimes(1);
  await screen.rerender(
    <UI.NativeLink href="/bounds" pressRetentionOffset={{ top: 3 }} onLongPress={null}>
      Bounds
    </UI.NativeLink>,
  );
  expect(screen.getByRole('link').props.pressRetentionOffset).toEqual({
    top: 3,
    left: 0,
    bottom: 0,
    right: 0,
  });
});
