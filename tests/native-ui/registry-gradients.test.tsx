import React from 'react';
import { processColor } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import * as UI from './.generated';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import { RegistryView, withRegistryStyles } from './.generated/src/native/registry-styles';
import { registryStyle } from './.generated/src/native/_registry-css';
import { nativeRegistryGradient } from './.generated/src/native/_gradient';
import { withAlpha } from './.generated/src/native/_core';
type Node = { type: string; props: Record<string, any>; children?: unknown[] };
function nodes(value: unknown): Node[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(nodes);
  const n = value as Node;
  return [n, ...(n.children ?? []).flatMap(nodes)];
}
const gradients = () => nodes(screen.toJSON()).filter((n) => n.type === 'RNSVGLinearGradient');
test('authored Empty background retains its real 30% stop, native color alpha, rounded surface and live theme updates', async () => {
  const Component = require('./.generated/src/examples/new-york-v4/empty-background').default;
  let theme: ReturnType<typeof UI.useTheme> | undefined;
  function Probe() {
    theme = UI.useTheme();
    return null;
  }
  await render(
    <UI.ThemeProvider>
      <NativeRegistryPalette generation="modern" source="new-york-v4">
        <Probe />
        <Component />
      </NativeRegistryPalette>
    </UI.ThemeProvider>,
  );
  expect(gradients()).toHaveLength(1);
  const id = gradients()[0]!.props.name;
  const verify = () => {
    expect(gradients()[0]!.props.gradient).toEqual([
      0.3,
      (processColor(withAlpha(theme!.colors.muted!, 0.5)) as number) | 0,
      1,
      (processColor(theme!.colors.background) as number) | 0,
    ]);
    expect(gradients()[0]!.props).toMatchObject({ x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
  };
  verify();
  expect(
    nodes(screen.toJSON()).some(
      (n) =>
        n.props.pointerEvents === 'none' &&
        n.props.importantForAccessibility === 'no-hide-descendants',
    ),
  ).toBe(true);
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
  await act(() => theme!.setPreference('dark'));
  verify();
  expect(gradients()[0]!.props.name).toBe(id);
});
test('native gradient coordinates, transparent endpoints and unpositioned via stops preserve source geometry and alpha', () => {
  const paint = registryStyle(
    'bg-gradient-to-r from-red-500/50 from-30% via-white/25 to-blue-500',
    {
      width: 320,
      color: (token) =>
        (
          ({
            'red-500/50': 'rgba(255,0,0,0.5)',
            'white/25': 'rgba(255,255,255,0.25)',
            'blue-500': '#0000ff',
          }) as Record<string, string>
        )[token]!,
      radius: 10,
    },
  ).paint;
  expect(nativeRegistryGradient(paint)).toMatchObject({
    x1: '0%',
    x2: '100%',
    y1: '0%',
    y2: '0%',
    stops: [
      { offset: 0.3, color: '#f00', opacity: 0.5 },
      { offset: 0.65, color: '#fff', opacity: 0.25 },
      { offset: 1, color: '#00f', opacity: 1 },
    ],
  });
  const transparent = nativeRegistryGradient({ gradientDirection: 'b', gradientFrom: '#112233' })!;
  expect(transparent.stops[1]).toMatchObject({ offset: 1, color: '#123', opacity: 0 });
  expect(() => nativeRegistryGradient({ gradientDirection: 'sideways' })).toThrow(/direction/);
  expect(() => nativeRegistryGradient({ gradientDirection: 'b', gradientFromOffset: NaN })).toThrow(
    /finite/,
  );
  expect(() => nativeRegistryGradient({ gradientDirection: 'b', gradientToOffset: 1.5 })).toThrow(
    /100%/,
  );
});
test('native background paint does not intercept a source pressable recipe action', async () => {
  const press = jest.fn();
  await render(
    <UI.ThemeProvider>
      <RegistryView
        className="bg-gradient-to-b from-muted/50 to-background rounded-lg p-4"
        onPress={press}
        accessibilityLabel="Gradient action"
      >
        Continue
      </RegistryView>
    </UI.ThemeProvider>,
  );
  expect(gradients()).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Gradient action' }));
  expect(press).toHaveBeenCalledTimes(1);
});
test('gradient utilities reject unsupported or ambiguous native hosts instead of dropping source paint', async () => {
  const Header = withRegistryStyles(UI.EmptyHeader, 'view');
  await expect(
    render(
      <UI.ThemeProvider>
        <Header className="bg-gradient-to-b from-muted to-background">Header</Header>
      </UI.ThemeProvider>,
    ),
  ).rejects.toThrow(/supported background host/);
  await expect(
    render(
      <UI.ThemeProvider>
        <RegistryView className="bg-gradient-to-b from-muted to-background overflow-y-auto">
          Scroll
        </RegistryView>
      </UI.ThemeProvider>,
    ),
  ).rejects.toThrow(/separate background surface/);
});
