import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);
test.each([
  ['default', 32],
  ['sm', 24],
  ['lg', 40],
] as const)('avatar size %s renders its upstream dimensions', async (size, extent) => {
  await mount(
    <UI.Avatar size={size} testID="avatar">
      <UI.AvatarFallback>AB</UI.AvatarFallback>
    </UI.Avatar>,
  );
  expect(screen.getByTestId('avatar')).toHaveStyle({
    width: extent,
    height: extent,
    borderRadius: extent / 2,
  });
});
test.each([
  ['default', 16],
  ['sm', 12],
] as const)('card size %s propagates spacing to all compound sections', async (size, padding) => {
  await mount(
    <UI.Card size={size} testID="card">
      <UI.CardHeader testID="header">
        <UI.CardTitle>Title</UI.CardTitle>
      </UI.CardHeader>
      <UI.CardContent testID="content">Content</UI.CardContent>
      <UI.CardFooter testID="footer">Footer</UI.CardFooter>
    </UI.Card>,
  );
  expect(screen.getByTestId('card')).toHaveStyle({
    paddingTop: padding,
    paddingBottom: 0,
    gap: padding,
  });
  for (const id of ['header', 'content', 'footer']) {
    const section = StyleSheet.flatten(screen.getByTestId(id).props.style);
    expect(section.paddingLeft ?? section.paddingHorizontal ?? section.padding).toBe(padding);
    expect(section.paddingRight ?? section.paddingHorizontal ?? section.padding).toBe(padding);
  }
});
test.each(['default', 'icon'] as const)(
  'empty media variant %s preserves media presentation',
  async (variant) => {
    await mount(
      <UI.EmptyMedia variant={variant} testID="media">
        No items
      </UI.EmptyMedia>,
    );
    if (variant === 'icon')
      expect(screen.getByTestId('media')).toHaveStyle({ width: 32, height: 32, borderRadius: 8 });
    else expect(screen.getByTestId('media')).not.toHaveStyle({ width: 40 });
  },
);
test.each(['default', 'outline', 'muted'] as const)(
  'item variant %s has explicit surface and border semantics',
  async (variant) => {
    await mount(
      <UI.Item variant={variant} testID="item">
        <UI.ItemContent>
          <UI.ItemTitle>Item</UI.ItemTitle>
        </UI.ItemContent>
      </UI.Item>,
    );
    expect(screen.getByTestId('item')).toHaveStyle({
      borderWidth: 1,
      borderColor: variant === 'outline' ? 'hsl(0, 0%, 89.8%)' : 'transparent',
      backgroundColor: variant === 'muted' ? 'rgba(245, 245, 245, 0.5)' : 'transparent',
    });
  },
);
test.each(['default', 'sm', 'xs'] as const)(
  'item size %s applies spacing independently of media variant',
  async (size) => {
    await mount(
      <UI.Item size={size} testID="item">
        <UI.ItemMedia variant="image" testID="image">
          Image
        </UI.ItemMedia>
        <UI.ItemMedia variant="icon" testID="icon">
          Icon
        </UI.ItemMedia>
        <UI.ItemMedia testID="default">Content</UI.ItemMedia>
      </UI.Item>,
    );
    expect(screen.getByTestId('item')).toHaveStyle({
      paddingHorizontal: size === 'xs' ? 10 : 12,
      paddingVertical: size === 'xs' ? 8 : 10,
    });
    expect(screen.getByTestId('image')).toHaveStyle({
      overflow: 'hidden',
      width: size === 'xs' ? 24 : size === 'sm' ? 32 : 40,
    });
    expect(screen.getByTestId('icon')).toHaveStyle({ width: 16, height: 16 });
    expect(screen.getByTestId('default')).not.toHaveStyle({ width: 40 });
  },
);
test.each(['default', 'border', 'separator'] as const)(
  'marker variant %s has the documented structural edges',
  async (variant) => {
    await mount(
      <UI.Marker variant={variant} testID="marker">
        <UI.MarkerContent>Today</UI.MarkerContent>
      </UI.Marker>,
    );
    if (variant === 'border')
      expect(screen.getByTestId('marker')).toHaveStyle({ borderBottomWidth: 1 });
    if (variant === 'separator') {
      expect(screen.getByTestId('marker-before')).toHaveStyle({ height: 1, flex: 1 });
      expect(screen.getByTestId('marker-after')).toHaveStyle({ height: 1, flex: 1 });
    }
  },
);
test('responsive field orientation follows its own container, and legend variants preserve hierarchy', async () => {
  await mount(
    <UI.Field orientation="responsive" testID="field">
      <UI.FieldLegend variant="label" testID="label">
        Label
      </UI.FieldLegend>
      <UI.FieldLegend testID="legend">Legend</UI.FieldLegend>
    </UI.Field>,
  );
  await fireEvent(screen.getByTestId('field'), 'layout', {
    nativeEvent: { layout: { width: 320, height: 100, x: 0, y: 0 } },
  });
  expect(screen.getByTestId('field')).toHaveStyle({ flexDirection: 'column' });
  await fireEvent(screen.getByTestId('field'), 'layout', {
    nativeEvent: { layout: { width: 900, height: 100, x: 0, y: 0 } },
  });
  expect(screen.getByTestId('field')).toHaveStyle({ flexDirection: 'row' });
  expect(screen.getByTestId('label')).toHaveStyle({ fontSize: 14 });
  expect(screen.getByTestId('legend')).toHaveStyle({ fontSize: 16 });
});
test.each(['default', 'line'] as const)(
  'tabs list variant %s preserves controlled activation and selected styling',
  async (variant) => {
    const change = jest.fn();
    await mount(
      <UI.Tabs defaultValue="one" onValueChange={change}>
        <UI.TabsList variant={variant}>
          <UI.TabsTrigger value="one">One</UI.TabsTrigger>
          <UI.TabsTrigger value="two">Two</UI.TabsTrigger>
        </UI.TabsList>
        <UI.TabsContent value="one">First content</UI.TabsContent>
        <UI.TabsContent value="two">Second content</UI.TabsContent>
      </UI.Tabs>,
    );
    await fireEvent.press(screen.getByRole('tab', { name: 'Two' }));
    expect(change).toHaveBeenCalledWith('two');
    expect(screen.getByText('Second content')).toBeOnTheScreen();
    if (variant === 'line')
      expect(screen.getByRole('tab', { name: 'Two' })).toHaveStyle({
        borderBottomWidth: 2,
        borderBottomColor: 'hsl(0, 0%, 9%)',
      });
  },
);
test('vertical outlined toggle groups propagate size/variant while keeping selection independent', async () => {
  await mount(
    <UI.ToggleGroup
      type="multiple"
      orientation="vertical"
      variant="outline"
      size="sm"
      testID="group"
    >
      <UI.ToggleGroupItem value="a">A</UI.ToggleGroupItem>
      <UI.ToggleGroupItem value="b">B</UI.ToggleGroupItem>
    </UI.ToggleGroup>,
  );
  expect(screen.getByTestId('group')).toHaveStyle({ flexDirection: 'column' });
  expect(screen.getByRole('button', { name: 'A' })).toHaveStyle({
    borderColor: 'hsl(0, 0%, 89.8%)',
  });
  await fireEvent.press(screen.getByRole('button', { name: 'A' }));
  expect(screen.getByRole('button', { name: 'A' })).toBeSelected();
  expect(screen.getByRole('button', { name: 'B' })).not.toBeSelected();
});
test.each(['default', 'sm'] as const)(
  'native switch size %s keeps native checked semantics and a usable hit area',
  async (size) => {
    const change = jest.fn();
    await mount(<UI.Switch size={size} accessibilityLabel="Enabled" onCheckedChange={change} />);
    const control = screen.getByRole('switch', { name: 'Enabled' });
    expect(control.props.hitSlop).toBe(size === 'sm' ? 12 : 8);
    await fireEvent(control, 'valueChange', true);
    expect(change).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch')).toBeChecked();
  },
);

test.each(['default', 'sm'] as const)(
  'native compound select size %s supports disabled optgroups and native selection',
  async (size) => {
    const change = jest.fn();
    await mount(
      <UI.NativeSelect size={size} accessibilityLabel="Choice" onValueChange={change}>
        <UI.NativeSelectOptGroup label="Unavailable" disabled>
          <UI.NativeSelectOption value="one">One</UI.NativeSelectOption>
        </UI.NativeSelectOptGroup>
        <UI.NativeSelectOptGroup label="Available">
          <UI.NativeSelectOption value="initial">Initial</UI.NativeSelectOption>
          <UI.NativeSelectOption value="two">Two</UI.NativeSelectOption>
        </UI.NativeSelectOptGroup>
      </UI.NativeSelect>,
    );
    await fireEvent.press(screen.getByRole('combobox', { name: 'Choice' }));
    expect(screen.getByRole('radio', { name: 'One' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: 'Two' }));
    expect(change).toHaveBeenCalledWith('two');
    expect(screen.queryByRole('radio', { name: 'Two' })).toBeNull();
  },
);
test.each([
  ['default', 384],
  ['sm', 320],
] as const)(
  'alert dialog size %s constrains the native surface without enabling backdrop dismissal',
  async (size, width) => {
    await mount(
      <UI.AlertDialog defaultOpen>
        <UI.AlertDialogContent size={size} testID="decision">
          <UI.AlertDialogTitle>Delete?</UI.AlertDialogTitle>
          <UI.AlertDialogCancel>Cancel</UI.AlertDialogCancel>
        </UI.AlertDialogContent>
      </UI.AlertDialog>,
    );
    expect(screen.getByTestId('decision')).toHaveStyle({ maxWidth: width, alignSelf: 'center' });
    expect(screen.queryByRole('button', { name: 'Dismiss overlay' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Delete?')).toBeNull();
  },
);
test.each(['horizontal', 'vertical'] as const)(
  'attachment %s layout carries every size and media variant',
  async (orientation) => {
    await mount(
      <>
        {(['default', 'sm', 'xs'] as const).map((size) => (
          <UI.Attachment key={size} orientation={orientation} size={size} testID={size}>
            <UI.AttachmentMedia variant="icon" testID={size + '-icon'}>
              Icon
            </UI.AttachmentMedia>
            <UI.AttachmentMedia variant="image" testID={size + '-image'}>
              Image
            </UI.AttachmentMedia>
          </UI.Attachment>
        ))}
      </>,
    );
    for (const size of ['default', 'sm', 'xs']) {
      expect(screen.getByTestId(size)).toHaveStyle({
        flexDirection: orientation === 'horizontal' ? 'row' : 'column',
      });
      expect(screen.getByTestId(size + '-image')).toHaveStyle({ backgroundColor: 'transparent' });
      expect(screen.getByTestId(size + '-icon')).toHaveStyle({
        width: size === 'default' ? 44 : size === 'sm' ? 32 : 24,
      });
    }
  },
);

test('destructive alerts announce their content and carry the destructive tone through both text parts', async () => {
  const { AccessibilityInfo } = await import('react-native');
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  try {
    await mount(
      <UI.Alert variant="destructive">
        <UI.AlertTitle>Unable to save</UI.AlertTitle>
        <UI.AlertDescription>Try again</UI.AlertDescription>
      </UI.Alert>,
    );
    expect(announce).toHaveBeenCalledWith('Unable to save Try again');
    expect(screen.getByText('Unable to save')).toHaveStyle({ color: 'hsl(0, 84.2%, 60.2%)' });
    expect(screen.getByText('Try again')).toHaveStyle({ color: 'rgba(239, 68, 68, 0.9)' });
  } finally {
    announce.mockRestore();
  }
});
test('nested native text inherits its button foreground and badges preserve link/action behavior', async () => {
  const press = jest.fn();
  await mount(
    <>
      <UI.Button>
        <UI.Text>Nested label</UI.Text>
      </UI.Button>
      <UI.Badge variant="link" onPress={press}>
        View item
      </UI.Badge>
    </>,
  );
  expect(screen.getByText('Nested label')).toHaveStyle({ color: 'hsl(0, 0%, 98%)' });
  await fireEvent.press(screen.getByRole('link', { name: 'View item' }));
  expect(press).toHaveBeenCalledTimes(1);
});
