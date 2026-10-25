import React from 'react';
import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (element: React.ReactElement) =>
  render(<UI.ThemeProvider>{element}</UI.ThemeProvider>);

test.each(['dialog', 'sheet', 'drawer', 'popover'] as const)(
  '%s opens from a real trigger, dismisses on native escape and reopens',
  async (kind) => {
    const parts = {
      dialog: [UI.Dialog, UI.DialogTrigger, UI.DialogContent, UI.DialogClose] as const,
      sheet: [UI.Sheet, UI.SheetTrigger, UI.SheetContent, UI.SheetClose] as const,
      drawer: [UI.Drawer, UI.DrawerTrigger, UI.DrawerContent, UI.DrawerClose] as const,
      popover: [UI.Popover, UI.PopoverTrigger, UI.PopoverContent, UI.PopoverClose] as const,
    }[kind];
    const [Root, Trigger, Content, Close] = parts;
    await mount(
      <Root>
        <Trigger>Open</Trigger>
        <Content testID="panel">
          <UI.Text>Body</UI.Text>
          <Close>Close</Close>
        </Content>
      </Root>,
    );
    expect(screen.queryByText('Body')).toBeNull();
    await userEvent.press(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('Body')).toBeOnTheScreen();
    await fireEvent(screen.getByTestId('panel'), 'accessibilityEscape');
    expect(screen.queryByText('Body')).toBeNull();
    await userEvent.press(screen.getByRole('button', { name: 'Open' }));
    await userEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Body')).toBeNull();
  },
);
test('controlled dialog requests closure on Android hardware-back without mutating supplied open state', async () => {
  const change = jest.fn();
  await mount(
    <UI.Dialog open onOpenChange={change}>
      <UI.DialogTrigger>Open</UI.DialogTrigger>
      <UI.DialogContent testID="controlled">
        <UI.DialogTitle>Controlled</UI.DialogTitle>
      </UI.DialogContent>
    </UI.Dialog>,
  );
  // Native boundary event has no accessible host control; other queries remain user-facing.
  await fireEvent(screen.getByTestId('controlled-modal'), 'requestClose');
  expect(change).toHaveBeenCalledWith(false);
  expect(screen.getByText('Controlled')).toBeOnTheScreen();
});
test('legacy Dialog triggerLabel API stays operational', async () => {
  const change = jest.fn();
  await mount(
    <UI.Dialog open={false} onOpenChange={change} triggerLabel="Open legacy" title="Legacy" />,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Open legacy' }));
  expect(change).toHaveBeenCalledWith(true);
});
test('alert dialog does not dismiss on backdrop and closes only via its explicit action', async () => {
  await mount(
    <UI.AlertDialog defaultOpen>
      <UI.AlertDialogContent>
        <UI.AlertDialogTitle>Delete?</UI.AlertDialogTitle>
        <UI.AlertDialogCancel>Cancel</UI.AlertDialogCancel>
      </UI.AlertDialogContent>
    </UI.AlertDialog>,
  );
  expect(screen.queryByRole('button', { name: 'Dismiss overlay' })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByText('Delete?')).toBeNull();
});
test.each(['dropdown', 'context', 'menubar'] as const)(
  '%s menu respects disabled items, preventDefault and closes after selection',
  async (kind) => {
    const select = jest.fn();
    const parts = {
      dropdown: [UI.DropdownMenu, UI.DropdownMenuContent, UI.DropdownMenuItem] as const,
      context: [UI.ContextMenu, UI.ContextMenuContent, UI.ContextMenuItem] as const,
      menubar: [UI.MenubarMenu, UI.MenubarContent, UI.MenubarItem] as const,
    }[kind];
    const [Root, Content, Item] = parts;
    await mount(
      <Root defaultOpen>
        <Content>
          <Item disabled onSelect={select}>
            Disabled
          </Item>
          <Item onSelect={(event) => event.preventDefault()}>Keep open</Item>
          <Item onSelect={select}>Select</Item>
        </Content>
      </Root>,
    );
    await userEvent.press(screen.getByRole('menuitem', { name: 'Disabled' }));
    expect(select).not.toHaveBeenCalled();
    await userEvent.press(screen.getByRole('menuitem', { name: 'Keep open' }));
    expect(screen.getByText('Select')).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('menuitem', { name: 'Select' }));
    expect(select).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Select')).toBeNull();
  },
);
test.each(['hover-card', 'tooltip'] as const)(
  '%s exposes a touch-and-hold interaction rather than requiring hover',
  async (kind) => {
    const Root = kind === 'hover-card' ? UI.HoverCard : UI.Tooltip;
    const Trigger = kind === 'hover-card' ? UI.HoverCardTrigger : UI.TooltipTrigger;
    const Content = kind === 'hover-card' ? UI.HoverCardContent : UI.TooltipContent;
    await mount(
      <Root>
        <Trigger>Preview</Trigger>
        <Content>Preview detail</Content>
      </Root>,
    );
    await userEvent.longPress(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByText('Preview detail')).toBeOnTheScreen();
    await userEvent.press(
      screen.getByRole('button', { name: 'Dismiss overlay', includeHiddenElements: true }),
    );
    expect(screen.queryByText('Preview detail')).toBeNull();
  },
);
test('sidebar state is shared by its navigation trigger and drawer', async () => {
  await mount(
    <UI.SidebarProvider>
      <UI.SidebarTrigger />
      <UI.Sidebar>
        <UI.SidebarMenu>
          <UI.SidebarMenuButton isActive>Home</UI.SidebarMenuButton>
        </UI.SidebarMenu>
      </UI.Sidebar>
    </UI.SidebarProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Toggle sidebar' }));
  expect(screen.getByRole('button', { name: 'Home' })).toBeOnTheScreen();
  await userEvent.press(
    screen.getByRole('button', { name: 'Dismiss overlay', includeHiddenElements: true }),
  );
  expect(screen.queryByText('Home')).toBeNull();
});
