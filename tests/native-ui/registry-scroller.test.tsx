import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ScrollView } from 'react-native';
import * as UI from './.generated';
import { createScrollerStore, type ScrollerOptions } from './.generated/src/native/_scroller-store';
function fixture(overrides: Partial<ScrollerOptions> = {}) {
  const bridge = { scrollTo: jest.fn(), scrollToEnd: jest.fn() };
  const store = createScrollerStore(
    {
      current: {
        autoScroll: true,
        defaultScrollPosition: 'end',
        scrollEdgeThreshold: 8,
        scrollPreviousItemPeek: 64,
        scrollMargin: 0,
        ...overrides,
      },
    },
    { current: bridge as unknown as ScrollView },
  );
  store.measureViewport(300);
  store.measureContent(600);
  store.register('first', { y: 0, height: 200, anchor: true });
  store.register('middle', { y: 200, height: 200, anchor: false });
  store.register('last', { y: 400, height: 200, anchor: true });
  return { store, bridge };
}
test('native transcript tracks visible IDs, anchors and overflow using native layout geometry', () => {
  const { store } = fixture();
  expect(store.getSnapshot().visibility).toEqual({
    currentAnchorId: 'first',
    visibleMessageIds: ['first', 'middle'],
  });
  expect(store.getSnapshot().scrollable).toEqual({ start: false, end: true });
  store.onScroll(300);
  expect(store.getSnapshot().visibility.visibleMessageIds).toEqual(['middle', 'last']);
  expect(store.getSnapshot().scrollable).toEqual({ start: true, end: false });
});
test('programmatic message alignment adds the needed tail space and restores the real transcript end', () => {
  const { store, bridge } = fixture();
  expect(store.scrollToMessage('last', { align: 'start', behavior: 'instant' })).toBe(true);
  expect(bridge.scrollTo).toHaveBeenLastCalledWith({ y: 400, animated: false });
  expect(store.getSnapshot().tail).toBe(100);
  expect(store.getSnapshot().visibility.currentAnchorId).toBe('last');
  store.measureContent(700, 100);
  store.scrollToEnd();
  expect(store.getSnapshot().tail).toBe(0);
  expect(bridge.scrollTo).toHaveBeenLastCalledWith({ y: 300, animated: false });
  expect(bridge.scrollToEnd).not.toHaveBeenCalled();
  expect(store.getSnapshot().scrollable).toEqual({ start: true, end: false });
  expect(store.scrollToMessage('missing')).toBe(false);
});
test('native scroll intent releases auto-follow and new content preserves reading position', () => {
  const { store, bridge } = fixture();
  store.contentChanged();
  expect(bridge.scrollTo).toHaveBeenCalledTimes(1);
  store.beginDrag();
  store.onScroll(100);
  store.measureContent(1000);
  store.contentChanged();
  expect(bridge.scrollTo).toHaveBeenCalledTimes(1);
  expect(store.getSnapshot().visibility.visibleMessageIds).toEqual(['first', 'middle']);
});
test('last-anchor restore and new turn anchoring keep the reading line stable', () => {
  const { store, bridge } = fixture({ defaultScrollPosition: 'last-anchor' });
  store.contentChanged();
  expect(bridge.scrollTo).toHaveBeenLastCalledWith({ y: 336, animated: false });
  store.measureContent(636, 36);
  store.contentChanged();
  expect(bridge.scrollTo).toHaveBeenLastCalledWith({ y: 336, animated: false });
  store.unregister('last');
  expect(store.getSnapshot().visibility.currentAnchorId).not.toBe('last');
});
test('nearest alignment avoids jumps for visible messages and subscriptions cleanly unsubscribe', () => {
  const { store, bridge } = fixture();
  const update = jest.fn(),
    unsubscribe = store.subscribe(update);
  store.scrollToMessage('first', { align: 'nearest' });
  expect(bridge.scrollTo).not.toHaveBeenCalled();
  store.scrollToStart();
  store.onScroll(200);
  expect(update).toHaveBeenCalled();
  unsubscribe();
  update.mockClear();
  store.onScroll(100);
  expect(update).not.toHaveBeenCalled();
});
test('native compound viewport exposes the upstream hooks and both accessible scroll directions', async () => {
  function State() {
    const scrollable = UI.useMessageScrollerScrollable(),
      visibility = UI.useMessageScrollerVisibility();
    const commands = UI.useMessageScroller();
    return (
      <>
        <UI.Text>{JSON.stringify({ scrollable, visibility })}</UI.Text>
        <UI.Button onPress={() => commands.scrollToStart()}>Start command</UI.Button>
      </>
    );
  }
  await render(
    <UI.ThemeProvider>
      <UI.MessageScrollerProvider defaultScrollPosition="start">
        <UI.MessageScroller>
          <UI.MessageScrollerViewport testID="viewport">
            <UI.MessageScrollerContent>
              <UI.MessageScrollerItem messageId="one" scrollAnchor testID="one">
                One
              </UI.MessageScrollerItem>
              <UI.MessageScrollerItem messageId="two" scrollAnchor testID="two">
                Two
              </UI.MessageScrollerItem>
            </UI.MessageScrollerContent>
          </UI.MessageScrollerViewport>
          <UI.MessageScrollerButton direction="start" />
          <UI.MessageScrollerButton direction="end" />
          <State />
        </UI.MessageScroller>
      </UI.MessageScrollerProvider>
    </UI.ThemeProvider>,
  );
  await fireEvent(screen.getByTestId('one'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 200 } },
  });
  await fireEvent(screen.getByTestId('two'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 200, width: 320, height: 200 } },
  });
  await fireEvent.scroll(screen.getByTestId('viewport'), {
    nativeEvent: {
      contentOffset: { x: 0, y: 100 },
      contentSize: { width: 320, height: 400 },
      layoutMeasurement: { width: 320, height: 200 },
    },
  });
  expect(screen.getByRole('button', { name: 'Scroll to start' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Scroll to end' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Scroll to end' }));
  expect(screen.queryByRole('button', { name: 'Scroll to end' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Start command' }));
  expect(screen.queryByRole('button', { name: 'Scroll to start' })).toBeNull();
});
