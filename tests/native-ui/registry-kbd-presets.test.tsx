import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { nativePresetKbdStyle } from './.generated/src/native/_preset-kbd-style';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import { NativeTextStyleProvider } from './.generated/src/native/_core';
import { withRegistryStyles, RegistrySample } from './.generated/src/native/registry-styles';
import { styling } from './.generated/styling/src';
const styles = [
  'vega',
  'nova',
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
const window = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...window, fontScale: 1 } }));
afterEach(() => Dimensions.set({ window }));
const mount = (node: React.ReactNode) => render(<UI.ThemeProvider>{node}</UI.ThemeProvider>);
for (const name of styles) {
  for (const mode of ['light', 'dark'] as const)
    test(`${name} ${mode} keyboard source metrics and every physical ancestor combination`, () => {
      const colors = {
        ...styling.registryThemes['theme-neutral'].native[mode],
        'destructive-foreground': '#ffffff',
      };
      for (const tooltip of [false, true])
        for (const inputGroup of [false, true]) {
          const result = nativePresetKbdStyle(name, 'Kbd', {
            colors,
            mode,
            radius: 10,
            tooltip,
            inputGroup,
            fontScale: 1,
          });
          const tall = name === 'luma' || name === 'sera';
          expect(result.view.height).toBe(tall ? 22 : 20);
          expect(result.view.minWidth).toBe(tall ? 22 : 20);
          expect(result.text.fontSize).toBe(name === 'mira' ? 10 : 12);
          expect(result.text.fontWeight).toBe('500');
          expect(result.iconSize).toBe(12);
          expect(result.fontRole).toBe('sans');
          expect(result.text.color).toBe(tooltip ? colors.background : colors['muted-foreground']);
          if (!tooltip)
            expect(result.view.backgroundColor).toBe(
              inputGroup && ['luma', 'sera', 'rhea'].includes(name) ? colors.input : colors.muted,
            );
          if (tooltip && !inputGroup)
            expect(result.view.backgroundColor).toContain(mode === 'dark' ? '0.1' : '0.2');
          expect(
            nativePresetKbdStyle(name, 'KbdGroup', { colors, mode, radius: 10 }).view.gap,
          ).toBe(4);
        }
    });
  test(`${name} native keyboard roots retain text and view styles separately`, async () => {
    await mount(
      <NativeRegistryPalette
        source={name === 'default' || name === 'new-york' || name === 'new-york-v4' ? name : 'base'}
        generation={name === 'default' || name === 'new-york' ? 'legacy' : 'modern'}
      >
        <UI.NativeComponentStyleProvider style={name}>
          <UI.Kbd testID="key">Ctrl</UI.Kbd>
          <UI.KbdGroup testID="group">
            <UI.Kbd>A</UI.Kbd>
            <UI.Kbd>B</UI.Kbd>
          </UI.KbdGroup>
          <UI.Kbd testID="custom" style={{ height: 36, fontSize: 18, color: '#123456' }}>
            Custom
          </UI.Kbd>
        </UI.NativeComponentStyleProvider>
      </NativeRegistryPalette>,
    );
    expect(screen.getByTestId('key')).toHaveStyle({
      height: name === 'luma' || name === 'sera' ? 22 : 20,
    });
    expect(screen.getByTestId('key').props.pointerEvents).toBe('none');
    expect(screen.getByText('Ctrl')).toHaveStyle({
      fontSize: name === 'mira' ? 10 : 12,
      fontWeight: '500',
    });
    expect(screen.getByTestId('group')).toHaveStyle({ flexDirection: 'row', gap: 4 });
    expect(screen.getByText('Custom')).toHaveStyle({
      fontSize: 18,
      color: '#123456',
      lineHeight: name === 'mira' ? 27 : 24,
    });
    expect(screen.getByTestId('custom')).toHaveStyle({ height: 36 });
    expect(StyleSheet.flatten(screen.getByTestId('custom').props.style).fontSize).toBeUndefined();
  });
}
test('keyboard font scaling grows source geometry while explicit utility typography wins', async () => {
  Dimensions.set({ window: { ...window, fontScale: 2 } });
  const Styled = withRegistryStyles(UI.Kbd);
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <Styled testID="key" className="text-lg px-3">
        Zoom
      </Styled>
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.getByTestId('key')).toHaveStyle({ height: 60, paddingLeft: 12, paddingRight: 12 });
  expect(screen.getByText('Zoom')).toHaveStyle({ fontSize: 18, lineHeight: 28 });
});
test('sample output retains monospace without inheriting keyboard background or changing inline code', async () => {
  await mount(
    <NativeTextStyleProvider value={{ fontRole: 'mono', style: { fontSize: 29 } }}>
      <UI.Kbd>
        Key<RegistrySample>File</RegistrySample>
      </UI.Kbd>
      <UI.TypographyInlineCode testID="code">Code</UI.TypographyInlineCode>
    </NativeTextStyleProvider>,
  );
  expect(screen.getByText('Key')).toHaveStyle({ fontSize: 12 });
  expect(screen.getByText('File')).toHaveStyle({ fontSize: 12 });
  expect(screen.getByTestId('code')).toHaveStyle({ paddingHorizontal: 6, borderRadius: 4 });
  expect(screen.queryByRole('button')).toBeNull();
});
test('input-group keyboard ancestry ends at physical modal boundaries and tooltip colors follow the modal', async () => {
  let inputColor: string | undefined, background: string | undefined;
  function Example() {
    const { colors } = UI.useTheme();
    inputColor = colors.input;
    background = colors.background;
    return (
      <UI.NativeComponentStyleProvider style="luma">
        <UI.InputGroup>
          <UI.InputGroupAddon>
            <UI.Kbd testID="input">Space</UI.Kbd>
          </UI.InputGroupAddon>
          <UI.InputGroupInput />
          <UI.Dialog defaultOpen>
            <UI.DialogContent>
              <UI.Kbd testID="dialog">D</UI.Kbd>
            </UI.DialogContent>
          </UI.Dialog>
          <UI.Tooltip>
            <UI.TooltipTrigger>Help</UI.TooltipTrigger>
            <UI.TooltipContent>
              <UI.Kbd testID="tip">T</UI.Kbd>
            </UI.TooltipContent>
          </UI.Tooltip>
        </UI.InputGroup>
      </UI.NativeComponentStyleProvider>
    );
  }
  await mount(<Example />);
  expect(screen.getByTestId('input')).toHaveStyle({ backgroundColor: inputColor! });
  expect(StyleSheet.flatten(screen.getByTestId('dialog').props.style).backgroundColor).not.toBe(
    inputColor!,
  );
  await fireEvent(screen.getByText('Help'), 'longPress', { isDefaultPrevented: () => false });
  expect(screen.getByText('T')).toHaveStyle({ color: background! });
  expect(StyleSheet.flatten(screen.getByTestId('tip').props.style).backgroundColor).toContain(
    '0.2',
  );
});

test('keyboard source glyph size is a default and explicit authored icon dimensions win', async () => {
  const { IconPlaceholder } = require('./.generated/src/native/registry-example');
  const Icon = withRegistryStyles(IconPlaceholder);
  await mount(
    <UI.Kbd>
      <Icon lucide="ArrowLeftIcon" testID="default-icon" />
      <Icon lucide="ArrowRightIcon" testID="class-icon" className="size-6" />
      <Icon lucide="CircleDashedIcon" testID="native-icon" size={19} />
    </UI.Kbd>,
  );
  expect(screen.getAllByTestId('default-icon')[0]!.props).toEqual(
    expect.objectContaining({ width: 12, height: 12 }),
  );
  expect(screen.getAllByTestId('class-icon')[0]!.props).toEqual(
    expect.objectContaining({ width: 24, height: 24 }),
  );
  expect(screen.getAllByTestId('native-icon')[0]!.props).toEqual(
    expect.objectContaining({ width: 19, height: 19 }),
  );
});
