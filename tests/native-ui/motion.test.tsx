import React from 'react';
import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (element: React.ReactElement) =>
  render(<UI.ThemeProvider>{element}</UI.ThemeProvider>);
test('slider accessible actions respect range, steps and distance between thumbs', async () => {
  const change = jest.fn();
  const commit = jest.fn();
  await mount(
    <UI.Slider
      defaultValue={[20, 40]}
      min={0}
      max={100}
      step={5}
      minStepsBetweenThumbs={2}
      onValueChange={change}
      onValueCommit={commit}
    />,
  );
  const first = () => screen.getByRole('adjustable', { name: 'Value 1' });
  await fireEvent(first(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(change).toHaveBeenLastCalledWith([25, 40]);
  await fireEvent(first(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  await fireEvent(first(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(first()).toHaveAccessibilityValue({ now: 30 });
  expect(commit).toHaveBeenLastCalledWith([30, 40]);
});
test('disabled slider ignores adjustment requests and exposes its disabled state', async () => {
  const change = jest.fn();
  await mount(<UI.Slider defaultValue={[20]} disabled onValueChange={change} />);
  const slider = screen.getByRole('adjustable');
  expect(slider).toBeDisabled();
  await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(change).not.toHaveBeenCalled();
});
test('RTL direction propagates to native layout and keeps values bounded', async () => {
  const change = jest.fn();
  await mount(
    <UI.DirectionProvider dir="rtl">
      <UI.Slider defaultValue={[100]} onValueChange={change} />
    </UI.DirectionProvider>,
  );
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ now: 100 });
});
test('resizable panels preserve total allocation and stop at neighbouring bounds', async () => {
  const resize = jest.fn();
  await mount(
    <UI.ResizablePanelGroup onLayout={resize}>
      <UI.ResizablePanel defaultSize={50} minSize={30} maxSize={60}>
        Left
      </UI.ResizablePanel>
      <UI.ResizableHandle withHandle />
      <UI.ResizablePanel defaultSize={50} minSize={30}>
        Right
      </UI.ResizablePanel>
    </UI.ResizablePanelGroup>,
  );
  expect(screen.getByTestId('resize-grip')).toBeOnTheScreen();
  for (let i = 0; i < 5; i++)
    await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
  const last = resize.mock.calls.at(-1)[0];
  expect(last).toEqual([60, 40]);
  expect(last.reduce((sum: number, value: number) => sum + value, 0)).toBe(100);
});
test('carousel disables boundary controls and supports next/previous selection', async () => {
  const change = jest.fn();
  await mount(
    <UI.Carousel onIndexChange={change}>
      <UI.CarouselContent>
        <UI.CarouselItem>First</UI.CarouselItem>
        <UI.CarouselItem>Second</UI.CarouselItem>
      </UI.CarouselContent>
      <UI.CarouselPrevious />
      <UI.CarouselNext />
    </UI.Carousel>,
  );
  expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Next slide' }));
  expect(change).toHaveBeenCalledWith(1);
  expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Previous slide' }));
  expect(change).toHaveBeenLastCalledWith(0);
});
test('looping carousel wraps instead of disabling its end control', async () => {
  const change = jest.fn();
  await mount(
    <UI.Carousel loop onIndexChange={change}>
      <UI.CarouselContent>
        <UI.CarouselItem>First</UI.CarouselItem>
        <UI.CarouselItem>Second</UI.CarouselItem>
      </UI.CarouselContent>
      <UI.CarouselPrevious />
    </UI.Carousel>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Previous slide' }));
  expect(change).toHaveBeenCalledWith(1);
});

function touch(x: number, y: number, previousX = x, previousY = y, time = 1) {
  const point = { pageX: x, pageY: y };
  return {
    nativeEvent: {
      ...point,
      locationX: x,
      locationY: y,
      touches: [point],
      changedTouches: [point],
      timestamp: time,
    },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: time,
      touchBank: [
        {
          touchActive: true,
          startPageX: 0,
          startPageY: 0,
          currentPageX: x,
          currentPageY: y,
          previousPageX: previousX,
          previousPageY: previousY,
          currentTimeStamp: time,
          previousTimeStamp: time - 1,
          startTimeStamp: 0,
        },
      ],
    },
    persist() {},
  };
}
test.each(['horizontal', 'vertical'] as const)(
  'slider retains %s drag state through value rerenders',
  async (orientation) => {
    const commit = jest.fn();
    await mount(<UI.Slider testID="track" orientation={orientation} onValueCommit={commit} />);
    const track = () => screen.getByTestId('track');
    await fireEvent(track(), 'layout', {
      nativeEvent: { layout: { width: 100, height: 100, x: 0, y: 0 } },
    });
    await fireEvent(track(), 'responderGrant', touch(20, 80));
    await fireEvent(track(), 'responderMove', touch(30, 60, 20, 80, 2));
    await fireEvent(track(), 'responderMove', touch(50, 40, 30, 60, 3));
    expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({
      now: orientation === 'vertical' ? 60 : 50,
    });
    await fireEvent(track(), 'responderRelease', touch(50, 40, 50, 40, 4));
    expect(commit).toHaveBeenLastCalledWith([orientation === 'vertical' ? 60 : 50]);
  },
);
test('resizing retains cumulative drag distance through panel rerenders', async () => {
  const resize = jest.fn();
  await mount(
    <UI.ResizablePanelGroup testID="panels" onLayout={resize}>
      <UI.ResizablePanel defaultSize={50}>Left</UI.ResizablePanel>
      <UI.ResizableHandle />
      <UI.ResizablePanel defaultSize={50}>Right</UI.ResizablePanel>
    </UI.ResizablePanelGroup>,
  );
  await fireEvent(screen.getByTestId('panels'), 'layout', {
    nativeEvent: { layout: { width: 224, height: 100, x: 0, y: 0 } },
  });
  const handle = () => screen.getByRole('adjustable');
  await fireEvent(handle(), 'responderGrant', touch(100, 0));
  await fireEvent(handle(), 'responderMove', touch(120, 0, 100, 0, 2));
  await fireEvent(handle(), 'responderMove', touch(140, 0, 120, 0, 3));
  expect(resize).toHaveBeenLastCalledWith([70, 30]);
});
