import type { RefObject } from 'react';
import type { ScrollView } from 'react-native';
export type ScrollerOptions = {
  autoScroll: boolean;
  defaultScrollPosition: 'start' | 'end' | 'last-anchor';
  scrollEdgeThreshold: number;
  scrollPreviousItemPeek: number;
  scrollMargin: number;
};
export type ScrollOptions = {
  align?: 'start' | 'center' | 'end' | 'nearest';
  behavior?: 'smooth' | 'instant' | 'auto';
  scrollMargin?: number;
};
type Row = { y: number; height: number; anchor: boolean };
type Snapshot = {
  scrollable: { start: boolean; end: boolean };
  visibility: { currentAnchorId: string | null; visibleMessageIds: string[] };
  tail: number;
};
export function createScrollerStore(
  config: RefObject<ScrollerOptions>,
  scroll: RefObject<ScrollView | null>,
) {
  const rows = new Map<string, Row>(),
    listeners = new Set<() => void>();
  let offset = 0,
    viewport = 0,
    content = 0,
    tail = 0,
    initialized = false,
    mode: 'follow' | 'free' | 'anchor' = 'follow',
    anchor: string | null = null,
    anchorOptions: ScrollOptions = {};
  let snapshot: Snapshot = {
    scrollable: { start: false, end: false },
    visibility: { currentAnchorId: null, visibleMessageIds: [] },
    tail: 0,
  };
  const ordered = () => [...rows].sort((a, b) => a[1].y - b[1].y);
  function publish() {
    offset = Math.min(Math.max(0, content + tail - viewport), Math.max(0, offset));
    const options = config.current,
      sorted = ordered();
    const visibleMessageIds = sorted
      .filter(
        ([, row]) =>
          row.y + row.height > offset + options.scrollMargin &&
          row.y < offset + viewport - options.scrollMargin,
      )
      .map(([id]) => id);
    const currentAnchorId =
      sorted
        .filter(
          ([, row]) =>
            row.anchor && row.y <= offset + options.scrollMargin + options.scrollPreviousItemPeek,
        )
        .at(-1)?.[0] ?? null;
    const start = offset > options.scrollEdgeThreshold,
      end = content + tail - viewport - offset > options.scrollEdgeThreshold;
    const sameEdges = snapshot.scrollable.start === start && snapshot.scrollable.end === end;
    const sameVisibility =
      snapshot.visibility.currentAnchorId === currentAnchorId &&
      snapshot.visibility.visibleMessageIds.length === visibleMessageIds.length &&
      snapshot.visibility.visibleMessageIds.every((id, index) => id === visibleMessageIds[index]);
    if (sameEdges && sameVisibility && snapshot.tail === tail) return;
    snapshot = {
      scrollable: sameEdges ? snapshot.scrollable : { start, end },
      visibility: sameVisibility ? snapshot.visibility : { currentAnchorId, visibleMessageIds },
      tail,
    };
    for (const listener of listeners) listener();
  }
  const api = {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    register(id: string, row: Row) {
      const previous = rows.get(id);
      if (
        previous &&
        previous.y === row.y &&
        previous.height === row.height &&
        previous.anchor === row.anchor
      )
        return;
      rows.set(id, row);
      if (
        !previous &&
        row.anchor &&
        initialized &&
        mode === 'follow' &&
        config.current.autoScroll
      ) {
        mode = 'anchor';
        anchor = id;
        anchorOptions = {
          align: 'start',
          behavior: 'instant',
          scrollMargin: config.current.scrollMargin + config.current.scrollPreviousItemPeek,
        };
      }
      publish();
    },
    unregister(id: string) {
      rows.delete(id);
      if (anchor === id) {
        anchor = null;
        mode = 'free';
        tail = 0;
      }
      publish();
    },
    measureViewport(height: number) {
      viewport = Math.max(0, height);
      publish();
    },
    measureContent(height: number, renderedTail = 0) {
      content = Math.max(0, height - renderedTail);
      publish();
    },
    onScroll(y: number) {
      offset = Math.max(0, y);
      if (mode !== 'anchor')
        mode =
          config.current.autoScroll &&
          content + tail - viewport - offset <= config.current.scrollEdgeThreshold
            ? 'follow'
            : 'free';
      publish();
    },
    beginDrag() {
      initialized = true;
      mode = 'free';
      anchor = null;
      publish();
    },
    contentChanged() {
      if (!viewport || !content) return;
      if (!initialized) {
        initialized = true;
        if (config.current.defaultScrollPosition === 'start')
          api.scrollToStart({ behavior: 'instant' });
        else if (config.current.defaultScrollPosition === 'last-anchor') {
          const id = ordered()
            .filter(([, row]) => row.anchor)
            .at(-1)?.[0];
          if (id)
            api.scrollToMessage(id, {
              align: 'start',
              behavior: 'instant',
              scrollMargin: config.current.scrollMargin + config.current.scrollPreviousItemPeek,
            });
          else api.scrollToEnd({ behavior: 'instant' });
        } else api.scrollToEnd({ behavior: 'instant' });
        return;
      }
      if (mode === 'anchor' && anchor) api.scrollToMessage(anchor, anchorOptions);
      else if (mode === 'follow' && config.current.autoScroll)
        api.scrollToEnd({ behavior: 'instant' });
    },
    scrollToEnd(options: ScrollOptions = {}) {
      mode = config.current.autoScroll ? 'follow' : 'free';
      anchor = null;
      tail = 0;
      offset = Math.max(0, content - viewport);
      // The native content still includes tail padding until React commits it.
      // Target the real transcript end rather than the old padded native end.
      scroll.current?.scrollTo({ y: offset, animated: options.behavior === 'smooth' });
      publish();
    },
    scrollToStart(options: ScrollOptions = {}) {
      mode = 'free';
      anchor = null;
      tail = 0;
      offset = 0;
      scroll.current?.scrollTo({ y: 0, animated: options.behavior === 'smooth' });
      publish();
    },
    scrollToMessage(id: string, options: ScrollOptions = {}) {
      const row = rows.get(id);
      if (!row) return false;
      const margin = options.scrollMargin ?? config.current.scrollMargin,
        align = options.align ?? 'start';
      if (
        align === 'nearest' &&
        row.y >= offset + margin &&
        row.y + row.height <= offset + viewport - margin
      )
        return true;
      const target = Math.max(
        0,
        align === 'center'
          ? row.y - (viewport - row.height) / 2
          : align === 'end' || (align === 'nearest' && row.y > offset)
            ? row.y + row.height - viewport + margin
            : row.y - margin,
      );
      const originalContent = content;
      tail = Math.max(0, target - Math.max(0, originalContent - viewport));
      mode = 'anchor';
      anchor = id;
      anchorOptions = options;
      offset = target;
      scroll.current?.scrollTo({ y: target, animated: options.behavior === 'smooth' });
      publish();
      return true;
    },
  };
  return api;
}
