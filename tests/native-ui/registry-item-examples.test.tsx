import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { NativeExampleOptions } from './.generated/src/native/registry-example';
for (const family of ['base', 'aria', 'radix'])
  for (const style of ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
    test(`${family}/${style} authored Item examples keep variants, sizes, links, groups and image compositions`, async () => {
      const Component = require(`./.generated/src/examples/${family}/item-example`).default;
      await render(
        <UI.ThemeProvider>
          <NativeExampleOptions style={style}>
            <Component />
          </NativeExampleOptions>
        </UI.ThemeProvider>,
      );
      for (const title of ['Default', 'Outline', 'Muted'])
        expect(screen.getAllByText(title).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Title Only').length).toBeGreaterThanOrEqual(9);
      expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
      expect(screen.container.queryAll((node) => node.type === 'Image').length).toBeGreaterThan(0);
      const actions = screen.getAllByRole('button', { name: 'Action' });
      expect(actions.length).toBeGreaterThan(20);
      await fireEvent.press(actions[0]!);
    });
for (const name of [
  'item-demo',
  'item-size',
  'item-image',
  'item-header',
  'item-link',
  'item-icon',
  'item-variant',
  'item-avatar',
  'item-group',
])
  test(`New York V4 authored ${name} retains its own complete source composition`, async () => {
    const Component = require(`./.generated/src/examples/new-york-v4/${name}`).default;
    await render(
      <UI.ThemeProvider>
        <UI.NativeNavigationProvider onNavigate={jest.fn()} onAnchor={jest.fn()}>
          <Component />
        </UI.NativeNavigationProvider>
      </UI.ThemeProvider>,
    );
    expect(screen.container.queryAll((node) => node.type === 'View').length).toBeGreaterThan(0);
    for (const button of screen.queryAllByRole('button')) await fireEvent.press(button);
    for (const link of screen.queryAllByRole('link')) await fireEvent.press(link);
  });
