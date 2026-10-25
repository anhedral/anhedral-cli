import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (node: React.ReactNode) => <UI.ThemeProvider>{node}</UI.ThemeProvider>;
afterEach(async () => {
  await act(() => UI.toast.dismiss());
  jest.useRealTimers();
});
test.each(['message', 'success', 'info', 'warning', 'error', 'loading'] as const)(
  'imperative native %s toast mounts without a provider and supports dismissal',
  async (kind) => {
    await render(mount(<UI.SonnerToaster />));
    await act(() => {
      UI.toast[kind]('Notification', { description: 'Details' });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Notification');
    expect(screen.getByText('Details')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Dismiss Notification' }));
    expect(screen.queryByRole('alert')).toBeNull();
  },
);
test('native notification actions invoke their callbacks and dismiss the correct ID', async () => {
  const action = jest.fn(),
    cancel = jest.fn(),
    dismissed = jest.fn();
  await render(mount(<UI.SonnerToaster />));
  await act(() => {
    UI.toast('Saved', {
      id: 'first',
      action: { label: 'Undo', onClick: action },
      onDismiss: dismissed,
    });
    UI.toast('Other', { id: 'second', cancel: { label: 'Cancel', onClick: cancel } });
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  expect(action).toHaveBeenCalledTimes(1);
  expect(dismissed).toHaveBeenCalledTimes(1);
  expect(UI.toast.getToasts().map((item) => item.id)).toEqual(['second']);
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(UI.toast.getToasts()).toHaveLength(0);
});
test('hidden queued notifications still expire, and updating a stable ID renews its deadline', async () => {
  jest.useFakeTimers();
  const closed = jest.fn();
  await render(mount(<UI.SonnerToaster visibleToasts={1} />));
  await act(() => {
    UI.toast('Hidden', { id: 'hidden', duration: 100, onAutoClose: closed });
    UI.toast('Visible', { id: 'shown', duration: 1000 });
  });
  expect(screen.queryByText('Hidden')).toBeNull();
  await act(() => jest.advanceTimersByTime(100));
  expect(closed).toHaveBeenCalledTimes(1);
  expect(UI.toast.getToasts()).toHaveLength(1);
  await act(() => jest.advanceTimersByTime(400));
  await act(() => {
    UI.toast('Updated', { id: 'shown', duration: 1000 });
  });
  await act(() => jest.advanceTimersByTime(500));
  expect(screen.getByText('Updated')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTime(500));
  expect(screen.queryByRole('alert')).toBeNull();
});
test('promise notifications settle into success/error and never resurrect a dismissed operation', async () => {
  await render(mount(<UI.SonnerToaster />));
  await act(async () => {
    UI.toast.promise(Promise.resolve('result'), {
      loading: 'Loading',
      success: (value) => 'Saved ' + value,
      error: 'Failed',
    });
  });
  expect(screen.getByRole('alert')).toHaveTextContent('Saved result');
  await act(async () => {
    UI.toast.promise(() => Promise.reject(Error('failure')), {
      loading: 'Loading',
      success: 'Saved',
      error: () => 'Failed safely',
    });
  });
  expect(screen.getByText('Failed safely')).toBeOnTheScreen();
  let finish!: (value: string) => void;
  const pending = new Promise<string>((resolve) => {
    finish = resolve;
  });
  let id: string | number = 0;
  await act(() => {
    id = UI.toast.promise(pending, { loading: 'Waiting', success: 'Returned', error: 'Failed' });
  });
  await act(() => {
    UI.toast.dismiss(id);
  });
  await act(async () => {
    finish('done');
    await pending;
  });
  expect(screen.queryByText('Returned')).toBeNull();
});
test.each(['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const)(
  'native button supports upstream size %s while retaining a minimum touch area',
  async (size) => {
    const press = jest.fn();
    await render(
      mount(
        <UI.Button size={size} onPress={press}>
          Action
        </UI.Button>,
      ),
    );
    const button = screen.getByRole('button', { name: 'Action' });
    expect(button).toHaveStyle({ minHeight: size === 'lg' || size === 'icon-lg' ? 48 : 44 });
    await fireEvent.press(button);
    expect(press).toHaveBeenCalledTimes(1);
  },
);
test.each(['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const)(
  'native badges accept upstream %s variant and preserve their content',
  async (variant) => {
    await render(mount(<UI.Badge variant={variant}>Tag</UI.Badge>));
    expect(screen.getByText('Tag')).toBeOnTheScreen();
  },
);
test('outlined native toggles retain their border before selection', async () => {
  await render(mount(<UI.Toggle variant="outline">Toggle</UI.Toggle>));
  const button = screen.getByRole('button', { name: 'Toggle' });
  expect(button).toHaveStyle({ borderColor: 'hsl(0, 0%, 89.8%)' });
  await fireEvent.press(button);
  expect(button).toBeSelected();
});

test('native notifications retain rich description views, per-message placement and theme-relative radius', async () => {
  await render(mount(<UI.SonnerToaster testID="notifications" />));
  await act(() => {
    UI.toast('First', {
      position: 'top-left',
      radiusOffset: 4,
      description: (
        <UI.Card testID="rich">
          <UI.Text>Structured details</UI.Text>
        </UI.Card>
      ),
    });
    UI.toast('Second', { position: 'bottom-right' });
  });
  expect(screen.getByTestId('notifications-top-left')).toHaveStyle({
    top: 16,
    alignItems: 'flex-start',
  });
  expect(screen.getByTestId('notifications-bottom-right')).toHaveStyle({
    bottom: 16,
    alignItems: 'flex-end',
  });
  expect(screen.getByTestId('rich')).toBeOnTheScreen();
  expect(screen.getByText('Structured details')).toBeOnTheScreen();
});
test('native promise notification formatter failures are caught and remain dismissible', async () => {
  await render(mount(<UI.SonnerToaster />));
  await act(async () => {
    UI.toast.promise(Promise.resolve('value'), {
      loading: 'Working',
      success: () => {
        throw Error('Display failed');
      },
      error: 'Operation failed',
    });
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(screen.getByRole('alert')).toHaveTextContent('Display failed');
  await fireEvent.press(screen.getByRole('button', { name: 'Dismiss Display failed' }));
  expect(screen.queryByRole('alert')).toBeNull();
});
