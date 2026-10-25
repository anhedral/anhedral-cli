import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, screen, userEvent, fireEvent, act } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (element: React.ReactElement) =>
  render(<UI.ThemeProvider>{element}</UI.ThemeProvider>);
test('data table sorts numeric values rather than strings, paginates and resets on filtering', async () => {
  const data = [
    { id: 'a', name: 'Alpha', age: 10 },
    { id: 'b', name: 'Beta', age: 2 },
  ];
  await mount(
    <UI.DataTable
      data={data}
      getRowId={(item) => item.id}
      pageSize={1}
      columns={[
        { id: 'name', header: 'Name', accessor: (item) => item.name },
        { id: 'age', header: 'Age', accessor: (item) => item.age },
      ]}
    />,
  );
  expect(screen.getByText('Alpha')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Age, unsorted' }));
  expect(screen.getByText('Beta')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByText('Alpha')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Filter rows'), 'Beta');
  expect(screen.getByText('Beta')).toBeOnTheScreen();
  expect(screen.getByText('1 / 1')).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Filter rows'), 'missing');
  expect(screen.getByText('No results')).toBeOnTheScreen();
});
test('table selection uses stable IDs and survives sorting and filtering', async () => {
  const select = jest.fn();
  await mount(
    <UI.DataTable
      data={[
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta' },
      ]}
      getRowId={(item) => item.id}
      onSelectionChange={select}
      columns={[{ id: 'name', header: 'Name', accessor: (item) => item.name }]}
    />,
  );
  await userEvent.press(screen.getByRole('checkbox', { name: 'Select row a' }));
  expect(select).toHaveBeenCalledWith(['a']);
  await fireEvent.changeText(screen.getByLabelText('Filter rows'), 'Alpha');
  expect(screen.getByRole('checkbox', { name: 'Select row a' })).toBeChecked();
});
test('progress clamps invalid values and exposes finite accessibility values', async () => {
  const result = await mount(<UI.Progress value={200} max={100} />);
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 0, max: 100, now: 100 });
  await result.rerender(
    <UI.ThemeProvider>
      <UI.Progress value={NaN} max={0} />
    </UI.ThemeProvider>,
  );
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 0, max: 100, now: 0 });
});
test('toast queue supports actions, explicit dismissal and timed removal without stale timers', async () => {
  jest.useFakeTimers();
  const action = jest.fn();
  function Notify() {
    const { toast } = UI.useToast();
    return (
      <UI.Button
        onPress={() =>
          toast({
            id: 'save',
            title: 'Saved',
            duration: 1000,
            action: { label: 'Undo', onPress: action },
          })
        }
      >
        Notify
      </UI.Button>
    );
  }
  try {
    await mount(
      <UI.ToastProvider>
        <Notify />
        <UI.Toaster />
      </UI.ToastProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Notify' }));
    expect(screen.getByText('Saved')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Saved')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Notify' }));
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    expect(screen.queryByText('Saved')).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});
test('message scroller stops following when reading history and offers a return-to-latest action', async () => {
  await mount(
    <UI.MessageScroller>
      <UI.MessageScrollerContent testID="messages">
        <UI.Text>History</UI.Text>
      </UI.MessageScrollerContent>
      <UI.MessageScrollerScrollButton />
    </UI.MessageScroller>,
  );
  expect(screen.queryByRole('button', { name: 'Scroll to latest messages' })).toBeNull();
  await fireEvent.scroll(screen.getByTestId('messages'), {
    nativeEvent: {
      contentOffset: { x: 0, y: 0 },
      contentSize: { width: 320, height: 1000 },
      layoutMeasurement: { width: 320, height: 400 },
    },
  });
  expect(screen.getByRole('button', { name: 'Scroll to latest messages' })).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Scroll to latest messages' }));
  expect(screen.queryByRole('button', { name: 'Scroll to latest messages' })).toBeNull();
});
test('avatar falls back after an image error and attachment actions preserve identity', async () => {
  const remove = jest.fn();
  const open = jest.fn();
  await mount(
    <>
      <UI.Avatar>
        <UI.AvatarImage source={{ uri: 'file:///fixture.png' }} testID="photo" />
        <UI.AvatarFallback>AB</UI.AvatarFallback>
      </UI.Avatar>
      <UI.Attachment name="report.txt" onRemove={remove} onOpen={open} progress={75} />
    </>,
  );
  expect(screen.getByText('AB')).toBeOnTheScreen();
  await fireEvent(screen.getByTestId('photo', { includeHiddenElements: true }), 'load', {});
  expect(screen.queryByText('AB')).toBeNull();
  await fireEvent(screen.getByTestId('photo', { includeHiddenElements: true }), 'error', {});
  expect(screen.getByText('AB')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Open report.txt' }));
  await userEvent.press(screen.getByRole('button', { name: 'Remove report.txt' }));
  expect(open).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 75 });
});
test('skeleton honours reduced motion and unsubscribes on unmount', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const add = jest.spyOn(AccessibilityInfo, 'addEventListener');
  const result = await mount(<UI.Skeleton testID="skeleton" />);
  const subscription = add.mock.results[0]!.value;
  const remove = jest.spyOn(subscription, 'remove');
  expect(screen.getByTestId('skeleton')).toBeOnTheScreen();
  await result.unmount();
  expect(remove).toHaveBeenCalled();
  jest.restoreAllMocks();
});
test('theme switcher changes native semantic colours without introducing a separate palette', async () => {
  await mount(
    <>
      <UI.ThemeSwitcher />
      <UI.Text testID="theme-text">Body</UI.Text>
    </>,
  );
  expect(screen.getByTestId('theme-text')).toHaveStyle({ color: 'hsl(0, 0%, 9%)' });
  await userEvent.press(screen.getByRole('button', { name: 'Dark' }));
  expect(screen.getByTestId('theme-text')).toHaveStyle({ color: 'hsl(0, 0%, 98%)' });
});
