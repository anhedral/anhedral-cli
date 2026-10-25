import { nativePresetSelectControlStyle } from './.generated/src/native/_preset-native-select-style';
import { nativeSelectControlPresetSource as source } from './.generated/src/native/_native-select-presets';
const state = {
  mode: 'light' as const,
  radius: 10,
  fontScale: 1,
  colors: {
    background: '#ffffff',
    foreground: '#111111',
    input: '#dddddd',
    border: '#dddddd',
    'muted-foreground': '#777777',
    popover: '#ffffff',
    'popover-foreground': '#111111',
    accent: '#eeeeee',
    'accent-foreground': '#222222',
    ring: '#555555',
    destructive: '#ff0000',
    muted: '#eeeeee',
    primary: '#111111',
    'primary-foreground': '#ffffff',
  },
};
test('Native Select retains all four source definitions and strict slots across its nine official styles', () => {
  const errors = new Set<string>();
  for (const name of [...Object.keys(source.presets), 'new-york-v4'] as any[])
    for (const origin of ['base', 'radix', 'aria'] as const)
      for (const slot of ['wrapper', 'control', 'icon', 'option', 'group'] as const)
        for (const mode of ['light', 'dark'] as const)
          for (const size of ['default', 'sm'] as const)
            for (const disabled of [false, true])
              for (const focused of [false, true])
                for (const invalid of [false, true]) {
                  try {
                    nativePresetSelectControlStyle(name, slot, {
                      ...state,
                      mode,
                      source: origin,
                      size,
                      disabled,
                      focused,
                      invalid,
                    });
                  } catch (error) {
                    errors.add(name + '/' + slot + ': ' + (error as Error).message);
                  }
                }
  expect([...errors]).toEqual([]);
});
test('Native Select source dimensions and Mira small icon offset remain literal', () => {
  const heights: Record<string, number[]> = {
    nova: [32, 28],
    vega: [36, 32],
    maia: [36, 32],
    lyra: [32, 28],
    mira: [28, 24],
    luma: [36, 32],
    sera: [40, 36],
    rhea: [32, 28],
    'new-york-v4': [36, 32],
  };
  for (const [name, [normal, small]] of Object.entries(heights)) {
    expect(nativePresetSelectControlStyle(name as any, 'control', state).view.height).toBe(normal);
    expect(
      nativePresetSelectControlStyle(name as any, 'control', { ...state, size: 'sm' }).view.height,
    ).toBe(small);
  }
  const icon = nativePresetSelectControlStyle('mira', 'icon', { ...state, size: 'sm' });
  expect(icon.view.width).toBe(12);
  expect(icon.iconTranslation).toBe(-5);
  expect(icon.centerIcon).toBe(true);
  const wrapper = nativePresetSelectControlStyle('nova', 'wrapper', { ...state, disabled: true });
  expect(wrapper.view.opacity).toBe(0.5);
});
