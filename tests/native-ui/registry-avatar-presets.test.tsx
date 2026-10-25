import { nativePresetAvatarStyle } from './.generated/src/native/_preset-avatar-style';
import { nativeAvatarPresetSource as source } from './.generated/src/native/_avatar-presets';
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
    border: '#ddd',
    ring: '#555',
  },
};
const modern = ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const;
const slots = [
  'Avatar',
  'AvatarImage',
  'AvatarFallback',
  'AvatarBadge',
  'AvatarGroup',
  'AvatarGroupCount',
] as const;
test('all thirty reviewed Avatar source slots retain all sizes, styles, theme modes and group size combinations', () => {
  const errors = new Set<string>();
  for (const name of [...modern, 'default', 'new-york', 'new-york-v4'] as const)
    for (const family of ['base', 'aria', 'radix'] as const)
      for (const size of ['default', 'sm', 'lg'] as const)
        for (const mode of ['light', 'dark'] as const)
          for (const fontScale of [1, 2])
            for (const hasSmall of [false, true])
              for (const hasLarge of [false, true])
                for (const slot of slots) {
                  if (
                    (name === 'default' || name === 'new-york') &&
                    !['Avatar', 'AvatarImage', 'AvatarFallback'].includes(slot)
                  )
                    continue;
                  try {
                    nativePresetAvatarStyle(name, slot, {
                      ...state,
                      source: family,
                      size,
                      mode,
                      fontScale,
                      hasSmall,
                      hasLarge,
                    });
                  } catch (error) {
                    errors.add([name, family, size, slot, (error as Error).message].join('/'));
                  }
                }
  expect([...errors]).toEqual([]);
  expect(
    Object.values(source.sources).reduce((sum, x) => sum + Object.values(x.slots).flat().length, 0),
  ).toBe(30);
});
test('Avatar dimensions, clipping, badge extents, direct glyph policy and group overlap follow source literals', () => {
  for (const name of modern)
    for (const size of ['default', 'sm', 'lg'] as const) {
      const root = nativePresetAvatarStyle(name, 'Avatar', { ...state, size });
      const extent = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;
      expect(root.view).toMatchObject({ width: extent, height: extent, borderRadius: 9999 });
      expect(root.view.overflow).toBeUndefined();
      expect(root.borderOverlay).toBe(true);
      expect(nativePresetAvatarStyle(name, 'AvatarImage', { ...state, size }).paint.objectFit).toBe(
        'cover',
      );
      const badge = nativePresetAvatarStyle(name, 'AvatarBadge', { ...state, size });
      expect(badge.view).toMatchObject({
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: size === 'sm' ? 8 : size === 'lg' ? 12 : 10,
        height: size === 'sm' ? 8 : size === 'lg' ? 12 : 10,
      });
      expect(badge.hideIcon).toBe(size === 'sm');
      if (size !== 'sm') expect(badge.iconSize).toBe(8);
      const fallback = nativePresetAvatarStyle(name, 'AvatarFallback', { ...state, size });
      expect(fallback.text.fontSize).toBe(size === 'sm' ? 12 : 14);
      const group = nativePresetAvatarStyle(name, 'AvatarGroup', state);
      expect(group.overlap).toBe(8);
      expect(group.groupRing).toBe(true);
    }
  for (const name of ['default', 'new-york'] as const)
    for (const size of ['default', 'sm', 'lg'] as const) {
      const root = nativePresetAvatarStyle(name, 'Avatar', { ...state, size });
      expect(root.view).toMatchObject({ width: 40, height: 40, overflow: 'hidden' });
      expect(root.borderOverlay).toBe(false);
      expect(() => nativePresetAvatarStyle(name, 'AvatarBadge', state)).toThrow('absent');
    }
  expect(nativePresetAvatarStyle('new-york-v4', 'Avatar', state).view.overflow).toBe('hidden');
});
test('group count uses source ordered has-size variants and source compact text rather than Badge paint', () => {
  for (const name of [...modern, 'new-york-v4'] as const)
    for (const hasSmall of [false, true])
      for (const hasLarge of [false, true]) {
        const count = nativePresetAvatarStyle(name, 'AvatarGroupCount', {
          ...state,
          hasSmall,
          hasLarge,
        });
        expect(count.view.width).toBe(hasSmall ? 24 : hasLarge ? 40 : 32);
        expect(count.view.height).toBe(hasSmall ? 24 : hasLarge ? 40 : 32);
        expect(count.iconSize).toBe(hasSmall ? 12 : hasLarge ? 20 : 16);
        expect(count.text.fontSize).toBe(name === 'lyra' || name === 'mira' ? 12 : 14);
        if (name === 'mira') expect(count.text.lineHeight).toBe(19.5);
      }
});
