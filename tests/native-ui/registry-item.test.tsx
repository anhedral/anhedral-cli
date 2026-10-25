import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  NativeRegistryPalette,
  NativeComponentStyleProvider,
} from './.generated/src/native/_registry-context';
import {
  NativePhysicalPortalBoundary,
  NativeOverlayContentSlot,
} from './.generated/src/native/_physical-scope';
const styles = [
  'nova',
  'vega',
  'maia',
  'lyra',
  'mira',
  'luma',
  'sera',
  'rhea',
  'default',
  'new-york',
  'new-york-v4',
] as const;
function wrap(children: React.ReactNode, style: (typeof styles)[number] = 'nova') {
  return (
    <UI.ThemeProvider>
      <NativeComponentStyleProvider style={style}>
        <NativeRegistryPalette
          generation={style === 'default' || style === 'new-york' ? 'legacy' : 'modern'}
          source={
            style === 'default' || style === 'new-york' || style === 'new-york-v4' ? style : 'base'
          }
        >
          {children}
        </NativeRegistryPalette>
      </NativeComponentStyleProvider>
    </UI.ThemeProvider>
  );
}
test.each(styles)(
  '%s Item source slots retain media, grouped typography, actions and adjacent content',
  async (style) => {
    const action = jest.fn();
    await render(
      wrap(
        <UI.ItemGroup testID="group">
          <UI.Item size="sm" variant="outline" testID="item">
            <UI.ItemHeader>Header</UI.ItemHeader>
            <UI.ItemMedia variant="image" testID="media" />
            <UI.ItemContent testID="first">
              <UI.ItemTitle testID="title">A title</UI.ItemTitle>
              <UI.ItemDescription>Some detail</UI.ItemDescription>
            </UI.ItemContent>
            <UI.ItemContent testID="second">Metadata</UI.ItemContent>
            <UI.ItemActions>
              <UI.Button onPress={action}>Open</UI.Button>
            </UI.ItemActions>
            <UI.ItemFooter>Footer</UI.ItemFooter>
          </UI.Item>
          <UI.ItemSeparator testID="separator" />
        </UI.ItemGroup>,
        style,
      ),
    );
    expect(screen.getByTestId('group').props.role).toBe('list');
    expect(screen.getByTestId('media')).toHaveStyle({
      width: ['default', 'new-york', 'new-york-v4'].includes(style) ? 40 : 32,
      alignSelf: 'flex-start',
      transform: [{ translateY: 2 }],
    });
    expect(screen.getByTestId('first')).toHaveStyle({ flexGrow: 1 });
    expect(screen.getByTestId('second')).toHaveStyle({
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto',
    });
    expect(screen.getByText('A title').props.numberOfLines).toBe(
      ['default', 'new-york', 'new-york-v4'].includes(style) ? undefined : 1,
    );
    expect(screen.getByText('Some detail').props.numberOfLines).toBe(2);
    await fireEvent.press(screen.getByRole('button', { name: 'Open' }));
    expect(action).toHaveBeenCalledTimes(1);
  },
);
test('Item reacts to description and size changes, with physical portal isolation', async () => {
  const tree = (description: boolean, size: 'default' | 'sm' | 'xs') =>
    wrap(
      <UI.ItemGroup testID="group">
        <UI.Item size={size}>
          <UI.ItemMedia testID="media" />
          {description && <UI.ItemDescription>Details</UI.ItemDescription>}
          <NativePhysicalPortalBoundary>
            <UI.ItemDescription>Portal detail</UI.ItemDescription>
            <UI.Item size="xs" />
          </NativePhysicalPortalBoundary>
        </UI.Item>
      </UI.ItemGroup>,
    );
  const view = await render(tree(false, 'default'));
  expect(screen.getByTestId('group')).toHaveStyle({ gap: 16 });
  expect(screen.getByTestId('media').props.style).not.toEqual(
    expect.objectContaining({ alignSelf: 'flex-start' }),
  );
  await view.rerender(tree(true, 'sm'));
  expect(screen.getByTestId('group')).toHaveStyle({ gap: 10 });
  expect(screen.getByTestId('media')).toHaveStyle({ alignSelf: 'flex-start' });
  await view.rerender(tree(false, 'xs'));
  expect(screen.getByTestId('group')).toHaveStyle({ gap: 8 });
  expect(screen.getByTestId('media')).not.toHaveStyle({ alignSelf: 'flex-start' });
});
test('Item adjacent content resets across intervening physical children and respects caller padding', async () => {
  await render(
    wrap(
      <UI.Item style={{ padding: 3 }} testID="item">
        <UI.ItemContent />
        <View />
        <UI.ItemContent testID="separated" />
      </UI.Item>,
    ),
  );
  expect(screen.getByTestId('separated')).toHaveStyle({ flexGrow: 1 });
  expect(screen.getByTestId('item')).toHaveStyle({ padding: 3 });
  expect(screen.getByTestId('item')).not.toHaveStyle({ paddingLeft: 12 });
});
test('Item source menu padding applies only to the actual dropdown content slot', async () => {
  await render(
    wrap(
      <>
        <NativeOverlayContentSlot.Provider value="dropdown-menu-content">
          <UI.Item size="xs" testID="menu" />
        </NativeOverlayContentSlot.Provider>
        <NativeOverlayContentSlot.Provider value="context-menu-content">
          <UI.Item size="xs" testID="context" />
        </NativeOverlayContentSlot.Provider>
      </>,
    ),
  );
  expect(screen.getByTestId('menu')).toHaveStyle({ paddingTop: 0, paddingLeft: 0 });
  expect(screen.getByTestId('context')).not.toHaveStyle({ paddingTop: 0 });
});
test('Item supports source render state, a native action and child-first cancellation', async () => {
  const parent = jest.fn(),
    child = jest.fn((event) => event.preventDefault()),
    renderSlot = jest.fn((_props, state) => <UI.Button testID="render">{state.variant}</UI.Button>);
  await render(
    wrap(
      <>
        <UI.Item variant="muted" render={renderSlot} onPress={parent} />
        <UI.Item asChild onPress={parent}>
          <UI.Button onPress={child}>Cancel</UI.Button>
        </UI.Item>
      </>,
    ),
  );
  expect(renderSlot).toHaveBeenCalledWith(expect.anything(), {
    slot: 'item',
    variant: 'muted',
    size: 'default',
  });
  await fireEvent.press(screen.getByTestId('render'));
  expect(parent).toHaveBeenCalledTimes(1);
  const event = {
    preventDefault: jest.fn(function (this: any) {
      this.defaultPrevented = true;
    }),
    isDefaultPrevented() {
      return !!(this as any).defaultPrevented;
    },
  };
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }), event);
  expect(child).toHaveBeenCalledTimes(1);
  expect(parent).toHaveBeenCalledTimes(1);
});
test('Item image descendants fill and crop the physical media box while explicit native styles retain ownership', async () => {
  const { withRegistryStyles } = require('./.generated/src/native/registry-styles');
  const { NativeRegistryImage } = require('./.generated/src/native/registry-image');
  const Image = withRegistryStyles(NativeRegistryImage, 'view');
  await render(
    wrap(
      <UI.Item>
        <UI.ItemMedia variant="image">
          <Image
            testID="image"
            src="https://example.com/image.png"
            alt="Cover"
            width={80}
            height={40}
          />
          <Image
            testID="custom"
            src="https://example.com/custom.png"
            alt="Contain"
            objectFit="contain"
            style={{ width: 16, height: 12 }}
          />
        </UI.ItemMedia>
      </UI.Item>,
    ),
  );
  expect(screen.getByTestId('image')).toHaveStyle({ width: '100%', height: '100%' });
  expect(screen.getByTestId('image-bitmap', { includeHiddenElements: true }).props.resizeMode).toBe(
    'cover',
  );
  expect(screen.getByTestId('custom')).toHaveStyle({ width: 16, height: 12 });
  expect(
    screen.getByTestId('custom-bitmap', { includeHiddenElements: true }).props.resizeMode,
  ).toBe('contain');
});
test.each(['base', 'aria', 'radix'] as const)(
  '%s ItemGroup has-size gaps follow actual source Button and Avatar attributes',
  async (source) => {
    await render(
      <UI.ThemeProvider>
        <NativeRegistryPalette generation="modern" source={source}>
          <NativeComponentStyleProvider style="nova">
            <UI.ItemGroup testID="buttons">
              <UI.Button size="sm">Small button</UI.Button>
            </UI.ItemGroup>
            <UI.ItemGroup testID="avatars">
              <UI.Avatar size="sm">
                <UI.AvatarFallback>SM</UI.AvatarFallback>
              </UI.Avatar>
            </UI.ItemGroup>
          </NativeComponentStyleProvider>
        </NativeRegistryPalette>
      </UI.ThemeProvider>,
    );
    expect(screen.getByTestId('buttons')).toHaveStyle({ gap: source === 'base' ? 16 : 10 });
    expect(screen.getByTestId('avatars')).toHaveStyle({ gap: 10 });
  },
);
test('Base Item render callbacks receive native source styles, retain their own transformed body and keep static hosts concrete', async () => {
  const callback = jest.fn((props: any, state: any) => (
    <View {...props} testID="native-render" style={[props.style, { padding: 3 }]}>
      <UI.ItemTitle>{state.variant + ' custom'}</UI.ItemTitle>
    </View>
  ));
  await render(
    wrap(
      <UI.Item render={callback} variant="outline">
        <UI.ItemTitle>Original body</UI.ItemTitle>
      </UI.Item>,
    ),
  );
  expect(typeof callback.mock.calls[0]![0].style).not.toBe('function');
  expect(screen.getByTestId('native-render')).toHaveStyle({ padding: 3, borderWidth: 1 });
  expect(typeof screen.getByTestId('native-render').props.style).not.toBe('function');
  expect(
    StyleSheet.flatten(screen.getByTestId('native-render').props.style).paddingLeft,
  ).toBeUndefined();
  expect(screen.getByText('outline custom')).toBeTruthy();
  expect(screen.queryByText('Original body')).toBeNull();
});
test('Item native View render hosts with long-press actions become real pressables without duplicating callbacks', async () => {
  const action = jest.fn(),
    callback = jest.fn((props: any) => (
      <View {...props} testID="native-long">
        <UI.ItemTitle>Hold</UI.ItemTitle>
      </View>
    ));
  await render(wrap(<UI.Item onLongPress={action} render={callback} />));
  await fireEvent(screen.getByTestId('native-long'), 'longPress');
  expect(action).toHaveBeenCalledTimes(1);
});
