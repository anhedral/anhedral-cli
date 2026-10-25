import React from 'react';
import Color from 'colorjs.io';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { styling } from './.generated/styling/src';
import { withAlpha } from './.generated/src/native/_core';
test.each(UI.nativeRegistryThemeNames)(
  'tinted bubbles in %s follow the upstream relative-OKLCH light/dark formula and scope their content surface',
  async (theme) => {
    function Example() {
      const { mode, setPreference } = UI.useTheme();
      return (
        <>
          <UI.Bubble variant="tinted" testID="bubble">
            <UI.BubbleContent testID="surface">
              <UI.Text>Content</UI.Text>
            </UI.BubbleContent>
            <UI.BubbleFooter>Outside surface</UI.BubbleFooter>
          </UI.Bubble>
          <UI.Button onPress={() => setPreference(mode === 'dark' ? 'light' : 'dark')}>
            Toggle mode
          </UI.Button>
          <UI.Text testID="mode">{mode}</UI.Text>
        </>
      );
    }
    await render(
      <UI.ThemeProvider theme={theme}>
        <Example />
      </UI.ThemeProvider>,
    );
    for (let index = 0; index < 2; index++) {
      const mode = screen.getByTestId('mode').props.children as 'light' | 'dark';
      const source = new Color(styling.registryThemes[theme].native[mode].primary).to('oklch');
      source.coords[0] = mode === 'dark' ? 0.3 : 0.93;
      source.coords[1] = (source.coords[1] ?? 0) * 0.4;
      const expected = source.to('srgb').toGamut({ method: 'css' }).toString({ format: 'hex' });
      expect(screen.getByTestId('surface')).toHaveStyle({ backgroundColor: expected });
      expect(screen.getByTestId('bubble')).not.toHaveStyle({ backgroundColor: expected });
      await fireEvent.press(screen.getByRole('button', { name: 'Toggle mode' }));
    }
  },
);
test('native alpha composition retains an existing alpha instead of dimming foreground children', () => {
  expect(withAlpha('#ff000080', 0.5)).toBe('rgba(255, 0, 0, 0.25098039215686274)');
  expect(withAlpha('hsl(0, 0%, 100%)', 0.1)).toBe('rgba(255, 255, 255, 0.1)');
});
