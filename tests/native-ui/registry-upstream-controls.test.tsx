import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import * as UI from './.generated';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
import { Input as RegistryInput } from './.generated/src/native/registry-form-controls';
import { Slider as RegistrySlider } from './.generated/src/native/registry-slider';
import {
  DialogTrigger as AriaDialogTrigger,
  Dialog as AriaDialog,
  DialogTitle,
  DialogClose,
} from './.generated/src/native/registry-aria-overlay';
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);

test('object-valued native Select keeps the original item and renders its custom selected content', async () => {
  type Plan = { id: string; label: string };
  const plans: Plan[] = [
      { id: 'basic', label: 'Basic' },
      { id: 'pro', label: 'Pro' },
    ],
    change = jest.fn();
  await mount(
    <UI.Select
      defaultValue={plans[0]}
      items={plans.map((value) => ({ label: value.label, value }))}
      itemToStringValue={(plan: Plan) => plan.id}
      onValueChange={change}
    >
      <UI.SelectTrigger accessibilityLabel="Plan">
        <UI.SelectValue>
          {(plan: Plan) => (
            <View>
              <Text>{plan.label}</Text>
            </View>
          )}
        </UI.SelectValue>
      </UI.SelectTrigger>
      <UI.SelectContent>
        {plans.map((plan) => (
          <UI.SelectItem key={plan.id} value={plan}>
            {plan.label}
          </UI.SelectItem>
        ))}
      </UI.SelectContent>
    </UI.Select>,
  );
  expect(screen.getByText('Basic')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('combobox', { name: 'Plan' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Pro' }));
  expect(change.mock.calls[0]?.[0]).toBe(plans[1]);
  expect(screen.getByText('Pro')).toBeOnTheScreen();
  expect(screen.queryAllByRole('radio')).toHaveLength(0);
});
test('multiple native Select toggles original IDs and stays open until dismissal', async () => {
  const change = jest.fn();
  await mount(
    <UI.Select multiple defaultValue={['apple']} onValueChange={change}>
      <UI.SelectTrigger accessibilityLabel="Fruits">
        <UI.SelectValue>{(values: string[]) => values.join('|')}</UI.SelectValue>
      </UI.SelectTrigger>
      <UI.SelectContent testID="fruit-options">
        <UI.SelectItem value="apple">Apple</UI.SelectItem>
        <UI.SelectItem value="banana">Banana</UI.SelectItem>
        <UI.SelectItem value="disabled" disabled>
          Unavailable
        </UI.SelectItem>
      </UI.SelectContent>
    </UI.Select>,
  );
  await fireEvent.press(screen.getByRole('combobox', { name: 'Fruits' }));
  expect(screen.getByRole('checkbox', { name: 'Apple' }).props.accessibilityState.checked).toBe(
    true,
  );
  expect(screen.getByRole('checkbox', { name: 'Unavailable' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Banana' }));
  expect(change).toHaveBeenLastCalledWith(['apple', 'banana']);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Apple' }));
  expect(change).toHaveBeenLastCalledWith(['banana']);
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  await fireEvent(screen.getByTestId('fruit-options'), 'accessibilityEscape');
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
});
test('Aria trigger composition opens and closes its actual native popup', async () => {
  await mount(
    <AriaDialogTrigger>
      <UI.Button>Open dialog</UI.Button>
      <AriaDialog>
        <DialogTitle>Native dialog</DialogTitle>
        <DialogClose>Done</DialogClose>
      </AriaDialog>
    </AriaDialogTrigger>,
  );
  expect(screen.queryByText('Native dialog')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Open dialog' }));
  expect(screen.getByText('Native dialog')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.queryByText('Native dialog')).toBeNull();
});
test('native source sliders preserve scalar and range callback payloads', async () => {
  const scalar = jest.fn(),
    range = jest.fn();
  await mount(
    <>
      <RegistrySlider value={25} onValueChange={scalar} accessibilityLabel="Scalar" />
      <RegistrySlider value={[25, 50]} onValueChange={range} accessibilityLabel="Range" />
    </>,
  );
  await fireEvent(screen.getByRole('adjustable', { name: 'Scalar' }), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  expect(scalar).toHaveBeenLastCalledWith(26);
  await fireEvent(screen.getByRole('adjustable', { name: 'Range 1' }), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  expect(range).toHaveBeenLastCalledWith([26, 50]);
});
test('native numeric text enforces authored bounds and steps on blur and preserves disabled input', async () => {
  const change = jest.fn();
  await mount(
    <>
      <RegistryInput
        accessibilityLabel="Quantity"
        type="number"
        defaultValue={1}
        min="1"
        max="5"
        step="2"
        onChange={change}
      />
      <RegistryInput
        accessibilityLabel="Disabled quantity"
        type="number"
        defaultValue="3"
        min="1"
        disabled
      />
    </>,
  );
  const field = screen.getByLabelText('Quantity');
  expect(field.props.value).toBe('1');
  await fireEvent.changeText(field, '0');
  await fireEvent(field, 'blur', { isDefaultPrevented: () => false });
  expect(field.props.value).toBe('1');
  await fireEvent.changeText(field, '4');
  await fireEvent(field, 'blur', { isDefaultPrevented: () => false });
  expect(field.props.value).toBe('5');
  expect(change).toHaveBeenLastCalledWith('5');
  expect(screen.getByLabelText('Disabled quantity').props.editable).toBe(false);
});
test('native pagination activates sample hash links, reports boundaries and emits real page changes', async () => {
  const change = jest.fn();
  await mount(
    <UI.Pagination defaultPage={2} onPageChange={change}>
      <UI.PaginationContent>
        <UI.PaginationPrevious href="#" />
        {[1, 2, 3].map((page) => (
          <UI.PaginationLink key={page} href="#">
            {page}
          </UI.PaginationLink>
        ))}
        <UI.PaginationNext href="#" />
      </UI.PaginationContent>
    </UI.Pagination>,
  );
  await fireEvent.press(screen.getByRole('button', { name: '3' }));
  expect(change).toHaveBeenLastCalledWith(3);
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Previous page' }));
  expect(change).toHaveBeenLastCalledWith(2);
  expect(screen.getByRole('button', { name: '2' }).props.accessibilityState.selected).toBe(true);
});
test('native popup width follows the measured trigger rather than a browser custom property', async () => {
  const Content = withRegistryStyles(UI.DropdownMenuContent);
  await mount(
    <UI.DropdownMenu>
      <UI.DropdownMenuTrigger asChild>
        <UI.Button>Choices</UI.Button>
      </UI.DropdownMenuTrigger>
      <Content testID="measured-popup" className="w-(--radix-dropdown-menu-trigger-width)">
        <UI.DropdownMenuItem>One</UI.DropdownMenuItem>
      </Content>
    </UI.DropdownMenu>,
  );
  const trigger = screen.getByRole('button', { name: 'Choices' });
  await fireEvent(trigger, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 184, height: 44 } },
  });
  await fireEvent.press(trigger);
  expect(StyleSheet.flatten(screen.getByTestId('measured-popup').props.style).width).toBe(184);
});
test('native button typography and pointer feedback retain authored colors and hide decorative labels', async () => {
  const Styled = withRegistryStyles(UI.Button, 'button');
  let colors!: ReturnType<typeof UI.useTheme>['colors'];
  function Sample() {
    colors = UI.useTheme().colors;
    return (
      <Styled
        variant="destructive"
        className="text-xs hover:bg-accent hover:text-accent-foreground"
      >
        <Text accessibilityElementsHidden>Decoration</Text>Action
      </Styled>
    );
  }
  await mount(<Sample />);
  const button = screen.getByRole('button', { name: 'Action' });
  expect(StyleSheet.flatten(screen.getByText('Action').props.style).fontSize).toBe(12);
  await fireEvent(button, 'hoverIn', {});
  expect(StyleSheet.flatten(screen.getByText('Action').props.style).color).toBe(
    colors['accent-foreground'],
  );
  expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(colors.accent);
  await fireEvent(button, 'hoverOut', {});
  expect(StyleSheet.flatten(screen.getByText('Action').props.style).color).toBe(colors.destructive);
});

test('grayscale avatars wait for their filtered image and restore the fallback on native loading failure', async () => {
  await mount(
    <UI.Avatar>
      <UI.AvatarImage
        source={{ uri: 'https://example.invalid/portrait.png' }}
        grayscale
        testID="portrait"
        accessibilityLabel="Portrait"
      />
      <UI.AvatarFallback>AB</UI.AvatarFallback>
    </UI.Avatar>,
  );
  expect(screen.getByText('AB')).toBeOnTheScreen();
  const probe = screen.getByTestId('portrait', { includeHiddenElements: true });
  await fireEvent(probe, 'load', {
    nativeEvent: { source: { width: 32, height: 32, uri: 'https://example.invalid/portrait.png' } },
  });
  expect(screen.getByText('AB')).toBeOnTheScreen();
  await fireEvent(
    screen.getByTestId('portrait-svg-source', { includeHiddenElements: true }),
    'load',
    { nativeEvent: { source: { width: 32, height: 32 } } },
  );
  expect(screen.queryByText('AB')).toBeNull();
  expect(screen.getAllByTestId('portrait-grayscale')[0]!).toBeOnTheScreen();
  await fireEvent(probe, 'error', { nativeEvent: { error: 'Image unavailable' } });
  expect(screen.getByText('AB')).toBeOnTheScreen();
  expect(screen.queryAllByTestId('portrait-grayscale')).toHaveLength(0);
});

test('avatar source identity survives object recreation and ignores a previous image completion', async () => {
  const loaded = jest.fn();
  const frame = (uri: string) => (
    <UI.ThemeProvider>
      <UI.Avatar>
        <UI.AvatarImage source={{ uri }} testID="stable-photo" onLoad={loaded} />
        <UI.AvatarFallback>Fallback</UI.AvatarFallback>
      </UI.Avatar>
    </UI.ThemeProvider>
  );
  const view = await render(frame('https://example.invalid/first.png'));
  const original = screen.getByTestId('stable-photo', { includeHiddenElements: true }).props.onLoad;
  await fireEvent(screen.getByTestId('stable-photo', { includeHiddenElements: true }), 'load', {
    nativeEvent: { source: { width: 32, height: 32 } },
  });
  expect(screen.queryByText('Fallback')).toBeNull();
  await view.rerender(frame('https://example.invalid/first.png'));
  expect(screen.queryByText('Fallback')).toBeNull();
  await view.rerender(frame('https://example.invalid/second.png'));
  expect(screen.getByText('Fallback')).toBeOnTheScreen();
  await act(() => original({ nativeEvent: { source: { width: 32, height: 32 } } }));
  expect(screen.getByText('Fallback')).toBeOnTheScreen();
  expect(loaded).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByTestId('stable-photo', { includeHiddenElements: true }), 'load', {
    nativeEvent: { source: { width: 32, height: 32 } },
  });
  expect(screen.queryByText('Fallback')).toBeNull();
  expect(loaded).toHaveBeenCalledTimes(2);
});
