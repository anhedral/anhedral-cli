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

test('table headers support direct Aria columns and authored widths without forcing a 120 point minimum', async () => {
  await mount(
    <UI.Table>
      <UI.TableHeader testID="headers">
        <UI.TableHead testID="invoice" style={{ width: 100 }}>
          Invoice
        </UI.TableHead>
        <UI.TableHead>Status</UI.TableHead>
      </UI.TableHeader>
      <UI.TableBody>
        <UI.TableRow>
          <UI.TableCell testID="cell" style={{ width: 100 }}>
            <Text>INV001</Text>
          </UI.TableCell>
        </UI.TableRow>
      </UI.TableBody>
    </UI.Table>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('headers').props.style).flexDirection).toBe('row');
  expect(StyleSheet.flatten(screen.getByTestId('invoice').props.style)).toMatchObject({
    width: 100,
    minWidth: 0,
  });
  expect(StyleSheet.flatten(screen.getByTestId('cell').props.style)).toMatchObject({
    width: 100,
    minWidth: 0,
  });
  await screen.rerender(
    <UI.ThemeProvider>
      <UI.TableHeader testID="headers">
        <UI.TableRow>
          <UI.TableHead>Wrapped</UI.TableHead>
        </UI.TableRow>
      </UI.TableHeader>
    </UI.ThemeProvider>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('headers').props.style)?.flexDirection).not.toBe(
    'row',
  );
});
test('radio group validation reaches every choice and explicit item state can override it', async () => {
  await mount(
    <UI.RadioGroup invalid defaultValue="a">
      <UI.RadioGroupItem value="a">Alpha</UI.RadioGroupItem>
      <UI.RadioGroupItem value="b" invalid={false}>
        Beta
      </UI.RadioGroupItem>
    </UI.RadioGroup>,
  );
  const alpha = StyleSheet.flatten(screen.getByRole('radio', { name: 'Alpha' }).props.style);
  const beta = StyleSheet.flatten(screen.getByRole('radio', { name: 'Beta' }).props.style);
  expect(alpha.borderColor).not.toBe(beta.borderColor);
  await fireEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(screen.getByRole('radio', { name: 'Beta' }).props.accessibilityState.checked).toBe(true);
});

test('native recipes distinguish current Tailwind utilities from the published legacy palette', async () => {
  const { RegistryView } = require('./.generated/src/native/registry-styles');
  const { NativeRegistryPalette } = require('./.generated/src/native/_registry-context');
  const { styling } = require('@workspace/styling');
  const frame = (generation: 'legacy' | 'modern') => (
    <UI.ThemeProvider>
      <NativeRegistryPalette generation={generation}>
        <RegistryView testID="color" className="bg-red-500" />
      </NativeRegistryPalette>
    </UI.ThemeProvider>
  );
  await render(frame('modern'));
  expect(StyleSheet.flatten(screen.getByTestId('color').props.style).backgroundColor).toBe(
    styling.utilityColors['red-500'],
  );
  await screen.rerender(frame('legacy'));
  expect(StyleSheet.flatten(screen.getByTestId('color').props.style).backgroundColor).toBe(
    '#ef4444',
  );
});

test('button fragments retain native text labels and source callbacks', async () => {
  await mount(
    <UI.Button>
      <>+ Set status</>
    </UI.Button>,
  );
  expect(screen.getByRole('button', { name: '+ Set status' })).toHaveTextContent('+ Set status');
});
test('recipe-local radius and typography preserve heading semantics and selected toggle styling', async () => {
  const { RegistryView, RegistryH1 } = require('./.generated/src/native/registry-styles');
  const StyledToggle = withRegistryStyles(UI.Toggle, 'button');
  const Radius = () => {
    const { radius } = UI.useTheme();
    return <Text testID="radius">{radius}</Text>;
  };
  await mount(
    <RegistryView className="[--radius:1.2rem]">
      <RegistryH1 className="text-4xl font-extrabold">The King</RegistryH1>
      <Radius />
      <StyledToggle accessibilityLabel="Bold" className="data-[state=on]:bg-red-500">
        B
      </StyledToggle>
    </RegistryView>,
  );
  expect(screen.getByTestId('radius')).toHaveTextContent('19.2');
  expect(screen.getByRole('header', { name: 'The King' })).toBeOnTheScreen();
  const before = StyleSheet.flatten(
    screen.getByRole('button', { name: 'Bold' }).props.style,
  ).backgroundColor;
  await fireEvent.press(screen.getByRole('button', { name: 'Bold' }));
  expect(screen.getByRole('button', { name: 'Bold' }).props.accessibilityState.selected).toBe(true);
  expect(
    StyleSheet.flatten(screen.getByRole('button', { name: 'Bold' }).props.style).backgroundColor,
  ).not.toBe(before);
  expect(before).toBe('transparent');
});

test('percentage resizable panels retain named layout callbacks and neighboring constraints', async () => {
  const change = jest.fn();
  await mount(
    <UI.ResizablePanelGroup orientation="vertical" onLayoutChange={change}>
      <UI.ResizablePanel nativeID="left" defaultSize="30%" minSize="20%" maxSize="40%">
        Left
      </UI.ResizablePanel>
      <UI.ResizableHandle />
      <UI.ResizablePanel nativeID="right" defaultSize="70%" minSize="30%">
        Right
      </UI.ResizablePanel>
    </UI.ResizablePanelGroup>,
  );
  expect(change).toHaveBeenLastCalledWith({ left: 30, right: 70 });
  for (let index = 0; index < 4; index++)
    await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
  expect(change).toHaveBeenLastCalledWith({ left: 40, right: 60 });
  expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ now: 40 });
});
test('the authored resizable example updates its displayed controlled percentages', async () => {
  const Component = require('./.generated/src/examples/base/resizable-example').default;
  await mount(<Component />);
  const handles = screen.getAllByRole('adjustable');
  await fireEvent(handles[handles.length - 1]!, 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  expect(screen.getByText('35%')).toBeOnTheScreen();
  expect(screen.getByText('65%')).toBeOnTheScreen();
});

test('fractional carousel cards compute real snap positions and preserve source API subscriptions', async () => {
  let api: import('./.generated/src/native/carousel').NativeCarouselApi | undefined;
  const StyledItem = withRegistryStyles(UI.CarouselItem);
  await mount(
    <UI.Carousel
      setApi={(value) => {
        api = value;
      }}
    >
      <UI.CarouselContent testID="viewport">
        {[1, 2, 3, 4, 5].map((value) => (
          <StyledItem key={value} className="basis-1/2">
            <Text>{value}</Text>
          </StyledItem>
        ))}
      </UI.CarouselContent>
      <UI.CarouselNext />
      <UI.CarouselPrevious />
    </UI.Carousel>,
  );
  await fireEvent(screen.getByTestId('viewport'), 'layout', {
    nativeEvent: { layout: { width: 300, height: 200, x: 0, y: 0 } },
  });
  expect(screen.getByTestId('viewport').props.snapToOffsets).toEqual([0, 150, 300, 450]);
  expect(api?.scrollSnapList()).toEqual([0, 1 / 3, 2 / 3, 1]);
  const select = jest.fn(),
    reInit = jest.fn();
  api!.on('select', select).on('reInit', reInit);
  for (let index = 0; index < 3; index++)
    await fireEvent.press(screen.getByRole('button', { name: 'Next slide' }));
  expect(api!.selectedScrollSnap()).toBe(3);
  expect(api!.canScrollNext()).toBe(false);
  expect(select).toHaveBeenCalledTimes(3);
  expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled();
  api!.off('select', select);
  await act(() => api!.scrollPrev());
  expect(select).toHaveBeenCalledTimes(3);
  expect(api!.selectedScrollSnap()).toBe(2);
  await fireEvent(screen.getByTestId('viewport'), 'layout', {
    nativeEvent: { layout: { width: 600, height: 200, x: 0, y: 0 } },
  });
  expect(reInit).toHaveBeenCalled();
  expect(screen.getByTestId('viewport').props.snapToOffsets).toEqual([0, 300, 600, 900]);
});
test('the authored carousel API example exposes one inline counter and tracks native selection', async () => {
  const Component = require('./.generated/src/examples/new-york-v4/carousel-api').default;
  await mount(<Component />);
  expect(screen.getByText('Slide 1 of 5')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Next slide' }));
  expect(screen.getByText('Slide 2 of 5')).toBeOnTheScreen();
});
test('carousel default selection survives the initial empty collection commit', async () => {
  await mount(
    <UI.Carousel defaultIndex={1}>
      <UI.CarouselContent>
        <UI.CarouselItem>First</UI.CarouselItem>
        <UI.CarouselItem>Second</UI.CarouselItem>
      </UI.CarouselContent>
      <UI.CarouselNext />
      <UI.CarouselPrevious />
    </UI.Carousel>,
  );
  expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Previous slide' })).not.toBeDisabled();
});
