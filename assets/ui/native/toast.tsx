import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Fragment } from 'react';
import { type ViewProps } from 'react-native';
import { Box, LabelText, Muted, Surface } from './_core';
import { useTheme } from '../theme';
import { Button, type ButtonProps } from './button';
import {
  createToastManager,
  type ToastManager,
  type ToastObject,
  type ToastAddOptions,
} from './_toast-store';
import { legacyToastManager } from './use-toast';
export { reducer } from './use-toast';
export { createToastManager } from './_toast-store';
export type {
  ToastManager,
  ToastObject,
  ToastAddOptions,
  ToastUpdateOptions,
  ToastPromiseOptions,
} from './_toast-store';
export const toast = createToastManager();
type ProviderState = { manager: ToastManager; timeout: number; limit: number };
const ManagerContext = createContext<ProviderState | null>(null),
  ItemContext = createContext<ToastObject | null>(null);
export function ToastProvider({
  children,
  toastManager,
  timeout = 5000,
  limit = 3,
}: {
  children?: ReactNode;
  toastManager?: ToastManager;
  timeout?: number;
  limit?: number;
}) {
  const owned = useRef<ToastManager | null>(null);
  if (!owned.current) owned.current = createToastManager();
  return (
    <ManagerContext.Provider
      value={{
        manager: toastManager ?? owned.current,
        timeout,
        limit: Math.max(1, Math.trunc(limit) || 3),
      }}
    >
      {children}
    </ManagerContext.Provider>
  );
}
export function useToastManager() {
  const context = useContext(ManagerContext);
  if (!context) throw Error('useToastManager requires ToastProvider.');
  const { manager, limit } = context;
  const records = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  return {
    toasts: records.map((record, index) => ({
      ...record,
      limited: index < records.length - limit,
    })),
    add: manager.add,
    close: manager.close,
    update: manager.update,
    promise: manager.promise,
  };
}
/** Retains the earlier native provider API; the hooks/use-toast subpath is provider-free. */
export function useToast() {
  const context = useContext(ManagerContext);
  const manager = context?.manager ?? legacyToastManager;
  const records = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  return {
    messages: records,
    toasts: records,
    dismiss: manager.close,
    toast: (
      message: Omit<ToastAddOptions, 'timeout'> & {
        duration?: number;
        action?: { label: ReactNode; onPress: () => void };
      },
    ) => {
      let id = '';
      id = manager.add({
        ...message,
        timeout: message.duration,
        actionProps: message.action
          ? {
              children: message.action.label,
              onPress: () => {
                message.action?.onPress();
                manager.close(id);
              },
            }
          : message.actionProps,
      });
      return id;
    },
  };
}
function useItem() {
  const item = useContext(ItemContext);
  if (!item) throw Error('Toast parts require Toast.');
  return item;
}
export function Toast({
  toast: record,
  message,
  variant = 'default',
  children,
  style,
  ...props
}: ViewProps & {
  variant?: 'default' | 'destructive';
  toast?: ToastObject;
  message?: {
    id: string;
    title?: ReactNode;
    description?: ReactNode;
    duration?: number;
    action?: { label: ReactNode; onPress: () => void };
  };
}) {
  const { colors } = useTheme();
  const provider = useContext(ManagerContext),
    manager = provider?.manager ?? toast;
  const item: ToastObject | undefined =
    record ??
    (message
      ? {
          ...message,
          createdAt: Date.now(),
          timeout: message.duration,
          actionProps: message.action
            ? {
                children: message.action.label,
                onPress: () => {
                  message.action?.onPress();
                  manager.close(message.id);
                },
              }
            : undefined,
        }
      : undefined);
  if (!item) throw Error('Toast requires a toast record or native message.');
  useEffect(() => {
    const timeout = item.timeout ?? provider?.timeout ?? 5000;
    if (!Number.isFinite(timeout) || timeout <= 0 || item.type === 'loading') return;
    const timer = setTimeout(
      () => manager.close(item.id),
      Math.max(0, timeout - (Date.now() - item.createdAt)),
    );
    return () => clearTimeout(timer);
  }, [manager, item.id, item.timeout, item.type, item.updateKey, provider?.timeout]);
  return (
    <ItemContext.Provider value={item}>
      <Surface
        {...props}
        accessibilityRole="alert"
        accessibilityLiveRegion={item.priority === 'high' ? 'assertive' : 'polite'}
        accessibilityElementsHidden={item.limited}
        importantForAccessibility={item.limited ? 'no-hide-descendants' : 'auto'}
        style={[
          {
            backgroundColor: colors.popover,
            borderColor:
              variant === 'destructive' || item.type === 'error'
                ? colors.destructive
                : colors.border,
          },
          item.limited && { display: 'none' },
          style,
        ]}
      >
        {children ?? (
          <ToastContent>
            <ToastTitle />
            <ToastDescription />
            <ToastAction />
            <ToastClose />
          </ToastContent>
        )}
      </Surface>
    </ItemContext.Provider>
  );
}
export const ToastPortal = ({ children }: { children?: ReactNode }) => (
  <Fragment>{children}</Fragment>
);
export const ToastContent = Box;
export function ToastTitle({ children, style, ...props }: React.ComponentProps<typeof LabelText>) {
  const item = useItem();
  return (
    <LabelText {...props} style={[{ fontWeight: '600' }, style]}>
      {children ?? item.title}
    </LabelText>
  );
}
export function ToastDescription({ children, ...props }: React.ComponentProps<typeof Muted>) {
  const item = useItem();
  return children || item.description ? (
    <Muted {...props}>{children ?? item.description}</Muted>
  ) : null;
}
export function ToastAction({
  children,
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const item = useItem();
  const label = children ?? item.actionProps?.children;
  if (!label) return null;
  return (
    <Button
      nativePreset={false}
      {...item.actionProps}
      {...props}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) item.actionProps?.onPress?.(event);
      }}
    >
      {label}
    </Button>
  );
}
export function ToastClose({
  id,
  children = 'Dismiss',
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & { id?: string; children?: ReactNode }) {
  const item = useContext(ItemContext),
    context = useContext(ManagerContext),
    manager = context?.manager ?? toast;
  const target = id ?? item?.id;
  return (
    <Button
      nativePreset={false}
      variant="ghost"
      accessibilityLabel={`Dismiss ${typeof item?.title === 'string' ? item.title : 'notification'}`}
      {...props}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented() && target) manager.close(target);
      }}
    >
      {children}
    </Button>
  );
}
function ToastList() {
  const { toasts } = useToastManager();
  return toasts.map((item) => <Toast key={item.id} toast={item} />);
}
export function ToastViewport({ children, ...props }: ViewProps) {
  return (
    <Box pointerEvents="box-none" {...props}>
      {children ?? <ToastList />}
    </Box>
  );
}
function LegacyGlobalToasts() {
  const records = useSyncExternalStore(
    legacyToastManager.subscribe,
    legacyToastManager.getSnapshot,
    legacyToastManager.getSnapshot,
  );
  return (
    <ToastProvider toastManager={legacyToastManager}>
      <Box>
        {records.map((item) => (
          <Toast key={item.id} toast={item}>
            <ToastContent>
              <ToastTitle />
              <ToastDescription />
              {item.data?.legacyAction as ReactNode}
              <ToastClose />
            </ToastContent>
          </Toast>
        ))}
      </Box>
    </ToastProvider>
  );
}
export function Toaster({
  children,
  toastManager,
  timeout,
  limit,
  ...props
}: ViewProps & { toastManager?: ToastManager; timeout?: number; limit?: number }) {
  const context = useContext(ManagerContext);
  if (context && !toastManager)
    return (
      <>
        {children}
        <ToastViewport {...props} />
      </>
    );
  return (
    <>
      <ToastProvider toastManager={toastManager ?? toast} timeout={timeout} limit={limit}>
        {children}
        <ToastPortal>
          <ToastViewport {...props} />
        </ToastPortal>
      </ToastProvider>
      {!toastManager && <LegacyGlobalToasts />}
    </>
  );
}
