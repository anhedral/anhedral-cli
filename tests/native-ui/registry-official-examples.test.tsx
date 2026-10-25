import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import catalog from './.generated/NATIVE_RECIPES.json';
const examples = catalog.recipes.filter(
  (recipe) =>
    recipe.kind === 'example' &&
    !recipe.name.startsWith('chart-') &&
    !recipe.name.startsWith('form-'),
);
for (const recipe of examples) {
  test(`${recipe.style}/${recipe.name} retains its authored native layout without browser hosts or warnings`, async () => {
    const Component = require(`./.generated/src/examples/${recipe.style}/${recipe.name}`)[
      'export' in recipe && typeof recipe.export === 'string' ? recipe.export : 'default'
    ];
    const warn = jest.spyOn(console, 'warn'),
      error = jest.spyOn(console, 'error');
    try {
      await render(
        <UI.ThemeProvider>
          <Component />
        </UI.ThemeProvider>,
      );
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });
}
test('the authored pagination example selects pages and disables native end boundaries', async () => {
  const Component = require('./.generated/src/examples/new-york-v4/pagination-demo').default;
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

test('recipe style conditions change layout through the explicit preview context and preserve native percentage widths', async () => {
  const { RegistryView } = require('./.generated/src/native/registry-styles');
  const { NativeExampleOptions } = require('./.generated/src/native/_registry-context');
  const { StyleSheet } = require('react-native');
  const frame = (style: string) => (
    <UI.ThemeProvider>
      <NativeExampleOptions style={style}>
        <RegistryView testID="conditional" className="w-[60%] style-nova:p-4 style-lyra:p-2" />
      </NativeExampleOptions>
    </UI.ThemeProvider>
  );
  const view = await render(frame('nova'));
  expect(StyleSheet.flatten(screen.getByTestId('conditional').props.style)).toMatchObject({
    width: '60%',
    padding: 16,
  });
  await view.rerender(frame('lyra'));
  expect(StyleSheet.flatten(screen.getByTestId('conditional').props.style)).toMatchObject({
    width: '60%',
    padding: 8,
  });
});

for (const source of ['base', 'radix', 'aria'])
  for (const style of ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
    test(`${source}/${style} authored Card examples retain all sections, selection, lists and inert unassociated submission`, async () => {
      const Component = require(`./.generated/src/examples/${source}/card-example`).default;
      const { NativeExampleOptions } = require('./.generated/src/native/_registry-context');
      await render(
        <UI.ThemeProvider>
          <NativeExampleOptions style={style}>
            <Component />
          </NativeExampleOptions>
        </UI.ThemeProvider>,
      );
      for (const name of [
        'Default Size',
        'Small Size',
        'Content Edge to Edge',
        'Custom Spacing',
        'Header with Border',
        'Footer with Border',
        'Header with Border (Small)',
        'Footer with Border (Small)',
        'With Image',
        'With Image (Small)',
        'Meeting Notes',
        'Login',
      ])
        expect(screen.getAllByText(name).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
      expect(
        screen.getByRole('listitem', { name: '1. New analytics widgets for daily/weekly metrics' }),
      ).toBeTruthy();
      const spacing = screen.getByRole('button', { name: '24px' });
      await fireEvent.press(spacing);
      expect(screen.getByRole('button', { name: '24px' }).props.accessibilityState.selected).toBe(
        true,
      );
      expect(screen.getByRole('button', { name: '16px' }).props.accessibilityState.selected).toBe(
        false,
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Login' }));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByLabelText('Email').props.accessibilityHint).toContain('Required');
    });
