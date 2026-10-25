import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import * as UI from './.generated';
import { styling } from './.generated/styling/src';
import { nativePresetBadgeStyle } from './.generated/src/native/_preset-badge-style';
import { RegistryLink, withRegistryStyles } from './.generated/src/native/registry-styles';
import { Check } from 'lucide-react-native';
const Icon = withRegistryStyles(Check, 'icon');
const window = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...window, fontScale: 1 } }));
afterEach(() => Dimensions.set({ window }));
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
const variants = ['default', 'secondary', 'outline', 'destructive', 'ghost', 'link'] as const;
const mount = (node: React.ReactNode) => render(<UI.ThemeProvider>{node}</UI.ThemeProvider>);
test.each(styles)(
  '%s resolves all authored Badge variants, modes and combined native states',
  (name) => {
    for (const variant of name === 'default' || name === 'new-york'
      ? variants.slice(0, 4)
      : variants)
      for (const mode of ['light', 'dark'] as const)
        for (const state of [
          {},
          {
            isLink: true,
            hovered: true,
            focused: true,
            invalid: true,
            iconStart: true,
            iconEnd: true,
          },
          { isLink: true, hovered: true, disabled: true },
        ]) {
          const result = nativePresetBadgeStyle(name, variant, {
            mode,
            radius: 10,
            colors: {
              ...styling.registryThemes['theme-neutral'].native[mode],
              'destructive-foreground': '#ffffff',
            },
            ...state,
          });
          expect(result.text.fontSize).toBeGreaterThan(0);
          expect(result.view.borderRadius).toBeDefined();
          expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/);
        }
  },
);
test.each([
  ['vega', 20.8, 12],
  ['nova', 20.8, 12],
  ['maia', 20.8, 12],
  ['lyra', 0, 12],
  ['mira', 9999, 10],
  ['luma', 17.6, 12],
  ['sera', 0, 10],
  ['rhea', 14.4, 12],
  ['default', 9999, 12],
  ['new-york', 6, 12],
  ['new-york-v4', 9999, 12],
] as const)(
  '%s renders authored native Badge geometry and text metrics',
  async (name, radius, fontSize) => {
    await mount(
      <UI.NativeComponentStyleProvider style={name}>
        <UI.Badge testID="badge" textStyle={{ fontSize }}>
          <Icon testID="glyph" />
          Badge
        </UI.Badge>
      </UI.NativeComponentStyleProvider>,
    );
    const style = StyleSheet.flatten(screen.getByTestId('badge').props.style);
    expect(style.borderRadius).toBe(radius);
    expect(StyleSheet.flatten(screen.getByText('Badge').props.style).fontSize).toBe(fontSize);
    if (name === 'sera') {
      expect(style.borderWidth).toBe(0);
      expect(style.paddingLeft).toBe(0);
    }
    if (!['default', 'new-york'].includes(name))
      expect(screen.getAllByTestId('glyph')[0]?.props.width).toBe(name === 'mira' ? 10 : 12);
  },
);
test('link-only Badge hover preserves static surfaces, link composition, invalid focus and exactly-once handlers', async () => {
  const navigate = jest.fn(),
    pressed = jest.fn(),
    entered = jest.fn();
  await mount(
    <UI.NativeNavigationProvider onNavigate={navigate}>
      <UI.NativeComponentStyleProvider style="nova">
        <UI.Badge asChild onPress={pressed} onHoverIn={entered} invalid>
          <RegistryLink href="/badge" accessibilityLabel="Badge destination">
            Badge link
          </RegistryLink>
        </UI.Badge>
        <UI.Badge testID="static">Static badge</UI.Badge>
      </UI.NativeComponentStyleProvider>
    </UI.NativeNavigationProvider>,
  );
  const base = StyleSheet.flatten(screen.getByTestId('static').props.style).backgroundColor;
  await fireEvent(screen.getByTestId('static'), 'pointerEnter', {});
  expect(StyleSheet.flatten(screen.getByTestId('static').props.style).backgroundColor).toBe(base);
  await fireEvent(screen.getByRole('link'), 'hoverIn', {});
  expect(entered).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(screen.getByRole('link').props.style).backgroundColor).not.toBe(base);
  await fireEvent(screen.getByRole('link'), 'focus', {});
  expect(StyleSheet.flatten(screen.getByRole('link').props.style).boxShadow).toBeDefined();
  await fireEvent.press(screen.getByRole('link'));
  expect(pressed).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledTimes(1);
});
test('functional render props preserve native callback ownership and Sera link-only foreground', async () => {
  const pressed = jest.fn(),
    anchor = jest.fn();
  await mount(
    <UI.NativeNavigationProvider onAnchor={anchor}>
      <UI.NativeComponentStyleProvider style="sera">
        <UI.Badge onPress={pressed} render={(props) => <RegistryLink {...props} href="#" />}>
          Open
        </UI.Badge>
      </UI.NativeComponentStyleProvider>
    </UI.NativeNavigationProvider>,
  );
  const original = StyleSheet.flatten(screen.getByText('Open').props.style).color;
  await fireEvent(screen.getByRole('link'), 'hoverIn', {});
  expect(StyleSheet.flatten(screen.getByText('Open').props.style).color).not.toBe(original);
  await fireEvent.press(screen.getByRole('link'));
  expect(pressed).toHaveBeenCalledTimes(1);
  expect(anchor).toHaveBeenCalledTimes(1);
});
test('Badge native font scaling, icon placement and consumer style overrides retain their own slots', async () => {
  Dimensions.set({ window: { ...window, fontScale: 2 } });
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <UI.Badge testID="scaled" style={{ borderRadius: 4 }}>
        <Icon registryIcon="inline-start" />
        Scale
      </UI.Badge>
      <UI.AvatarBadge testID="avatar">A</UI.AvatarBadge>
    </UI.NativeComponentStyleProvider>,
  );
  const badge = StyleSheet.flatten(screen.getByTestId('scaled').props.style);
  expect(badge.height).toBeGreaterThan(20);
  expect(badge.borderRadius).toBe(4);
  expect(badge.paddingLeft).toBe(6);
  const avatar = StyleSheet.flatten(screen.getByTestId('avatar').props.style);
  expect(avatar.height).toBeUndefined();
  expect(avatar.borderRadius).toBe(12);
});

test('shared CVA evaluation preserves finite compound conditions and rejects unknown bindings and slots', () => {
  const { nativePresetStyle } = require('./.generated/src/native/_preset-style');
  const metrics = { sm: 0.6, md: 0.8, lg: 1, xl: 1.4, '2xl': 1.8, '3xl': 2.2, '4xl': 2.6 };
  const recipe = {
    base: 'text-xs',
    variants: { variant: { default: 'bg-background', outline: 'border' } },
    defaultVariants: { variant: 'default' },
    compoundVariants: [
      {
        when: { variant: ['default', 'outline'], isLink: true },
        className: 'bg-primary text-primary-foreground',
      },
    ],
  };
  const colors = styling.registryThemes['theme-neutral'].native.light;
  const selected = nativePresetStyle(
    'nova',
    'badge',
    recipe,
    undefined,
    metrics,
    { variant: 'default' },
    { mode: 'light', radius: 8, colors, isLink: true },
  );
  expect(selected.view.backgroundColor).toBe(colors.primary);
  const plain = nativePresetStyle(
    'nova',
    'badge',
    recipe,
    undefined,
    metrics,
    { variant: 'default' },
    { mode: 'light', radius: 8, colors, isLink: false },
  );
  expect(plain.view.backgroundColor).toBe(colors.background);
  expect(() =>
    nativePresetStyle(
      'nova',
      'badge',
      recipe,
      undefined,
      metrics,
      { variant: 'unknown' },
      { mode: 'light', radius: 8, colors, isLink: true },
    ),
  ).toThrow(/Unknown native badge source slot/);
  expect(() =>
    nativePresetStyle(
      'nova',
      'badge',
      recipe,
      undefined,
      metrics,
      { variant: 'default' },
      { mode: 'light', radius: 8, colors },
    ),
  ).toThrow(/Unbound native badge compound condition/);
});

test('authored Badge utility colors and explicit consumer text overrides take precedence over source variants', async () => {
  const StyledBadge = withRegistryStyles(UI.Badge);
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <StyledBadge className="bg-blue-600 text-blue-50" testID="custom">
        Custom color
      </StyledBadge>
      <StyledBadge className="text-blue-50" textStyle={{ color: '#123456', fontSize: 18 }}>
        Explicit color
      </StyledBadge>
    </UI.NativeComponentStyleProvider>,
  );
  expect(StyleSheet.flatten(screen.getByText('Custom color').props.style).color).not.toBe(
    'hsl(0, 0%, 98%)',
  );
  expect(StyleSheet.flatten(screen.getByText('Explicit color').props.style)).toMatchObject({
    color: '#123456',
    fontSize: 18,
  });
  expect(StyleSheet.flatten(screen.getByTestId('custom').props.style).backgroundColor).not.toBe(
    'hsl(0, 0%, 9%)',
  );
});

for (const base of ['base', 'radix', 'aria'])
  for (const style of styles.slice(0, 8)) {
    test(`${base} authored Badge example retains every variant and custom color in ${style}`, async () => {
      const Example = require(`./.generated/src/examples/${base}/badge-example`).default;
      const errors = jest.spyOn(console, 'error'),
        warnings = jest.spyOn(console, 'warn');
      try {
        await mount(
          <UI.NativeComponentStyleProvider style={style}>
            <Example />
          </UI.NativeComponentStyleProvider>,
        );
        expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
        expect(errors).not.toHaveBeenCalled();
        expect(warnings).not.toHaveBeenCalled();
      } finally {
        errors.mockRestore();
        warnings.mockRestore();
      }
    });
  }

test('functional Badge content owns its rendered children, scaled geometry and direct glyph placement', async () => {
  Dimensions.set({ window: { ...window, fontScale: 2 } });
  await mount(
    <UI.NativeComponentStyleProvider style="nova">
      <UI.Badge
        render={(props) => (
          <RegistryLink {...props} href="#">
            <Icon registryIcon="inline-start" />
            Rendered label
          </RegistryLink>
        )}
      >
        Original label
      </UI.Badge>
    </UI.NativeComponentStyleProvider>,
  );
  expect(screen.queryByText('Original label')).toBeNull();
  const style = StyleSheet.flatten(screen.getByRole('link').props.style);
  expect(style.height).toBeGreaterThan(20);
  expect(style.paddingLeft).toBe(6);
});
