import { createContext, useContext, useState, type ReactNode } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { Box, LabelText, Muted, Surface, row } from './_core';
import { Button, type ButtonProps } from './button';
import { Input } from './input';
import { Skeleton } from './_display';
import { OverlayRoot, OverlayContent, useOverlay } from './_overlay';
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
export const Sidebar = ({
  side = 'left',
  ...props
}: React.ComponentProps<typeof OverlayContent>) => <OverlayContent {...props} side={side} />;
export function SidebarTrigger({
  children = 'Menu',
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const state = useSidebar(),
    overlay = useOverlay();
  return (
    <Button
      accessibilityLabel="Toggle sidebar"
      {...props}
      ref={overlay.trigger}
      accessibilityState={{ expanded: state.open }}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) state.toggleSidebar();
      }}
    >
      {children}
    </Button>
  );
}
export const SidebarInput = Input;
export function SidebarRail({
  children,
  onPress,
  ...props
}: Omit<ButtonProps, 'children'> & { children?: ReactNode }) {
  const state = useSidebar();
  return (
    <Button
      variant="ghost"
      accessibilityLabel={state.open ? 'Collapse sidebar' : 'Expand sidebar'}
      {...props}
      onPress={(event) => {
        onPress?.(event);
        if (!event.isDefaultPrevented()) state.toggleSidebar();
      }}
    >
      {children ?? (state.open ? '‹' : '›')}
    </Button>
  );
}
export const SidebarGroupAction = Button;
export function SidebarMenuSkeleton({
  showIcon = false,
  style,
  ...props
}: ViewProps & { showIcon?: boolean }) {
  return (
    <Box {...props} accessible accessibilityLabel="Loading navigation" style={row(style)}>
      {showIcon && (
        <Skeleton
          accessible={false}
          accessibilityElementsHidden
          style={{ width: 24, height: 24 }}
        />
      )}
      <Skeleton
        accessible={false}
        accessibilityElementsHidden
        style={{ width: '70%', height: 20 }}
      />
    </Box>
  );
}
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
