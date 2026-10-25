import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { NativeExampleOptions } from './.generated/src/native/registry-example';
const styles = ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const;
for (const family of ['base', 'aria', 'radix'])
  for (const style of styles)
    test(`${family}/${style} Empty examples retain all six compositions, native inputs and actual link/inert-button behavior`, async () => {
      const anchor = jest.fn(),
        Component = require(`./.generated/src/examples/${family}/empty-example`).default;
      await render(
        <UI.ThemeProvider>
          <UI.NativeNavigationProvider onAnchor={anchor}>
            <NativeExampleOptions style={style}>
              <Component />
            </NativeExampleOptions>
          </UI.NativeNavigationProvider>
        </UI.ThemeProvider>,
      );
      expect(screen.getAllByText('No projects yet')).toHaveLength(2);
      expect(screen.getAllByText('404 - Not Found')).toHaveLength(2);
      expect(screen.getByText('No results found')).toBeTruthy();
      expect(screen.getByText('Nothing to see here')).toBeTruthy();
      expect(screen.getAllByPlaceholderText('Try searching for pages...')).toHaveLength(2);
      const create = screen.getAllByRole('link', { name: 'Create project' })[0]!;
      await fireEvent.press(create);
      expect(anchor).toHaveBeenCalledWith('', { replace: undefined, scroll: undefined });
      await fireEvent.press(screen.getAllByRole('link', { name: 'Contact support' })[0]!);
      expect(anchor).toHaveBeenCalledTimes(2);
      await fireEvent.press(screen.getByRole('button', { name: 'New Post' }));
      expect(anchor).toHaveBeenCalledTimes(2);
    });
for (const name of [
  'empty-demo',
  'empty-icon',
  'empty-outline',
  'empty-background',
  'empty-input-group',
  'empty-avatar',
  'empty-avatar-group',
])
  test(`authored ${name} retains its actual Empty source composition`, async () => {
    const Component = require(`./.generated/src/examples/new-york-v4/${name}`).default;
    await render(
      <UI.ThemeProvider>
        <Component />
      </UI.ThemeProvider>,
    );
    expect(screen.getAllByRole('header').length).toBeGreaterThan(0);
    if (name === 'empty-demo') {
      expect(screen.getByText('No Projects Yet')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Create Project' })).toBeTruthy();
    }
    if (name === 'empty-icon') {
      expect(screen.getByText('No messages')).toBeTruthy();
      expect(screen.getByText('No favorites')).toBeTruthy();
    }
    if (name === 'empty-outline')
      expect(screen.getByRole('button', { name: 'Upload Files' })).toBeTruthy();
    if (name === 'empty-background')
      expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
    if (name === 'empty-input-group')
      expect(screen.getByPlaceholderText('Try searching for pages...')).toBeTruthy();
  });
