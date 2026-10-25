import React from 'react';
import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import { StyleSheet, Dimensions } from 'react-native';
import * as presets from './.generated/src/native/_preset-native-select-style';
import { nativeSelectControlPresetSource as source } from './.generated/src/native/_native-select-presets';
const originalWindow = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { ...originalWindow, fontScale: 1, width: 390 } }));
afterEach(() => Dimensions.set({ window: originalWindow }));
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import * as UI from './.generated';
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);
test('Native Select starts at the first enabled option and respects empty labels and disabled groups', async () => {
  const change = jest.fn();
  await mount(
    <UI.NativeSelect onValueChange={change}>
      <UI.NativeSelectOptGroup label="Unavailable" disabled>
        <UI.NativeSelectOption value="blocked">Blocked</UI.NativeSelectOption>
      </UI.NativeSelectOptGroup>
      <UI.NativeSelectOption disabled value="skip">
        Skip
      </UI.NativeSelectOption>
      <UI.NativeSelectOption value="" label="Choose a fruit">
        Ignored child
      </UI.NativeSelectOption>
      <UI.NativeSelectOption> Green {'\n'} Apple </UI.NativeSelectOption>
    </UI.NativeSelect>,
  );
  expect(screen.getByRole('combobox')).toHaveTextContent('Choose a fruit');
  await userEvent.press(screen.getByRole('combobox'));
  expect(
    screen.getByRole('radio', { name: 'Choose a fruit' }).props.accessibilityState.checked,
  ).toBe(true);
  await userEvent.press(screen.getByRole('radio', { name: 'Blocked' }));
  expect(change).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('radio', { name: 'Green Apple' }));
  expect(change).toHaveBeenLastCalledWith('Green Apple');
  expect(screen.getByRole('combobox')).toHaveTextContent('Green Apple');
});
test('removed uncontrolled options reset without emitting a user change', async () => {
  const change = jest.fn();
  const view = await mount(
    <UI.NativeSelect
      defaultValue="b"
      onValueChange={change}
      options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]}
    />,
  );
  expect(screen.getByRole('combobox')).toHaveTextContent('Beta');
  await view.rerender(
    <UI.ThemeProvider>
      <UI.NativeSelect onValueChange={change} options={[{ value: 'c', label: 'Gamma' }]} />
    </UI.ThemeProvider>,
  );
  expect(screen.getByRole('combobox')).toHaveTextContent('Gamma');
  expect(change).not.toHaveBeenCalled();
});
test('placeholder extension keeps an empty initial value and controlled values stay consumer owned', async () => {
  const change = jest.fn();
  const view = await mount(
    <UI.NativeSelect
      placeholder="Choose"
      onValueChange={change}
      options={[{ value: 'a', label: 'Alpha' }]}
    />,
  );
  expect(screen.getByRole('combobox')).toHaveTextContent('Choose');
  await userEvent.press(screen.getByRole('combobox'));
  await userEvent.press(screen.getByRole('radio', { name: 'Alpha' }));
  expect(change).toHaveBeenLastCalledWith('a');
  expect(screen.getByRole('combobox')).toHaveTextContent('Alpha');
  await view.rerender(
    <UI.ThemeProvider>
      <UI.NativeSelect
        value="a"
        onValueChange={change}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />
    </UI.ThemeProvider>,
  );
  await userEvent.press(screen.getByRole('combobox'));
  await userEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(change).toHaveBeenLastCalledWith('b');
  expect(screen.getByRole('combobox')).toHaveTextContent('Alpha');
});
test('owned control paint preserves source height, caller text and a single disabled opacity', async () => {
  await mount(
    <UI.NativeComponentStyleProvider style="mira">
      <UI.NativeSelect
        size="sm"
        disabled
        testID="control"
        style={{ width: 180 }}
        textStyle={{ color: '#123456' }}
        options={[{ value: 'a', label: 'Alpha' }]}
      />
    </UI.NativeComponentStyleProvider>,
  );
  const control = screen.getByTestId('control');
  expect(control).toBeDisabled();
  expect(StyleSheet.flatten(control.props.style).height).toBe(24);
  expect(StyleSheet.flatten(control.props.style)).toMatchObject({
    opacity: 1,
    justifyContent: 'flex-start',
  });
  const wrapper = control.parent;
  expect(
    screen.getAllByTestId('control-icon', { includeHiddenElements: true })[0]!.props.width,
  ).toBe(12);
  expect(screen.getByText('Alpha')).toHaveStyle({ color: '#123456' });
  expect(wrapper).not.toBeNull();
});
test('intrinsic width uses the widest measured option and preserves a caller width', async () => {
  const view = await mount(
    <UI.NativeSelect
      testID="intrinsic"
      options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Longest label' },
      ]}
    />,
  );
  const measure = screen.getByText('Alpha\nLongest label', { includeHiddenElements: true });
  await fireEvent(measure, 'textLayout', {
    nativeEvent: { lines: [{ width: 30 }, { width: 110 }] },
  });
  expect(
    StyleSheet.flatten(screen.getByTestId('intrinsic-wrapper').props.style).width,
  ).toBeGreaterThan(110);
  expect(screen.getByTestId('intrinsic-measure', { includeHiddenElements: true })).toHaveProp(
    'pointerEvents',
    'none',
  );
  await view.rerender(
    <UI.ThemeProvider>
      <UI.NativeSelect style={{ width: 180 }} options={[{ value: 'a', label: 'Alpha' }]} />
    </UI.ThemeProvider>,
  );
  expect(screen.queryByText('Alpha', { includeHiddenElements: true })).not.toBeNull();
  expect(screen.getAllByText('Alpha', { includeHiddenElements: true })).toHaveLength(1);
});

test.each(['base', 'radix', 'aria'] as const)(
  'Native Select retains its own selected label in %s source context',
  async (source) => {
    await mount(
      <NativeRegistryPalette source={source} generation="modern">
        <UI.NativeSelect options={[{ value: 'a', label: 'Alpha' }]} />
      </NativeRegistryPalette>,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('Alpha');
  },
);

test('all twenty reviewed Native Select class slots are consumed by the native renderer', async () => {
  const consumed = new Set<string>(),
    actual = presets.nativePresetSelectControlStyle;
  const spy = jest
    .spyOn(presets, 'nativePresetSelectControlStyle')
    .mockImplementation((...args) => {
      const result = actual(...args);
      consumed.add(result.source + '/' + args[1]);
      return result;
    });
  try {
    for (const family of Object.keys(source.sources) as (keyof typeof source.sources)[]) {
      const view = await mount(
        <NativeRegistryPalette source={family} generation="modern">
          <UI.NativeSelect>
            <UI.NativeSelectOptGroup label="Fruit">
              <UI.NativeSelectOption value="a">Alpha</UI.NativeSelectOption>
            </UI.NativeSelectOptGroup>
          </UI.NativeSelect>
        </NativeRegistryPalette>,
      );
      await userEvent.press(screen.getByRole('combobox'));
      expect(screen.getByRole('radio', { name: 'Alpha' })).toBeOnTheScreen();
      await view.unmount();
    }
    expect(consumed.size).toBe(20);
    for (const family of Object.keys(source.sources))
      for (const slot of ['wrapper', 'control', 'icon', 'option', 'group'])
        expect(consumed.has(family + '/' + slot)).toBe(true);
  } finally {
    spy.mockRestore();
  }
});
test('native font scaling expands compact source controls without clipping their labels', async () => {
  Dimensions.set({ window: { ...originalWindow, fontScale: 2, width: 390 } });
  await mount(
    <UI.NativeComponentStyleProvider style="mira">
      <UI.NativeSelect size="sm" testID="scaled" options={[{ value: 'a', label: 'Alpha' }]} />
    </UI.NativeComponentStyleProvider>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('scaled').props.style).height).toBeGreaterThan(24);
});

test('explicit native type metrics grow the control instead of clipping a large label', async () => {
  await mount(
    <UI.NativeSelect
      testID="large-type"
      textStyle={{ fontSize: 32, lineHeight: 40 }}
      options={[{ value: 'a', label: 'Alpha' }]}
    />,
  );
  expect(
    StyleSheet.flatten(screen.getByTestId('large-type').props.style).height,
  ).toBeGreaterThanOrEqual(40);
  expect(screen.getByText('Alpha')).toHaveStyle({ fontSize: 32, lineHeight: 40 });
});

test('associated native labels activate the owned control and preserve field invalid state', async () => {
  const change = jest.fn();
  await mount(
    <UI.Field invalid>
      <UI.Label controlID="native-choice">Choose fruit by label</UI.Label>
      <UI.NativeSelect
        nativeID="native-choice"
        onValueChange={change}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />
    </UI.Field>,
  );
  const control = screen.getByRole('combobox', { name: 'Choose fruit by label' });
  expect(control).toHaveProp('nativeID', 'native-choice');
  await userEvent.press(screen.getByText('Choose fruit by label'));
  await userEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(change).toHaveBeenCalledWith('b');
  expect(screen.getByRole('combobox')).toHaveTextContent('Beta');
});

test.each(['ltr', 'rtl'] as const)(
  'native select labels follow source start alignment in %s layouts',
  async (dir) => {
    await mount(
      <UI.DirectionProvider dir={dir}>
        <UI.NativeSelect options={[{ value: 'a', label: 'Alpha' }]} />
      </UI.DirectionProvider>,
    );
    expect(screen.getByText('Alpha')).toHaveStyle({ textAlign: dir === 'rtl' ? 'right' : 'left' });
  },
);
