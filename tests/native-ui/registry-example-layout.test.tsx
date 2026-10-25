import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  Example,
  ExampleWrapper,
  NativeExampleOptions,
} from './.generated/src/native/registry-example';
import { RegistryView, withRegistryStyles } from './.generated/src/native/registry-styles';
const window = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...window, width: 390, height: 844, fontScale: 1 } }));
afterEach(() => Dimensions.set({ window }));
const StyledExample = withRegistryStyles(Example),
  Wrapper = withRegistryStyles(ExampleWrapper);
const mount = (node: React.ReactNode) => render(<UI.ThemeProvider>{node}</UI.ThemeProvider>);
test('gallery className styles the content while containerClassName and native props own the outer example', async () => {
  await mount(
    <StyledExample
      testID="example"
      title="Sample"
      className="p-2 gap-3"
      containerClassName="max-w-xs mt-4"
      style={{ paddingLeft: 7 }}
    >
      <RegistryView testID="body">Content</RegistryView>
    </StyledExample>,
  );
  expect(screen.getByTestId('example')).toHaveStyle({
    maxWidth: 320,
    marginTop: 16,
    paddingLeft: 7,
    gap: 4,
  });
  expect(screen.getByTestId('example')).not.toHaveStyle({ padding: 8 });
  const panel = screen.getByTestId('body').parent!;
  expect(panel).toHaveStyle({ padding: 8, gap: 12 });
  expect(screen.getByRole('header', { name: 'Sample' })).toHaveStyle({
    fontSize: 12,
    fontWeight: '500',
  });
});
for (const preset of ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
  test(`${preset} gallery retains source panel padding, radius and structural child width defaults`, async () => {
    await mount(
      <NativeExampleOptions style={preset}>
        <Example>
          <RegistryView testID="default">Default</RegistryView>
          <RegistryView testID="sized" className="w-24">
            Sized
          </RegistryView>
          <RegistryView testID="native" style={{ width: 150 }}>
            Native
          </RegistryView>
          <UI.Button>Action</UI.Button>
        </Example>
      </NativeExampleOptions>,
    );
    const panel = screen.getByTestId('default').parent!;
    expect(panel).toHaveStyle({
      padding: 48,
      gap: 24,
      alignItems: 'flex-start',
      flexBasis: 'auto',
      borderRadius: preset === 'lyra' || preset === 'sera' ? 0 : 11.2,
    });
    expect(screen.getByTestId('default')).toHaveStyle({ width: '100%' });
    expect(screen.getByTestId('sized')).toHaveStyle({ width: 96 });
    expect(screen.getByTestId('native')).toHaveStyle({ width: 150 });
    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: 'Action' }).props.style).width,
    ).toBeUndefined();
  });
test('gallery wrapper preserves viewport height, responsive source grid tracks and maximum container widths', async () => {
  Dimensions.set({ window: { ...window, width: 1600, height: 900, fontScale: 1 } });
  await mount(
    <Wrapper testID="grid">
      <StyledExample testID="one">One</StyledExample>
      <StyledExample testID="two">Two</StyledExample>
    </Wrapper>,
  );
  expect(screen.getByTestId('grid')).toHaveStyle({
    minHeight: 900,
    maxWidth: 1152,
    padding: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    alignContent: 'center',
  });
  await fireEvent(screen.getByTestId('grid'), 'layout', {
    nativeEvent: { layout: { width: 1152, height: 900, x: 0, y: 0 } },
  });
  expect(screen.getByTestId('one')).toHaveStyle({ width: 512, maxWidth: undefined });
  expect(screen.getByTestId('two')).toHaveStyle({ width: 512 });
});
test('gallery defaults stop at native container, text and modal boundaries', async () => {
  await mount(
    <Example>
      <RegistryView testID="outer">
        <RegistryView testID="nested">Nested</RegistryView>
      </RegistryView>
      <UI.Kbd>Key</UI.Kbd>
      <UI.Dialog defaultOpen>
        <UI.DialogContent>
          <RegistryView testID="modal">Modal</RegistryView>
        </UI.DialogContent>
      </UI.Dialog>
    </Example>,
  );
  expect(screen.getByTestId('outer')).toHaveStyle({ width: '100%' });
  expect(StyleSheet.flatten(screen.getByTestId('nested').props.style).width).toBeUndefined();
  expect(StyleSheet.flatten(screen.getByText('Key').props.style).width).toBeUndefined();
  expect(StyleSheet.flatten(screen.getByTestId('modal').props.style).width).toBeUndefined();
});
test('local composed containers receive defaults while explicit native width stays authoritative', async () => {
  function Local() {
    return <RegistryView testID="local">Local</RegistryView>;
  }
  const ref = React.createRef<View>();
  await mount(
    <Wrapper className="p-2" testID="wrapper" ref={ref}>
      <StyledExample>
        <Local />
      </StyledExample>
    </Wrapper>,
  );
  expect(ref.current).not.toBeNull();
  expect(screen.getByTestId('wrapper')).toHaveStyle({ padding: 8 });
  expect(screen.getByTestId('local')).toHaveStyle({ width: '100%' });
});

test('source cn conflict resolution clears earlier padding edges and preserves conditional style variants', async () => {
  const { registryClassNames } = require('./.generated/src/native/registry-styles');
  expect(registryClassNames('p-4 pt-2', [false, { 'p-0': true }])).toBe('p-0');
  await mount(
    <NativeExampleOptions style="lyra">
      <Wrapper testID="merged" className="p-0">
        <StyledExample className="rounded-lg">
          <RegistryView testID="content">Merged</RegistryView>
        </StyledExample>
      </Wrapper>
    </NativeExampleOptions>,
  );
  expect(screen.getByTestId('merged')).toHaveStyle({ padding: 0, paddingTop: 0, paddingLeft: 0 });
  expect(screen.getByTestId('content').parent!).toHaveStyle({ borderRadius: 0 });
});

test('intrinsic gallery sizing preserves active authored basis rules and explicit native content overrides', async () => {
  await mount(
    <Example className="md:basis-1/2" contentStyle={{ paddingLeft: 9 }}>
      <RegistryView testID="basis">Basis</RegistryView>
    </Example>,
  );
  expect(screen.getByTestId('basis').parent!).toHaveStyle({ flexBasis: 'auto', paddingLeft: 9 });
  const { act } = require('@testing-library/react-native');
  await act(() => Dimensions.set({ window: { ...window, width: 800, height: 600, fontScale: 1 } }));
  expect(screen.getByTestId('basis').parent!).toHaveStyle({ flexBasis: '50%', paddingLeft: 9 });
  await screen.rerender(
    <UI.ThemeProvider>
      <Example contentStyle={{ flexBasis: 123, padding: 0 }}>
        <RegistryView testID="explicit">Explicit</RegistryView>
      </Example>
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('explicit').parent!).toHaveStyle({ flexBasis: 123, padding: 0 });
});
