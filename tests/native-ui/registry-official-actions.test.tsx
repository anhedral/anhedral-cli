import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as UI from './.generated';
import { NativeFormValues } from './.generated/src/native/registry-action-form';
afterEach(async () => {
  await act(() => UI.toast.dismiss());
});
async function example(name: string) {
  const Component = require(`./.generated/src/examples/new-york-v4/form-next-${name}`).default;
  return render(
    <UI.ThemeProvider>
      <Component />
      <UI.SonnerToaster />
    </UI.ThemeProvider>,
  );
}
test('native action data preserves repeated fields and missing values without browser FormData', () => {
  const data = new NativeFormValues([
    ['addons', 'analytics'],
    ['addons', 'backup'],
    ['plan', 'pro'],
  ]);
  expect(data.get('addons')).toBe('analytics');
  expect(data.getAll('addons')).toEqual(['analytics', 'backup']);
  expect(data.get('missing')).toBeNull();
  expect(data.getAll('missing')).toEqual([]);
  expect([...data.entries()]).toHaveLength(3);
});
test('official action bug report validates native edits and clears its values only after successful submission', async () => {
  const warn = jest.spyOn(console, 'warn'),
    error = jest.spyOn(console, 'error');
  await example('demo');
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
  await fireEvent.changeText(screen.getByLabelText('Bug Title'), 'Native keyboard issue');
  await fireEvent.changeText(
    screen.getByLabelText('Description'),
    'The keyboard stays open after switching to another field.',
  );
  expect(screen.getByText('57/100 characters')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(screen.getByText('Thank you for your feedback')).toBeOnTheScreen());
  expect(screen.getByLabelText('Bug Title').props.value).toBe('');
  expect(screen.getByLabelText('Description').props.value).toBe('');
  expect(screen.getByText('0/100 characters')).toBeOnTheScreen();
  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
  warn.mockRestore();
  error.mockRestore();
});
test('official action subscription retains submitted selections, validates addons and reports pending native controls', async () => {
  await example('complex');
  await fireEvent.press(screen.getByRole('button', { name: /Save Preferences/ }));
  expect(screen.getByRole('button', { name: /Save Preferences/ })).toBeDisabled();
  let nativeForm = screen.getByRole('switch').parent;
  while (nativeForm && nativeForm.props.nativeID !== 'subscription-form')
    nativeForm = nativeForm.parent;
  expect(nativeForm?.props.accessibilityState.busy).toBe(true);
  await waitFor(
    () => expect(screen.getByRole('alert')).toHaveTextContent(/select at least one add-on/),
    { timeout: 2500 },
  );
  await fireEvent.press(screen.getByRole('radio', { name: 'Pro' }));
  await fireEvent.press(screen.getByRole('combobox'));
  await fireEvent.press(screen.getByRole('radio', { name: 'Yearly' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Analytics' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Backup' }));
  await fireEvent(screen.getByRole('switch'), 'valueChange', true);
  await fireEvent.press(screen.getByRole('button', { name: /Save Preferences/ }));
  await waitFor(() => expect(screen.getByText('Preferences saved')).toBeOnTheScreen(), {
    timeout: 2500,
  });
  expect(screen.getByRole('radio', { name: 'Pro' }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole('checkbox', { name: 'Analytics' }).props.accessibilityState.checked).toBe(
    true,
  );
  expect(screen.getByRole('switch').props.accessibilityState.checked).toBe(true);
});
