import React from 'react';
import { View, Text as NativeText, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { RegistryView } from './.generated/src/native/registry-styles';
import type { ButtonRenderProps, ButtonChildrenState } from './.generated/src/native/button';
const mount = (children: React.ReactNode) =>
  render(
    <UI.ThemeProvider>
      <UI.NativeComponentStyleProvider style="nova">{children}</UI.NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );

const hosts: Record<
  string,
  (
    props: ButtonRenderProps,
    ref: React.RefCallback<unknown>,
  ) => React.ReactElement<{ children?: React.ReactNode }>
> = {
  View: (props, ref) => (
    <View {...props} ref={ref} style={[props.style, { paddingHorizontal: 7 }]} />
  ),
  'native Text': (props, ref) => (
    <NativeText {...props} ref={ref} style={[props.style, { paddingHorizontal: 7 }]} />
  ),
  'themed Text': (props, ref) => (
    <UI.Text {...props} ref={ref} style={[props.style, { paddingHorizontal: 7 }]} />
  ),
  'registry View': (props, ref) => (
    <RegistryView {...props} ref={ref} style={[props.style, { paddingHorizontal: 7 }]} />
  ),
};
for (const [name, host] of Object.entries(hosts))
  test(`Button callback ${name} keeps one native action, consumer styles, source metrics and refs`, async () => {
    const action = jest.fn(),
      release = jest.fn(),
      ref = jest.fn(() => release),
      ownRef = { current: null as unknown };
    const keepOwnRef = (node: unknown) => {
      ownRef.current = node;
      return () => {
        ownRef.current = null;
      };
    };
    const receive = jest.fn();
    const tree = await mount(
      <UI.Button
        accessibilityLabel="Rendered control"
        size="sm"
        ref={ref}
        onPress={action}
        render={(props, state) => {
          receive(state);
          expect(props.children).toBe('Rendered label');
          return host(props, keepOwnRef);
        }}
      >
        Rendered label
      </UI.Button>,
    );
    expect(ownRef.current).toBeTruthy();
    expect(ref).toHaveBeenCalledTimes(1);
    expect(receive).toHaveBeenLastCalledWith({ disabled: false, open: undefined });
    const button = screen.getByRole('button', { name: 'Rendered control' });
    expect(typeof button.props.style).not.toBe('function');
    expect(StyleSheet.flatten(button.props.style).paddingHorizontal).toBe(7);
    if (name.includes('Text')) {
      expect(button).toHaveStyle({ textAlign: 'center', textAlignVertical: 'center' });
      expect(StyleSheet.flatten(button.props.style).paddingTop).toBeGreaterThan(0);
    }
    await fireEvent.press(button);
    expect(action).toHaveBeenCalledTimes(1);
    await fireEvent(button, 'hoverIn');
    expect(ref).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
    await tree.unmount();
    expect(release).toHaveBeenCalledTimes(1);
    expect(ownRef.current).toBeNull();
  });

test('stateful children receive live hover, press, focus, disabled and pending state with source distinctions', async () => {
  const action = jest.fn(),
    states: ButtonChildrenState[] = [];
  const child = (state: ButtonChildrenState) => {
    states.push(state);
    return state.isPending
      ? 'Pending'
      : state.isDisabled
        ? 'Disabled'
        : state.isPressed
          ? 'Pressed'
          : state.isHovered
            ? 'Hovered'
            : state.isFocused
              ? 'Focused'
              : 'Idle';
  };
  const fixture = (pending = false, disabled = false) => (
    <UI.ThemeProvider>
      <UI.Button
        pending={pending}
        disabled={disabled}
        accessibilityLabel="State control"
        onPress={action}
      >
        {child}
      </UI.Button>
    </UI.ThemeProvider>
  );
  const tree = await render(fixture());
  const control = () => screen.getByRole('button', { name: 'State control' });
  expect(screen.getByText('Idle')).toBeTruthy();
  await fireEvent(control(), 'hoverIn');
  expect(screen.getByText('Hovered')).toBeTruthy();
  await fireEvent(control(), 'pressIn');
  expect(screen.getByText('Pressed')).toBeTruthy();
  await fireEvent(control(), 'pressOut');
  await fireEvent(control(), 'hoverOut');
  await fireEvent(control(), 'focus');
  expect(screen.getByText('Focused')).toBeTruthy();
  expect(states.at(-1)?.isFocusVisible).toBe(true);
  await fireEvent(control(), 'blur');
  expect(screen.getByText('Idle')).toBeTruthy();
  await tree.rerender(fixture(true));
  expect(screen.getByText('Pending')).toBeTruthy();
  expect(control()).toBeDisabled();
  expect(control().props.accessibilityState.busy).toBe(true);
  expect(StyleSheet.flatten(control().props.style).opacity).not.toBe(0.5);
  expect(states.at(-1)?.isDisabled).toBe(false);
  await fireEvent.press(control());
  expect(action).not.toHaveBeenCalled();
  await tree.rerender(fixture(false, true));
  expect(screen.getByText('Disabled')).toBeTruthy();
  expect(states.at(-1)?.isPending).toBe(false);
});

test('render callback event ownership preserves child-first cancellation without duplicate native refs or actions', async () => {
  const trace: string[] = [];
  const action = jest.fn((event) => trace.push('parent:' + event.isDefaultPrevented())),
    child = jest.fn(() => trace.push('child'));
  await mount(
    <UI.Button
      onPress={action}
      render={(props) => (
        <RegistryView
          {...props}
          onPress={(event) => {
            child();
            event.preventDefault();
          }}
        />
      )}
    >
      Cancel action
    </UI.Button>,
  );
  let prevented = false;
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel action' }), {
    preventDefault: () => {
      prevented = true;
    },
    isDefaultPrevented: () => prevented,
  });
  expect(trace).toEqual(['child']);
  expect(child).toHaveBeenCalledTimes(1);
  expect(action).not.toHaveBeenCalled();
});

test('rendered overlay controls expose live open state and retain source Button form defaults through composition', async () => {
  const seen = jest.fn(),
    submit = jest.fn();
  await mount(
    <UI.NativeForm onSubmit={submit}>
      <UI.Dialog>
        <UI.DialogTrigger
          render={(props, state) => {
            seen(state);
            return <RegistryView {...props} />;
          }}
        >
          Open callback dialog
        </UI.DialogTrigger>
        <UI.DialogContent>
          <UI.DialogTitle>Callback dialog</UI.DialogTitle>
          <UI.DialogClose>Close callback dialog</UI.DialogClose>
        </UI.DialogContent>
      </UI.Dialog>
    </UI.NativeForm>,
  );
  expect(seen).toHaveBeenLastCalledWith({ disabled: false, open: false });
  await fireEvent.press(screen.getByRole('button', { name: 'Open callback dialog' }));
  expect(screen.getByRole('header', { name: 'Callback dialog' })).toBeTruthy();
  expect(seen).toHaveBeenLastCalledWith({ disabled: false, open: true });
  expect(submit).not.toHaveBeenCalled();
});

test('LinkButton stateful children retain a single navigable native link', async () => {
  const navigate = jest.fn();
  await mount(
    <UI.LinkButton href="/native" accessibilityLabel="Callback link" onNavigate={navigate}>
      {(state) => (state.isHovered ? 'Hovered link' : 'Navigate')}
    </UI.LinkButton>,
  );
  await fireEvent.press(screen.getByRole('link', { name: 'Callback link' }));
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('/native');
});

test('callback-added source icons affect Button slots after the actual render host is known', async () => {
  const { nativeRegistryIcons } = require('./.generated/src/native/registry-icons');
  const Icon = nativeRegistryIcons.PlusIcon;
  await mount(
    <UI.Button
      accessibilityLabel="Added glyph"
      size="sm"
      render={(props) => (
        <View {...props}>
          <Icon registryIcon="inline-start" />
          {props.children}
        </View>
      )}
    >
      Glyph label
    </UI.Button>,
  );
  expect(screen.getByRole('button', { name: 'Added glyph' })).toHaveStyle({ paddingLeft: 6 });
});

test('composed Buttons preserve the pending versus disabled distinction in their child callbacks', async () => {
  const seen = jest.fn();
  await mount(
    <UI.Button pending asChild>
      <UI.Button>
        {(state) => {
          seen(state);
          return state.isPending ? 'Nested pending' : 'Nested ready';
        }}
      </UI.Button>
    </UI.Button>,
  );
  expect(screen.getByRole('button', { name: 'Nested pending' })).toBeDisabled();
  expect(seen).toHaveBeenLastCalledWith(
    expect.objectContaining({ isPending: true, isDisabled: false }),
  );
});

test('Button render callbacks reject absent or multiple hosts instead of silently replacing their output', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await expect(
      mount(
        <UI.Button
          render={() => (
            <>
              <View />
              <View />
            </>
          )}
        >
          Invalid roots
        </UI.Button>,
      ),
    ).rejects.toThrow('Native composition requires one native host element.');
    const invalid = (() => null) as unknown as NonNullable<
      import('./.generated/src/native/button').ButtonProps['render']
    >;
    await expect(mount(<UI.Button render={invalid}>Missing root</UI.Button>)).rejects.toThrow(
      'Native Button render callbacks require one native host element.',
    );
  } finally {
    error.mockRestore();
  }
});

test('ordinary Button content is not mistaken for a replacement host when it contains one source icon', async () => {
  const { nativeRegistryIcons } = require('./.generated/src/native/registry-icons');
  const Icon = nativeRegistryIcons.PlusIcon;
  await mount(
    <UI.Button size="sm" accessibilityLabel="Single source icon">
      <Icon registryIcon="inline-start" />
    </UI.Button>,
  );
  expect(screen.getByRole('button', { name: 'Single source icon' })).toHaveStyle({
    paddingLeft: 6,
  });
});
