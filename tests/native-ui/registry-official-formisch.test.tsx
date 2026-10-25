import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as UI from './.generated';
import manifest from './.generated/NATIVE_RECIPES.json';
const recipes = manifest.recipes.filter((recipe) => recipe.name.startsWith('form-formisch-'));
afterEach(async () => {
  await act(() => UI.toast.dismiss());
});
for (const recipe of recipes) {
  test(`${recipe.name} renders the official schema and native controls without browser hosts`, async () => {
    const Component = require(`./.generated/src/examples/${recipe.style}/${recipe.name}`).default;
    const warn = jest.spyOn(console, 'warn'),
      error = jest.spyOn(console, 'error');
    await render(
      <UI.ThemeProvider>
        <Component />
        <UI.SonnerToaster />
      </UI.ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: /Save|Submit|Create Password/ })).toBeOnTheScreen();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });
}
test('official Formisch input validates edited native text, submits the real values from its external button and resets', async () => {
  const Component = require('./.generated/src/examples/new-york-v4/form-formisch-input').default;
  await render(
    <UI.ThemeProvider>
      <Component />
      <UI.SonnerToaster />
    </UI.ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(/Username must be at least 3 characters/),
  );
  await fireEvent.changeText(screen.getByLabelText('Username'), 'native_user');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Username must be at most 10 characters.'),
  );
  await fireEvent.changeText(screen.getByLabelText('Username'), 'expo_user');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('You submitted the following values:'),
  );
  expect(UI.toast.getToasts().at(-1)?.description).toBeTruthy();
  expect(screen.getByText(/"username": "expo_user"/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByLabelText('Username').props.value).toBe('');
});

async function example(name: string) {
  const Component = require(`./.generated/src/examples/new-york-v4/${name}`).default;
  return render(
    <UI.ThemeProvider>
      <Component />
      <UI.SonnerToaster />
    </UI.ThemeProvider>,
  );
}
async function submitted() {
  await waitFor(() =>
    expect(UI.toast.getToasts().at(-1)?.title).toBe('You submitted the following values:'),
  );
}

test('official Formisch checkbox labels activate their real native control, preserve disabled values and validate selections', async () => {
  await example('form-formisch-checkbox');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please select at least one notification type.',
    ),
  );
  const disabled = screen
    .getAllByRole('checkbox')
    .find((node) => node.props.accessibilityState.disabled);
  expect(disabled).toBeDefined();
  await fireEvent.press(disabled!);
  expect(disabled!.props.accessibilityState.checked).toBe(true);
  const task = screen
    .getAllByRole('checkbox', { name: 'Push notifications' })
    .find((node) => !node.props.accessibilityState.disabled)!;
  const taskLabel = screen
    .getAllByText('Push notifications')
    .find((node) => task.props.accessibilityLabelledBy?.includes(node.props.nativeID));
  expect(taskLabel).toBeDefined();
  await fireEvent.press(taskLabel!);
  expect(task.props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await submitted();
  expect(screen.getByText(/"responses": true/)).toBeOnTheScreen();
  expect(screen.getByText(/"push"/)).toBeOnTheScreen();
});
test('official Formisch switch changes its controlled value and validates its required true state', async () => {
  await example('form-formisch-switch');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/enable two-factor/));
  await fireEvent(screen.getByRole('switch'), 'valueChange', true);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await submitted();
  expect(screen.getByText(/"twoFactor": true/)).toBeOnTheScreen();
});
test('official Formisch choice-card labels select native radios and submit the original option ID', async () => {
  await example('form-formisch-radiogroup');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(/must select a subscription plan/),
  );
  const label = screen.getByText('Pro (1M tokens/month)');
  // Press the native choice-card surface, not only the nested radio indicator.
  let card = label.parent;
  while (card && card.props.accessible !== false) card = card.parent;
  expect(card).not.toBeNull();
  await fireEvent.press(card!);
  expect(
    screen.getByRole('radio', { name: 'Pro (1M tokens/month)' }).props.accessibilityState.checked,
  ).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await submitted();
  expect(screen.getByText(/"plan": "pro"/)).toBeOnTheScreen();
});
test('official Formisch select rejects auto detection, preserves a selected language and submits it', async () => {
  await example('form-formisch-select');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Please select your spoken language.'),
  );
  await fireEvent.press(screen.getByRole('combobox'));
  await fireEvent.press(screen.getByRole('radio', { name: /Auto/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(/Auto-detection is not allowed/),
  );
  await fireEvent.press(screen.getByRole('combobox'));
  await fireEvent.press(screen.getByRole('radio', { name: 'Japanese' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await submitted();
  expect(screen.getByText(/"language": "ja"/)).toBeOnTheScreen();
});
test('official Formisch field-array append/remove limits and native input refs preserve the submitted addresses', async () => {
  await example('form-formisch-array');
  expect(screen.getAllByLabelText(/Email address \d/)).toHaveLength(2);
  for (let i = 0; i < 3; i++)
    await fireEvent.press(screen.getByRole('button', { name: 'Add Email Address' }));
  expect(screen.getAllByLabelText(/Email address \d/)).toHaveLength(5);
  expect(screen.getByRole('button', { name: 'Add Email Address' })).toBeDisabled();
  for (let i = 5; i > 1; i--)
    await fireEvent.press(screen.getByRole('button', { name: `Remove email ${i}` }));
  expect(screen.getAllByLabelText(/Email address \d/)).toHaveLength(1);
  await fireEvent.changeText(screen.getByLabelText('Email address 1'), 'not-an-email');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.'),
  );
  await fireEvent.changeText(screen.getByLabelText('Email address 1'), 'native@example.com');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await submitted();
  expect(screen.getByText(/"address": "native@example.com"/)).toBeOnTheScreen();
});

test('official Formisch textarea validates length, retains native multiline entry and submits its exact value', async () => {
  await example('form-formisch-textarea');
  const field = screen.getByLabelText('More about you');
  expect(field.props.multiline).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Please provide at least 10 characters.'),
  );
  await fireEvent.changeText(field, 'A native\nprofile description.');
  await fireEvent(field, 'submitEditing', {
    nativeEvent: { text: 'A native\nprofile description.' },
    isDefaultPrevented: () => false,
  });
  expect(UI.toast.getToasts()).toHaveLength(0);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await submitted();
  expect(screen.getByText(/"about": "A native\\nprofile description\."/)).toBeOnTheScreen();
});
test('official Formisch bug-report form preserves title/description validation, count and the original payload', async () => {
  await example('form-formisch-demo');
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
  await fireEvent.changeText(screen.getByLabelText('Bug Title'), 'Native input problem');
  const description = 'The keyboard stays open after selecting a different field.';
  await fireEvent.changeText(screen.getByLabelText('Description'), description);
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  await submitted();
  expect(screen.getByText(/"title": "Native input problem"/)).toBeOnTheScreen();
  expect(screen.getByText(/"description": "The keyboard stays open/)).toBeOnTheScreen();
});
test('official mixed Formisch form submits its real plan, billing, addon and notification values', async () => {
  await example('form-formisch-complex');
  await fireEvent.press(screen.getByRole('button', { name: 'Save Preferences' }));
  await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
  await fireEvent.press(screen.getByRole('radio', { name: 'Pro' }));
  await fireEvent.press(screen.getByRole('combobox'));
  await fireEvent.press(screen.getByRole('radio', { name: 'Yearly' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Analytics' }));
  await fireEvent(screen.getByRole('switch'), 'valueChange', true);
  await fireEvent.press(screen.getByRole('button', { name: 'Save Preferences' }));
  await submitted();
  expect(screen.getByText(/"plan": "pro"/)).toBeOnTheScreen();
  expect(screen.getByText(/"billingPeriod": "yearly"/)).toBeOnTheScreen();
  expect(screen.getByText(/"analytics"/)).toBeOnTheScreen();
  expect(screen.getByText(/"emailNotifications": true/)).toBeOnTheScreen();
});
