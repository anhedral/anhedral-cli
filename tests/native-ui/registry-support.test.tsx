import React, { useState } from 'react';
import { Dimensions } from 'react-native';
import { useForm } from 'react-hook-form';
import { render, screen, userEvent, fireEvent, waitFor } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (node: React.ReactNode) => render(<UI.ThemeProvider>{node}</UI.ThemeProvider>);
test('native mobile hook uses the subscribed window, including breakpoint equality and cleanup', async () => {
  const event = jest.spyOn(Dimensions, 'addEventListener');
  const original = Dimensions.get('window');
  function Result() {
    return <UI.Text>{UI.useIsMobile() ? 'compact' : 'wide'}</UI.Text>;
  }
  const result = await mount(<Result />);
  const subscription = event.mock.results[0]?.value;
  const remove = jest.spyOn(subscription, 'remove');
  await fireEvent(screen.getByText(original.width < 768 ? 'compact' : 'wide'), 'layout', {
    nativeEvent: { layout: { width: 400, height: 800 } },
  });
  // This invokes the real RN dimensions subscription rather than a browser matchMedia mock.
  await import('@testing-library/react-native').then(async ({ act }) => {
    await act(() => Dimensions.set({ window: { ...original, width: 768 } }));
  });
  expect(screen.getByText('wide')).toBeOnTheScreen();
  await import('@testing-library/react-native').then(async ({ act }) => {
    await act(() => Dimensions.set({ window: { ...original, width: 767 } }));
  });
  expect(screen.getByText('compact')).toBeOnTheScreen();
  expect(event).toHaveBeenCalled();
  await import('@testing-library/react-native').then(async ({ act }) => {
    await act(() => Dimensions.set({ window: original }));
  });
  await result.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
  event.mockRestore();
});
test('native Form propagates required errors, controlled values and successful submissions', async () => {
  const submit = jest.fn();
  function Example() {
    const form = useForm({ defaultValues: { email: '' } });
    return (
      <UI.Form {...form}>
        <UI.FormField
          control={form.control}
          name="email"
          rules={{ required: 'Email is required' }}
          render={({ field }) => (
            <UI.FormItem>
              <UI.FormLabel>Email</UI.FormLabel>
              <UI.FormControl>
                <UI.Input
                  accessibilityLabel="Email"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              </UI.FormControl>
              <UI.FormDescription>Use your work email</UI.FormDescription>
              <UI.FormMessage />
            </UI.FormItem>
          )}
        />
        <UI.Button onPress={() => void form.handleSubmit(submit)()}>Submit</UI.Button>
      </UI.Form>
    );
  }
  await mount(<Example />);
  await userEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
  expect(submit).not.toHaveBeenCalled();
  await userEvent.type(screen.getByLabelText('Email'), 'person@example.com');
  await userEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(submit.mock.calls[0]?.[0]).toEqual({ email: 'person@example.com' });
  expect(screen.queryByRole('alert')).toBeNull();
});
test.each([
  'bash',
  'css',
  'diff',
  'html',
  'javascript',
  'json',
  'jsx',
  'markdown',
  'python',
  'sql',
  'tsx',
  'typescript',
  'yaml',
])(
  'native grammar highlighter loads %s without HTML host elements',
  async (language) => {
    const result = await UI.highlightCode('const value = 1;\nnext', language);
    expect(result).not.toBeNull();
    await mount(<UI.Text>{result}</UI.Text>);
    expect(screen.getByText(/const value = 1;next/)).toBeOnTheScreen();
  },
  30000,
);
test('grammar state continues multiline tokens and language aliases retain source', async () => {
  const highlighter = await UI.loadHighlighter('TS');
  expect(highlighter).not.toBeNull();
  const first = highlighter!.highlight('/* opening comment');
  const continued = highlighter!.highlight('continued */ const value = 1;', first.state);
  await mount(<UI.Text>{continued.lines}</UI.Text>);
  expect(screen.getByText(/continued \*\/ const value = 1;/)).toBeOnTheScreen();
  expect(await UI.loadHighlighter('unsupported-language')).toBeNull();
  expect(await UI.highlightCode('value', 'unsupported-language')).toBeNull();
});
test('streaming highlighted code updates appended lines, replacements and language switches', async () => {
  function Example() {
    const [code, set] = useState('const a = 1;\n');
    const [language, change] = useState('typescript');
    const lines = UI.useHighlightedCode(code, language);
    return (
      <>
        <UI.Text testID="code">{lines}</UI.Text>
        <UI.Button onPress={() => set(code + 'const b = 2;')}>Append</UI.Button>
        <UI.Button
          onPress={() => {
            change('python');
            set('print(3)');
          }}
        >
          Replace
        </UI.Button>
      </>
    );
  }
  await mount(<Example />);
  await userEvent.press(screen.getByRole('button', { name: 'Append' }));
  await waitFor(() =>
    expect(screen.getByTestId('code')).toHaveTextContent('const a = 1;const b = 2;'),
  );
  await userEvent.press(screen.getByRole('button', { name: 'Replace' }));
  await waitFor(() => expect(screen.getByTestId('code')).toHaveTextContent('print(3)'));
});

test('native syntax tokens change theme and ANSI escapes are interpreted rather than displayed', async () => {
  const nodes = await UI.highlightCode('const value = 1;', 'typescript');
  function ThemeToggle() {
    const theme = UI.useTheme();
    return <UI.Button onPress={() => theme.setPreference('dark')}>Dark</UI.Button>;
  }
  const rendered = await mount(
    <>
      <UI.Text>{nodes}</UI.Text>
      <ThemeToggle />
    </>,
  );
  const light = screen.getByText('const', { exact: true }).props.style.color;
  await userEvent.press(screen.getByRole('button', { name: 'Dark' }));
  expect(screen.getByText('const', { exact: true }).props.style.color).not.toBe(light);
  await rendered.unmount();
  const ansi = await UI.highlightCode('\u001b[31merror\u001b[0m', 'ansi');
  await mount(<UI.Text>{ansi}</UI.Text>);
  expect(screen.getByText('error')).toBeOnTheScreen();
});
