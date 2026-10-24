import React from 'react';
import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (element: React.ReactElement) =>
  render(<UI.ThemeProvider>{element}</UI.ThemeProvider>);
test('native select displays option labels, blocks disabled choices and closes after a selection', async () => {
  const change = jest.fn();
  await mount(
    <UI.NativeSelect
      defaultValue="a"
      onValueChange={change}
      options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
        { value: 'c', label: 'Disabled', disabled: true },
      ]}
    />,
  );
  expect(screen.getByRole('combobox')).toHaveTextContent('Alpha');
  await userEvent.press(screen.getByRole('combobox'));
  await userEvent.press(screen.getByRole('radio', { name: 'Disabled' }));
  expect(change).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(change).toHaveBeenCalledWith('b');
  expect(screen.getByRole('combobox')).toHaveTextContent('Beta');
  expect(screen.queryByRole('radio')).toBeNull();
});
test('controlled select leaves label ownership with the consumer', async () => {
  const change = jest.fn();
  await mount(
    <UI.NativeSelect
      value="a"
      onValueChange={change}
      options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]}
    />,
  );
  await userEvent.press(screen.getByRole('combobox'));
  await userEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(change).toHaveBeenCalledWith('b');
  expect(screen.getByRole('combobox')).toHaveTextContent('Alpha');
});
test('combobox filters, reports empty results and clears its query after selection', async () => {
  const change = jest.fn();
  await mount(
    <UI.Combobox
      onValueChange={change}
      options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]}
    />,
  );
  await userEvent.press(screen.getByRole('combobox'));
  await fireEvent.changeText(screen.getByLabelText('Search options'), 'missing');
  expect(screen.getByText('No options found')).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Search options'), 'bet');
  expect(screen.queryByRole('radio', { name: 'Alpha' })).toBeNull();
  await userEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(change).toHaveBeenCalledWith('b');
  await userEvent.press(screen.getByRole('combobox'));
  expect(screen.getByLabelText('Search options')).toHaveProp('value', '');
  expect(screen.getByRole('radio', { name: 'Alpha' })).toBeOnTheScreen();
});
test('command keyword filtering, empty state and disabled selection operate on native input', async () => {
  const select = jest.fn();
  await mount(
    <UI.Command>
      <UI.CommandInput />
      <UI.CommandList>
        <UI.CommandEmpty>No commands</UI.CommandEmpty>
        <UI.CommandItem value="open" keywords={['files']} onSelect={select}>
          Open file
        </UI.CommandItem>
        <UI.CommandItem value="save" disabled onSelect={select}>
          Save
        </UI.CommandItem>
      </UI.CommandList>
    </UI.Command>,
  );
  await fireEvent.changeText(screen.getByLabelText('Search commands'), 'files');
  expect(screen.getByText('Open file')).toBeOnTheScreen();
  expect(screen.queryByText('Save')).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: 'Open file' }));
  expect(select).toHaveBeenCalledWith('open');
  await fireEvent.changeText(screen.getByLabelText('Search commands'), 'none');
  expect(screen.getByText('No commands')).toBeOnTheScreen();
});
test('navigation menu exposes a real link action', async () => {
  const go = jest.fn();
  await mount(
    <UI.NavigationMenu>
      <UI.NavigationMenuItem defaultOpen>
        <UI.NavigationMenuContent>
          <UI.NavigationMenuLink onPress={go}>Details</UI.NavigationMenuLink>
        </UI.NavigationMenuContent>
      </UI.NavigationMenuItem>
    </UI.NavigationMenu>,
  );
  await userEvent.press(screen.getByRole('link', { name: 'Details' }));
  expect(go).toHaveBeenCalledTimes(1);
});
