import React from 'react';
import { Platform, View } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import * as UI from './.generated';
import { parseNativeTemporal, formatNativeTemporal } from './.generated/src/native/temporal-input';
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: (props: unknown) => {
    const React = require('react'),
      { View } = require('react-native');
    return React.createElement(View, { ...(props as object), testID: 'native-temporal-picker' });
  },
}));
const frame = (children: React.ReactNode) => <UI.ThemeProvider>{children}</UI.ThemeProvider>;
function date(year: number, month: number, day: number, hour = 0, minute = 0) {
  const value = new Date();
  value.setFullYear(year, month - 1, day);
  value.setHours(hour, minute, 0, 0);
  return value;
}
async function changeNative(value: Date) {
  await fireEvent(
    screen.getByTestId('native-temporal-picker'),
    'valueChange',
    { nativeEvent: { timestamp: value.getTime(), utcOffset: 0 } },
    value,
  );
}
test('native date/time parsers preserve local components, early years and leap boundaries without UTC day shifts', () => {
  expect(formatNativeTemporal(parseNativeTemporal('0037-01-02', 'date')!, 'date')).toBe(
    '0037-01-02',
  );
  expect(parseNativeTemporal('2023-02-29', 'date')).toBeUndefined();
  expect(parseNativeTemporal('2024-02-29', 'date')?.getDate()).toBe(29);
  for (const bad of ['2026-00-01', '2026-13-01', '2026-10-00', '0000-01-01'])
    expect(parseNativeTemporal(bad, 'date')).toBeUndefined();
  expect(
    formatNativeTemporal(parseNativeTemporal('23:59', 'time', date(2026, 10, 25))!, 'time'),
  ).toBe('23:59');
  expect(parseNativeTemporal('24:00', 'time')).toBeUndefined();
  expect(parseNativeTemporal('12:60', 'time')).toBeUndefined();
  expect(() => formatNativeTemporal(new Date(NaN), 'date')).toThrow('valid Date');
});
for (const type of ['date', 'time'] as const)
  test(`${type} uses native selection and commits canonical values exactly once`, async () => {
    const change = jest.fn();
    await render(
      frame(
        <UI.TemporalInput
          type={type}
          accessibilityLabel="Native temporal field"
          onChangeText={change}
        />,
      ),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Native temporal field' }));
    expect(screen.getByTestId('native-temporal-picker').props.mode).toBe(type);
    await changeNative(date(2026, 11, 17, 15, 42));
    if (Platform.OS === 'ios') {
      expect(change).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByRole('button', { name: 'Apply ' + type }));
    }
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith(type === 'date' ? '2026-11-17' : '15:42');
    expect(screen.queryByTestId('native-temporal-picker')).toBeNull();
  });
test('native dismissal preserves previously selected work and controlled values stay owned by the application', async () => {
  const change = jest.fn();
  await render(frame(<UI.TemporalInput type="date" value="2026-10-25" onChange={change} />));
  await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
  await fireEvent(screen.getByTestId('native-temporal-picker'), 'dismiss');
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByText('2026-10-25')).toBeOnTheScreen();
});
test('out-of-range native results remain unsaved with a retryable error', async () => {
  const change = jest.fn();
  await render(
    frame(
      <UI.TemporalInput
        type="date"
        defaultValue="2026-10-25"
        min="2026-10-01"
        max="2026-10-31"
        onChange={change}
      />,
    ),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
  await changeNative(date(2026, 11, 17));
  if (Platform.OS === 'ios')
    await fireEvent.press(screen.getByRole('button', { name: 'Apply date' }));
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Date must be at most 2026-10-31.');
  if (Platform.OS === 'ios')
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel date' }));
  expect(screen.getByText('2026-10-25')).toBeOnTheScreen();
});
test('time bounds retain their periodic domain across midnight', async () => {
  const change = jest.fn();
  await render(frame(<UI.TemporalInput type="time" min="21:00" max="06:00" onChange={change} />));
  await fireEvent.press(screen.getByRole('button', { name: 'Time' }));
  await changeNative(date(2026, 10, 25, 1, 30));
  if (Platform.OS === 'ios')
    await fireEvent.press(screen.getByRole('button', { name: 'Apply time' }));
  expect(change).toHaveBeenCalledWith('01:30');
});
test('disabled and stale native controls cannot change application values', async () => {
  const change = jest.fn(),
    view = await render(frame(<UI.TemporalInput type="date" onChange={change} />));
  await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
  const stale = screen.getByTestId('native-temporal-picker').props.onValueChange;
  await view.rerender(frame(<UI.TemporalInput type="date" disabled onChange={change} />));
  expect(screen.queryByTestId('native-temporal-picker')).toBeNull();
  await act(() => stale({}, date(2026, 11, 17)));
  expect(change).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
  expect(screen.queryByTestId('native-temporal-picker')).toBeNull();
});
test('field labels activate temporal inputs and required date values participate in native validation', async () => {
  const submit = jest.fn();
  await render(
    frame(
      <UI.NativeForm onSubmit={submit}>
        <UI.Field>
          <UI.Label controlID="start">Start date</UI.Label>
          <UI.TemporalInput nativeID="start" type="date" required />
        </UI.Field>
        <UI.Button type="submit">Save date</UI.Button>
      </UI.NativeForm>,
    ),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save date' }));
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Start date is required.');
  await fireEvent.press(screen.getByText('Start date'));
  await changeNative(date(2026, 10, 25));
  if (Platform.OS === 'ios')
    await fireEvent.press(screen.getByRole('button', { name: 'Apply date' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save date' }));
  expect(submit).toHaveBeenCalledTimes(1);
});
test('native date focus callbacks are dispatched once through the composed field', async () => {
  const focus = jest.fn();
  await render(frame(<UI.TemporalInput type="date" onFocus={focus} />));
  await fireEvent(screen.getByRole('button', { name: 'Date' }), 'focus');
  expect(focus).toHaveBeenCalledTimes(1);
});

test('native picker failures preserve prior values and permit a fresh request', async () => {
  if (Platform.OS !== 'android') return;
  const change = jest.fn();
  await render(frame(<UI.TemporalInput type="date" defaultValue="2026-10-25" onChange={change} />));
  await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
  await fireEvent(
    screen.getByTestId('native-temporal-picker'),
    'error',
    new Error('native provider unavailable'),
  );
  expect(screen.queryByTestId('native-temporal-picker')).toBeNull();
  expect(screen.getByRole('alert')).toHaveTextContent(/picker is unavailable/);
  expect(change).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
  expect(screen.getByTestId('native-temporal-picker')).toBeOnTheScreen();
});

test('temporal field layout belongs to its native outer host and text paint remains on the control', async () => {
  await render(
    frame(
      <UI.TemporalInput
        type="date"
        testID="temporal-layout"
        style={{ flex: 1, marginLeft: 12, width: 180, color: '#123456', height: 48 }}
      />,
    ),
  );
  expect(screen.getByTestId('temporal-layout')).toHaveStyle({
    flex: 1,
    marginLeft: 12,
    width: 180,
  });
  expect(screen.getByRole('button', { name: 'Date' })).toHaveStyle({ height: 48 });
  expect(screen.getByText('yyyy-mm-dd')).toHaveStyle({ color: '#123456' });
});

test('native wheel events retain a stable picker seed until Apply and external controlled values still replace the draft', async () => {
  if (Platform.OS !== 'ios') return;
  const change = jest.fn(),
    node = (value: string) => <UI.TemporalInput type="date" value={value} onChange={change} />;
  const view = await render(frame(node('2026-10-25')));
  await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
  const seed = screen.getByTestId('native-temporal-picker').props.value;
  await changeNative(date(2026, 10, 17));
  expect(screen.getByTestId('native-temporal-picker').props.value).toBe(seed);
  expect(change).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Apply date' }));
  expect(change).toHaveBeenLastCalledWith('2026-10-17');
  await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
  await changeNative(date(2026, 10, 12));
  await view.rerender(frame(node('2026-10-20')));
  expect(
    formatNativeTemporal(screen.getByTestId('native-temporal-picker').props.value, 'date'),
  ).toBe('2026-10-20');
  await fireEvent.press(screen.getByRole('button', { name: 'Apply date' }));
  expect(change).toHaveBeenLastCalledWith('2026-10-20');
});
