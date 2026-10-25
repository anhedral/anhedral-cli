import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  NativeRegistryPalette,
  NativeComponentStyleProvider,
} from './.generated/src/native/_registry-context';
import {
  withRegistryStyles,
  RegistryLink,
  RegistryParagraph,
  RegistryView,
} from './.generated/src/native/registry-styles';
import { IconPlaceholder } from './.generated/src/native/registry-example';
const Glyph = withRegistryStyles(IconPlaceholder, 'icon');
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
const initial = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...initial, width: 390, fontScale: 1 } }));
afterEach(() => Dimensions.set({ window: initial }));
test.each(styles)('%s Empty retains all source slot geometry and native actions', async (style) => {
  const action = jest.fn();
  await render(
    wrap(
      <UI.Empty testID="root">
        <UI.EmptyHeader testID="header">
          <UI.EmptyMedia variant="icon" testID="media">
            <Glyph lucide="FolderIcon" testID="glyph" />
          </UI.EmptyMedia>
          <UI.EmptyTitle testID="title">No projects yet</UI.EmptyTitle>
          <UI.EmptyDescription testID="description">
            Create a project to get started.
          </UI.EmptyDescription>
        </UI.EmptyHeader>
        <UI.EmptyContent testID="content">
          <UI.Button onPress={action}>Create project</UI.Button>
        </UI.EmptyContent>
      </UI.Empty>,
      style,
    ),
  );
  expect(screen.getByTestId('root')).toHaveStyle({
    alignItems: 'center',
    padding: ['nova', 'lyra', 'mira', 'default', 'new-york', 'new-york-v4'].includes(style)
      ? 24
      : 48,
  });
  expect(screen.getByTestId('header')).toHaveStyle({ gap: style === 'mira' ? 4 : 8 });
  expect(screen.getByTestId('title')).toHaveStyle({ fontWeight: style === 'sera' ? '600' : '500' });
  expect(screen.getByTestId('media')).toHaveStyle({
    height: ['nova', 'lyra', 'mira'].includes(style) ? 32 : 40,
  });
  expect(screen.getAllByTestId('glyph')[0]!.props.pointerEvents).toBe('none');
  expect(screen.getAllByTestId('glyph')[0]!.props.width).toBe(
    ['nova', 'lyra', 'mira'].includes(style)
      ? 16
      : ['luma', 'sera', 'rhea'].includes(style)
        ? 20
        : 24,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Create project' }));
  expect(action).toHaveBeenCalledTimes(1);
});
test('Empty scopes the source direct-link underline and primary hover while preserving inline navigation', async () => {
  const anchor = jest.fn();
  await render(
    wrap(
      <UI.NativeNavigationProvider onAnchor={anchor}>
        <UI.Empty>
          <UI.EmptyHeader>
            <UI.EmptyTitle>Empty</UI.EmptyTitle>
            <UI.EmptyDescription>
              Need help?{' '}
              <RegistryLink href="#support" testID="direct">
                Contact support
              </RegistryLink>
              <RegistryParagraph>
                Nested{' '}
                <RegistryLink href="#nested" testID="nested">
                  link
                </RegistryLink>
              </RegistryParagraph>
            </UI.EmptyDescription>
          </UI.EmptyHeader>
        </UI.Empty>
        <RegistryLink href="#outside" testID="outside">
          Outside
        </RegistryLink>
      </UI.NativeNavigationProvider>,
    ),
  );
  expect(screen.getByTestId('direct')).toHaveStyle({ textDecorationLine: 'underline' });
  expect(screen.getByTestId('nested')).not.toHaveStyle({ textDecorationLine: 'underline' });
  expect(screen.getByTestId('outside')).not.toHaveStyle({ textDecorationLine: 'underline' });
  await fireEvent.press(screen.getByTestId('direct'));
  expect(anchor).toHaveBeenCalledWith('support', { replace: undefined, scroll: undefined });
  const before = StyleSheet.flatten(screen.getByTestId('direct').props.style).color;
  await fireEvent(screen.getByTestId('direct'), 'hoverIn', {});
  expect(StyleSheet.flatten(screen.getByTestId('direct').props.style).color).not.toBe(before);
  await fireEvent(screen.getByTestId('direct'), 'hoverOut', {});
  expect(screen.getByTestId('direct')).toHaveStyle({ color: before });
});
test('Empty default media preserves interactive children and caller glyph dimensions', async () => {
  const press = jest.fn();
  await render(
    wrap(
      <UI.Empty>
        <UI.EmptyMedia testID="plain">
          <UI.Button onPress={press}>Media action</UI.Button>
        </UI.EmptyMedia>
        <UI.EmptyMedia variant="icon">
          <Glyph lucide="FolderIcon" className="size-7" testID="glyph" />
        </UI.EmptyMedia>
      </UI.Empty>,
    ),
  );
  expect(StyleSheet.flatten(screen.getByTestId('plain').props.style).width).toBeUndefined();
  expect(screen.getByTestId('plain')).toHaveStyle({ backgroundColor: 'transparent' });
  expect(screen.getAllByTestId('glyph')[0]!.props.width).toBe(28);
  await fireEvent.press(screen.getByRole('button', { name: 'Media action' }));
  expect(press).toHaveBeenCalledTimes(1);
});
test('Empty preserves caller text metrics and class paint without affecting generic display aliases', async () => {
  const Title = withRegistryStyles(UI.EmptyTitle, 'view');
  await render(
    wrap(
      <>
        <UI.Empty style={{ padding: 31 }} testID="root">
          <UI.EmptyHeader>
            <Title className="text-xl tracking-wide font-mono" testID="title">
              Empty
            </Title>
            <UI.EmptyDescription textStyle={{ fontSize: 19, lineHeight: 33 }}>
              <RegistryParagraph testID="description">Body</RegistryParagraph>
            </UI.EmptyDescription>
          </UI.EmptyHeader>
        </UI.Empty>
        <UI.TypographyLarge testID="large">Large</UI.TypographyLarge>
      </>,
    ),
  );
  expect(screen.getByTestId('root')).toHaveStyle({ padding: 31 });
  expect(screen.getByTestId('title')).toHaveStyle({
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0.5,
  });
  expect(screen.getByTestId('description')).toHaveStyle({ fontSize: 19, lineHeight: 33 });
  expect(screen.getByTestId('large')).toHaveStyle({ fontSize: 14, lineHeight: 21 });
});
test('all thirty-six Empty source slots are consumed by the native renderer', async () => {
  const presets = require('./.generated/src/native/_preset-empty-style'),
    { nativeEmptyPresetSource: source } = require('./.generated/src/native/_empty-presets'),
    actual = presets.nativePresetEmptyStyle,
    seen = new Set<string>();
  const spy = jest.spyOn(presets, 'nativePresetEmptyStyle').mockImplementation((...args: any[]) => {
    const result = actual(...args);
    seen.add(result.source + '/' + args[1]);
    return result;
  });
  try {
    for (const family of Object.keys(source.sources)) {
      const view = await render(
        <UI.ThemeProvider>
          <NativeRegistryPalette
            source={family as any}
            generation={family === 'default' || family === 'new-york' ? 'legacy' : 'modern'}
          >
            <UI.Empty>
              <UI.EmptyHeader>
                <UI.EmptyMedia variant="icon">
                  <Glyph lucide="FolderIcon" />
                </UI.EmptyMedia>
                <UI.EmptyTitle>Empty</UI.EmptyTitle>
                <UI.EmptyDescription>Body</UI.EmptyDescription>
              </UI.EmptyHeader>
              <UI.EmptyContent>Content</UI.EmptyContent>
            </UI.Empty>
          </NativeRegistryPalette>
        </UI.ThemeProvider>,
      );
      await view.unmount();
    }
    for (const [family, definition] of Object.entries(source.sources) as any[])
      for (const slot of Object.keys(definition.slots))
        expect(seen.has(family + '/' + slot)).toBe(true);
    expect(seen.size).toBe(36);
  } finally {
    spy.mockRestore();
  }
});
test('Empty source media styles reach raw native SVG roots and explicit glyph classes retain ownership', async () => {
  const { default: NativeSvg, Path } = require('react-native-svg'),
    Svg = withRegistryStyles(NativeSvg, 'svg-root');
  await render(
    wrap(
      <UI.EmptyMedia variant="icon">
        <Svg testID="raw" viewBox="0 0 24 24">
          <Path d="M0 0h24v24H0z" />
        </Svg>
        <Svg testID="explicit" className="size-7" viewBox="0 0 24 24" />
      </UI.EmptyMedia>,
    ),
  );
  expect(screen.getAllByTestId('raw')[0]).toHaveStyle({ width: 16, height: 16 });
  expect(screen.getAllByTestId('raw')[0]!.props.pointerEvents).toBe('none');
  expect(screen.getAllByTestId('explicit')[0]).toHaveStyle({ width: 28, height: 28 });
});
test('Empty responsive source padding updates on native resize and clears icon-only geometry when the media variant changes', async () => {
  const { act } = require('@testing-library/react-native');
  await render(
    wrap(
      <UI.Empty testID="root">
        <UI.EmptyMedia testID="media" variant="icon">
          <Glyph lucide="FolderIcon" testID="glyph" />
        </UI.EmptyMedia>
      </UI.Empty>,
      'default',
    ),
  );
  expect(screen.getByTestId('root')).toHaveStyle({ padding: 24 });
  await act(() => Dimensions.set({ window: { ...initial, width: 1024, fontScale: 1 } }));
  expect(screen.getByTestId('root')).toHaveStyle({ padding: 48 });
  await screen.rerender(
    wrap(
      <UI.Empty>
        <UI.EmptyMedia testID="media">
          <Glyph lucide="FolderIcon" testID="glyph" />
        </UI.EmptyMedia>
      </UI.Empty>,
      'default',
    ),
  );
  expect(StyleSheet.flatten(screen.getByTestId('media').props.style).width).toBeUndefined();
  expect(screen.getAllByTestId('glyph')[0]!.props.width).toBe(24);
  await screen.rerender(
    wrap(
      <UI.EmptyMedia variant="icon">
        <Glyph lucide="FolderIcon" testID="glyph" />
      </UI.EmptyMedia>,
    ),
  );
  expect(screen.getAllByTestId('glyph')[0]!.props.width).toBe(16);
  await screen.rerender(
    wrap(
      <UI.EmptyMedia>
        <Glyph lucide="FolderIcon" testID="glyph" />
      </UI.EmptyMedia>,
    ),
  );
  expect(screen.getAllByTestId('glyph')[0]!.props.width).toBe(24);
});
for (const style of ['nova', 'default', 'new-york-v4'] as const)
  for (const mode of ['light', 'dark'] as const)
    test(`${style} ${mode} Empty media sends its semantic foreground to the actual native SVG`, async () => {
      const { processColor } = require('react-native');
      let foreground: string | undefined;
      function Sample() {
        const theme = UI.useTheme();
        foreground = theme.colors.foreground;
        React.useLayoutEffect(() => {
          theme.setPreference(mode);
        }, []);
        return (
          <UI.EmptyMedia variant="icon">
            <Glyph lucide="FolderIcon" />
          </UI.EmptyMedia>
        );
      }
      await render(wrap(<Sample />, style));
      const visit = (value: any): any[] =>
        !value || typeof value !== 'object'
          ? []
          : Array.isArray(value)
            ? value.flatMap(visit)
            : [value, ...(value.children ?? []).flatMap(visit)];
      expect(
        visit(screen.toJSON()).some(
          (node) =>
            node.props?.stroke?.type === 0 &&
            node.props.stroke.payload === processColor(foreground),
        ),
      ).toBe(true);
    });
test('Empty source SVG default sizing and pointer rules stop at a physical native modal', async () => {
  await render(
    wrap(
      <UI.EmptyMedia variant="icon">
        <Glyph lucide="FolderIcon" testID="inline" />
        <UI.Popover>
          <UI.PopoverTrigger>Open media detail</UI.PopoverTrigger>
          <UI.PopoverContent>
            <Glyph lucide="FolderIcon" testID="popup" />
          </UI.PopoverContent>
        </UI.Popover>
      </UI.EmptyMedia>,
    ),
  );
  expect(screen.getAllByTestId('inline')[0]!.props.width).toBe(16);
  await fireEvent.press(screen.getByRole('button', { name: 'Open media detail' }));
  expect(screen.getAllByTestId('popup')[0]!.props.width).toBe(24);
  expect(screen.getAllByTestId('popup')[0]!.props.pointerEvents).not.toBe('none');
});
test('source grid cells ignore Empty flex-item hints and one-column grids retain vertical flow', async () => {
  const { act } = require('@testing-library/react-native'),
    Cell = withRegistryStyles(UI.Empty, 'view');
  const children = (
    <>
      <Cell testID="first">
        <UI.EmptyHeader>
          <UI.EmptyTitle>First</UI.EmptyTitle>
        </UI.EmptyHeader>
      </Cell>
      <Cell testID="second">
        <UI.EmptyHeader>
          <UI.EmptyTitle>Second</UI.EmptyTitle>
        </UI.EmptyHeader>
      </Cell>
    </>
  );
  await render(
    wrap(
      <RegistryView testID="grid" className="grid grid-cols-2 gap-8">
        {children}
      </RegistryView>,
    ),
  );
  await fireEvent(screen.getByTestId('grid'), 'layout', {
    nativeEvent: { layout: { width: 320, height: 100, x: 0, y: 0 } },
  });
  expect(screen.getByTestId('first')).toHaveStyle({
    width: 144,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  });
  expect(screen.getByTestId('second')).toHaveStyle({
    width: 144,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  });
  await screen.rerender(
    wrap(
      <RegistryView testID="grid" className="grid grid-cols-1 gap-8">
        {children}
      </RegistryView>,
    ),
  );
  expect(screen.getByTestId('grid')).toHaveStyle({ flexDirection: 'column' });
  expect(screen.getByTestId('first')).toHaveStyle({
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  });
});
