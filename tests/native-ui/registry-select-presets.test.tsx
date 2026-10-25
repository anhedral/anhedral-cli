import { nativePresetSelectStyle } from './.generated/src/native/_preset-select-style';
import { nativeSelectPresetSource as source } from './.generated/src/native/_select-presets';
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
  },
};
test('all reviewed Select source slots retain a strict native projection across styles and states', () => {
  const errors = new Set<string>();
  for (const name of [
    ...Object.keys(source.presets),
    'default',
    'new-york',
    'new-york-v4',
  ] as any[])
    for (const origin of ['base', 'radix', 'aria'] as const) {
      const family = ['default', 'new-york', 'new-york-v4'].includes(name) ? name : origin;
      const slots = (source.sources as any)[family].slots;
      for (const [slot, parts] of Object.entries(slots))
        for (let part = 0; part < (parts as any[]).length; part++)
          for (const focused of [false, true])
            for (const size of ['default', 'sm'] as const)
              for (const mode of ['light', 'dark'] as const) {
                try {
                  const value = nativePresetSelectStyle(
                    name,
                    slot as any,
                    {
                      ...state,
                      mode,
                      source: origin,
                      focused,
                      size,
                      disabled: true,
                      invalid: true,
                      empty: true,
                      placeholder: true,
                      position: 'popper',
                      side: 'bottom',
                    },
                    part,
                  );
                  expect(value.source).toBe(family);
                } catch (error) {
                  errors.add(`${name}/${origin}/${slot}/${part}: ${(error as Error).message}`);
                }
              }
    }
  expect([...errors]).toEqual([]);
});
test('Select trigger source metrics distinguish frozen and modern sizes', () => {
  const heights: Record<string, number[]> = {
    vega: [36, 32],
    nova: [32, 28],
    maia: [36, 32],
    lyra: [32, 28],
    mira: [28, 24],
    luma: [36, 32],
    sera: [40, 36],
    rhea: [32, 28],
    default: [40, 40],
    'new-york': [36, 36],
    'new-york-v4': [36, 32],
  };
  for (const [name, [regular, small]] of Object.entries(heights)) {
    expect(nativePresetSelectStyle(name as any, 'SelectTrigger', state).view.height).toBe(regular);
    expect(
      nativePresetSelectStyle(name as any, 'SelectTrigger', { ...state, size: 'sm' }).view.height,
    ).toBe(small);
  }
});
