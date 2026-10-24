import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View, AccessibilityInfo, type ViewProps } from 'react-native';
import { Box, LabelText, Muted, Surface, row } from './_core';
import { Button, type ButtonProps } from './button';
import { OverlayRoot, OverlayTrigger, OverlayContent } from './_overlay';
export type ToastMessage = {
  id?: string;
  title: string;
  description?: string;
  duration?: number;
  action?: { label: string; onPress: () => void };
};
const ToastContext = createContext<{
  messages: (ToastMessage & { id: string })[];
  toast: (message: ToastMessage) => string;
  dismiss: (id?: string) => void;
} | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, set] = useState<(ToastMessage & { id: string })[]>([]);
  const counter = useRef(0);
  const dismiss = (id?: string) =>
    set((before) => (id ? before.filter((item) => item.id !== id) : []));
  const toast = (message: ToastMessage) => {
    const id = message.id ?? `toast-${++counter.current}`;
    set((before) => [...before.filter((item) => item.id !== id), { ...message, id }]);
    AccessibilityInfo.announceForAccessibility(
      [message.title, message.description].filter(Boolean).join('. '),
    );
    return id;
  };
  return (
    <ToastContext.Provider value={{ messages, toast, dismiss }}>{children}</ToastContext.Provider>
  );
}
export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw Error('useToast requires ToastProvider.');
  return value;
}
export function Toast({ message }: { message: ToastMessage & { id: string } }) {
  const { dismiss } = useToast();
  const latest = useRef(dismiss);
  latest.current = dismiss;
  useEffect(() => {
    const duration = message.duration ?? 5000;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const timer = setTimeout(() => latest.current(message.id), duration);
    return () => clearTimeout(timer);
  }, [message.id, message.duration]);
  return (
    <Surface accessibilityRole="alert" accessibilityLiveRegion="polite">
      <ToastTitle>{message.title}</ToastTitle>
      {message.description && <ToastDescription>{message.description}</ToastDescription>}
      {message.action && (
        <Button
          onPress={() => {
            message.action?.onPress();
            dismiss(message.id);
          }}
        >
          {message.action.label}
        </Button>
      )}
      <Button
        variant="ghost"
        accessibilityLabel={`Dismiss ${message.title}`}
        onPress={() => dismiss(message.id)}
      >
        Dismiss
      </Button>
    </Surface>
  );
}
export function Toaster(props: ViewProps) {
  const { messages } = useToast();
  return (
    <Box {...props}>
      {messages.map((message) => (
        <Toast key={message.id} message={message} />
      ))}
    </Box>
  );
}
export const ToastViewport = Toaster;
export const ToastTitle = ({ style, ...props }: React.ComponentProps<typeof LabelText>) => (
  <LabelText {...props} style={[{ fontWeight: '600' }, style]} />
);
export const ToastDescription = Muted;
export const ToastAction = Button;
export function ToastClose({
  id,
  children = 'Dismiss',
  ...props
}: Omit<ButtonProps, 'children'> & { id: string; children?: ReactNode }) {
  const { dismiss } = useToast();
  return (
    <Button {...props} onPress={() => dismiss(id)}>
      {children}
    </Button>
  );
}
const SidebarContext = createContext<{ open: boolean; setOpen: (value: boolean) => void } | null>(
  null,
);
export function SidebarProvider({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [internal, setInternal] = useState(defaultOpen);
  const selected = open ?? internal;
  const setOpen = (value: boolean) => {
    if (open === undefined) setInternal(value);
    onOpenChange?.(value);
  };
  return (
    <SidebarContext.Provider value={{ open: selected, setOpen }}>
      <OverlayRoot open={selected} onOpenChange={setOpen}>
        {children}
      </OverlayRoot>
    </SidebarContext.Provider>
  );
}
export function useSidebar() {
  const state = useContext(SidebarContext);
  if (!state) throw Error('Sidebar requires SidebarProvider.');
  return { ...state, toggleSidebar: () => state.setOpen(!state.open) };
}
export const Sidebar = (props: React.ComponentProps<typeof OverlayContent>) => (
  <OverlayContent {...props} side="left" />
);
export const SidebarTrigger = ({
  children = 'Menu',
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) => (
  <OverlayTrigger accessibilityLabel="Toggle sidebar" {...props}>
    {children}
  </OverlayTrigger>
);
export const SidebarInset = Box;
export const SidebarHeader = Box;
export const SidebarFooter = Box;
export const SidebarContent = ScrollView;
export const SidebarGroup = Box;
export const SidebarGroupContent = Box;
export const SidebarGroupLabel = Muted;
export const SidebarMenu = Box;
export const SidebarMenuItem = Box;
export const SidebarMenuButton = ({ isActive, ...props }: ButtonProps & { isActive?: boolean }) => (
  <Button
    variant={isActive ? 'secondary' : 'ghost'}
    {...props}
    accessibilityState={{ selected: !!isActive, disabled: !!props.disabled }}
  />
);
export const SidebarMenuAction = Button;
export const SidebarMenuBadge = Muted;
export const SidebarSeparator = () => <View style={{ height: 8 }} />;
export const SidebarMenuSub = Box;
export const SidebarMenuSubItem = Box;
export const SidebarMenuSubButton = SidebarMenuButton;
const ScrollerContext = createContext<{
  bottom: boolean;
  setBottom: (value: boolean) => void;
  scroll: React.RefObject<ScrollView | null>;
} | null>(null);
export function MessageScroller(props: ViewProps) {
  const [bottom, setBottom] = useState(true);
  const scroll = useRef<ScrollView>(null);
  return (
    <ScrollerContext.Provider value={{ bottom, setBottom, scroll }}>
      <Box {...props} />
    </ScrollerContext.Provider>
  );
}
export function MessageScrollerContent({
  onScroll,
  onContentSizeChange,
  children,
  ...props
}: React.ComponentProps<typeof ScrollView>) {
  const state = useContext(ScrollerContext);
  if (!state) throw Error('MessageScrollerContent requires MessageScroller.');
  const frame = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return (
    <ScrollView
      {...props}
      ref={state.scroll}
      scrollEventThrottle={16}
      onScroll={(event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        state.setBottom(contentOffset.y + layoutMeasurement.height >= contentSize.height - 40);
        onScroll?.(event);
      }}
      onContentSizeChange={(width, height) => {
        if (state.bottom) {
          if (frame.current !== undefined) cancelAnimationFrame(frame.current);
          frame.current = requestAnimationFrame(() =>
            state.scroll.current?.scrollToEnd({ animated: false }),
          );
        }
        onContentSizeChange?.(width, height);
      }}
    >
      {children}
    </ScrollView>
  );
}
export function MessageScrollerScrollButton({
  children = 'Latest messages',
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const state = useContext(ScrollerContext);
  if (!state || state.bottom) return null;
  return (
    <Button
      accessibilityLabel="Scroll to latest messages"
      {...props}
      onPress={() => {
        state.scroll.current?.scrollToEnd({ animated: false });
        state.setBottom(true);
      }}
    >
      {children}
    </Button>
  );
}
export const MessageScrollerFooter = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
