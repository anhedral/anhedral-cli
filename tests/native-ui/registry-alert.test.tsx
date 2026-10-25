import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  NativeComponentStyleProvider,
  NativeRegistryPalette,
} from './.generated/src/native/_registry-context';
import {
  RegistryLink,
  RegistryParagraph,
  RegistryView,
} from './.generated/src/native/registry-styles';
import { nativePresetAlertStyle } from './.generated/src/native/_preset-alert-style';
const Glyph = Object.assign((props: any) => <View {...props} />, { nativeRegistryIcon: true });
let errors: jest.SpyInstance;
beforeEach(() => {
  errors = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  const messages = errors.mock.calls.map((args) => args.join(' '));
  errors.mockRestore();
  expect(messages).toEqual([]);
});
const initial = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...initial, width: 390, fontScale: 1 } }));
afterEach(() => Dimensions.set({ window: initial }));
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
  '%s Alert preserves title/description block layout, source action placement and callbacks',
  async (style) => {
    const undo = jest.fn();
    await render(
      wrap(
        <UI.Alert testID="root">
          <Glyph testID="glyph" />
          <UI.AlertTitle testID="title">Saved</UI.AlertTitle>
          <UI.AlertDescription testID="description">Your changes were saved.</UI.AlertDescription>
          <UI.AlertAction testID="action">
            <UI.Button onPress={undo}>Undo</UI.Button>
          </UI.AlertAction>
        </UI.Alert>,
        style,
      ),
    );
    expect(screen.getByTestId('root').props.accessibilityRole).toBe('alert');
    expect(screen.getByTestId('title')).toHaveStyle({
      fontWeight: style === 'sera' ? '600' : '500',
    });
    expect(screen.getByTestId('action')).toHaveStyle({ position: 'absolute' });
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalledTimes(1);
    if (style === 'default' || style === 'new-york') {
      expect(screen.getByTestId('title')).toHaveStyle({ paddingLeft: 28, marginBottom: 4 });
      expect(screen.getByTestId('description')).toHaveStyle({ paddingLeft: 28 });
      expect(screen.getByTestId('title').props.style).not.toEqual(
        expect.objectContaining({ transform: [{ translateY: -3 }] }),
      );
    } else {
      const title = screen.getByTestId('title');
      expect(title.parent?.type).not.toBe('Text');
      expect(screen.getByTestId('root')).toHaveStyle({
        paddingRight: style === 'new-york-v4' ? 16 : 72,
      });
    }
    if (style === 'new-york-v4') expect(screen.getByTestId('title').props.numberOfLines).toBe(1);
  },
);
test('legacy direct SVG plus description retains the source div offset', async () => {
  await render(
    wrap(
      <UI.Alert>
        <Glyph />
        <UI.AlertDescription testID="description">Body</UI.AlertDescription>
      </UI.Alert>,
      'default',
    ),
  );
  expect(screen.getByTestId('description')).toHaveStyle({
    transform: [{ translateY: -3 }],
    paddingLeft: 28,
  });
});
test('description retains separate paragraphs, source paragraph spacing and scoped link underline', async () => {
  await render(
    wrap(
      <>
        <UI.Alert>
          <UI.AlertTitle>
            Saved{' '}
            <RegistryLink href="#" testID="title-link">
              details
            </RegistryLink>
          </UI.AlertTitle>
          <UI.AlertDescription>
            <RegistryParagraph testID="first">
              First paragraph{' '}
              <RegistryLink href="#" testID="link">
                read more
              </RegistryLink>
            </RegistryParagraph>
            <RegistryParagraph testID="last">Last paragraph</RegistryParagraph>
          </UI.AlertDescription>
        </UI.Alert>
        <RegistryParagraph testID="outside">Outside</RegistryParagraph>
        <RegistryLink href="#" testID="outside-link">
          Outside link
        </RegistryLink>
      </>,
    ),
  );
  expect(screen.getByTestId('first')).toHaveStyle({ marginBottom: 16 });
  expect(screen.getByTestId('last')).not.toHaveStyle({ marginBottom: 16 });
  expect(screen.getByTestId('outside')).not.toHaveStyle({ marginBottom: 16 });
  expect(screen.getByTestId('link')).toHaveStyle({ textDecorationLine: 'underline' });
  expect(screen.getByTestId('title-link')).toHaveStyle({ textDecorationLine: 'underline' });
  expect(screen.getByTestId('outside-link')).not.toHaveStyle({ textDecorationLine: 'underline' });
  await fireEvent(screen.getByTestId('link'), 'hoverIn', {});
  expect(screen.getByTestId('link')).toHaveStyle({
    color: StyleSheet.flatten(screen.getByTestId('title-link').props.style).color,
  });
  await fireEvent(screen.getByTestId('link'), 'hoverOut', {});
  expect(screen.getByTestId('link')).toHaveStyle({
    color: StyleSheet.flatten(screen.getByTestId('first').props.style).color,
  });
});
test('Alert preserves caller styles, description blocks and generic title aliases', async () => {
  await render(
    wrap(
      <>
        <UI.Alert style={{ padding: 23 }} testID="root">
          <UI.AlertTitle testID="title" style={{ fontSize: 19 }}>
            Title
          </UI.AlertTitle>
          <UI.AlertDescription testID="body" style={{ padding: 7, color: '#123456' }}>
            <RegistryParagraph testID="paragraph">Body</RegistryParagraph>
            <RegistryView testID="block" />
          </UI.AlertDescription>
        </UI.Alert>
        <UI.EmptyTitle testID="empty">Empty</UI.EmptyTitle>
        <UI.TypographyLarge testID="large">Large</UI.TypographyLarge>
      </>,
      'new-york-v4',
    ),
  );
  expect(screen.getByTestId('root')).toHaveStyle({ padding: 23 });
  expect(screen.getByTestId('title')).toHaveStyle({ fontSize: 19 });
  expect(screen.getByTestId('body')).toHaveStyle({ padding: 7 });
  expect(screen.getByTestId('paragraph')).toHaveStyle({ color: '#123456', lineHeight: 22.75 });
  expect(screen.getByTestId('empty').props.numberOfLines).toBeUndefined();
  expect(screen.getByTestId('large').props.numberOfLines).toBeUndefined();
});
test.each(['base', 'aria', 'radix', 'default', 'new-york', 'new-york-v4'])(
  'authored %s Alert source examples render all authored alerts and actions',
  async (family) => {
    const name = ['base', 'aria', 'radix'].includes(family) ? 'alert-example' : 'alert-demo';
    const Component = require(`./.generated/src/examples/${family}/${name}`).default;
    await render(
      <UI.ThemeProvider>
        <Component />
      </UI.ThemeProvider>,
    );
    const count = (nodes: any): number =>
      Array.isArray(nodes)
        ? nodes.reduce((sum, node) => sum + count(node), 0)
        : nodes && typeof nodes === 'object'
          ? Number(nodes.props?.accessibilityRole === 'alert') + count(nodes.children)
          : 0;
    expect(count(screen.toJSON())).toBe(
      family === 'radix'
        ? 14
        : ['base', 'aria'].includes(family)
          ? 13
          : family === 'new-york-v4'
            ? 3
            : 1,
    );
    if (name === 'alert-example') expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
  },
);
test.each(['default', 'destructive'] as const)(
  'Alert %s source foreground and description alpha reach native text',
  async (variant) => {
    let colors: Record<string, string> = {};
    const { useTheme } = require('./.generated/src/theme');
    const { withAlpha } = require('./.generated/src/native/_core');
    function Probe() {
      colors = useTheme().colors;
      return null;
    }
    await render(
      wrap(
        <>
          <Probe />
          <UI.Alert variant={variant}>
            <UI.AlertTitle testID="title">Title</UI.AlertTitle>
            <UI.AlertDescription>
              <RegistryParagraph testID="description">Description</RegistryParagraph>
            </UI.AlertDescription>
          </UI.Alert>
        </>,
      ),
    );
    expect(screen.getByTestId('title')).toHaveStyle({
      color: variant === 'destructive' ? colors.destructive : colors['card-foreground'],
    });
    expect(screen.getByTestId('description')).toHaveStyle({
      color:
        variant === 'destructive' ? withAlpha(colors.destructive, 0.9) : colors['muted-foreground'],
    });
  },
);
test('source list-inside keeps the marker in the first text line and leaves outside markers separate', async () => {
  const {
    RegistryUnorderedList,
    RegistryListItem,
  } = require('./.generated/src/native/registry-styles');
  await render(
    wrap(
      <>
        <RegistryUnorderedList className="list-inside list-disc">
          <RegistryListItem>First native item</RegistryListItem>
        </RegistryUnorderedList>
        <RegistryUnorderedList className="list-outside list-disc">
          <RegistryListItem>Second native item</RegistryListItem>
        </RegistryUnorderedList>
      </>,
    ),
  );
  expect(screen.getByText('• First native item')).toBeTruthy();
  expect(screen.getByText('Second native item')).toBeTruthy();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});
test('all twenty-one reviewed Alert class slots are consumed by the renderer', async () => {
  const presets = require('./.generated/src/native/_preset-alert-style');
  const { nativeAlertPresetSource: source } = require('./.generated/src/native/_alert-presets');
  const actual = presets.nativePresetAlertStyle,
    seen = new Set<string>();
  const spy = jest.spyOn(presets, 'nativePresetAlertStyle').mockImplementation((...args: any[]) => {
    const result = actual(...args);
    seen.add(
      result.source +
        '/' +
        (
          {
            root: 'Alert',
            title: 'AlertTitle',
            description: 'AlertDescription',
            action: 'AlertAction',
          } as any
        )[args[1]],
    );
    return result;
  });
  try {
    for (const family of Object.keys(source.sources)) {
      const legacy = family === 'default' || family === 'new-york';
      const view = await render(
        <UI.ThemeProvider>
          <NativeRegistryPalette source={family as any} generation={legacy ? 'legacy' : 'modern'}>
            <UI.Alert>
              <UI.AlertTitle>Title</UI.AlertTitle>
              <UI.AlertDescription>Body</UI.AlertDescription>
              {!legacy && family !== 'new-york-v4' && <UI.AlertAction>Action</UI.AlertAction>}
            </UI.Alert>
          </NativeRegistryPalette>
        </UI.ThemeProvider>,
      );
      await view.unmount();
    }
    for (const [family, definition] of Object.entries(source.sources) as any[])
      for (const slot of Object.keys(definition.slots))
        expect(seen.has(family + '/' + slot)).toBe(true);
    expect(seen.size).toBe(21);
  } finally {
    spy.mockRestore();
  }
});
test.each(['default', 'new-york', 'new-york-v4'])(
  'authored %s destructive Alert keeps source text and destructive description paint',
  async (family) => {
    const Component = require(`./.generated/src/examples/${family}/alert-destructive`).default;
    await render(
      <UI.ThemeProvider>
        <Component />
      </UI.ThemeProvider>,
    );
    const title = screen.getByText('Error'),
      body = screen.getByText('Your session has expired. Please log in again.');
    const titleColor = StyleSheet.flatten(title.props.style).color;
    const bodyColor = StyleSheet.flatten(body.props.style).color;
    if (family === 'new-york-v4') expect(bodyColor).not.toBe(titleColor);
    else expect(bodyColor).toBe(titleColor);
  },
);
test('Alert announcements retain paragraph/list boundaries and inline spacing while excluding hidden content and actions', async () => {
  const { AccessibilityInfo } = require('react-native');
  const {
    RegistryUnorderedList,
    RegistryListItem,
  } = require('./.generated/src/native/registry-styles');
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  try {
    await render(
      wrap(
        <UI.Alert>
          <UI.AlertTitle>
            Saved <RegistryLink href="#">details</RegistryLink>
          </UI.AlertTitle>
          <UI.AlertDescription>
            <RegistryParagraph>First paragraph.</RegistryParagraph>
            <RegistryParagraph>Second paragraph.</RegistryParagraph>
            <RegistryUnorderedList>
              <RegistryListItem>First item.</RegistryListItem>
              <RegistryListItem>Second item.</RegistryListItem>
            </RegistryUnorderedList>
            <RegistryParagraph accessibilityElementsHidden>Hidden.</RegistryParagraph>
          </UI.AlertDescription>
          <UI.AlertAction>
            <UI.Button>Undo</UI.Button>
          </UI.AlertAction>
        </UI.Alert>,
      ),
    );
    expect(announce).toHaveBeenLastCalledWith(
      'Saved details First paragraph. Second paragraph. First item. Second item.',
    );
  } finally {
    announce.mockRestore();
  }
});
test('Alert unitless source leading and tracking follow custom native font sizes while explicit metrics retain ownership', async () => {
  await render(
    wrap(
      <UI.Alert>
        <UI.AlertTitle style={{ fontSize: 19 }} testID="title">
          Title
        </UI.AlertTitle>
        <UI.AlertTitle style={{ fontSize: 19, lineHeight: 31, letterSpacing: 2 }} testID="explicit">
          Explicit
        </UI.AlertTitle>
      </UI.Alert>,
      'new-york-v4',
    ),
  );
  expect(screen.getByTestId('title')).toHaveStyle({ fontSize: 19 });
  expect(StyleSheet.flatten(screen.getByTestId('title').props.style).letterSpacing).toBeCloseTo(
    -0.475,
  );
  expect(screen.getByTestId('explicit')).toHaveStyle({ lineHeight: 31, letterSpacing: 2 });
  await screen.rerender(
    wrap(
      <UI.Alert>
        <UI.AlertTitle style={{ fontSize: 19 }} testID="title">
          Title
        </UI.AlertTitle>
        <UI.AlertDescription style={{ fontSize: 19 }}>
          <RegistryParagraph testID="body">Body</RegistryParagraph>
        </UI.AlertDescription>
      </UI.Alert>,
      'default',
    ),
  );
  expect(screen.getByTestId('title')).toHaveStyle({
    fontSize: 19,
    lineHeight: 19,
  });
  expect(StyleSheet.flatten(screen.getByTestId('title').props.style).letterSpacing).toBeCloseTo(
    -0.475,
  );
  await screen.rerender(
    wrap(
      <UI.Alert textStyle={{ fontSize: 19 }}>
        <UI.AlertTitle testID="title">Title</UI.AlertTitle>
        <UI.AlertDescription style={{ fontSize: 19 }}>
          <RegistryParagraph testID="body">Body</RegistryParagraph>
        </UI.AlertDescription>
      </UI.Alert>,
      'mira',
    ),
  );
  expect(screen.getByTestId('title')).toHaveStyle({ fontSize: 19, lineHeight: 30.875 });
  expect(screen.getByTestId('body')).toHaveStyle({ fontSize: 19, lineHeight: 30.875 });
});
