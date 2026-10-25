import { nativePresetEmptyStyle } from './.generated/src/native/_preset-empty-style';
import { nativeEmptyPresetSource as source } from './.generated/src/native/_empty-presets';
const state = {
  mode: 'light' as const,
  radius: 10,
  fontScale: 1,
  colors: {
    background: '#ffffff',
    foreground: '#111111',
    card: '#ffffff',
    'card-foreground': '#111111',
    primary: '#112233',
    secondary: '#dddddd',
    muted: '#eeeeee',
    'muted-foreground': '#777777',
    input: '#dddddd',
    border: '#dddddd',
    ring: '#555555',
    destructive: '#ff0000',
  },
};
const names = [...Object.keys(source.presets), 'default', 'new-york', 'new-york-v4'] as any[];
test('Empty strictly accounts for all thirty-six source slots, styles, variants, modes, widths and font scales', () => {
  const errors = new Set<string>();
  for (const name of names)
    for (const family of ['base', 'aria', 'radix'] as const)
      for (const variant of ['default', 'icon'] as const)
        for (const mode of ['light', 'dark'] as const)
          for (const width of [390, 1024])
            for (const fontScale of [1, 2])
              for (const slot of [
                'Empty',
                'EmptyHeader',
                'EmptyMedia',
                'EmptyTitle',
                'EmptyDescription',
                'EmptyContent',
              ] as const)
                try {
                  nativePresetEmptyStyle(name, slot, {
                    ...state,
                    source: family,
                    variant,
                    mode,
                    width,
                    fontScale,
                  });
                } catch (error) {
                  errors.add(name + '/' + family + '/' + slot + ': ' + (error as Error).message);
                }
  expect([...errors]).toEqual([]);
});
test('Empty retains source padding, media/glyph sizes, compact typography, header/content gaps and heading roles', () => {
  const expected = {
    nova: [24, 32, 16, 14, 20, 8, 10],
    vega: [48, 40, 24, 18, 28, 8, 16],
    maia: [48, 40, 24, 18, 28, 8, 16],
    lyra: [24, 32, 16, 14, 20, 8, 10],
    mira: [24, 32, 16, 14, 20, 4, 8],
    luma: [48, 40, 20, 18, 28, 8, 16],
    sera: [48, 40, 20, 18, 28, 8, 16],
    rhea: [48, 40, 20, 18, 28, 8, 16],
  };
  for (const [
    name,
    [padding, media, glyph, fontSize, lineHeight, headerGap, contentGap],
  ] of Object.entries(expected)) {
    expect(nativePresetEmptyStyle(name as any, 'Empty', state).view).toMatchObject({
      padding,
      gap: 16,
    });
    const icon = nativePresetEmptyStyle(name as any, 'EmptyMedia', {
      ...state,
      variant: 'icon',
      fontScale: 2,
    });
    expect(icon.view).toMatchObject({ width: media, height: media, marginBottom: 8 });
    expect(icon.iconSize).toBe(glyph);
    expect(icon.glyphPointerEvents).toBe(true);
    const title = nativePresetEmptyStyle(name as any, 'EmptyTitle', state);
    expect(title.text).toMatchObject({ fontSize, lineHeight });
    expect(title.fontRole).toBe('heading');
    expect(nativePresetEmptyStyle(name as any, 'EmptyHeader', state).view.gap).toBe(headerGap);
    expect(nativePresetEmptyStyle(name as any, 'EmptyContent', state).view.gap).toBe(contentGap);
  }
  expect(nativePresetEmptyStyle('sera', 'EmptyTitle', state).text).toMatchObject({
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  });
  for (const name of ['default', 'new-york', 'new-york-v4'] as const) {
    expect(nativePresetEmptyStyle(name, 'Empty', { ...state, width: 390 }).view).toMatchObject({
      padding: 24,
      gap: 24,
    });
    expect(nativePresetEmptyStyle(name, 'Empty', { ...state, width: 1024 }).view.padding).toBe(48);
    expect(nativePresetEmptyStyle(name, 'EmptyTitle', state).text).toMatchObject({
      fontSize: 18,
      lineHeight: 28,
    });
  }
});
test('Empty keeps default media unpainted, icon media semantic foreground and direct-link metadata', () => {
  for (const name of names) {
    expect(nativePresetEmptyStyle(name, 'EmptyMedia', state).view.backgroundColor).toBe(
      'transparent',
    );
    expect(nativePresetEmptyStyle(name, 'EmptyMedia', state).iconSize).toBeUndefined();
    expect(
      nativePresetEmptyStyle(name, 'EmptyMedia', { ...state, variant: 'icon' }).text.color,
    ).toBe('#111111');
    expect(nativePresetEmptyStyle(name, 'EmptyDescription', state)).toMatchObject({
      links: true,
      linkOffset: 4,
    });
    expect(
      nativePresetEmptyStyle(name, 'EmptyDescription', { ...state, fontSize: 30, lineHeight: 45 })
        .text.fontSize,
    ).toBe(name === 'lyra' || name === 'mira' ? 12 : 14);
  }
});
