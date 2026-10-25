import React, { useState } from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import * as UI from './.generated';
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);

test('native form association works outside the form, serializes pending actions and exposes failures for retry', async () => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const submit = jest
      .fn()
      .mockImplementationOnce(() => pending)
      .mockRejectedValueOnce(new Error('Try again'))
      .mockResolvedValue(undefined),
    reset = jest.fn(),
    error = jest.fn();
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  await mount(
    <UI.NativeFormScope>
      <UI.NativeForm
        testID="form"
        nativeID="profile"
        onSubmit={submit}
        onReset={reset}
        onError={error}
      >
        <UI.Input accessibilityLabel="Username" />
      </UI.NativeForm>
      <UI.Button type="submit" form="profile">
        Save
      </UI.Button>
      <UI.Button type="reset" form="profile">
        Reset
      </UI.Button>
    </UI.NativeFormScope>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  expect(screen.getByTestId('form').props.accessibilityState.busy).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish();
    await pending;
  });
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Reset' }));
  expect(reset).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Try again');
  expect(error).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith('Try again');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(submit).toHaveBeenCalledTimes(3);
  announce.mockRestore();
});
test('native form IDs are local to each screen and nearest-form submission needs no global registry', async () => {
  const first = jest.fn(),
    second = jest.fn(),
    nearest = jest.fn();
  await mount(
    <>
      <UI.NativeFormScope>
        <UI.NativeForm nativeID="same" onSubmit={first} />
        <UI.Button form="same" type="submit">
          First
        </UI.Button>
      </UI.NativeFormScope>
      <UI.NativeFormScope>
        <UI.NativeForm nativeID="same" onSubmit={second} />
        <UI.Button form="same" type="submit">
          Second
        </UI.Button>
      </UI.NativeFormScope>
      <UI.NativeForm onSubmit={nearest}>
        <UI.Button type="submit">Nearest</UI.Button>
      </UI.NativeForm>
    </>,
  );
  for (const name of ['First', 'Second', 'Nearest'])
    await fireEvent.press(screen.getByRole('button', { name }));
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  expect(nearest).toHaveBeenCalledTimes(1);
});
test('native form controls compose cancellation, use current controlled values and do not resurrect after unmount', async () => {
  const submit = jest.fn();
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  function Example() {
    const [value, setValue] = useState('initial');
    return (
      <UI.NativeForm
        onSubmit={() => {
          submit(value);
          return pending;
        }}
      >
        <UI.Input accessibilityLabel="Value" value={value} onChangeText={setValue} />
        <UI.Button type="submit" onPress={(event) => event.preventDefault()}>
          Cancel default
        </UI.Button>
        <UI.Button type="submit">Submit</UI.Button>
      </UI.NativeForm>
    );
  }
  const mounted = await mount(<Example />);
  let cancelled = false;
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel default' }), {
    preventDefault: () => {
      cancelled = true;
    },
    isDefaultPrevented: () => cancelled,
  });
  expect(submit).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Value'), 'edited');
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(submit).toHaveBeenCalledWith('edited');
  await mounted.unmount();
  await act(async () => {
    finish();
    await pending;
  });
});
test('missing native form actions fail explicitly and error-report failures remain visible', async () => {
  const missing = await mount(
    <UI.Button type="submit" form="missing">
      Missing
    </UI.Button>,
  );
  await expect(fireEvent.press(screen.getByRole('button', { name: 'Missing' }))).rejects.toThrow(
    /not registered/,
  );
  await missing.unmount();
  await mount(
    <UI.NativeForm
      onSubmit={() => {
        throw Error('Submit failed');
      }}
      onError={() => {
        throw Error('Reporter failed');
      }}
    >
      <UI.Button type="submit">Submit</UI.Button>
      <UI.Button type="reset">Reset</UI.Button>
    </UI.NativeForm>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Submit failed\nReporter failed');
  await fireEvent.press(screen.getByRole('button', { name: 'Reset' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/explicit onReset/));
});
