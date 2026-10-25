import React from 'react';
import { View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import * as UI from './.generated';
import { IconPlaceholder } from './.generated/src/native/registry-example';
import { nativeRegistryIcons } from './.generated/src/native/registry-icons';
test('every authored official Lucide selection resolves to a real native SVG icon', async () => {
  const names = Object.keys(nativeRegistryIcons) as (keyof typeof nativeRegistryIcons)[];
  const warn = jest.spyOn(console, 'warn'),
    error = jest.spyOn(console, 'error');
  try {
    await render(
      <UI.ThemeProvider>
        <View>
          {names.map((name) => (
            <IconPlaceholder key={name} lucide={name} testID={name} className="size-4" />
          ))}
        </View>
      </UI.ThemeProvider>,
    );
    for (const name of names) expect(screen.getAllByTestId(name)[0]!).toBeOnTheScreen();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  } finally {
    warn.mockRestore();
    error.mockRestore();
  }
});
