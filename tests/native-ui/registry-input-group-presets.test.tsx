import { nativePresetInputGroupStyle } from './.generated/src/native/_preset-input-group-style';
import { styling } from './.generated/styling/src';
const names = [
  'vega',
  'nova',
  'maia',
  'lyra',
  'mira',
  'luma',
  'sera',
  'rhea',
  'default',
  'new-york',
  'new-york-v4',
] as const;
const colors = {
  ...styling.registryThemes['theme-neutral'].native.light,
  'destructive-foreground': '#ffffff',
};
const slots = [
  'InputGroup',
  'InputGroupAddon',
  'InputGroupButton',
  'InputGroupText',
  'InputGroupInput',
  'InputGroupTextarea',
] as const;
for (const name of names) {
  test(`${name} input-group slots retain source vocabulary in every focus/invalid/disabled, alignment and size state`, () => {
    for (const mode of ['light', 'dark'] as const)
      for (const focused of [false, true])
        for (const invalid of [false, true])
          for (const disabled of [false, true])
            for (const align of ['inline-start', 'inline-end', 'block-start', 'block-end'] as const)
              for (const size of ['xs', 'sm', 'icon-xs', 'icon-sm'] as const)
                for (const slot of slots) {
                  expect(() =>
                    nativePresetInputGroupStyle(name, slot, {
                      mode,
                      colors,
                      radius: 8,
                      focused,
                      invalid,
                      disabled,
                      hasDisabled: disabled,
                      groupDisabled: disabled,
                      align,
                      size,
                      hasInput: true,
                      hasTextarea: true,
                      hasButton: true,
                      hasKbd: true,
                      hasIcon: true,
                      inlineStart: true,
                      inlineEnd: true,
                      blockStart: true,
                      blockEnd: true,
                      borderTop: true,
                      borderBottom: true,
                      inCombobox: true,
                    }),
                  ).not.toThrow();
                }
  });
}
test('input-group source root heights, conditional column/auto sizing and field-padding overrides remain distinct', () => {
  const heights = [36, 32, 36, 32, 28, 36, 40, 32, 36, 36, 36];
  for (const [index, name] of names.entries()) {
    const plain = nativePresetInputGroupStyle(name, 'InputGroup', {
      mode: 'light',
      colors,
      radius: 8,
    });
    expect(plain.view.height).toBe(heights[index]);
    expect(plain.view.flexDirection).toBe('row');
    const block = nativePresetInputGroupStyle(name, 'InputGroup', {
      mode: 'light',
      colors,
      radius: 8,
      hasInput: true,
      blockEnd: true,
    });
    expect(block.view.height).toBe('auto');
    expect(block.view.flexDirection).toBe('column');
    expect(block.control.paddingTop).toBe(12);
  }
});
test('Sera input-group addon comments remain inert while authored input padding remains active', () => {
  const addon = nativePresetInputGroupStyle('sera', 'InputGroupAddon', {
    mode: 'light',
    colors,
    radius: 8,
    align: 'inline-start',
    hasButton: true,
    hasKbd: true,
  });
  expect(addon.view.marginLeft).toBeUndefined();
  const input = nativePresetInputGroupStyle('sera', 'InputGroupInput', {
    mode: 'light',
    colors,
    radius: 8,
    inlineStart: true,
    inlineEnd: true,
  });
  expect(input.view.paddingLeft).toBe(8);
  expect(input.view.paddingRight).toBe(8);
});

test('compiled source specificity keeps control focus and invalid borders above combobox focus-within', () => {
  const base = {
    mode: 'light' as const,
    colors,
    radius: 8,
    inCombobox: true,
    inheritedBorderColor: '#123456',
  };
  expect(
    nativePresetInputGroupStyle('nova', 'InputGroup', { ...base, focusWithin: true }).view
      .borderColor,
  ).toBe('#123456');
  expect(
    nativePresetInputGroupStyle('nova', 'InputGroup', { ...base, focusWithin: true, focused: true })
      .view.borderColor,
  ).toBe(colors.ring);
  expect(
    nativePresetInputGroupStyle('nova', 'InputGroup', {
      ...base,
      focusWithin: true,
      focused: true,
      invalid: true,
    }).view.borderColor,
  ).toBe(colors.destructive);
});
