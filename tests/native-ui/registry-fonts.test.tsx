import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as UI from './.generated';
import catalog from './.generated/native-fonts.json';
import * as ExpoFont from 'expo-font';
import { Text as NativeText } from 'react-native';
jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => false),
  loadAsync: jest.fn(async () => {}),
}));
beforeEach(() => jest.clearAllMocks());
test.each(UI.nativeFontIds)(
  'native font %s exposes every real cut, immutable URI, license and weight selection',
  (id) => {
    const info = UI.nativeFontDetails(id),
      sources = UI.nativeFontSources([id]);
    const item = catalog.items[id],
      family = catalog.families[item.family as keyof typeof catalog.families];
    expect(info.variants.length).toBe(family.variants.length);
    expect(info.license.text).toContain('LICENSE');
    for (const cut of info.variants) {
      const name = 'Anhedral_' + cut.name;
      expect(sources[name]!.uri).toContain('/' + catalog.source.commit + '/');
      expect(sources[name]!.uri).toContain('/' + cut.file);
      expect(UI.nativeFontStyle(id, cut.weight, cut.italic)).toEqual({
        fontFamily: name,
        fontWeight: 'normal',
        fontStyle: 'normal',
      });
    }
    expect(Object.keys(sources)).toHaveLength(info.variants.length);
  },
);
test('body and heading roles share cuts without duplicate native font requests', () => {
  expect(UI.nativeFontSources(['font-inter', 'font-heading-inter'])).toEqual(
    UI.nativeFontSources(['font-inter']),
  );
  expect(UI.nativeFontDetails('font-heading-inter').role).toBe('heading');
  expect(UI.nativeFontStyle('font-manrope', 100).fontFamily).toBe('Anhedral_Manrope_200ExtraLight');
  expect(UI.nativeFontStyle('font-manrope', 400, true).fontStyle).toBe('italic');
  expect(() => UI.nativeFontStyle('font-inter', NaN)).toThrow(/weight/);
});
test('native font provider gates children until loading, applies body/heading cuts and preserves custom font overrides', async () => {
  await render(
    <UI.ThemeProvider>
      <UI.NativeFontProvider fonts={{ sans: 'font-inter', heading: 'font-heading-geist' }}>
        <UI.Button>Continue</UI.Button>
        <UI.TypographyH1>Heading</UI.TypographyH1>
        <UI.TypographyP style={{ fontWeight: '700' }}>Body</UI.TypographyP>
        <UI.TypographyP style={{ fontFamily: 'Custom' }}>Custom font</UI.TypographyP>
      </UI.NativeFontProvider>
    </UI.ThemeProvider>,
  );
  await waitFor(() => expect(screen.getByText('Continue')).toBeOnTheScreen());
  expect(ExpoFont.loadAsync).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Continue')).toHaveStyle({
    fontFamily: 'Anhedral_Inter_500Medium',
    fontWeight: 'normal',
  });
  expect(screen.getByText('Body')).toHaveStyle({
    fontFamily: 'Anhedral_Inter_700Bold',
    fontWeight: 'normal',
  });
  expect(screen.getByText('Heading')).toHaveStyle({ fontFamily: 'Anhedral_Geist_700Bold' });
  expect(screen.getByText('Custom font')).toHaveStyle({ fontFamily: 'Custom' });
});
test('native font loading failures expose a retry and recover without leaving children in a partial font state', async () => {
  jest.mocked(ExpoFont.loadAsync).mockRejectedValueOnce(new Error('Offline'));
  await render(
    <UI.NativeFontProvider fonts={{ sans: 'font-inter' }}>
      <NativeText>Ready</NativeText>
    </UI.NativeFontProvider>,
  );
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to load fonts.'));
  expect(screen.queryByText('Ready')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry fonts' }));
  await waitFor(() => expect(screen.getByText('Ready')).toBeOnTheScreen());
});
test('font selection changes and unmount cancel stale completion callbacks', async () => {
  let finish: (() => void) | undefined;
  jest.mocked(ExpoFont.loadAsync).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const mounted = await render(
    <UI.NativeFontProvider fonts={{ sans: 'font-inter' }}>
      <NativeText>Old</NativeText>
    </UI.NativeFontProvider>,
  );
  await waitFor(() => expect(ExpoFont.loadAsync).toHaveBeenCalledTimes(1));
  await mounted.rerender(
    <UI.ThemeProvider>
      <UI.NativeFontProvider fonts={{ sans: 'font-geist' }}>
        <UI.Text>New</UI.Text>
      </UI.NativeFontProvider>
    </UI.ThemeProvider>,
  );
  await waitFor(() => expect(screen.getByText('New')).toBeOnTheScreen());
  await act(async () => {
    finish?.();
  });
  expect(screen.queryByText('Old')).toBeNull();
  await mounted.unmount();
});

test('native SVG labels select the real font cut for nested weight, italic and monospace variants', async () => {
  const { TSpan } = require('./.generated/src/native/charts');
  const { withRegistryStyles } = require('./.generated/src/native/registry-styles');
  const StyledSpan = withRegistryStyles(TSpan, 'svg');
  await render(
    <UI.ThemeProvider>
      <UI.NativeFontProvider fonts={{ sans: 'font-inter', mono: 'font-jetbrains-mono' }}>
        <UI.ChartContainer>
          <UI.PieChart>
            <UI.Pie data={[{ value: 10 }]} dataKey="value">
              <UI.ChartLabel
                content={({ viewBox }) => (
                  <UI.ChartText x={viewBox.cx} y={viewBox.cy} fontWeight={500}>
                    <TSpan testID="medium-cut">Medium</TSpan>
                    <StyledSpan testID="bold-cut" className="font-bold">
                      Bold
                    </StyledSpan>
                    <StyledSpan testID="mono-cut" className="font-mono">
                      Mono
                    </StyledSpan>
                    <TSpan testID="italic-cut" fontStyle="italic">
                      Italic
                    </TSpan>
                    <TSpan testID="custom-cut" fontFamily="Custom">
                      Custom
                    </TSpan>
                  </UI.ChartText>
                )}
              />
            </UI.Pie>
          </UI.PieChart>
        </UI.ChartContainer>
      </UI.NativeFontProvider>
    </UI.ThemeProvider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId('medium-cut', { includeHiddenElements: true })).toBeOnTheScreen(),
  );
  const font = (id: string) => screen.getByTestId(id, { includeHiddenElements: true }).props.font;
  expect(font('medium-cut').fontFamily).toBe('Anhedral_Inter_500Medium');
  expect(font('bold-cut').fontFamily).toBe('Anhedral_Inter_700Bold');
  expect(font('mono-cut').fontFamily).toBe('Anhedral_JetBrainsMono_500Medium');
  expect(font('italic-cut').fontFamily).toBe('Anhedral_Inter_500Medium_Italic');
  expect(font('custom-cut').fontFamily).toBe('Custom');
});
