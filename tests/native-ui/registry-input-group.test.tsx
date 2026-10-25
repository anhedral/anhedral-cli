import React from 'react';
import { TextInput, Dimensions } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { Box } from './.generated/src/native/_core';
const initialWindow = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...initialWindow, fontScale: 1 } }));
afterEach(() => Dimensions.set({ window: initialWindow }));
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);
test.each(['inline-start', 'inline-end', 'block-start', 'block-end'] as const)(
  'input group %s addon uses native layout and focuses its actual input',
  async (align) => {
    let input: TextInput | null = null;
    await mount(
      <UI.InputGroup testID="group">
        <UI.InputGroupInput
          accessibilityLabel="Search"
          ref={(node) => {
            input = node;
          }}
        />
        <UI.InputGroupAddon align={align} testID="addon">
          <UI.InputGroupText>Search</UI.InputGroupText>
        </UI.InputGroupAddon>
      </UI.InputGroup>,
    );
    const focus = jest.spyOn(input!, 'focus');
    try {
      await fireEvent.press(screen.getByTestId('addon'));
      expect(focus).toHaveBeenCalledTimes(1);
    } finally {
      focus.mockRestore();
    }
    expect(screen.getByLabelText('Search')).toHaveStyle({
      borderWidth: 0,
      backgroundColor: 'transparent',
    });
    if (align.startsWith('block'))
      expect(screen.getByTestId('addon')).toHaveStyle({ paddingLeft: 10, paddingRight: 10 });
    else expect(screen.getByTestId('addon')).toHaveStyle({ paddingTop: 6, paddingBottom: 6 });
  },
);
test('native input group slots are ordered by alignment independently of JSX source order', async () => {
  await mount(
    <UI.InputGroup testID="group">
      <UI.InputGroupAddon align="block-end" testID="end">
        End
      </UI.InputGroupAddon>
      <UI.InputGroupInput accessibilityLabel="Body" />
      <UI.InputGroupAddon align="block-start" testID="start">
        Start
      </UI.InputGroupAddon>
    </UI.InputGroup>,
  );
  const root = screen.getByTestId('group');
  expect(root.children[0]).toBe(screen.getByTestId('start'));
  expect(root.children.at(-1)).toBe(screen.getByTestId('end'));
});
test('native input group surfaces follow validation and disabled controls without adding an independent input border', async () => {
  const send = jest.fn();
  const mounted = await mount(
    <UI.InputGroup testID="group">
      <UI.InputGroupTextarea accessibilityLabel="Message" invalid editable={false} />
      <UI.InputGroupAddon>
        <UI.InputGroupButton onPress={send}>Send</UI.InputGroupButton>
      </UI.InputGroupAddon>
    </UI.InputGroup>,
  );
  expect(screen.getByTestId('group')).toHaveStyle({
    borderColor: 'hsl(0, 84.2%, 60.2%)',
    opacity: 0.5,
  });
  expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
  expect(send).toHaveBeenCalledTimes(1);
  await mounted.rerender(
    <UI.ThemeProvider>
      <UI.InputGroup testID="group">
        <UI.InputGroupTextarea accessibilityLabel="Message" />
        <UI.InputGroupAddon>
          <UI.InputGroupButton onPress={send}>Send</UI.InputGroupButton>
        </UI.InputGroupAddon>
      </UI.InputGroup>
    </UI.ThemeProvider>,
  );
  expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  expect(screen.getByTestId('group')).toHaveStyle({ borderColor: 'hsl(0, 0%, 89.8%)' });
  expect(
    require('react-native').StyleSheet.flatten(screen.getByTestId('group').props.style).opacity ??
      1,
  ).toBe(1);
});
test.each(['xs', 'sm', 'icon-xs', 'icon-sm'] as const)(
  'native input-group button %s composes explicit submit/reset actions',
  async (size) => {
    const submit = jest.fn(),
      reset = jest.fn();
    await mount(
      <UI.InputGroup>
        <UI.InputGroupInput accessibilityLabel="Value" />
        <UI.InputGroupAddon>
          <UI.InputGroupButton size={size} type="submit" onPress={submit}>
            Submit
          </UI.InputGroupButton>
          <UI.InputGroupButton size={size} type="reset" onPress={reset}>
            Reset
          </UI.InputGroupButton>
        </UI.InputGroupAddon>
      </UI.InputGroup>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reset' }));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  },
);

test('explicit group disabled state blocks its controls and addon actions', async () => {
  const send = jest.fn();
  await mount(
    <UI.InputGroup disabled>
      <UI.InputGroupInput accessibilityLabel="Disabled group input" />
      <UI.InputGroupAddon>
        <UI.InputGroupButton onPress={send}>Send</UI.InputGroupButton>
      </UI.InputGroupAddon>
    </UI.InputGroup>,
  );
  expect(screen.getByLabelText('Disabled group input')).toHaveProp('editable', false);
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
  expect(send).not.toHaveBeenCalled();
});
test('input-group buttons bind implicit native form submit and reset exactly once', async () => {
  const submit = jest.fn(),
    reset = jest.fn();
  await mount(
    <UI.NativeForm onSubmit={submit} onReset={reset}>
      <UI.InputGroup>
        <UI.InputGroupInput accessibilityLabel="Form value" />
        <UI.InputGroupAddon>
          <UI.InputGroupButton type="submit">Submit</UI.InputGroupButton>
          <UI.InputGroupButton type="reset">Reset</UI.InputGroupButton>
        </UI.InputGroupAddon>
      </UI.InputGroup>
    </UI.NativeForm>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Reset' }));
  expect(submit).toHaveBeenCalledTimes(1);
  expect(reset).toHaveBeenCalledTimes(1);
});

test('group focus follows compound controls while raw inputs only contribute focus-within', async () => {
  const mounted = await mount(
    <UI.InputGroup testID="group">
      <UI.InputGroupInput accessibilityLabel="Compound" />
      <UI.Input accessibilityLabel="Raw" />
    </UI.InputGroup>,
  );
  const base = require('react-native').StyleSheet.flatten(
    screen.getByTestId('group').props.style,
  ).borderColor;
  await fireEvent(screen.getByLabelText('Raw'), 'focus', { nativeEvent: {} });
  expect(screen.getByTestId('group')).toHaveStyle({ borderColor: base });
  await fireEvent(screen.getByLabelText('Compound'), 'focus', { nativeEvent: {} });
  expect(
    require('react-native').StyleSheet.flatten(screen.getByTestId('group').props.style).borderColor,
  ).not.toBe(base);
  await mounted.rerender(
    <UI.ThemeProvider>
      <UI.InputGroup testID="group">
        <UI.Input accessibilityLabel="Raw" />
      </UI.InputGroup>
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('group')).toHaveStyle({ borderColor: base });
});

test('invalid descendant cleanup restores the group without changing sibling validation', async () => {
  const mounted = await mount(
    <UI.InputGroup testID="group">
      <UI.InputGroupInput accessibilityLabel="Invalid" invalid />
      <UI.InputGroupInput accessibilityLabel="Valid" />
    </UI.InputGroup>,
  );
  expect(screen.getByLabelText('Valid').props.accessibilityHint ?? '').toBe('');
  expect(screen.getByTestId('group')).toHaveStyle({ borderColor: 'hsl(0, 84.2%, 60.2%)' });
  await mounted.rerender(
    <UI.ThemeProvider>
      <UI.InputGroup testID="group">
        <UI.InputGroupInput accessibilityLabel="Valid" />
      </UI.InputGroup>
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('group')).toHaveStyle({ borderColor: 'hsl(0, 0%, 89.8%)' });
});

test('readonly group controls remain enabled, dispatch native focus requests and preserve caller refs and dispatch layout callbacks once', async () => {
  const ref = React.createRef<TextInput>(),
    layout = jest.fn(),
    callerFocus = jest.fn();
  await mount(
    <UI.InputGroup>
      <UI.InputGroupInput
        ref={ref}
        accessibilityLabel="Read only"
        readOnly
        onLayout={layout}
        onFocus={callerFocus}
      />
      <UI.InputGroupAddon testID="addon">Read</UI.InputGroupAddon>
    </UI.InputGroup>,
  );
  expect(screen.getByLabelText('Read only').props.accessibilityState.disabled).toBe(false);
  const focus = jest.spyOn(ref.current!, 'focus');
  try {
    await fireEvent.press(screen.getByTestId('addon'));
    expect(focus).toHaveBeenCalledTimes(1);
  } finally {
    focus.mockRestore();
  }
  await fireEvent(screen.getByLabelText('Read only'), 'focus', { nativeEvent: {} });
  await fireEvent(screen.getByLabelText('Read only'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 180, height: 36 } },
  });
  expect(callerFocus).toHaveBeenCalledTimes(1);
  expect(layout).toHaveBeenCalledTimes(1);
});

test('standalone compound slots retain their source behavior without requiring an owner', async () => {
  const action = jest.fn();
  await mount(
    <>
      <UI.InputGroupInput accessibilityLabel="Standalone" />
      <UI.InputGroupAddon testID="addon">Unit</UI.InputGroupAddon>
      <UI.InputGroupButton onPress={action}>Action</UI.InputGroupButton>
    </>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Action' }));
  expect(action).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByTestId('addon'));
});

test('Mira addon keyboard inherits source relaxed leading across native wrappers', async () => {
  await mount(
    <UI.NativeComponentStyleProvider style="mira">
      <UI.InputGroup>
        <UI.InputGroupInput accessibilityLabel="Keyboard input" />
        <UI.InputGroupAddon>
          <UI.Kbd testID="direct">Direct</UI.Kbd>
          <Box>
            <UI.Kbd testID="descendant">Descendant</UI.Kbd>
          </Box>
        </UI.InputGroupAddon>
      </UI.InputGroup>
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.getByText('Direct')).toHaveStyle({ fontSize: 10, lineHeight: 16.25 });
  expect(screen.getByText('Descendant')).toHaveStyle({ fontSize: 10, lineHeight: 16.25 });
});

test('authored custom autosize textarea uses raw preflight geometry and contributes compound focus', async () => {
  const Component = require('./.generated/src/examples/new-york-v4/input-group-custom').default;
  await mount(<Component />);
  const input = screen.getByPlaceholderText('Autoresize textarea...');
  expect(input).toHaveStyle({
    borderWidth: 0,
    minHeight: 64,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  });
  expect(input.props.scrollEnabled).toBe(false);
  await fireEvent.changeText(input, 'First line\nSecond line\nThird line');
  expect(screen.getByPlaceholderText('Autoresize textarea...').props.value).toBe(
    'First line\nSecond line\nThird line',
  );
  let group = input.parent;
  while (group && group.props.role !== 'group') group = group.parent;
  expect(group).not.toBeNull();
  const before = require('react-native').StyleSheet.flatten(group!.props.style).borderColor;
  await fireEvent(input, 'focus', { nativeEvent: {} });
  expect(require('react-native').StyleSheet.flatten(group!.props.style).borderColor).not.toBe(
    before,
  );
});

for (const [preset, heights] of [
  ['vega', [24, 36, 24, 32]],
  ['nova', [24, 32, 24, 32]],
  ['maia', [24, 36, 24, 32]],
  ['lyra', [24, 32, 24, 28]],
  ['mira', [20, 28, 24, 28]],
  ['luma', [24, 36, 24, 32]],
  ['sera', [24, 40, 24, 32]],
  ['rhea', [24, 32, 24, 32]],
  ['default', [24, 32, 24, 32]],
  ['new-york', [24, 32, 24, 32]],
  ['new-york-v4', [24, 32, 24, 32]],
] as const)
  test(`${preset} compound button size overrides compose with the regular source Button recipe`, async () => {
    const sizes = ['xs', 'sm', 'icon-xs', 'icon-sm'] as const;
    await mount(
      <UI.NativeComponentStyleProvider style={preset}>
        <UI.InputGroup>
          <UI.InputGroupInput />
          <UI.InputGroupAddon>
            {sizes.map((size) => (
              <UI.InputGroupButton key={size} size={size} testID={size} accessibilityLabel={size}>
                Action
              </UI.InputGroupButton>
            ))}
          </UI.InputGroupAddon>
        </UI.InputGroup>
      </UI.NativeComponentStyleProvider>,
    );
    for (const [index, size] of sizes.entries()) {
      expect(screen.getByTestId(size)).toHaveStyle({ height: heights[index] });
      if (size.startsWith('icon'))
        expect(screen.getByTestId(size)).toHaveStyle({ width: heights[index] });
    }
  });

test('large native fonts expand source text buttons and measured group frames without inflating icon-only buttons', async () => {
  Dimensions.set({ window: { ...initialWindow, fontScale: 2 } });
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <UI.InputGroup testID="large-group">
        <UI.InputGroupInput accessibilityLabel="Large input" />
        <UI.InputGroupAddon>
          <UI.InputGroupButton testID="text-button">Action</UI.InputGroupButton>
          <UI.InputGroupButton testID="icon-button" size="icon-xs" accessibilityLabel="Icon">
            A
          </UI.InputGroupButton>
        </UI.InputGroupAddon>
      </UI.InputGroup>
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.getByTestId('text-button')).toHaveStyle({ height: 44 });
  expect(screen.getByTestId('icon-button')).toHaveStyle({ height: 24, width: 24 });
  await fireEvent(screen.getByLabelText('Large input'), 'layout', {
    nativeEvent: { layout: { width: 150, height: 64, x: 0, y: 0 } },
  });
  expect(screen.getByTestId('large-group')).toHaveStyle({ height: 64 });
});

test('authored source button example copies its retained URL and toggles the real Tabler star paint', async () => {
  const { setStringAsync } = require('expo-clipboard');
  const Component = require('./.generated/src/examples/new-york-v4/input-group-button').default;
  await mount(<Component />);
  await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
  expect(setStringAsync).toHaveBeenCalledWith('https://x.com/shadcn');
  const star = () => {
    const pending = [screen.container];
    while (pending.length) {
      const node = pending.pop()!;
      if (
        node.props.d ===
        'M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z'
      )
        return node;
      for (const child of node.children)
        if (typeof child === 'object' && child) pending.push(child);
    }
    throw Error('Missing authored Tabler star SVG path');
  };
  expect(star().props.fill).toBeNull();
  await fireEvent.press(star());
  expect(star().props.fill).toBeTruthy();
  expect(star().props.stroke).toBeTruthy();
  await fireEvent.press(star());
  expect(star().props.fill).toBeNull();
});

test('ghost group buttons inherit addon foreground until their source hover rule supplies its own', async () => {
  let colors: Record<string, string> = {};
  function Example() {
    colors = UI.useTheme().colors;
    return (
      <UI.NativeComponentStyleProvider style="nova">
        <UI.InputGroup>
          <UI.InputGroupAddon>
            <UI.InputGroupButton>Inherited action</UI.InputGroupButton>
            <UI.InputGroupButton variant="secondary">Secondary action</UI.InputGroupButton>
          </UI.InputGroupAddon>
        </UI.InputGroup>
      </UI.NativeComponentStyleProvider>
    );
  }
  await mount(<Example />);
  expect(screen.getByText('Inherited action')).toHaveStyle({ color: colors['muted-foreground'] });
  expect(screen.getByText('Secondary action')).toHaveStyle({
    color: colors['secondary-foreground'],
  });
  await fireEvent(screen.getByRole('button', { name: 'Inherited action' }), 'hoverIn', {
    nativeEvent: {},
  });
  expect(screen.getByText('Inherited action')).toHaveStyle({ color: colors.foreground });
});

test('transparent popup triggers preserve source ordering relative to sibling start addons and retain their own actions', async () => {
  const { withRegistryStyles } = require('./.generated/src/native/registry-styles');
  const Popover = withRegistryStyles(UI.Popover),
    Trigger = withRegistryStyles(UI.PopoverTrigger, 'button'),
    Addon = withRegistryStyles(UI.InputGroupAddon);
  await mount(
    <UI.InputGroup testID="ordered-root">
      <Popover>
        <Trigger asChild>
          <Addon testID="popup-addon" accessibilityLabel="Open group help" accessible>
            Help
          </Addon>
        </Trigger>
        <UI.PopoverContent>
          <UI.Text>Connection help</UI.Text>
        </UI.PopoverContent>
      </Popover>
      <Addon testID="prefix-addon">https://</Addon>
      <UI.InputGroupInput accessibilityLabel="Address" />
    </UI.InputGroup>,
  );
  const root = screen.getByTestId('ordered-root');
  expect(root.children[0]).toBe(screen.getByTestId('popup-addon'));
  expect(root.children[1]).toBe(screen.getByTestId('prefix-addon'));
  await fireEvent.press(screen.getByLabelText('Open group help'));
  expect(screen.getByText('Connection help')).toBeOnTheScreen();
});

test('physical combobox ancestry supplies source focus-within paint to raw group fields', async () => {
  await mount(
    <UI.Combobox open items={['One']}>
      <UI.ComboboxContent style={{ borderColor: '#123456' }}>
        <UI.InputGroup testID="combo-group">
          <UI.Input accessibilityLabel="Raw grouped search" />
        </UI.InputGroup>
      </UI.ComboboxContent>
    </UI.Combobox>,
  );
  await fireEvent(screen.getByLabelText('Raw grouped search'), 'focus', { nativeEvent: {} });
  expect(screen.getByTestId('combo-group')).toHaveStyle({ borderColor: '#123456' });
});

test('authored connection-info button opens its popup through the composed addon trigger', async () => {
  const Component = require('./.generated/src/examples/new-york-v4/input-group-button').default;
  await mount(<Component />);
  const unnamed = screen.getAllByRole('button', { name: '' });
  expect(unnamed).toHaveLength(2);
  await fireEvent.press(unnamed[0]!);
  expect(screen.getByText('Your connection is not secure.')).toBeOnTheScreen();
});

test.each([false, true])(
  'composed addon activators follow their child action exactly once and honor cancellation=%s',
  async (cancel) => {
    const child = jest.fn((event) => {
        if (cancel) event.preventDefault();
      }),
      parent = jest.fn();
    await mount(
      <UI.InputGroup>
        <UI.InputGroupAddon onPress={parent}>
          <UI.InputGroupButton asChild>
            <UI.Button onPress={child}>Nested action</UI.Button>
          </UI.InputGroupButton>
        </UI.InputGroupAddon>
      </UI.InputGroup>,
    );
    let prevented = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Nested action' }), {
      preventDefault: () => {
        prevented = true;
      },
      isDefaultPrevented: () => prevented,
    });
    expect(child).toHaveBeenCalledTimes(1);
    expect(parent).toHaveBeenCalledTimes(cancel ? 0 : 1);
  },
);

test('authored tooltip addon forwards touch-and-hold activation to its actual inner button', async () => {
  const Component = require('./.generated/src/examples/new-york-v4/input-group-tooltip').default;
  await mount(<Component />);
  await require('@testing-library/react-native').userEvent.longPress(
    screen.getAllByRole('button', { name: 'Help' })[1]!,
  );
  expect(screen.getByText('Click for help with API keys')).toBeOnTheScreen();
});

test('composed addon activators expose state and caller labels on the actual native button while child labels win', async () => {
  const action = jest.fn();
  const mounted = await mount(
    <UI.InputGroup>
      <UI.InputGroupAddon
        onPress={action}
        accessibilityLabel="Parent action"
        accessibilityState={{ expanded: true }}
        disabled
      >
        <UI.InputGroupButton>Activate</UI.InputGroupButton>
      </UI.InputGroupAddon>
    </UI.InputGroup>,
  );
  expect(screen.getByRole('button', { name: 'Parent action' })).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Parent action' }).props.accessibilityState.expanded,
  ).toBe(true);
  await mounted.rerender(
    <UI.ThemeProvider>
      <UI.InputGroup>
        <UI.InputGroupAddon
          onPress={action}
          accessibilityLabel="Parent action"
          accessibilityState={{ expanded: false }}
        >
          <UI.InputGroupButton accessibilityLabel="Child action">Activate</UI.InputGroupButton>
        </UI.InputGroupAddon>
      </UI.InputGroup>
    </UI.ThemeProvider>,
  );
  const button = screen.getByRole('button', { name: 'Child action' });
  expect(button).toBeEnabled();
  expect(button.props.accessibilityState.expanded).toBe(false);
  await fireEvent.press(button);
  expect(action).toHaveBeenCalledTimes(1);
});

test('composed addon long-press actions retain the native activation hint, threshold and accessibility action', async () => {
  const hold = jest.fn(),
    activate = jest.fn();
  await mount(
    <UI.InputGroup>
      <UI.InputGroupAddon
        onLongPress={hold}
        delayLongPress={900}
        accessibilityHint="Hold for details"
        accessibilityActions={[{ name: 'activate', label: 'Open details' }]}
        onAccessibilityAction={activate}
      >
        <UI.InputGroupButton accessibilityLabel="Details">?</UI.InputGroupButton>
      </UI.InputGroupAddon>
    </UI.InputGroup>,
  );
  const button = screen.getByRole('button', { name: 'Details' });
  const user = require('@testing-library/react-native').userEvent;
  await user.longPress(button, { duration: 800 });
  expect(hold).not.toHaveBeenCalled();
  await user.longPress(button, { duration: 1000 });
  expect(hold).toHaveBeenCalledTimes(1);
  expect(button.props.accessibilityHint).toBe('Hold for details');
  await fireEvent(button, 'accessibilityAction', {
    nativeEvent: { actionName: 'activate' },
    isDefaultPrevented: () => false,
  });
  expect(activate).toHaveBeenCalledTimes(1);
});

for (const family of ['base', 'radix', 'aria'])
  test(`${family} authored input-group country menu retains its callback and selected value`, async () => {
    const Component = require(`./.generated/src/examples/${family}/input-group-example`).default;
    await mount(<Component />);
    await fireEvent.press(screen.getByRole('button', { name: /^\+1(?:\s|$)/ }));
    await fireEvent.press(screen.getByRole('menuitem', { name: '+44' }));
    expect(screen.getByRole('button', { name: /^\+44(?:\s|$)/ })).toBeOnTheScreen();
    expect(screen.queryByRole('menuitem', { name: '+44' })).toBeNull();
  });

test('input-group text styles reach the native text host while adjacent expressions remain continuous', async () => {
  await mount(
    <UI.InputGroupText style={{ userSelect: 'none', fontSize: 18 }}>
      {'US'}
      {'D'}
    </UI.InputGroupText>,
  );
  expect(screen.getByText('USD')).toHaveStyle({ userSelect: 'none', fontSize: 18 });
});
