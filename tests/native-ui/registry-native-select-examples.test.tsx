import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { NativeExampleOptions } from './.generated/src/native/registry-example';
for (const family of ['base', 'aria', 'radix'])
  for (const style of ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
    test(`${family}/${style} authored Native Select collections retain sections, native selection and field names`, async () => {
      const Component = require(
        `./.generated/src/examples/${family}/native-select-example`,
      ).default;
      await render(
        <UI.ThemeProvider>
          <NativeExampleOptions style={style}>
            <Component />
          </NativeExampleOptions>
        </UI.ThemeProvider>,
      );
      for (const title of ['Basic', 'With Groups', 'Sizes', 'With Field', 'Disabled', 'Invalid'])
        expect(screen.getAllByText(title).length).toBeGreaterThan(0);
      const country = screen.getByRole('combobox', { name: 'Country' });
      await userEvent.press(country);
      await userEvent.press(screen.getByRole('radio', { name: 'Canada' }));
      expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('Canada');
      const disabled = screen
        .getAllByRole('combobox')
        .find((control) => control.props.accessibilityState.disabled);
      expect(disabled).toBeTruthy();
      await userEvent.press(disabled!);
      expect(screen.queryByRole('radio', { name: 'Apple' })).toBeNull();
    });
