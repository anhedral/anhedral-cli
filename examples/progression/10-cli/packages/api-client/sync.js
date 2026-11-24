const protocol = 'anhedral.sync.v1';

// One subscription per signed-in app instance. Abort on sign-out or unmount.
export async function subscribe(request, refresh, signal, onForeground) {
  let retry = 250;
  let attempt;
  let refreshing;
  let dirty = false;
  // Collapse concurrent notifications to a trailing full refetch.
  function invalidate(event) {
    dirty = true;
    if (refreshing) return refreshing;
    refreshing = (async () => {
      while (dirty && !signal.aborted) {
        dirty = false;
        await refresh(event);
        event = undefined;
      }
    })().finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  }
  const wake = () => attempt?.abort();
  const foreground = () => {
    if (!signal.aborted) void invalidate().catch(() => {});
    wake();
  };
  const visible = () => {
    if (globalThis.document?.visibilityState === 'visible') foreground();
  };
  signal.addEventListener('abort', wake);
  globalThis.document?.addEventListener('visibilitychange', visible);
  globalThis.addEventListener?.('online', foreground);
  const unsubscribe = onForeground?.(foreground);
  try {
    while (!signal.aborted) {
      attempt = new AbortController();
      const active = attempt.signal;
      try {
        const response = await request('/api/sync/ticket', { method: 'POST', signal: active });
        if ([401, 403].includes(response.status)) throw new Error('Sign in to subscribe');
        if (!response.ok) throw new Error('Sync unavailable');
        const { url, ticket } = await response.json();
        if (active.aborted) continue;
        await new Promise((resolve, reject) => {
          const socket = new WebSocket(url, [protocol, ticket]);
          // Rotate the ticket against the current session and bound stalled handshakes.
          let timer = setTimeout(finish, 15000);
          function finish(error) {
            clearTimeout(timer);
            active.removeEventListener('abort', cancel);
            socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
            try {
              socket.close();
            } catch {
              /* Already closed. */
            }
            if (error instanceof Error) reject(error);
            else resolve();
          }
          const cancel = () => finish();
          active.addEventListener('abort', cancel, { once: true });
          socket.onopen = () => {
            clearTimeout(timer);
            timer = setTimeout(finish, 270000);
            retry = 250;
            invalidate().catch(finish);
          };
          socket.onmessage = ({ data }) => {
            try {
              invalidate(JSON.parse(data)).catch(finish);
            } catch {
              finish();
            }
          };
          socket.onclose = socket.onerror = cancel;
        });
      } catch (error) {
        if (error?.message === 'Sign in to subscribe') throw error;
      }
      if (active.aborted || signal.aborted) continue;
      await new Promise((resolve) => {
        const done = () => {
          clearTimeout(timer);
          active.removeEventListener('abort', done);
          resolve();
        };
        const timer = setTimeout(done, retry + (Math.random() * retry) / 4);
        active.addEventListener('abort', done, { once: true });
      });
      retry = Math.min(15000, retry * 2);
    }
  } finally {
    signal.removeEventListener('abort', wake);
    globalThis.document?.removeEventListener('visibilitychange', visible);
    globalThis.removeEventListener?.('online', foreground);
    unsubscribe?.();
  }
}
