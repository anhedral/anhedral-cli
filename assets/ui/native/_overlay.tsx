import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  View,
  Modal,
  KeyboardAvoidingView,
  Pressable,
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  PanResponder,
  type ViewProps,
} from 'react-native';
import { Box, LabelText, Muted, row, content, useControllable } from './_core';
import { Button, type ButtonProps } from './button';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

type OverlayState = {
  open: boolean;
  set: (open: boolean) => void;
  trigger: RefObject<View | null>;
  heading: RefObject<View | null>;
  id: string;
};
const OverlayContext = createContext<OverlayState | null>(null);
export function useOverlay() {
  const value = useContext(OverlayContext);
  if (!value) throw Error('Overlay parts require a Dialog, Sheet, Popover or menu root.');
  return value;
}
export type OverlayProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};
export function OverlayRoot({ open, defaultOpen = false, onOpenChange, children }: OverlayProps) {
  const [value, set] = useControllable(open, defaultOpen, onOpenChange);
  const trigger = useRef<View>(null);
  const heading = useRef<View>(null);
  const id = useId();
  return (
    <OverlayContext.Provider value={{ open: value, set, trigger, heading, id }}>
      {children}
    </OverlayContext.Provider>
  );
}
function focus(ref: RefObject<View | null>) {
  const node = ref.current && findNodeHandle(ref.current);
  if (node) AccessibilityInfo.setAccessibilityFocus(node);
}
export function OverlayTrigger({ onPress, ...props }: ButtonProps) {
  const state = useOverlay();
  return (
    <Button
      {...props}
      ref={state.trigger}
      accessibilityState={{ ...props.accessibilityState, expanded: state.open }}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) state.set(true);
      }}
    />
  );
}
export function LongPressTrigger({ onLongPress, ...props }: ButtonProps) {
  const state = useOverlay();
  return (
    <Button
      {...props}
      ref={state.trigger}
      accessibilityHint="Touch and hold to open"
      accessibilityState={{ expanded: state.open }}
      onLongPress={(event) => {
        onLongPress?.(event);
        state.set(true);
      }}
      accessibilityActions={[{ name: 'activate', label: 'Open preview' }]}
      onAccessibilityAction={() => state.set(true)}
    />
  );
}
export function OverlayClose({ onPress, ...props }: ButtonProps) {
  const state = useOverlay();
  return (
    <Button
      {...props}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) state.set(false);
      }}
    />
  );
}
export function OverlayContent({
  children,
  side = 'center',
  dismissOnBackdrop = true,
  swipeToDismiss = false,
  style,
  ...props
}: ViewProps & {
  side?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  dismissOnBackdrop?: boolean;
  swipeToDismiss?: boolean;
}) {
  const state = useOverlay();
  const { colors } = useTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const previous = useRef(state.open);
  useEffect(() => {
    const closed = previous.current && !state.open;
    previous.current = state.open;
    if (!closed || Platform.OS === 'ios') return;
    const frame = requestAnimationFrame(() => focus(state.trigger));
    return () => cancelAnimationFrame(frame);
  }, [state.open, state.trigger]);
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) =>
      swipeToDismiss && Math.abs(gesture.dx) < 20 && gesture.dy > 16,
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 80) state.set(false);
    },
  });
  const horizontal = side === 'left' || side === 'right';
  return (
    <Modal
      testID={props.testID ? `${props.testID}-modal` : undefined}
      visible={state.open}
      transparent
      animationType="none"
      onShow={() => focus(state.heading)}
      onDismiss={() => focus(state.trigger)}
      onRequestClose={() => state.set(false)}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          accessibilityElementsHidden={!state.open}
          importantForAccessibility={state.open ? 'auto' : 'no-hide-descendants'}
          style={{
            flex: 1,
            justifyContent:
              side === 'top' ? 'flex-start' : side === 'bottom' ? 'flex-end' : 'center',
            alignItems: side === 'left' ? 'flex-start' : side === 'right' ? 'flex-end' : 'stretch',
            padding: side === 'center' ? 24 : 0,
          }}
        >
          <Pressable
            accessible={dismissOnBackdrop}
            accessibilityRole="button"
            accessibilityLabel="Dismiss overlay"
            disabled={!dismissOnBackdrop}
            onPress={() => state.set(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: colors.foreground,
              opacity: 0.35,
            }}
          />
          <View
            {...props}
            accessibilityViewIsModal
            onAccessibilityEscape={() => state.set(false)}
            style={[
              {
                backgroundColor: colors.popover,
                padding: 20,
                paddingTop: 20 + insets.top,
                paddingBottom: 20 + insets.bottom,
                paddingLeft: 20 + insets.left,
                paddingRight: 20 + insets.right,
                gap: 12,
                borderRadius: side === 'center' ? 12 : 0,
                maxHeight: '90%',
                width: horizontal ? '85%' : undefined,
              },
              horizontal && { height: '100%', maxHeight: '100%' },
              style,
            ]}
          >
            {swipeToDismiss && (
              <Pressable
                accessible
                accessibilityRole="button"
                accessibilityLabel="Close drawer"
                onPress={() => state.set(false)}
              >
                <View
                  {...pan.panHandlers}
                  style={{ minHeight: 28, justifyContent: 'center', alignItems: 'center' }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.border,
                    }}
                  />
                </View>
              </Pressable>
            )}
            {content(children)}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function OverlayTitle({ children, ...props }: ViewProps) {
  const state = useOverlay();
  return (
    <View
      {...props}
      ref={state.heading}
      accessible
      accessibilityRole="header"
      nativeID={`${state.id}-title`}
    >
      <LabelText style={{ fontSize: 18, fontWeight: '600' }}>{children}</LabelText>
    </View>
  );
}
export const OverlayDescription = Muted;
export const OverlayHeader = Box;
export const OverlayFooter = ({ style, ...props }: ViewProps) => (
  <Box {...props} style={row(style)} />
);
export function AlertDialogContent(props: React.ComponentProps<typeof OverlayContent>) {
  return <OverlayContent {...props} dismissOnBackdrop={false} />;
}
export const AlertDialog = OverlayRoot;
export const AlertDialogTrigger = OverlayTrigger;
export const AlertDialogTitle = OverlayTitle;
export const AlertDialogDescription = Muted;
export const AlertDialogHeader = Box;
export const AlertDialogFooter = OverlayFooter;
export const AlertDialogAction = OverlayClose;
export const AlertDialogCancel = (props: ButtonProps) => (
  <OverlayClose variant="outline" {...props} />
);
export const Popover = OverlayRoot;
export const PopoverTrigger = OverlayTrigger;
export const PopoverContent = OverlayContent;
export const PopoverClose = OverlayClose;
export const PopoverAnchor = Box;
export const Sheet = OverlayRoot;
export const SheetTrigger = OverlayTrigger;
export const SheetContent = ({
  side = 'right',
  ...props
}: React.ComponentProps<typeof OverlayContent>) => <OverlayContent side={side} {...props} />;
export const SheetClose = OverlayClose;
export const SheetHeader = Box;
export const SheetFooter = OverlayFooter;
export const SheetTitle = OverlayTitle;
export const SheetDescription = Muted;
export const Drawer = OverlayRoot;
export const DrawerTrigger = OverlayTrigger;
export const DrawerContent = (props: React.ComponentProps<typeof OverlayContent>) => (
  <OverlayContent side="bottom" swipeToDismiss {...props} />
);
export const DrawerClose = OverlayClose;
export const DrawerHeader = Box;
export const DrawerFooter = OverlayFooter;
export const DrawerTitle = OverlayTitle;
export const DrawerDescription = Muted;
export const HoverCard = OverlayRoot;
export const HoverCardTrigger = LongPressTrigger;
export const HoverCardContent = OverlayContent;
export const TooltipProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const Tooltip = OverlayRoot;
export const TooltipTrigger = LongPressTrigger;
export const TooltipContent = OverlayContent;
export const TooltipClose = OverlayClose;
export const DropdownMenu = OverlayRoot;
export const DropdownMenuTrigger = OverlayTrigger;
export const DropdownMenuContent = (props: React.ComponentProps<typeof OverlayContent>) => (
  <OverlayContent accessibilityRole="menu" {...props} />
);
export const DropdownMenuLabel = Muted;
export const DropdownMenuGroup = Box;
export const DropdownMenuSeparator = ({ ...props }: ViewProps) => (
  <Box {...props} style={{ height: 4 }} />
);
export function DropdownMenuItem({
  onSelect,
  onPress,
  ...props
}: ButtonProps & { onSelect?: (event: { preventDefault: () => void }) => void }) {
  const state = useOverlay();
  return (
    <Button
      variant="ghost"
      {...props}
      accessibilityRole="menuitem"
      onPress={(event) => {
        let prevented = false;
        onPress?.(event);
        onSelect?.({
          preventDefault: () => {
            prevented = true;
          },
        });
        if (!prevented && !event.isDefaultPrevented()) state.set(false);
      }}
    />
  );
}
export const DropdownMenuShortcut = Muted;
export function DropdownMenuCheckboxItem({
  checked = false,
  onCheckedChange,
  ...props
}: ButtonProps & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) {
  return (
    <DropdownMenuItem
      {...props}
      accessibilityState={{ checked }}
      onSelect={(event) => {
        event.preventDefault();
        onCheckedChange?.(!checked);
      }}
    >
      <LabelText accessibilityElementsHidden>{checked ? '✓ ' : '  '}</LabelText>
      {contentForMenu(props.children)}
    </DropdownMenuItem>
  );
}
function contentForMenu(children: ReactNode) {
  return typeof children === 'string' ? <LabelText>{children}</LabelText> : children;
}
const MenuRadioContext = createContext({ value: '', change: (_value: string) => {} });
export function DropdownMenuRadioGroup({
  value = '',
  onValueChange = () => {},
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <MenuRadioContext.Provider value={{ value, change: onValueChange }}>
      <Box>{children}</Box>
    </MenuRadioContext.Provider>
  );
}
export function DropdownMenuRadioItem({ value, ...props }: ButtonProps & { value: string }) {
  const radio = useContext(MenuRadioContext);
  return (
    <DropdownMenuItem
      {...props}
      accessibilityState={{ checked: radio.value === value }}
      onSelect={() => radio.change(value)}
    />
  );
}
export const DropdownMenuSub = OverlayRoot;
export const DropdownMenuSubTrigger = OverlayTrigger;
export const DropdownMenuSubContent = DropdownMenuContent;
export const ContextMenu = OverlayRoot;
export const ContextMenuTrigger = LongPressTrigger;
export const ContextMenuContent = DropdownMenuContent;
export const ContextMenuItem = DropdownMenuItem;
export const ContextMenuCheckboxItem = DropdownMenuCheckboxItem;
export const ContextMenuRadioGroup = DropdownMenuRadioGroup;
export const ContextMenuRadioItem = DropdownMenuRadioItem;
export const ContextMenuLabel = Muted;
export const ContextMenuSeparator = DropdownMenuSeparator;
export const ContextMenuGroup = Box;
export const ContextMenuShortcut = Muted;
export const ContextMenuSub = OverlayRoot;
export const ContextMenuSubTrigger = OverlayTrigger;
export const ContextMenuSubContent = DropdownMenuContent;
export const Menubar = ({ style, ...props }: ViewProps) => <Box {...props} style={row(style)} />;
export const MenubarMenu = OverlayRoot;
export const MenubarTrigger = OverlayTrigger;
export const MenubarContent = DropdownMenuContent;
export const MenubarItem = DropdownMenuItem;
export const MenubarCheckboxItem = DropdownMenuCheckboxItem;
export const MenubarRadioGroup = DropdownMenuRadioGroup;
export const MenubarRadioItem = DropdownMenuRadioItem;
export const MenubarLabel = Muted;
export const MenubarSeparator = DropdownMenuSeparator;
export const MenubarGroup = Box;
export const MenubarShortcut = Muted;
export const MenubarSub = OverlayRoot;
export const MenubarSubTrigger = OverlayTrigger;
export const MenubarSubContent = DropdownMenuContent;
