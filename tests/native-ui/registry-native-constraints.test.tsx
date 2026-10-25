import React from 'react';
import { TextInput, AccessibilityInfo } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { RegistryInput } from './.generated/src/native/registry-form-controls';
import { NativeRecipeForm } from './.generated/src/native/native-form';
import {
  NativeRegistryPalette,
  type NativeRegistrySource,
} from './.generated/src/native/_registry-context';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
const SourceButton = withRegistryStyles(UI.Button, 'button');
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);

test('required native fields block submission, focus the field and retry with current values', async () => {
  const submit = jest.fn(),
    input = React.createRef<TextInput>();
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  await mount(
    <UI.NativeForm onSubmit={submit}>
      <RegistryInput ref={input} required type="email" accessibilityLabel="Email" />
      <UI.Button type="submit">Save</UI.Button>
    </UI.NativeForm>,
  );
  const focus = jest.spyOn(input.current!, 'focus');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).not.toHaveBeenCalled();
  expect(focus).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('alert')).toHaveTextContent('Email is required.');
  expect(announce).toHaveBeenCalledWith('Email is required.');
  await fireEvent.changeText(screen.getByLabelText('Email'), 'bad');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Email requires a valid email address.');
  await fireEvent.changeText(screen.getByLabelText('Email'), 'member@example.com');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('alert')).toBeNull();
  focus.mockRestore();
  announce.mockRestore();
});

test('constraints follow controlled changes, disabled state and unmounted fields', async () => {
  const submit = jest.fn();
  const fixture = (disabled: boolean, show = true) => (
    <UI.ThemeProvider>
      <UI.NativeForm onSubmit={submit}>
        {show && <RegistryInput accessibilityLabel="Code" value="" required disabled={disabled} />}
        <UI.Button type="submit">Save</UI.Button>
      </UI.NativeForm>
    </UI.ThemeProvider>
  );
  const tree = await render(fixture(true));
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(1);
  await tree.rerender(fixture(false));
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(1);
  await tree.rerender(fixture(false, false));
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(2);
});

test('native pattern, length and URL validation preserves optional empty fields', async () => {
  const submit = jest.fn();
  await mount(
    <UI.NativeForm onSubmit={submit}>
      <RegistryInput accessibilityLabel="Code" minLength={3} pattern="[0-9]*" />
      <RegistryInput accessibilityLabel="Website" type="url" />
      <UI.Button type="submit">Save</UI.Button>
    </UI.NativeForm>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(1);
  await fireEvent.changeText(screen.getByLabelText('Code'), '12');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Code must contain at least 3 characters.');
  await fireEvent.changeText(screen.getByLabelText('Code'), 'abc');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Code does not match the required format.');
  await fireEvent.changeText(screen.getByLabelText('Code'), '123');
  await fireEvent.changeText(screen.getByLabelText('Website'), 'invalid');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Website requires a valid URL.');
  await fireEvent.changeText(screen.getByLabelText('Website'), 'https://example.com');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(2);
});

for (const source of [
  'base',
  'aria',
  'radix',
  'default',
  'new-york',
  'new-york-v4',
] as NativeRegistrySource[])
  test(`${source} Button retains its source-specific implicit form action`, async () => {
    const submit = jest.fn();
    await mount(
      <NativeRegistryPalette generation="modern" source={source}>
        <UI.NativeForm onSubmit={submit}>
          <SourceButton>Implicit</SourceButton>
          <UI.Button type="button">Explicit button</UI.Button>
        </UI.NativeForm>
      </NativeRegistryPalette>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Implicit' }));
    expect(submit).toHaveBeenCalledTimes(['base', 'aria'].includes(source) ? 0 : 1);
    await fireEvent.press(screen.getByRole('button', { name: 'Explicit button' }));
    expect(submit).toHaveBeenCalledTimes(['base', 'aria'].includes(source) ? 0 : 1);
  });

test('unassociated native submit controls remain inert and authored forms without actions disclose their boundary', async () => {
  await mount(
    <>
      <UI.Button type="submit">Unassociated</UI.Button>
      <NativeRecipeForm>
        <UI.Button type="submit">Example submit</UI.Button>
      </NativeRecipeForm>
    </>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Unassociated' }));
  expect(screen.queryByRole('alert')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Example submit' }));
  expect(screen.getByRole('alert')).toHaveTextContent(
    'This example has no submission action configured.',
  );
});
