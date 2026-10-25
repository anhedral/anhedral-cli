import type { ReactNode } from 'react';
import { AccessibilityInfo, type PressableProps } from 'react-native';
export type ToastObject<Data extends object = Record<string, unknown>> = {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  type?: string;
  timeout?: number;
  priority?: 'low' | 'high';
  onClose?: () => void;
  onRemove?: () => void;
  actionProps?: Omit<PressableProps, 'children'> & { children?: ReactNode };
  data?: Data;
  limited?: boolean;
  updateKey?: number;
  createdAt: number;
};
export type ToastAddOptions<Data extends object = Record<string, unknown>> = Omit<
  ToastObject<Data>,
  'id' | 'createdAt'
> & { id?: string };
export type ToastUpdateOptions<Data extends object = Record<string, unknown>> = Partial<
  Omit<ToastObject<Data>, 'id' | 'createdAt'>
>;
type PromiseMessage<Data extends object> = string | ToastUpdateOptions<Data>;
export type ToastPromiseOptions<Value, Data extends object = Record<string, unknown>> = {
  loading: PromiseMessage<Data>;
  success: PromiseMessage<Data> | ((value: Value) => PromiseMessage<Data>);
  error: PromiseMessage<Data> | ((reason: unknown) => PromiseMessage<Data>);
};
let sequence = 0;
export function createToastManager<Data extends object = Record<string, unknown>>() {
  let messages: readonly ToastObject<Data>[] = [],
    revision = 0;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const announce = (title: ReactNode, description: ReactNode) => {
    const text = [title, description]
      .filter((value) => typeof value === 'string' || typeof value === 'number')
      .join('. ');
    if (text) AccessibilityInfo.announceForAccessibility(text);
  };
  const manager = {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => messages,
    add(options: ToastAddOptions<Data>) {
      const id = options.id ?? `toast-${++sequence}`;
      const current = messages.find((message) => message.id === id);
      const next: ToastObject<Data> = {
        ...current,
        ...options,
        id,
        createdAt: Date.now(),
        updateKey: ++revision,
      };
      messages = current
        ? messages.map((message) => (message.id === id ? next : message))
        : [...messages, next];
      notify();
      announce(next.title, next.description);
      return id;
    },
    update(
      id: string,
      updates:
        ToastUpdateOptions<Data> | ((previous: ToastObject<Data>) => ToastUpdateOptions<Data>),
    ) {
      const previous = messages.find((message) => message.id === id);
      if (!previous) return;
      const patch = typeof updates === 'function' ? updates(previous) : updates;
      const next = { ...previous, ...patch, updateKey: ++revision, createdAt: Date.now() };
      messages = messages.map((message) => (message.id === id ? next : message));
      notify();
      announce(next.title, next.description);
    },
    close(id?: string) {
      const removed = messages.filter((message) => id === undefined || message.id === id);
      messages = messages.filter((message) => id !== undefined && message.id !== id);
      notify();
      for (const message of removed) {
        message.onClose?.();
        message.onRemove?.();
      }
    },
    async promise<Value>(input: Promise<Value>, options: ToastPromiseOptions<Value, Data>) {
      const asOptions = (value: PromiseMessage<Data>): ToastUpdateOptions<Data> =>
        typeof value === 'string' ? { title: value } : value;
      const id = manager.add({ ...asOptions(options.loading), type: 'loading', timeout: 0 });
      const expected = messages.find((message) => message.id === id)!.updateKey;
      const active = () =>
        messages.some((message) => message.id === id && message.updateKey === expected);
      try {
        const value = await input;
        if (active())
          manager.update(id, {
            timeout: 5000,
            type: 'success',
            ...asOptions(
              typeof options.success === 'function' ? options.success(value) : options.success,
            ),
          });
        return value;
      } catch (reason) {
        if (active())
          manager.update(id, {
            timeout: 5000,
            type: 'error',
            ...asOptions(
              typeof options.error === 'function' ? options.error(reason) : options.error,
            ),
          });
        throw reason;
      }
    },
  };
  return manager;
}
export type ToastManager<Data extends object = Record<string, unknown>> = ReturnType<
  typeof createToastManager<Data>
>;
