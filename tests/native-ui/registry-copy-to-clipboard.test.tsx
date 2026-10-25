import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { setStringAsync } from 'expo-clipboard';
import * as UI from './.generated';
import {
  useCopyToClipboard,
  nativeClipboardSource,
} from './.generated/src/native/registry-copy-to-clipboard';
import catalog from './.generated/NATIVE_RECIPES.json';
test('the companion clipboard implementation requires renewed review at each upstream pin', () => {
  expect(nativeClipboardSource.commit).toBe(catalog.upstream.commit);
  expect(nativeClipboardSource.sha256).toMatch(/^[a-f0-9]{64}$/);
});
const clipboard = jest.mocked(setStringAsync);
afterEach(() => {
  jest.useRealTimers();
  clipboard.mockReset();
  clipboard.mockResolvedValue(true);
});
function Example({
  timeout = 2000,
  onCopy,
  value = 'Copied value',
}: {
  timeout?: number;
  onCopy?: () => void;
  value?: string;
}) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout, onCopy });
  return (
    <UI.ThemeProvider>
      <UI.Button onPress={() => copyToClipboard(value)}>Copy</UI.Button>
      <UI.Text>{isCopied ? 'Copied' : 'Ready'}</UI.Text>
    </UI.ThemeProvider>
  );
}
test('native copying invokes the actual clipboard and resets only after the configured timeout', async () => {
  jest.useFakeTimers();
  const onCopy = jest.fn();
  await render(<Example onCopy={onCopy} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
  expect(clipboard).toHaveBeenCalledWith('Copied value');
  expect(onCopy).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Copied')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTime(1999));
  expect(screen.getByText('Copied')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTime(1));
  expect(screen.getByText('Ready')).toBeOnTheScreen();
});
test('empty values and OS rejection do not claim successful copying', async () => {
  const onCopy = jest.fn();
  const mounted = await render(<Example value="" onCopy={onCopy} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
  expect(clipboard).not.toHaveBeenCalled();
  await mounted.rerender(<Example onCopy={onCopy} />);
  clipboard.mockRejectedValueOnce(new Error('Clipboard unavailable'));
  await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
  expect(screen.getByText('Ready')).toBeOnTheScreen();
  clipboard.mockResolvedValueOnce(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
  expect(screen.getByText('Ready')).toBeOnTheScreen();
  expect(onCopy).not.toHaveBeenCalled();
});
test('zero timeout retains status and unmount cleans up pending reset timers', async () => {
  jest.useFakeTimers();
  const mounted = await render(<Example timeout={0} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
  await act(() => jest.advanceTimersByTime(10000));
  expect(screen.getByText('Copied')).toBeOnTheScreen();
  const scheduled = jest.spyOn(globalThis, 'setTimeout'),
    cleared = jest.spyOn(globalThis, 'clearTimeout');
  await mounted.rerender(<Example timeout={1000} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
  const index = scheduled.mock.calls.findIndex((args) => args[1] === 1000);
  expect(index).toBeGreaterThanOrEqual(0);
  const timer = scheduled.mock.results[index]!.value;
  await mounted.unmount();
  expect(cleared).toHaveBeenCalledWith(timer);
  scheduled.mockRestore();
  cleared.mockRestore();
});

test('a failed subsequent copy does not strand an earlier success beyond its timeout', async () => {
  jest.useFakeTimers();
  await render(<Example timeout={1000} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
  clipboard.mockRejectedValueOnce(new Error('Rejected'));
  await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
  await act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByText('Ready')).toBeOnTheScreen();
});
