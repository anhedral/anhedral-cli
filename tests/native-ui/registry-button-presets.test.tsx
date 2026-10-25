import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet, Dimensions } from 'react-native';
import Color from 'colorjs.io';
import * as UI from './.generated';
import { nativePresetButtonStyle } from './.generated/src/native/_preset-button-style';
import { withAlpha } from './.generated/src/native/_core';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
import { Check } from 'lucide-react-native';
import { styling } from './.generated/styling/src';
const originalWindow = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...originalWindow, fontScale: 1 } }));
afterEach(() => Dimensions.set({ window: originalWindow }));
const presets = ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const;
const variants = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const;
const sizes = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const;
const Icon = withRegistryStyles(Check, 'icon');
test.each(presets)(
  '%s resolves every variant/size in light and dark modes, including combined native states',
  (name) => {
    for (const mode of ['light', 'dark'] as const)
      for (const variant of variants)
        for (const size of sizes)
          for (const state of [
            {},
            {
              hovered: true,
              focused: true,
              invalid: true,
              expanded: true,
              pressed: true,
              inGroup: true,
              iconStart: true,
              iconEnd: true,
            },
            { hovered: true, focused: true, disabled: true, pressed: true, iconStart: true },
          ]) {
            const result = nativePresetButtonStyle(name, variant, size, {
              mode,
              radius: 10,
              colors: styling.registryThemes['theme-neutral'].native[mode],
              ...state,
            });
            expect(result.view.height).toBeGreaterThan(0);
            expect(result.text.fontSize).toBeGreaterThan(0);
            expect(result.iconSize).toBeGreaterThan(0);
            if (size.startsWith('icon')) expect(result.view.width).toBe(result.view.height);
            expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/);
            if (state.disabled) expect(result.view.transform).toBeUndefined();
          }
  },
);
test.each([
  ['vega', 36, 6.4, 14, 16],
  ['nova', 32, 8, 14, 16],
  ['maia', 36, 20.8, 14, 16],
  ['lyra', 32, 0, 12, 16],
  ['mira', 28, 6.4, 12, 14],
  ['luma', 36, 20.8, 14, 16],
  ['sera', 40, 0, 12, 14],
  ['rhea', 32, 14.4, 14, 16],
] as const)(
  '%s renders its authored geometry and inherited icon size with a native touch target',
  async (name, height, radius, fontSize, iconSize) => {
    await render(
      <UI.ThemeProvider>
        <UI.NativeComponentStyleProvider style={name}>
          <UI.Button testID="preset">
            Action
            <Icon testID="icon" />
          </UI.Button>
        </UI.NativeComponentStyleProvider>
      </UI.ThemeProvider>,
    );
    expect(screen.getByTestId('preset')).toHaveStyle({
      height,
      borderRadius: radius,
      minHeight: 0,
    });
    expect(screen.getByTestId('preset').props.hitSlop.top * 2 + height).toBeGreaterThanOrEqual(44);
    expect(screen.getByText('Action')).toHaveStyle({ fontSize });
    expect(screen.getAllByTestId('icon')[0]!.props.width).toBe(iconSize);
  },
);
test('native preset focus/invalid selectors override the base and variant border while preserving consumer handlers', async () => {
  const focus = jest.fn(),
    blur = jest.fn(),
    hover = jest.fn();
  function Fixture() {
    const { colors } = UI.useTheme();
    return (
      <>
        <UI.Text testID="tokens">{JSON.stringify(colors)}</UI.Text>
        <UI.NativeComponentStyleProvider style="nova">
          <UI.Button
            testID="button"
            variant="outline"
            invalid
            onFocus={focus}
            onBlur={blur}
            onHoverIn={hover}
          >
            Invalid button
          </UI.Button>
        </UI.NativeComponentStyleProvider>
      </>
    );
  }
  await render(
    <UI.ThemeProvider>
      <Fixture />
    </UI.ThemeProvider>,
  );
  const colors = JSON.parse(String(screen.getByTestId('tokens').props.children));
  expect(screen.getByTestId('button')).toHaveStyle({ borderColor: colors.destructive });
  await fireEvent(screen.getByTestId('button'), 'focus', {});
  expect(focus).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('button')).toHaveStyle({ borderColor: colors.destructive });
  expect(StyleSheet.flatten(screen.getByTestId('button').props.style).boxShadow).toContainEqual(
    expect.objectContaining({ spreadDistance: 3, color: withAlpha(colors.destructive, 0.2) }),
  );
  await fireEvent(screen.getByTestId('button'), 'hoverIn', {});
  expect(hover).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('button')).toHaveStyle({ backgroundColor: colors.muted });
  await fireEvent(screen.getByTestId('button'), 'hoverOut', {});
  expect(screen.getByTestId('button')).toHaveStyle({ backgroundColor: colors.background });
  await fireEvent(screen.getByTestId('button'), 'blur', {});
  expect(blur).toHaveBeenCalledTimes(1);
});
test('secondary hover uses the authored OKLCH mix; disabled native controls retain their original surface', async () => {
  function Fixture() {
    const { colors } = UI.useTheme();
    return (
      <>
        <UI.Text testID="tokens">{JSON.stringify(colors)}</UI.Text>
        <UI.NativeComponentStyleProvider style="vega">
          <UI.Button testID="hover" variant="secondary">
            Hover
          </UI.Button>
          <UI.Button disabled testID="disabled" variant="secondary">
            Disabled
          </UI.Button>
        </UI.NativeComponentStyleProvider>
      </>
    );
  }
  await render(
    <UI.ThemeProvider>
      <Fixture />
    </UI.ThemeProvider>,
  );
  const colors = JSON.parse(String(screen.getByTestId('tokens').props.children));
  await fireEvent(screen.getByTestId('hover'), 'hoverIn', {});
  const expected = new Color(colors.secondary)
    .mix(colors.foreground, 0.05, { space: 'oklch', outputSpace: 'srgb' })
    .toGamut({ method: 'css' })
    .toString({ format: 'hex' });
  expect(screen.getByTestId('hover')).toHaveStyle({ backgroundColor: expected });
  await fireEvent(screen.getByTestId('disabled'), 'hoverIn', {});
  expect(screen.getByTestId('disabled')).toHaveStyle({
    backgroundColor: colors.secondary,
    opacity: 0.5,
  });
});
test('native icon placement changes source padding, explicit icon sizing wins, and button groups override capped corner radii', async () => {
  await render(
    <UI.ThemeProvider>
      <UI.NativeComponentStyleProvider style="nova">
        <UI.ButtonGroup>
          <UI.Button size="xs" testID="group">
            <Icon registryIcon="inline-start" className="size-6" testID="icon" />
            Grouped
          </UI.Button>
        </UI.ButtonGroup>
        <UI.Button size="xs" testID="plain">
          Plain
        </UI.Button>
      </UI.NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('group')).toHaveStyle({ borderRadius: 8, paddingLeft: 6 });
  expect(screen.getByTestId('plain')).toHaveStyle({ borderRadius: 6.4 });
  expect(screen.getAllByTestId('icon')[0]!.props.width).toBe(24);
});
test('pressed preset surfaces move only plain buttons and preserve explicit consumer styles and hit slop', async () => {
  const frame = (pressed: boolean) => (
    <UI.ThemeProvider>
      <UI.NativeComponentStyleProvider style="sera">
        <UI.Button testID="plain" testOnly_pressed={pressed} hitSlop={20} style={{ height: 48 }}>
          Action
        </UI.Button>
        <UI.Button
          testID="popup"
          testOnly_pressed={pressed}
          accessibilityState={{ expanded: false }}
        >
          Popup
        </UI.Button>
      </UI.NativeComponentStyleProvider>
    </UI.ThemeProvider>
  );
  const view = await render(frame(true));
  expect(screen.getByTestId('plain')).toHaveStyle({ height: 48, transform: [{ translateY: 1 }] });
  expect(screen.getByTestId('plain').props.hitSlop).toBe(20);
  expect(StyleSheet.flatten(screen.getByTestId('popup').props.style).transform).toBeUndefined();
  await view.rerender(frame(false));
  expect(StyleSheet.flatten(screen.getByTestId('plain').props.style).transform).toBeUndefined();
  expect(screen.getByText('Action')).toHaveStyle({ textTransform: 'uppercase', fontWeight: '600' });
  expect(StyleSheet.flatten(screen.getByText('Action').props.style).letterSpacing).toBeCloseTo(1.2);
});
test('legacy recipe boundaries keep their published presentation when a modern component preset is selected', async () => {
  await render(
    <UI.ThemeProvider>
      <UI.NativeComponentStyleProvider style="lyra">
        <NativeRegistryPalette generation="legacy">
          <UI.Button testID="legacy">Legacy</UI.Button>
        </NativeRegistryPalette>
      </UI.NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('legacy')).toHaveStyle({ minHeight: 44, borderRadius: 8 });
});

test('preset icon buttons clear legacy padding and long labels keep the source no-wrap behavior', async () => {
  const label = 'A long authored action label';
  await render(
    <UI.ThemeProvider>
      <UI.NativeComponentStyleProvider style="vega">
        <UI.Button size="icon" testID="icon-button" accessibilityLabel="Confirm">
          <Icon />
        </UI.Button>
        <UI.Button>{label}</UI.Button>
      </UI.NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('icon-button')).toHaveStyle({
    width: 36,
    height: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
  });
  expect(screen.getByText(label).props.numberOfLines).toBe(1);
  expect(screen.getByRole('button', { name: label })).toBeTruthy();
});

test('preset button composition preserves both parent and child hover callbacks and link activation', async () => {
  const parentEnter = jest.fn(),
    childEnter = jest.fn(),
    parentLeave = jest.fn(),
    childLeave = jest.fn(),
    navigate = jest.fn();
  await render(
    <UI.ThemeProvider>
      <UI.NativeComponentStyleProvider style="nova">
        <UI.Button asChild variant="outline" onHoverIn={parentEnter} onHoverOut={parentLeave}>
          <UI.LinkButton
            href="/example"
            onNavigate={navigate}
            onHoverIn={childEnter}
            onHoverOut={childLeave}
          >
            Open
          </UI.LinkButton>
        </UI.Button>
      </UI.NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );
  const link = screen.getByRole('link', { name: 'Open' });
  await fireEvent(link, 'hoverIn', {});
  expect(parentEnter).toHaveBeenCalledTimes(1);
  expect(childEnter).toHaveBeenCalledTimes(1);
  await fireEvent(link, 'hoverOut', {});
  expect(parentLeave).toHaveBeenCalledTimes(1);
  expect(childLeave).toHaveBeenCalledTimes(1);
  await fireEvent.press(link);
  expect(navigate).toHaveBeenCalledWith('/example');
});

test('component preset selection styles authored Buttons without leaking Button typography and geometry into compound controls', async () => {
  await render(
    <UI.ThemeProvider>
      <UI.NativeComponentStyleProvider style="sera">
        <UI.Button>Authored button</UI.Button>
        <UI.Toggle>Independent toggle</UI.Toggle>
        <UI.Tabs defaultValue="one">
          <UI.TabsList>
            <UI.TabsTrigger value="one">Independent tab</UI.TabsTrigger>
          </UI.TabsList>
          <UI.TabsContent value="one">Panel</UI.TabsContent>
        </UI.Tabs>
      </UI.NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );
  expect(screen.getByText('Authored button')).toHaveStyle({ textTransform: 'uppercase' });
  expect(screen.getByText('Independent toggle')).not.toHaveStyle({ textTransform: 'uppercase' });
  expect(screen.getByText('Independent tab')).not.toHaveStyle({ textTransform: 'uppercase' });
  expect(screen.getByRole('button', { name: 'Independent toggle' })).toHaveStyle({ minHeight: 44 });
  expect(screen.getByRole('tab', { name: 'Independent tab' })).toHaveStyle({ minHeight: 44 });
});

test('native preset labels grow with OS font scaling and explicit text metrics while icon-only geometry stays stable', async () => {
  await render(
    <UI.ThemeProvider>
      <UI.NativeComponentStyleProvider style="nova">
        <UI.Button testID="scaled">Readable action</UI.Button>
        <UI.Button size="icon" testID="icon-only" accessibilityLabel="Confirm">
          <Icon />
          <UI.Text style={{ position: 'absolute', width: 1, height: 1 }}>
            Hidden confirmation label
          </UI.Text>
        </UI.Button>
        <UI.Button testID="large-type" textStyle={{ fontSize: 30, lineHeight: 36 }}>
          Large label
        </UI.Button>
      </UI.NativeComponentStyleProvider>
    </UI.ThemeProvider>,
  );
  expect(screen.getByTestId('scaled')).toHaveStyle({ height: 32 });
  expect(screen.getByTestId('large-type')).toHaveStyle({ height: 48 });
  await act(() => Dimensions.set({ window: { ...originalWindow, fontScale: 2 } }));
  expect(screen.getByTestId('scaled')).toHaveStyle({ height: 52 });
  expect(screen.getByTestId('large-type')).toHaveStyle({ height: 84 });
  expect(screen.getByTestId('icon-only')).toHaveStyle({ height: 32, width: 32 });
});
