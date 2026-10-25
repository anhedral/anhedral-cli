import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import * as UI from './.generated';
test('native field labels, descriptions and errors reach the real input and label touches focus its preserved ref', async () => {
  let input: TextInput | null = null;
  function Example() {
    const [invalid, setInvalid] = useState(false);
    return (
      <UI.Field invalid={invalid}>
        <UI.FieldLabel nativeID="account-label">Account name</UI.FieldLabel>
        <UI.FieldDescription>Use your public name</UI.FieldDescription>
        <UI.FieldInput
          ref={(node) => {
            input = node;
          }}
          testID="input"
        />
        <UI.FieldError errors={invalid ? [{ message: 'Required' }, { message: 'Required' }] : []} />
        <UI.Button onPress={() => setInvalid(!invalid)}>Toggle error</UI.Button>
      </UI.Field>
    );
  }
  const mounted = await render(
    <UI.ThemeProvider>
      <Example />
    </UI.ThemeProvider>,
  );
  expect(screen.getByLabelText('Account name')).toBe(screen.getByTestId('input'));
  expect(screen.getByTestId('input').props.accessibilityLabelledBy).toEqual(['account-label']);
  expect(screen.getByTestId('input').props.accessibilityHint).toBe('Use your public name');
  expect(input).not.toBeNull();
  const focus = jest.spyOn(input!, 'focus');
  await fireEvent.press(screen.getByText('Account name'));
  expect(focus).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Toggle error' }));
  expect(screen.getByTestId('input').props.accessibilityHint).toBe(
    'Use your public name. Required',
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Required');
  expect(screen.getByTestId('input')).toHaveStyle({ borderColor: 'hsl(0, 84.2%, 60.2%)' });
  await fireEvent.press(screen.getByRole('button', { name: 'Toggle error' }));
  expect(screen.getByTestId('input').props.accessibilityHint).toBe('Use your public name');
  await mounted.unmount();
  expect(input).toBeNull();
});
test('field metadata stays scoped and explicit input labels/hints retain ownership', async () => {
  await render(
    <UI.ThemeProvider>
      <UI.Field>
        <UI.FieldLabel>Automatic</UI.FieldLabel>
        <UI.FieldDescription>Automatic hint</UI.FieldDescription>
        <UI.FieldInput
          testID="custom"
          accessibilityLabel="Custom label"
          accessibilityHint="Custom hint"
        />
      </UI.Field>
      <UI.Field>
        <UI.FieldLabel>Second field</UI.FieldLabel>
        <UI.FieldInput testID="second" />
      </UI.Field>
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('custom').props.accessibilityLabel).toBe('Custom label');
  expect(screen.getByTestId('custom').props.accessibilityHint).toBe('Custom hint');
  expect(screen.getByTestId('custom').props.accessibilityLabelledBy).toBeUndefined();
  expect(screen.getByTestId('second').props.accessibilityLabel).toBe('Second field');
  expect(screen.getByTestId('second').props.accessibilityHint).not.toContain('Automatic');
});
