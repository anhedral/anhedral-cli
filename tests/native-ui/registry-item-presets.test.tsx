import { nativePresetItemStyle } from './.generated/src/native/_preset-item-style';
import { nativeItemPresetSource as source } from './.generated/src/native/_item-presets';
const state = {
  mode: 'light' as const,
  radius: 10,
  fontScale: 1,
  colors: {
    background: '#fff',
    foreground: '#111',
    primary: '#123',
    'primary-foreground': '#fff',
    muted: '#eee',
    'muted-foreground': '#777',
    accent: '#ddd',
    border: '#ccc',
    ring: '#555',
  },
};
const names = [...Object.keys(source.presets), 'default', 'new-york', 'new-york-v4'] as any[],
  slots = [
    'Item',
    'ItemGroup',
    'ItemSeparator',
    'ItemMedia',
    'ItemContent',
    'ItemTitle',
    'ItemDescription',
    'ItemActions',
    'ItemHeader',
    'ItemFooter',
  ] as const;
test('Item strictly accounts for all sixty source slots, variants, source sizes, media and source conditions', () => {
  const errors = new Set<string>();
  for (const name of names)
    for (const family of ['base', 'aria', 'radix'] as const)
      for (const size of ['default', 'sm', 'xs'] as const) {
        if (['default', 'new-york', 'new-york-v4'].includes(name) && size === 'xs') continue;
        for (const variant of ['default', 'outline', 'muted'] as const)
          for (const mediaVariant of ['default', 'icon', 'image'] as const)
            for (const mode of ['light', 'dark'] as const)
              for (const active of [false, true])
                for (const slot of slots)
                  try {
                    nativePresetItemStyle(name, slot, {
                      ...state,
                      source: family,
                      size,
                      variant,
                      mediaVariant,
                      mode,
                      hasDescription: active,
                      previousContent: active,
                      inMenu: active,
                      hasSmall: active,
                      hasExtraSmall: active,
                      fontScale: active ? 2 : 1,
                    });
                  } catch (error) {
                    errors.add([name, family, slot, (error as Error).message].join('/'));
                  }
      }
  expect([...errors]).toEqual([]);
});
test('Item retains literal modern/frozen padding, description alignment, adjacent content and source menu overrides', () => {
  expect(nativePresetItemStyle('nova', 'Item', { ...state, size: 'default' }).view).toMatchObject({
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  });
  expect(
    nativePresetItemStyle('nova', 'Item', { ...state, size: 'xs', inMenu: true }).view,
  ).toMatchObject({ padding: 0, paddingHorizontal: 0, paddingVertical: 0 });
  expect(
    nativePresetItemStyle('nova', 'ItemMedia', { ...state, hasDescription: true }).view,
  ).toMatchObject({ alignSelf: 'flex-start', transform: [{ translateY: 2 }] });
  expect(
    nativePresetItemStyle('nova', 'ItemContent', { ...state, previousContent: true }).view,
  ).toMatchObject({ flexGrow: 0, flexShrink: 0, flexBasis: 'auto' });
  expect(
    nativePresetItemStyle('nova', 'ItemGroup', { ...state, hasSmall: true, hasExtraSmall: true })
      .view.gap,
  ).toBe(8);
  for (const name of ['default', 'new-york', 'new-york-v4'] as const) {
    expect(nativePresetItemStyle(name, 'Item', { ...state, size: 'default' }).view).toMatchObject({
      padding: 16,
      gap: 16,
    });
    expect(() => nativePresetItemStyle(name, 'Item', { ...state, size: 'xs' })).toThrow('Unknown');
    expect(nativePresetItemStyle(name, 'ItemSeparator', state).view).toMatchObject({
      marginTop: 0,
      marginBottom: 0,
    });
  }
});
test('Item media literal icon/image sizing and glyph rules remain independent from text scaling', () => {
  for (const name of names)
    for (const size of ['default', 'sm'] as const) {
      const media = nativePresetItemStyle(name, 'ItemMedia', {
        ...state,
        size,
        mediaVariant: 'image',
        fontScale: 2,
      });
      const expected = ['default', 'new-york', 'new-york-v4'].includes(name)
        ? 40
        : name === 'mira'
          ? 32
          : size === 'sm'
            ? 32
            : 40;
      expect(media.view).toMatchObject({ width: expected, height: expected, overflow: 'hidden' });
      expect(media.imageFull).toBe(true);
      expect(media.imageCover).toBe(true);
      expect(media.iconPointerEvents).toBe(true);
    }
  const icon = nativePresetItemStyle('default', 'ItemMedia', { ...state, mediaVariant: 'icon' });
  expect(icon.view).toMatchObject({ width: 32, height: 32, borderWidth: 1 });
  expect(icon.iconSize).toBe(16);
});
