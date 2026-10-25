import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { styling } from './.generated/styling/src';
function Toggle() {
  const { mode, setPreference, colors, radius } = UI.useTheme();
  return (
    <>
      <UI.Button testID="themed" onPress={() => setPreference(mode === 'dark' ? 'light' : 'dark')}>
        Toggle palette
      </UI.Button>
      <UI.Text testID="tokens">{JSON.stringify({ mode, colors, radius })}</UI.Text>
    </>
  );
}
test.each(UI.nativeRegistryThemeNames)(
  'native theme %s applies every color in light and dark modes',
  async (theme) => {
    await render(
      <UI.ThemeProvider theme={theme}>
        <Toggle />
      </UI.ThemeProvider>,
    );
    for (let index = 0; index < 2; index++) {
      const state = JSON.parse(String(screen.getByTestId('tokens').props.children));
      const expected = styling.registryThemes[theme].native[state.mode as 'light' | 'dark'];
      for (const [key, value] of Object.entries(expected)) expect(state.colors[key]).toBe(value);
      expect(screen.getByTestId('themed')).toHaveStyle({
        backgroundColor: expected.primary,
        borderRadius: state.radius,
      });
      await fireEvent.press(screen.getByTestId('themed'));
    }
  },
);
test('controlled registry-theme changes replace colors while preserving the user light/dark preference', async () => {
  const mounted = await render(
    <UI.ThemeProvider theme="theme-slate">
      <Toggle />
    </UI.ThemeProvider>,
  );
  await fireEvent.press(screen.getByTestId('themed'));
  await mounted.rerender(
    <UI.ThemeProvider theme="theme-emerald">
      <Toggle />
    </UI.ThemeProvider>,
  );
  const state = JSON.parse(String(screen.getByTestId('tokens').props.children));
  expect(state.mode).toBe('dark');
  expect(state.colors.primary).toBe(styling.registryThemes['theme-emerald'].native.dark.primary);
});
