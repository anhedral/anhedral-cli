import React from 'react';
import { View, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  NativeRegistryPalette,
  NativeComponentStyleProvider,
} from './.generated/src/native/_registry-context';
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);
for (const source of ['base', 'radix', 'aria', 'default', 'new-york', 'new-york-v4'] as const)
  for (const orientation of ['horizontal', 'vertical'] as const)
    test(`${source} Separator ${orientation} preserves source layout and accessibility defaults`, async () => {
      await mount(
        <NativeRegistryPalette
          source={source}
          generation={source === 'default' || source === 'new-york' ? 'legacy' : 'modern'}
        >
          <UI.Separator testID="source" orientation={orientation} />
          <UI.Separator
            testID="override"
            orientation={orientation}
            decorative={false}
            style={{ width: 19, height: 7, backgroundColor: '#123456' }}
          />
        </NativeRegistryPalette>,
      );
      const separator = screen.getByTestId('source', { includeHiddenElements: true });
      const style = StyleSheet.flatten(separator.props.style);
      expect(style.flexShrink).toBe(0);
      if (orientation === 'horizontal') expect(style).toMatchObject({ height: 1, width: '100%' });
      else if (source === 'default' || source === 'new-york' || source === 'new-york-v4')
        expect(style).toMatchObject({ width: 1, height: '100%' });
      else expect(style).toMatchObject({ width: 1, alignSelf: 'stretch' });
      if (source === 'base' || source === 'aria')
        expect(screen.getByTestId('source')).toBeOnTheScreen();
      else expect(screen.queryByTestId('source')).toBeNull();
      expect(screen.getByTestId('override')).toHaveStyle({
        width: 19,
        height: 7,
        backgroundColor: '#123456',
      });
      expect(screen.getByTestId('override').props.role).toBe('separator');
    });
test('native AspectRatio composes one host, refs and callbacks without a DOM wrapper', async () => {
  const outer = React.createRef<View>(),
    inner = React.createRef<View>(),
    layout = jest.fn(),
    childLayout = jest.fn();
  const tree = await mount(
    <UI.AspectRatio ratio={16 / 9} asChild ref={outer} onLayout={layout}>
      <View ref={inner} testID="composed" onLayout={childLayout} style={{ borderRadius: 3 }}>
        Native image placeholder
      </View>
    </UI.AspectRatio>,
  );
  expect(outer.current).toBeTruthy();
  expect(outer.current).toBe(inner.current);
  expect(screen.getByTestId('composed')).toHaveStyle({
    aspectRatio: 16 / 9,
    width: '100%',
    position: 'relative',
    borderRadius: 3,
  });
  expect(screen.getByText('Native image placeholder')).toBeOnTheScreen();
  const event = { nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 90 } } };
  await fireEvent(screen.getByTestId('composed'), 'layout', event);
  expect(layout).toHaveBeenCalledTimes(1);
  expect(childLayout).toHaveBeenCalledTimes(1);
  await tree.unmount();
  expect(outer.current).toBeNull();
  expect(inner.current).toBeNull();
});
test('native layout render callbacks receive native styles, preserve their own children and reject multiple roots', async () => {
  const callback = jest.fn(
    (props: import('./.generated/src/native/_layout').NativeLayoutRenderProps) => (
      <View {...props} testID="callback" style={[props.style, { width: 80 }]}>
        <UI.Text>Rendered content</UI.Text>
      </View>
    ),
  );
  await mount(
    <UI.AspectRatio ratio={2} render={callback}>
      Original content
    </UI.AspectRatio>,
  );
  expect(screen.getByTestId('callback')).toHaveStyle({ width: 80, aspectRatio: 2 });
  expect(screen.getByText('Rendered content')).toBeOnTheScreen();
  expect(screen.queryByText('Original content')).toBeNull();
  expect('className' in callback.mock.calls[0]![0]).toBe(false);
  await expect(
    mount(
      <UI.AspectRatio asChild>
        <>
          <View />
          <View />
        </>
      </UI.AspectRatio>,
    ),
  ).rejects.toThrow(/one native host/);
});
test('Separator render elements preserve authored native style and accessibility labels', async () => {
  await mount(
    <UI.Separator
      orientation="vertical"
      decorative={false}
      accessibilityLabel="Between settings"
      render={<View testID="rendered" />}
    />,
  );
  expect(screen.getByLabelText('Between settings')).toBe(screen.getByTestId('rendered'));
  expect(screen.getByTestId('rendered')).toHaveStyle({ width: 1, alignSelf: 'stretch' });
  expect(screen.getByTestId('rendered').props.role).toBe('separator');
});
for (const style of ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
  test(`${style} AspectRatio and Separator accept preset context without changing source geometry`, async () => {
    await mount(
      <NativeComponentStyleProvider style={style}>
        <UI.AspectRatio ratio={4 / 3} testID="ratio" />
        <UI.Separator orientation="vertical" decorative={false} testID="separator" />
      </NativeComponentStyleProvider>,
    );
    expect(screen.getByTestId('ratio')).toHaveStyle({ aspectRatio: 4 / 3 });
    expect(screen.getByTestId('separator')).toHaveStyle({ width: 1, alignSelf: 'stretch' });
  });
