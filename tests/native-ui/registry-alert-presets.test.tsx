import { nativePresetAlertStyle } from './.generated/src/native/_preset-alert-style';
import { nativeAlertPresetSource as source } from './.generated/src/native/_alert-presets';
const state = {
  mode: 'light' as const,
  radius: 10,
  fontScale: 1,
  colors: {
    background: '#ffffff',
    foreground: '#111111',
    card: '#ffffff',
    'card-foreground': '#111111',
    primary: '#111111',
    secondary: '#dddddd',
    muted: '#eeeeee',
    'muted-foreground': '#777777',
    input: '#dddddd',
    border: '#dddddd',
    ring: '#555555',
    destructive: '#ff0000',
  },
};
test('Alert retains all six source CVA definitions and strictly accounts for every source/style/variant/structure', () => {
  const errors = new Set<string>();
  for (const name of [
    ...Object.keys(source.presets),
    'default',
    'new-york',
    'new-york-v4',
  ] as any[])
    for (const family of ['base', 'aria', 'radix'] as const)
      for (const variant of ['default', 'destructive'] as const)
        for (const mode of ['light', 'dark'] as const)
          for (const width of [390, 1024])
            for (const hasIcon of [false, true])
              for (const hasAction of [false, true])
                for (const slot of ['root', 'title', 'description', 'action'] as const)
                  try {
                    nativePresetAlertStyle(name, slot, {
                      ...state,
                      source: family,
                      variant,
                      mode,
                      width,
                      hasIcon,
                      hasAction,
                    });
                  } catch (error) {
                    errors.add(name + '/' + family + '/' + slot + ': ' + (error as Error).message);
                  }
  expect([...errors]).toEqual([]);
});
test('Alert source spacing, icon metrics, action offsets and Sera accent remain literal', () => {
  const expected = {
    nova: [10, 8, 8, 2, 16, 8, 8],
    vega: [16, 12, 10, 2, 16, 10, 12],
    maia: [16, 12, 10, 2, 16, 10, 12],
    lyra: [10, 8, 8, 2, 16, 5, 5],
    mira: [8, 6, 6, 2, 14, 6, 8],
    luma: [16, 12, 10, 2, 16, 10, 12],
    sera: [16, 12, 10, 4, 16, 10, 12],
    rhea: [16, 12, 10, 2, 16, 10, 12],
  };
  for (const [name, [x, y, gap, row, size, top, right]] of Object.entries(expected)) {
    const root = nativePresetAlertStyle(name as any, 'root', {
      ...state,
      hasIcon: true,
      hasAction: true,
    });
    expect(root.view).toMatchObject({ paddingLeft: x, paddingTop: y, paddingRight: 72 });
    expect(root.columnGap).toBe(gap);
    expect(root.rowGap).toBe(row);
    expect(root.icon.size).toBe(size);
    expect(nativePresetAlertStyle(name as any, 'action', state).view).toMatchObject({ top, right });
  }
  for (const variant of ['default', 'destructive'] as const) {
    const root = nativePresetAlertStyle('sera', 'root', { ...state, variant });
    expect(root.accent.view).toMatchObject({
      position: 'absolute',
      top: -1,
      bottom: -1,
      left: -1,
      width: 2,
      backgroundColor: variant === 'default' ? '#111111' : '#ff0000',
    });
  }
  expect(nativePresetAlertStyle('lyra', 'description', state)).toMatchObject({
    paragraphGap: 8,
    text: { fontSize: 12, lineHeight: 19.5 },
  });
  expect(nativePresetAlertStyle('mira', 'description', state).paragraphGap).toBe(16);
  expect(nativePresetAlertStyle('default', 'title', state).text).toMatchObject({
    fontSize: 16,
    lineHeight: 16,
  });
  expect(nativePresetAlertStyle('new-york', 'title', state).text).toMatchObject({
    fontSize: 14,
    lineHeight: 14,
  });
  expect(nativePresetAlertStyle('new-york-v4', 'title', state).paint.lines).toBe(1);
  expect(
    nativePresetAlertStyle('nova', 'description', { ...state, width: 390 }).paint.textBreakStrategy,
  ).toBe('balanced');
  expect(
    nativePresetAlertStyle('nova', 'description', { ...state, width: 1024 }).paint
      .textBreakStrategy,
  ).toBe('highQuality');
});
test('Alert inherited typography never overrides an explicit source font-size/line-height utility', () => {
  const metrics = {
    nova: [14, 20],
    vega: [14, 20],
    maia: [14, 20],
    lyra: [12, 16],
    mira: [12, 19.5],
    luma: [14, 20],
    sera: [14, 20],
    rhea: [14, 20],
    default: [16, 24],
    'new-york': [14, 20],
    'new-york-v4': [14, 20],
  };
  for (const [name, [fontSize, lineHeight]] of Object.entries(metrics)) {
    const paint = nativePresetAlertStyle(name as any, 'root', state);
    expect(paint.text).toMatchObject({ fontSize, lineHeight });
    if (name !== 'default')
      expect(
        nativePresetAlertStyle(name as any, 'root', { ...state, fontSize: 30, lineHeight: 45 })
          .text,
      ).toMatchObject({ fontSize, lineHeight });
  }
  expect(
    nativePresetAlertStyle('nova', 'title', {
      ...state,
      fontSize: 14,
      lineHeight: 20,
      lineHeightMultiplier: 20 / 14,
    }).text,
  ).toMatchObject({ fontSize: 14, lineHeight: 20 });
  expect(
    nativePresetAlertStyle('nova', 'title', { ...state, fontSize: 19, lineHeight: 31 }).text,
  ).toMatchObject({ fontSize: 19, lineHeight: 31 });
  expect(
    nativePresetAlertStyle('nova', 'description', { ...state, fontSize: 30, lineHeight: 45 }).text,
  ).toMatchObject({ fontSize: 14, lineHeight: 20 });
});
