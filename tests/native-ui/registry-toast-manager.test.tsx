import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import * as Legacy from './.generated/src/native/use-toast';
import { toast as globalManager } from './.generated/src/native/toast';
const mount = (node: React.ReactNode) => render(<UI.ThemeProvider>{node}</UI.ThemeProvider>);
beforeEach(() => {
  globalManager.close();
  Legacy.legacyToastManager.close();
});
afterEach(() => jest.useRealTimers());
test('native toast managers preserve stable IDs, update in place and isolate independent providers', async () => {
  const first = UI.createToastManager(),
    second = UI.createToastManager();
  await mount(
    <>
      <UI.Toaster toastManager={first} testID="first" />
      <UI.Toaster toastManager={second} testID="second" />
    </>,
  );
  await act(() => {
    first.add({ id: 'shared', title: 'One' });
    second.add({ id: 'shared', title: 'Two' });
  });
  expect(screen.getByText('One')).toBeOnTheScreen();
  expect(screen.getByText('Two')).toBeOnTheScreen();
  await act(() => {
    first.update('shared', (previous) => ({ title: previous.title + ' updated' }));
  });
  expect(screen.getByText('One updated')).toBeOnTheScreen();
  await act(() => first.close('shared'));
  expect(screen.queryByText('One updated')).toBeNull();
  expect(screen.getByText('Two')).toBeOnTheScreen();
});
test('compound native toasts use record titles, descriptions, actions and explicit close callbacks', async () => {
  const manager = UI.createToastManager(),
    action = jest.fn(),
    closed = jest.fn(),
    removed = jest.fn();
  function Messages() {
    const { toasts } = UI.useToastManager();
    return (
      <UI.ToastViewport>
        {toasts.map((item) => (
          <UI.Toast key={item.id} toast={item}>
            <UI.ToastContent>
              <UI.ToastTitle />
              <UI.ToastDescription />
              <UI.ToastAction />
              <UI.ToastClose />
            </UI.ToastContent>
          </UI.Toast>
        ))}
      </UI.ToastViewport>
    );
  }
  await mount(
    <UI.ToastProvider toastManager={manager}>
      <UI.ToastPortal>
        <Messages />
      </UI.ToastPortal>
    </UI.ToastProvider>,
  );
  await act(() =>
    manager.add({
      title: 'Saved',
      description: 'Stored on device',
      actionProps: { children: 'Undo', onPress: action },
      onClose: closed,
      onRemove: removed,
    }),
  );
  expect(screen.getByText('Stored on device')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  expect(action).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Saved')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Dismiss Saved' }));
  expect(closed).toHaveBeenCalledTimes(1);
  expect(removed).toHaveBeenCalledTimes(1);
});
test('limited native toast records remain queued and retain independent expiry timers after updates', async () => {
  jest.useFakeTimers();
  const manager = UI.createToastManager();
  await mount(<UI.Toaster toastManager={manager} limit={1} />);
  await act(() => {
    manager.add({ id: 'old', title: 'Old', timeout: 100 });
    manager.add({ id: 'new', title: 'New', timeout: 300 });
  });
  expect(screen.queryByText('Old')).toBeNull();
  expect(screen.getByText('New')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTime(90));
  await act(() => manager.update('new', { title: 'Renewed', timeout: 300 }));
  await act(() => jest.advanceTimersByTime(210));
  expect(manager.getSnapshot()).toHaveLength(1);
  expect(screen.getByText('Renewed')).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTime(91));
  expect(manager.getSnapshot()).toHaveLength(0);
});
test('native promise notifications return the input result, expose errors and cannot resurrect dismissed records', async () => {
  const manager = UI.createToastManager();
  let settle: ((value: string) => void) | undefined;
  const pending = manager.promise(
    new Promise<string>((resolve) => {
      settle = resolve;
    }),
    { loading: 'Saving', success: (value) => 'Saved ' + value, error: 'Failed' },
  );
  expect(manager.getSnapshot()[0]?.type).toBe('loading');
  manager.close();
  settle?.('one');
  expect(await pending).toBe('one');
  expect(manager.getSnapshot()).toHaveLength(0);
  await expect(
    manager.promise(Promise.reject(new Error('Offline')), {
      loading: 'Saving',
      success: 'Saved',
      error: (reason) => (reason as Error).message,
    }),
  ).rejects.toThrow('Offline');
  expect(manager.getSnapshot()[0]?.title).toBe('Offline');
  expect(manager.getSnapshot()[0]?.type).toBe('error');
});
test('native manager subscription cleanup and missing-record updates are safe', () => {
  const manager = UI.createToastManager(),
    listener = jest.fn(),
    unsubscribe = manager.subscribe(listener);
  manager.update('missing', { title: 'Ignored' });
  expect(listener).not.toHaveBeenCalled();
  const id = manager.add({ title: 'One' });
  unsubscribe();
  listener.mockClear();
  manager.update(id, { title: 'Two' });
  expect(listener).not.toHaveBeenCalled();
  expect(manager.getSnapshot()[0]?.title).toBe('Two');
});
test('the provider-free legacy hook keeps the single-toast limit, updates without stale fields and renders through the default toaster', async () => {
  await mount(<UI.Toaster />);
  let first: ReturnType<typeof Legacy.toast> | undefined;
  await act(() => {
    first = Legacy.toast({ title: 'First', description: 'Original' });
  });
  expect(screen.getByText('First')).toBeOnTheScreen();
  await act(() => first!.update({ title: 'Updated' }));
  await act(() => first!.update({ description: 'Changed' }));
  expect(screen.getByText('Updated')).toBeOnTheScreen();
  expect(screen.getByText('Changed')).toBeOnTheScreen();
  await act(() => {
    Legacy.toast({ title: 'Replacement' });
  });
  expect(screen.queryByText('Updated')).toBeNull();
  expect(screen.getByText('Replacement')).toBeOnTheScreen();
  await act(() => Legacy.legacyToastManager.close());
});
test('legacy reducer preserves exported add/update/dismiss/remove contracts without browser transition timers', () => {
  const a = { id: 'a', title: 'A', open: true },
    b = { id: 'b', title: 'B', open: true };
  let state = Legacy.reducer({ toasts: [a] }, { type: 'ADD_TOAST', toast: b });
  expect(state.toasts).toEqual([b]);
  state = Legacy.reducer(state, { type: 'UPDATE_TOAST', toast: { id: 'b', title: 'Updated' } });
  expect(state.toasts[0]?.title).toBe('Updated');
  state = Legacy.reducer(state, { type: 'DISMISS_TOAST' });
  expect(state.toasts[0]?.open).toBe(false);
  state = Legacy.reducer(state, { type: 'REMOVE_TOAST', toastId: 'b' });
  expect(state.toasts).toEqual([]);
});
