import React from 'react';
import { Platform } from 'react-native';
import { render, screen, act, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { NativeExampleOptions } from './.generated/src/native/registry-example';
for (const family of ['base', 'aria', 'radix'])
  for (const style of ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
    test(`${family}/${style} Avatar source keeps all seven sections, 39 OS images, native filters and 48 fallbacks`, async () => {
      const Component = require(`./.generated/src/examples/${family}/avatar-example`).default;
      await render(
        <UI.ThemeProvider>
          <NativeExampleOptions style={style}>
            <Component />
          </NativeExampleOptions>
        </UI.ThemeProvider>,
      );
      for (const title of [
        'Sizes',
        'Badge',
        'Badge with Icon',
        'Group',
        'Group with Count',
        'Group with Icon Count',
        'In Empty',
      ])
        expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText('No Team Members')).toBeTruthy();
      const images = screen.container.queryAll((node) => node.type === 'Image');
      expect(images).toHaveLength(39);
      await act(() => {
        for (const image of images)
          image.props.onLoad?.({ nativeEvent: { source: { width: 80, height: 40 } } });
      });
      const filtered = screen.container.queryAll((node) => node.type === 'RNSVGImage');
      if (Platform.OS === 'android') expect(filtered).toHaveLength(0);
      else expect(filtered.length).toBeGreaterThan(0);
      await act(() => {
        for (const image of filtered)
          image.props.onLoad?.({ nativeEvent: { source: { width: 80, height: 40 } } });
      });
      expect(screen.getAllByRole('image')).toHaveLength(39);
      expect(
        ['CN', 'JZ', 'PP', 'LR', 'ER'].reduce(
          (count, name) => count + screen.queryAllByText(name).length,
          0,
        ),
      ).toBe(9);
      await act(() => {
        for (const image of images) image.props.onError?.({ nativeEvent: { error: 'offline' } });
      });
      expect(screen.queryAllByRole('image')).toHaveLength(0);
      expect(
        ['CN', 'JZ', 'PP', 'LR', 'ER'].reduce(
          (count, name) => count + screen.queryAllByText(name).length,
          0,
        ),
      ).toBe(48);
      await fireEvent.press(screen.getByRole('button', { name: 'Invite Members' }));
    });
for (const style of ['default', 'new-york', 'new-york-v4'])
  test(`${style} Avatar demo keeps its own frozen image composition`, async () => {
    const Component = require(`./.generated/src/examples/${style}/avatar-demo`).default;
    await render(
      <UI.ThemeProvider>
        <Component />
      </UI.ThemeProvider>,
    );
    const images = screen.container.queryAll((node) => node.type === 'Image');
    expect(images).toHaveLength(style === 'new-york-v4' ? 5 : 1);
    await act(() => {
      for (const image of images)
        image.props.onLoad?.({ nativeEvent: { source: { width: 80, height: 40 } } });
    });
    await act(() => {
      for (const image of screen.container.queryAll((node) => node.type === 'RNSVGImage'))
        image.props.onLoad?.({ nativeEvent: { source: { width: 80, height: 40 } } });
    });
    expect(screen.getAllByRole('image')).toHaveLength(images.length);
  });
