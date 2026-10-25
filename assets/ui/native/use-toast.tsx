import { useSyncExternalStore, type ReactNode } from 'react';
import { createToastManager } from './_toast-store';
export const legacyToastManager = createToastManager();
export type LegacyToast = {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  open?: boolean;
  duration?: number;
  variant?: 'default' | 'destructive';
  onOpenChange?: (open: boolean) => void;
  action?: ReactNode;
};
type State = { toasts: LegacyToast[] };
type Action =
  | { type: 'ADD_TOAST'; toast: LegacyToast }
  | { type: 'UPDATE_TOAST'; toast: Partial<LegacyToast> }
  | { type: 'DISMISS_TOAST' | 'REMOVE_TOAST'; toastId?: string };
/** Native views have no CSS exit transition, so dismissed records can be removed immediately. */
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TOAST':
      return { toasts: [action.toast, ...state.toasts].slice(0, 1) };
    case 'UPDATE_TOAST':
      return {
        toasts: state.toasts.map((toast) =>
          toast.id === action.toast.id ? { ...toast, ...action.toast } : toast,
        ),
      };
    case 'DISMISS_TOAST':
      return {
        toasts: state.toasts.map((toast) =>
          action.toastId === undefined || toast.id === action.toastId
            ? { ...toast, open: false }
            : toast,
        ),
      };
    case 'REMOVE_TOAST':
      return {
        toasts: state.toasts.filter(
          (toast) => action.toastId !== undefined && toast.id !== action.toastId,
        ),
      };
  }
}
export function toast(options: Omit<LegacyToast, 'id'> & { id?: string }) {
  legacyToastManager.close();
  const id = legacyToastManager.add({
    id: options.id,
    title: options.title,
    description: options.description,
    timeout: options.duration,
    type: options.variant === 'destructive' ? 'error' : undefined,
    data: { legacyAction: options.action, legacyVariant: options.variant },
    onClose: () => options.onOpenChange?.(false),
  });
  return {
    id,
    dismiss: () => legacyToastManager.close(id),
    update: (updates: Partial<LegacyToast>) =>
      legacyToastManager.update(id, (previous) => ({
        ...('title' in updates ? { title: updates.title } : {}),
        ...('description' in updates ? { description: updates.description } : {}),
        ...('duration' in updates ? { timeout: updates.duration } : {}),
        ...('action' in updates
          ? { data: { ...previous.data, legacyAction: updates.action } }
          : {}),
      })),
  };
}
export function useToast() {
  const records = useSyncExternalStore(
    legacyToastManager.subscribe,
    legacyToastManager.getSnapshot,
    legacyToastManager.getSnapshot,
  );
  return {
    toasts: records.map((record) => ({
      ...record,
      open: true,
      duration: record.timeout,
      action: record.data?.legacyAction as ReactNode,
    })),
    toast,
    dismiss: legacyToastManager.close,
  };
}
