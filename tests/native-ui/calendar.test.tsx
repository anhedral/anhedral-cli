import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (element: React.ReactElement) =>
  render(<UI.ThemeProvider>{element}</UI.ThemeProvider>);
test('calendar handles leap days, date bounds and single selection', async () => {
  const select = jest.fn();
  await mount(
    <UI.Calendar
      locale="en-US"
      defaultMonth={new Date(2024, 1, 1)}
      fromDate={new Date(2024, 1, 1)}
      toDate={new Date(2024, 1, 29)}
      onSelect={select}
    />,
  );
  expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Thursday, February 29, 2024' }));
  expect(select.mock.calls[0][0]).toEqual(new Date(2024, 1, 29));
  await userEvent.press(screen.getByRole('button', { name: 'Thursday, February 29, 2024' }));
  expect(select).toHaveBeenLastCalledWith(undefined);
});
test('calendar navigates month/year boundaries and honours disabled date predicates', async () => {
  const select = jest.fn();
  await mount(
    <UI.Calendar
      locale="en-US"
      defaultMonth={new Date(2024, 11, 1)}
      disabled={(day) => day.getDay() === 0}
      onSelect={select}
    />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByText('January 2025')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Sunday, January 5, 2025' }));
  expect(select).not.toHaveBeenCalled();
});
test('multiple selection toggles membership without dropping other dates', async () => {
  const select = jest.fn();
  await mount(
    <UI.Calendar
      mode="multiple"
      locale="en-US"
      defaultMonth={new Date(2024, 1, 1)}
      onSelect={select}
    />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Thursday, February 1, 2024' }));
  await userEvent.press(screen.getByRole('button', { name: 'Friday, February 2, 2024' }));
  expect(select.mock.calls[1][0]).toHaveLength(2);
  await userEvent.press(screen.getByRole('button', { name: 'Thursday, February 1, 2024' }));
  expect(select).toHaveBeenLastCalledWith([new Date(2024, 1, 2)]);
});
test('range selection orders endpoints and starts a new range after completion', async () => {
  const select = jest.fn();
  await mount(
    <UI.Calendar
      mode="range"
      locale="en-US"
      defaultMonth={new Date(2024, 1, 1)}
      onSelect={select}
    />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Friday, February 2, 2024' }));
  await userEvent.press(screen.getByRole('button', { name: 'Thursday, February 1, 2024' }));
  expect(select).toHaveBeenLastCalledWith({ from: new Date(2024, 1, 1), to: new Date(2024, 1, 2) });
  await userEvent.press(screen.getByRole('button', { name: 'Saturday, February 3, 2024' }));
  expect(select).toHaveBeenLastCalledWith({ from: new Date(2024, 1, 3) });
});
test('explicit controlled clearing cannot resurrect a previous selection', async () => {
  const select = jest.fn();
  const result = await mount(
    <UI.Calendar
      locale="en-US"
      defaultMonth={new Date(2024, 1, 1)}
      selected={new Date(2024, 1, 1)}
      onSelect={select}
    />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Friday, February 2, 2024' }));
  expect(select).toHaveBeenCalledWith(new Date(2024, 1, 2));
  await result.rerender(
    <UI.ThemeProvider>
      <UI.Calendar
        locale="en-US"
        defaultMonth={new Date(2024, 1, 1)}
        selected={undefined}
        onSelect={select}
      />
    </UI.ThemeProvider>,
  );
  expect(
    screen.getByRole('button', { name: 'Thursday, February 1, 2024' }).props.accessibilityState
      .selected,
  ).toBe(false);
  expect(
    screen.getByRole('button', { name: 'Friday, February 2, 2024' }).props.accessibilityState
      .selected,
  ).toBe(false);
});
test('date picker opens a calendar, returns a date and closes its modal', async () => {
  const change = jest.fn();
  await mount(
    <UI.DatePicker locale="en-US" defaultMonth={new Date(2024, 1, 1)} onValueChange={change} />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Choose date' }));
  await userEvent.press(screen.getByRole('button', { name: 'Thursday, February 1, 2024' }));
  expect(change).toHaveBeenCalledWith(new Date(2024, 1, 1));
  expect(screen.queryByText('February 2024')).toBeNull();
});
