import React from 'react';
import { TextInput } from 'react-native';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen, userEvent, fireEvent, waitFor } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);
test('native form control owns the actual input label/error description, keeps its ref and focuses Zod-invalid fields', async () => {
  const schema = z.object({ email: z.email('Enter a valid email') }),
    submit = jest.fn();
  let input: TextInput | null = null;
  function Example() {
    const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });
    return (
      <UI.Form {...form}>
        <UI.FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <UI.FormItem>
              <UI.FormLabel>Work email</UI.FormLabel>
              <UI.FormControl>
                <UI.Input
                  testID="control"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  ref={(value) => {
                    input = value;
                    field.ref(value);
                  }}
                />
              </UI.FormControl>
              <UI.FormDescription>Use your work account</UI.FormDescription>
              <UI.FormMessage />
            </UI.FormItem>
          )}
        />
        <UI.Button onPress={() => void form.handleSubmit(submit)()}>Submit</UI.Button>
      </UI.Form>
    );
  }
  await mount(<Example />);
  expect(screen.getByLabelText('Work email').props.accessibilityHint).toBe('Use your work account');
  expect(input).not.toBeNull();
  const focus = jest.spyOn(input!, 'focus');
  try {
    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email'));
    expect(focus).toHaveBeenCalled();
    expect(screen.getByLabelText('Work email').props.accessibilityHint).toBe(
      'Use your work account. Enter a valid email',
    );
    expect(screen.getByLabelText('Work email')).toHaveStyle({
      borderColor: 'hsl(0, 84.2%, 60.2%)',
    });
    expect(screen.getByText('Work email')).toHaveStyle({ color: 'hsl(0, 84.2%, 60.2%)' });
    expect(screen.getByTestId('control').props.nativeID).toBe(
      String(screen.getByText('Work email').props.nativeID).replace('-label', '-control'),
    );
    await userEvent.type(screen.getByLabelText('Work email'), 'person@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith({ email: 'person@example.com' }, undefined),
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Work email').props.accessibilityHint).toBe(
      'Use your work account',
    );
  } finally {
    focus.mockRestore();
  }
});
test('native form arrays keep field names/values bound after removal and append', async () => {
  const submit = jest.fn();
  function Example() {
    const form = useForm({ defaultValues: { users: [{ name: 'Alpha' }, { name: 'Beta' }] } }),
      array = useFieldArray({ control: form.control, name: 'users' });
    return (
      <UI.Form {...form}>
        {array.fields.map((item, index) => (
          <UI.FormField
            key={item.id}
            control={form.control}
            name={`users.${index}.name`}
            render={({ field }) => (
              <UI.FormItem>
                <UI.FormLabel>{'Name ' + (index + 1)}</UI.FormLabel>
                <UI.FormControl>
                  <UI.Input value={field.value} onChangeText={field.onChange} ref={field.ref} />
                </UI.FormControl>
              </UI.FormItem>
            )}
          />
        ))}
        <UI.Button onPress={() => array.remove(0)}>Remove first</UI.Button>
        <UI.Button onPress={() => array.append({ name: 'Gamma' })}>Add user</UI.Button>
        <UI.Button onPress={() => void form.handleSubmit(submit)()}>Submit</UI.Button>
      </UI.Form>
    );
  }
  await mount(<Example />);
  await fireEvent.press(screen.getByRole('button', { name: 'Remove first' }));
  expect(screen.getByLabelText('Name 1')).toHaveDisplayValue('Beta');
  await fireEvent.press(screen.getByRole('button', { name: 'Add user' }));
  expect(screen.getByLabelText('Name 2')).toHaveDisplayValue('Gamma');
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(submit).toHaveBeenCalledWith({ users: [{ name: 'Beta' }, { name: 'Gamma' }] }, undefined);
});
test('native form control preserves caller accessibility text and custom message fallback', async () => {
  function Example() {
    const form = useForm({ defaultValues: { name: '' } });
    return (
      <UI.Form {...form}>
        <UI.FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <UI.FormItem>
              <UI.FormLabel>Name</UI.FormLabel>
              <UI.FormControl>
                <UI.Input
                  value={field.value}
                  onChangeText={field.onChange}
                  accessibilityLabel="Custom name"
                  accessibilityHint="Caller hint"
                />
              </UI.FormControl>
              <UI.FormMessage>Optional information</UI.FormMessage>
            </UI.FormItem>
          )}
        />
      </UI.Form>
    );
  }
  await mount(<Example />);
  expect(screen.getByLabelText('Custom name').props.accessibilityHint).toBe('Caller hint');
  expect(screen.getByRole('alert')).toHaveTextContent('Optional information');
});
