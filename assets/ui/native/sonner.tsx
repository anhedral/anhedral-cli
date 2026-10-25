import { useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { AccessibilityInfo, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Box, LabelText, TextToneProvider, content, plainText, row } from './_core';
import { Button } from './button';
import { Spinner } from './_display';
import { useTheme } from '../theme';

type ToastId = string | number;
type ToastKind = 'message' | 'success' | 'info' | 'warning' | 'error' | 'loading';
export type NativeToastPosition =
  'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type NativeToastOptions = {
  position?: NativeToastPosition;
  style?: StyleProp<ViewStyle>;
  radiusOffset?: number;
  contentGap?: number;
  id?: ToastId;
  description?: ReactNode;
  duration?: number;
  dismissible?: boolean;
  closeButton?: boolean;
  action?: { label: ReactNode; onClick: () => void };
  cancel?: { label: ReactNode; onClick?: () => void };
  onDismiss?: (toast: NativeToast) => void;
  onAutoClose?: (toast: NativeToast) => void;
};
export type NativeToast = NativeToastOptions & {
  id: ToastId;
  title: ReactNode;
  kind: ToastKind;
  revision: number;
  createdAt: number;
};
let sequence = 0;
let revision = 0;
let messages: readonly NativeToast[] = [];
const listeners = new Set<() => void>();
const snapshot = () => messages;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function publish(next: readonly NativeToast[]) {
  messages = next;
  for (const listener of listeners) listener();
}
function push(kind: ToastKind, title: ReactNode, options: NativeToastOptions = {}): ToastId {
  const id = options.id ?? ++sequence;
  const toast: NativeToast = {
    ...options,
    id,
    title,
    kind,
    revision: ++revision,
    createdAt: Date.now(),
  };
  publish([...messages.filter((item) => item.id !== id), toast]);
  const announcement = [plainText(title), plainText(options.description)]
    .filter(Boolean)
    .join('. ');
  if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
  return id;
}
function dismiss(id?: ToastId) {
  const removed = messages.filter((item) => id === undefined || item.id === id);
  publish(messages.filter((item) => id !== undefined && item.id !== id));
  for (const item of removed) item.onDismiss?.(item);
  return id;
}
function expire(id: ToastId, expectedRevision: number) {
  const message = messages.find((item) => item.id === id && item.revision === expectedRevision);
  if (!message) return;
  publish(messages.filter((item) => item !== message));
  message.onAutoClose?.(message);
}
function promise<T>(
  input: Promise<T> | (() => Promise<T>),
  options: NativeToastOptions & {
    loading: ReactNode;
    success: ReactNode | ((value: T) => ReactNode);
    error: ReactNode | ((reason: unknown) => ReactNode);
  },
) {
  const id = push('loading', options.loading, { ...options, duration: Infinity });
  const initialRevision = messages.find((item) => item.id === id)!.revision;
  const active = () => messages.some((item) => item.id === id && item.revision === initialRevision);
  void Promise.resolve()
    .then(() => (typeof input === 'function' ? input() : input))
    .then(
      (result) => {
        if (active())
          push(
            'success',
            typeof options.success === 'function' ? options.success(result) : options.success,
            { ...options, id, duration: options.duration ?? 4000 },
          );
      },
      (reason) => {
        if (active())
          push(
            'error',
            typeof options.error === 'function' ? options.error(reason) : options.error,
            { ...options, id, duration: options.duration ?? 4000 },
          );
      },
    )
    .catch((reason) => {
      if (active())
        push(
          'error',
          reason instanceof Error ? reason.message : 'Unable to display the notification.',
          { id, duration: options.duration ?? 4000 },
        );
    });
  return id;
}
export const toast = Object.assign(
  (title: ReactNode, options?: NativeToastOptions) => push('message', title, options),
  {
    message: (title: ReactNode, options?: NativeToastOptions) => push('message', title, options),
    success: (title: ReactNode, options?: NativeToastOptions) => push('success', title, options),
    info: (title: ReactNode, options?: NativeToastOptions) => push('info', title, options),
    warning: (title: ReactNode, options?: NativeToastOptions) => push('warning', title, options),
    error: (title: ReactNode, options?: NativeToastOptions) => push('error', title, options),
    loading: (title: ReactNode, options?: NativeToastOptions) =>
      push('loading', title, { duration: Infinity, ...options }),
    custom: (render: (id: ToastId) => ReactNode, options: NativeToastOptions = {}) => {
      const id = options.id ?? ++sequence;
      return push('message', render(id), { ...options, id });
    },
    dismiss,
    promise,
    getToasts: snapshot,
  },
);
export function useSonner() {
  return { toasts: useSyncExternalStore(subscribe, snapshot, snapshot) };
}
function NativeToastView({
  message,
  closeButton,
  visible,
}: {
  message: NativeToast;
  closeButton: boolean;
  visible: boolean;
}) {
  const { colors, radius } = useTheme();
  useEffect(() => {
    const duration = message.duration ?? 4000;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const timer = setTimeout(
      () => expire(message.id, message.revision),
      Math.max(0, duration - (Date.now() - message.createdAt)),
    );
    return () => clearTimeout(timer);
  }, [message.id, message.revision, message.duration]);
  const dismissible = message.dismissible !== false;
  return (
    <Box
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[
        {
          backgroundColor: colors.popover,
          borderColor: message.kind === 'error' ? colors.destructive : colors.border,
          borderWidth: 1,
          borderRadius: radius + (message.radiusOffset ?? 2),
          padding: 16,
          gap: message.contentGap ?? 8,
        },
        message.style,
        { display: visible ? 'flex' : 'none' },
      ]}
    >
      <Box style={row()}>
        {message.kind === 'loading' && <Spinner accessibilityLabel="Loading" />}
        <LabelText
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ fontWeight: '600', flex: 1 }}
        >
          {message.title}
        </LabelText>
      </Box>
      {message.description && (
        <TextToneProvider value={colors['muted-foreground']}>
          {content(message.description)}
        </TextToneProvider>
      )}
      <Box style={row()}>
        {message.action && (
          <Button
            nativePreset={false}
            onPress={() => {
              message.action?.onClick();
              dismiss(message.id);
            }}
          >
            {message.action.label}
          </Button>
        )}
        {message.cancel && (
          <Button
            nativePreset={false}
            variant="outline"
            onPress={() => {
              message.cancel?.onClick?.();
              dismiss(message.id);
            }}
          >
            {message.cancel.label}
          </Button>
        )}
        {dismissible && (message.closeButton ?? closeButton) && (
          <Button
            nativePreset={false}
            variant="ghost"
            accessibilityLabel={`Dismiss ${plainText(message.title)}`}
            onPress={() => dismiss(message.id)}
          >
            Dismiss
          </Button>
        )}
      </Box>
    </Box>
  );
}
export function SonnerToaster({
  position = 'bottom-center',
  visibleToasts = 3,
  closeButton = true,
  expand = false,
  style,
  ...props
}: ViewProps & {
  position?: NativeToastPosition;
  visibleToasts?: number;
  closeButton?: boolean;
  expand?: boolean;
}) {
  const { toasts } = useSonner();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const count = Number.isFinite(visibleToasts) ? Math.max(1, Math.trunc(visibleToasts)) : 3;
  const positions = [
    ...new Set([position, ...toasts.map((message) => message.position ?? position)]),
  ];
  return (
    <>
      {positions.map((groupPosition) => {
        const group = toasts.filter((message) => (message.position ?? position) === groupPosition);
        const shown = new Set((expand ? group : group.slice(-count)).map((message) => message.id));
        return (
          <Box
            {...props}
            key={groupPosition}
            testID={
              props.testID && positions.length > 1
                ? `${props.testID}-${groupPosition}`
                : props.testID
            }
            pointerEvents="box-none"
            style={[
              {
                position: 'absolute',
                left: 16 + insets.left,
                right: 16 + insets.right,
                gap: 8,
                ...(groupPosition.startsWith('top')
                  ? { top: 16 + insets.top }
                  : { bottom: 16 + insets.bottom }),
                alignItems: groupPosition.endsWith('left')
                  ? 'flex-start'
                  : groupPosition.endsWith('right')
                    ? 'flex-end'
                    : 'stretch',
              },
              style,
            ]}
          >
            {group.map((message) => (
              <NativeToastView
                key={message.id}
                message={message}
                closeButton={closeButton}
                visible={shown.has(message.id)}
              />
            ))}
          </Box>
        );
      })}
    </>
  );
}

export { SonnerToaster as Toaster };
