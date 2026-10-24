import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { Box, row } from './_core';
import { Button, type ButtonProps } from './button';
import { createScrollerStore, type ScrollerOptions, type ScrollOptions } from './_scroller-store';
export type { ScrollOptions as MessageScrollerScrollOptions };
type Store = ReturnType<typeof createScrollerStore>;
const Context = createContext<Store | null>(null),
  ViewportContext = createContext(false);
function useStore() {
  const value = useContext(Context);
  if (!value)
    throw Error('Message scroller parts require MessageScrollerProvider or MessageScroller.');
  return value;
}
const ScrollRefContext = createContext<React.RefObject<ScrollView | null> | null>(null);
export function MessageScrollerProvider({
  children,
  autoScroll = true,
  defaultScrollPosition = 'end',
  scrollEdgeThreshold = 8,
  scrollPreviousItemPeek = 64,
  scrollMargin = 0,
}: { children?: ReactNode } & Partial<ScrollerOptions>) {
  const scroll = useRef<ScrollView>(null),
    config = useRef<ScrollerOptions>({
      autoScroll,
      defaultScrollPosition,
      scrollEdgeThreshold,
      scrollPreviousItemPeek,
      scrollMargin,
    });
  config.current = {
    autoScroll,
    defaultScrollPosition,
    scrollEdgeThreshold: Math.max(0, scrollEdgeThreshold),
    scrollPreviousItemPeek: Math.max(0, scrollPreviousItemPeek),
    scrollMargin: Math.max(0, scrollMargin),
  };
  const store = useRef<Store | null>(null);
  if (!store.current) store.current = createScrollerStore(config, scroll);
  return (
    <Context.Provider value={store.current}>
      <ScrollRefContext.Provider value={scroll}>{children}</ScrollRefContext.Provider>
    </Context.Provider>
  );
}
export function MessageScroller(props: ViewProps) {
  const context = useContext(Context);
  return context ? (
    <Box {...props} />
  ) : (
    <MessageScrollerProvider>
      <Box {...props} />
    </MessageScrollerProvider>
  );
}
export function useMessageScroller() {
  const store = useStore();
  return {
    scrollToMessage: store.scrollToMessage,
    scrollToStart: store.scrollToStart,
    scrollToEnd: store.scrollToEnd,
  };
}
export function useMessageScrollerScrollable() {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().scrollable,
    () => store.getSnapshot().scrollable,
  );
}
export function useMessageScrollerVisibility() {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().visibility,
    () => store.getSnapshot().visibility,
  );
}
export function MessageScrollerViewport({
  preserveScrollOnPrepend = true,
  onLayout,
  onScroll,
  onContentSizeChange,
  onScrollBeginDrag,
  children,
  contentContainerStyle,
  ...props
}: React.ComponentProps<typeof ScrollView> & { preserveScrollOnPrepend?: boolean }) {
  const store = useStore(),
    scroll = useContext(ScrollRefContext),
    frame = useRef<number | undefined>(undefined);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const schedule = () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      store.contentChanged();
    });
  };
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return (
    <ScrollView
      {...props}
      ref={scroll}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      maintainVisibleContentPosition={
        preserveScrollOnPrepend ? { minIndexForVisible: 0 } : undefined
      }
      contentContainerStyle={contentContainerStyle}
      onLayout={(event) => {
        store.measureViewport(event.nativeEvent.layout.height);
        schedule();
        onLayout?.(event);
      }}
      onScroll={(event) => {
        store.measureViewport(event.nativeEvent.layoutMeasurement.height);
        store.measureContent(event.nativeEvent.contentSize.height, snapshot.tail);
        store.onScroll(event.nativeEvent.contentOffset.y);
        onScroll?.(event);
      }}
      onScrollBeginDrag={(event) => {
        store.beginDrag();
        onScrollBeginDrag?.(event);
      }}
      onContentSizeChange={(width, height) => {
        store.measureContent(height, snapshot.tail);
        schedule();
        onContentSizeChange?.(width, height);
      }}
    >
      <ViewportContext.Provider value={true}>{children}</ViewportContext.Provider>
      {snapshot.tail > 0 && <View accessible={false} style={{ height: snapshot.tail }} />}
    </ScrollView>
  );
}
export function MessageScrollerContent({
  children,
  style,
  ...props
}: React.ComponentProps<typeof ScrollView>) {
  const viewport = useContext(ViewportContext);
  return viewport ? (
    <Box {...props} style={style}>
      {children}
    </Box>
  ) : (
    <MessageScrollerViewport {...props} style={style}>
      {children}
    </MessageScrollerViewport>
  );
}
export function MessageScrollerItem({
  messageId,
  scrollAnchor = false,
  onLayout,
  ...props
}: ViewProps & { messageId?: string; scrollAnchor?: boolean }) {
  const store = useStore(),
    generated = useId(),
    id = messageId ?? generated;
  useEffect(() => () => store.unregister(id), [store, id]);
  return (
    <Box
      {...props}
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        store.register(id, { y, height, anchor: scrollAnchor });
        onLayout?.(event);
      }}
    />
  );
}
export function MessageScrollerButton({
  direction = 'end',
  behavior = 'smooth',
  children,
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & {
  direction?: 'start' | 'end';
  behavior?: ScrollOptions['behavior'];
  children?: ReactNode;
}) {
  const store = useStore(),
    state = useMessageScrollerScrollable();
  if (!state[direction]) return null;
  return (
    <Button
      variant="secondary"
      accessibilityLabel={direction === 'end' ? 'Scroll to end' : 'Scroll to start'}
      {...props}
      onPress={(event) => {
        onPress?.(event);
        if (event.isDefaultPrevented()) return;
        if (direction === 'end') store.scrollToEnd({ behavior });
        else store.scrollToStart({ behavior });
      }}
    >
      {children ?? (direction === 'end' ? 'Latest messages' : 'First messages')}
    </Button>
  );
}
export function MessageScrollerScrollButton({
  children = 'Latest messages',
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  return (
    <MessageScrollerButton accessibilityLabel="Scroll to latest messages" {...props}>
      {children}
    </MessageScrollerButton>
  );
}
export const MessageScrollerFooter = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
