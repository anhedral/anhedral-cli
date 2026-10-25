import { nativePresetFieldStyle } from './.generated/src/native/_preset-field-style';
const state = {
  mode: 'light' as const,
  radius: 10,
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
    input: '#aaa',
    destructive: '#900',
  },
};
const slots = [
  'FieldSet',
  'FieldLegend',
  'FieldGroup',
  'Field',
  'FieldContent',
  'FieldLabel',
  'FieldTitle',
  'FieldDescription',
  'FieldSeparator',
  'FieldSeparatorLine',
  'FieldSeparatorContent',
  'FieldError',
  'FieldErrorList',
] as const;
test('Field source variants and every selector branch translate without unreviewed utilities', () => {
  const errors = new Set<string>();
  for (const name of [
    'nova',
    'vega',
    'maia',
    'lyra',
    'mira',
    'luma',
    'sera',
    'rhea',
    'default',
    'new-york',
    'new-york-v4',
  ] as const)
    for (const source of ['base', 'aria', 'radix'] as const)
      for (const orientation of ['vertical', 'horizontal', 'responsive'] as const)
        for (const active of [false, true])
          for (const slot of slots)
            try {
              nativePresetFieldStyle(name, slot, {
                ...state,
                source,
                orientation,
                mode: active ? 'dark' : 'light',
                groupWidth: active ? 448 : 447,
                inLabel: active,
                compound: active,
                hasContent: active,
                choiceGroup: active,
                nestedGroup: active,
                checked: active,
                selected: active,
                previousLegend: active,
                last: active,
                secondLast: active,
                outlineGroup: active,
                disabled: active,
                focused: active,
                hovered: active,
                invalid: active,
                legendVariant: active ? 'label' : 'legend',
              });
            } catch (error) {
              errors.add(name + '/' + source + '/' + slot + '/' + (error as Error).message);
            }
  expect([...errors]).toEqual([]);
});
