import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as UI from './.generated';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import { RegistryView } from './.generated/src/native/registry-styles';
import { styling } from './.generated/styling/src';
for (const style of ['default', 'new-york']) {
  test(`${style} authored pagination retains actual selection and native end boundaries`, async () => {
    const Component = require(`./.generated/src/examples/${style}/pagination-demo`).default;
    await render(
      <UI.ThemeProvider>
        <Component />
      </UI.ThemeProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: '3' }));
    expect(screen.getByRole('button', { name: '3' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: '1' }));
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });
  test(`${style} authored carousel API counter follows actual native selection`, async () => {
    const Component = require(`./.generated/src/examples/${style}/carousel-api`).default;
    await render(
      <UI.ThemeProvider>
        <Component />
      </UI.ThemeProvider>,
    );
    expect(screen.getByText('Slide 1 of 5')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Next slide' }));
    expect(screen.getByText('Slide 2 of 5')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Previous slide' }));
    expect(screen.getByText('Slide 1 of 5')).toBeTruthy();
  });
  test(`${style} authored controlled OTP updates its original feedback text`, async () => {
    const Component = require(`./.generated/src/examples/${style}/input-otp-controlled`).default;
    await render(
      <UI.ThemeProvider>
        <Component />
      </UI.ThemeProvider>,
    );
    expect(screen.getByText('Enter your one-time password.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('One-time code'), '123456');
    expect(screen.getByText('You entered: 123456')).toBeTruthy();
    expect(screen.getByLabelText('Digit 6 of 6')).toHaveTextContent('6');
  });
}
test('legacy and modern utility colors/shadows remain separate when rendered beside one another', async () => {
  await render(
    <UI.ThemeProvider>
      <NativeRegistryPalette generation="legacy">
        <RegistryView testID="legacy" className="bg-red-500 shadow-sm" />
      </NativeRegistryPalette>
      <NativeRegistryPalette generation="modern">
        <RegistryView testID="modern" className="bg-red-500 shadow-sm" />
      </NativeRegistryPalette>
    </UI.ThemeProvider>,
  );
  const legacy = StyleSheet.flatten(screen.getByTestId('legacy').props.style),
    modern = StyleSheet.flatten(screen.getByTestId('modern').props.style);
  expect(legacy.backgroundColor).toBe(styling.registryColors['red-500']);
  expect(modern.backgroundColor).toBe(styling.utilityColors['red-500']);
  expect(legacy.backgroundColor).not.toBe(modern.backgroundColor);
  expect(legacy.boxShadow).toEqual([
    { offsetX: 0, offsetY: 1, blurRadius: 2, spreadDistance: 0, color: 'rgba(0,0,0,0.05)' },
  ]);
  expect(modern.boxShadow).toHaveLength(2);
});
test('legacy destructive buttons and badges preserve filled surfaces and contrasting labels', async () => {
  function Samples() {
    const { colors } = UI.useTheme();
    return (
      <>
        <UI.Text testID="tokens">{JSON.stringify(colors)}</UI.Text>
        <NativeRegistryPalette generation="legacy">
          <UI.Button variant="destructive" testID="legacy-button">
            Legacy button
          </UI.Button>
          <UI.Badge variant="destructive" testID="legacy-badge">
            Legacy badge
          </UI.Badge>
        </NativeRegistryPalette>
        <UI.Button variant="destructive" testID="modern-button">
          Modern button
        </UI.Button>
        <UI.Badge variant="destructive" testID="modern-badge">
          Modern badge
        </UI.Badge>
      </>
    );
  }
  await render(
    <UI.ThemeProvider>
      <Samples />
    </UI.ThemeProvider>,
  );
  const colors = JSON.parse(String(screen.getByTestId('tokens').props.children));
  for (const id of ['legacy-button', 'legacy-badge'])
    expect(screen.getByTestId(id)).toHaveStyle({ backgroundColor: colors.destructive });
  for (const text of ['Legacy button', 'Legacy badge'])
    expect(screen.getByText(text)).toHaveStyle({ color: colors['destructive-foreground'] });
  for (const id of ['modern-button', 'modern-badge'])
    expect(screen.getByTestId(id)).not.toHaveStyle({ backgroundColor: colors.destructive });
  for (const text of ['Modern button', 'Modern badge'])
    expect(screen.getByText(text)).toHaveStyle({ color: colors.destructive });
});
