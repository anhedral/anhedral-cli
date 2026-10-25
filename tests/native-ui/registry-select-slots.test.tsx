import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import * as presets from './.generated/src/native/_preset-select-style';
import { nativeSelectPresetSource as source } from './.generated/src/native/_select-presets';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';

test('every reviewed Select source slot is consumed by the real native adapter or has an explicit platform decision', async () => {
  const used = new Set<string>(),
    actual = presets.nativePresetSelectStyle;
  const spy = jest.spyOn(presets, 'nativePresetSelectStyle').mockImplementation((...args) => {
    const result = actual(...args);
    used.add(result.source + '/' + args[1] + '/' + (args[3] ?? 0));
    return result;
  });
  try {
    for (const family of Object.keys(source.sources) as (keyof typeof source.sources)[]) {
      const view = await render(
        <UI.ThemeProvider>
          <NativeRegistryPalette
            source={family}
            generation={family === 'default' || family === 'new-york' ? 'legacy' : 'modern'}
          >
            <UI.Select defaultOpen defaultValue="a">
              <UI.SelectTrigger>
                <UI.SelectValue />
              </UI.SelectTrigger>
              <UI.SelectContent>
                <UI.SelectInput />
                <UI.SelectList>
                  <UI.SelectGroup>
                    <UI.SelectLabel>Category</UI.SelectLabel>
                    <UI.SelectItem value="a">Alpha</UI.SelectItem>
                    <UI.SelectSeparator />
                  </UI.SelectGroup>
                  <UI.SelectEmpty>No choices</UI.SelectEmpty>
                </UI.SelectList>
              </UI.SelectContent>
            </UI.Select>
          </NativeRegistryPalette>
        </UI.ThemeProvider>,
      );
      await fireEvent.changeText(screen.getByLabelText('Search options'), 'missing');
      expect(screen.getByText('No choices')).toBeOnTheScreen();
      await view.unmount();
    }
    const missing = Object.entries(source.slotPolicy)
      .filter(([key, policy]) => policy.classification === 'native-slot' && !used.has(key))
      .map(([key]) => key);
    expect(missing).toEqual([]);
    for (const [key, policy] of Object.entries(source.slotPolicy))
      if (policy.classification !== 'native-slot') expect(policy.reason.length).toBeGreaterThan(20);
  } finally {
    spy.mockRestore();
  }
});
