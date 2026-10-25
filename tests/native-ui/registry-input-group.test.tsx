import React from 'react';
import { TextInput } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
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
      expect(screen.getByTestId('addon')).toHaveStyle({ paddingHorizontal: 10 });
    else expect(screen.getByTestId('addon')).toHaveStyle({ paddingVertical: 6 });
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
  const mounted = await mount(
    <UI.InputGroup testID="group">
      <UI.InputGroupTextarea accessibilityLabel="Message" invalid editable={false} />
      <UI.InputGroupAddon>
        <UI.InputGroupButton>Send</UI.InputGroupButton>
      </UI.InputGroupAddon>
    </UI.InputGroup>,
  );
  expect(screen.getByTestId('group')).toHaveStyle({
    borderColor: 'hsl(0, 84.2%, 60.2%)',
    opacity: 0.5,
  });
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  await mounted.rerender(
    <UI.ThemeProvider>
      <UI.InputGroup testID="group">
        <UI.InputGroupTextarea accessibilityLabel="Message" />
        <UI.InputGroupAddon>
          <UI.InputGroupButton>Send</UI.InputGroupButton>
        </UI.InputGroupAddon>
      </UI.InputGroup>
    </UI.ThemeProvider>,
  );
  expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  expect(screen.getByTestId('group')).toHaveStyle({ borderColor: 'hsl(0, 0%, 89.8%)', opacity: 1 });
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
