import React from 'react';
import { render, screen, fireEvent, userEvent, within } from '@testing-library/react-native';
import { StyleSheet, Dimensions, processColor } from 'react-native';
import * as UI from './.generated';
import * as Aria from './.generated/src/native/registry-aria-select';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import {
  RegistrySelectAutocomplete,
  useRegistrySelectFilter,
} from './.generated/src/native/_select';
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);
const aria = (children: React.ReactNode) => (
  <NativeRegistryPalette generation="modern" source="aria">
    {children}
  </NativeRegistryPalette>
);
test('object values keep consumer equivalence and controlled label ownership', async () => {
  const alpha = { id: 'a', name: 'Alpha' },
    beta = { id: 'b', name: 'Beta' },
    change = jest.fn();
  await mount(
    <UI.Select
      value={{ ...alpha }}
      itemToStringValue={(item: typeof alpha) => item.id}
      onValueChange={change}
    >
      <UI.SelectTrigger>
        <UI.SelectValue>{(item: typeof alpha) => item.name}</UI.SelectValue>
      </UI.SelectTrigger>
      <UI.SelectContent>
        <UI.SelectItem value={alpha}>Alpha</UI.SelectItem>
        <UI.SelectItem value={beta}>Beta</UI.SelectItem>
      </UI.SelectContent>
    </UI.Select>,
  );
  await userEvent.press(screen.getByRole('combobox'));
  expect(screen.getByRole('radio', { name: 'Alpha' }).props.accessibilityState.checked).toBe(true);
  await userEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(change).toHaveBeenCalledWith(beta);
  expect(screen.getByRole('combobox')).toHaveTextContent('Alpha');
});
test('Aria generic collections return original selectedItems and preserve multiple selection in an open popup', async () => {
  const items = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ],
    change = jest.fn();
  await mount(
    <Aria.Select selectionMode="multiple" onValueChange={change}>
      <Aria.SelectTrigger>
        <Aria.SelectValue<(typeof items)[0]>>
          {({ selectedItems }) =>
            selectedItems.length ? selectedItems.map((item) => item.label).join(' + ') : 'Choose'
          }
        </Aria.SelectValue>
      </Aria.SelectTrigger>
      <Aria.SelectContent>
        <Aria.SelectGroup items={items}>
          {(item) => <Aria.SelectItem id={item.value}>{item.label}</Aria.SelectItem>}
        </Aria.SelectGroup>
      </Aria.SelectContent>
    </Aria.Select>,
  );
  await userEvent.press(screen.getByRole('combobox'));
  await userEvent.press(screen.getByRole('checkbox', { name: 'Alpha' }));
  await userEvent.press(screen.getByRole('checkbox', { name: 'Beta' }));
  expect(change).toHaveBeenLastCalledWith(['a', 'b']);
  expect(screen.getByRole('checkbox', { name: 'Alpha' }).props.accessibilityState.checked).toBe(
    true,
  );
  expect(screen.getByRole('combobox', { includeHiddenElements: true })).toHaveTextContent(
    'Alpha + Beta',
  );
  await userEvent.press(screen.getByRole('checkbox', { name: 'Alpha' }));
  expect(change).toHaveBeenLastCalledWith(['b']);
});
function Searchable() {
  const { contains } = useRegistrySelectFilter({ sensitivity: 'base' });
  return (
    <Aria.Select placeholder="Country">
      <Aria.SelectTrigger>
        <Aria.SelectValue />
      </Aria.SelectTrigger>
      <RegistrySelectAutocomplete filter={contains}>
        <Aria.SelectPopover>
          <Aria.SelectInput />
          <Aria.SelectList
            renderEmptyState={() => <Aria.SelectEmpty>Nothing matched</Aria.SelectEmpty>}
          >
            <Aria.SelectGroup
              items={[
                { value: 'fr', label: 'Côte d’Ivoire' },
                { value: 'tr', label: 'Türkiye' },
              ]}
            >
              {(item) => <Aria.SelectItem id={item.value}>{item.label}</Aria.SelectItem>}
            </Aria.SelectGroup>
          </Aria.SelectList>
        </Aria.SelectPopover>
      </RegistrySelectAutocomplete>
    </Aria.Select>
  );
}
test('native search retains collation, source labels, empty state and query reset', async () => {
  await mount(aria(<Searchable />));
  await userEvent.press(screen.getByRole('combobox'));
  await fireEvent.changeText(screen.getByLabelText('Search options'), 'cote');
  expect(screen.getByRole('radio', { name: 'Côte d’Ivoire' })).toBeOnTheScreen();
  expect(screen.queryByRole('radio', { name: 'Türkiye' })).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Search options'), 'missing');
  expect(screen.getByText('Nothing matched')).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Search options'), 'turkiye');
  await userEvent.press(screen.getByRole('radio', { name: 'Türkiye' }));
  expect(screen.getByRole('combobox')).toHaveTextContent('Türkiye');
  await userEvent.press(screen.getByRole('combobox'));
  expect(screen.getByLabelText('Search options')).toHaveProp('value', '');
  expect(screen.getAllByRole('radio')).toHaveLength(2);
});
test('disabled groups and cancelled item callbacks retain selection and popup state', async () => {
  const change = jest.fn();
  await mount(
    <UI.Select onValueChange={change}>
      <UI.SelectTrigger>
        <UI.SelectValue />
      </UI.SelectTrigger>
      <UI.SelectContent>
        <UI.SelectGroup disabled>
          <UI.SelectItem value="blocked">Blocked</UI.SelectItem>
        </UI.SelectGroup>
        <UI.SelectItem value="cancel" onPress={(event) => event.preventDefault()}>
          Cancelled
        </UI.SelectItem>
      </UI.SelectContent>
    </UI.Select>,
  );
  await userEvent.press(screen.getByRole('combobox'));
  await userEvent.press(screen.getByRole('radio', { name: 'Blocked' }));
  let prevented = false;
  await fireEvent.press(screen.getByRole('radio', { name: 'Cancelled' }), {
    preventDefault: () => {
      prevented = true;
    },
    isDefaultPrevented: () => prevented,
  });
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByRole('radio', { name: 'Cancelled' })).toBeOnTheScreen();
});
function panel(title: string) {
  let node = screen.getByRole('header', { name: title });
  while (node && !within(node).queryByRole('combobox', { includeHiddenElements: true }))
    node = node.parent!;
  if (!node) throw Error('No source Select panel ' + title);
  return within(node);
}
test('the authored Aria search and multi-select examples keep their actual collections and render callbacks', async () => {
  const Component = require('./.generated/src/examples/aria/select-example').default;
  await mount(<Component />);
  await userEvent.press(panel('With Autocomplete').getByRole('combobox'));
  await fireEvent.changeText(screen.getByLabelText('Search options'), 'united');
  expect(screen.getAllByRole('radio')).toHaveLength(2);
  await userEvent.press(screen.getByRole('radio', { name: 'United States' }));
  expect(panel('With Autocomplete').getByRole('combobox')).toHaveTextContent('United States');
  await userEvent.press(panel('Multiple Selection').getByRole('combobox'));
  await userEvent.press(screen.getByRole('checkbox', { name: 'Apple' }));
  expect(
    panel('Multiple Selection').getByRole('combobox', { includeHiddenElements: true }),
  ).toHaveTextContent('Apple');
  await userEvent.press(screen.getByRole('checkbox', { name: 'Banana' }));
  expect(
    panel('Multiple Selection').getByRole('combobox', { includeHiddenElements: true }),
  ).toHaveTextContent('2 fruits selected');
});
test('Select labels and separators retain native source geometry', async () => {
  await mount(
    <UI.Select defaultOpen>
      <UI.SelectContent>
        <UI.SelectLabel testID="label">Category</UI.SelectLabel>
        <UI.SelectSeparator testID="separator" />
        <UI.SelectItem value="a">Alpha</UI.SelectItem>
      </UI.SelectContent>
    </UI.Select>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('separator').props.style)).toMatchObject({
    height: 1,
    marginLeft: -4,
    marginRight: -4,
    marginTop: 4,
    marginBottom: 4,
  });
  expect(StyleSheet.flatten(screen.getByTestId('label').props.style)).toMatchObject({
    fontSize: 12,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 4,
    paddingBottom: 4,
  });
});

test.each([
  ['base', 'content', undefined, undefined, -4, 'center'],
  ['aria', 'content', undefined, undefined, -4, 'center'],
  ['aria', 'popover', undefined, undefined, -4, 'flex-start'],
  ['radix', 'content', undefined, undefined, undefined, 'center'],
  ['new-york-v4', 'content', undefined, undefined, undefined, 'center'],
  ['default', 'content', undefined, undefined, -4, 'center'],
  ['new-york', 'content', undefined, undefined, -4, 'center'],
  ['aria', 'content', 'top end', 9, 9, 'flex-end'],
] as const)(
  'Select %s/%s retains its source default placement and native offset contract',
  async (family, kind, placement, offset, y, align) => {
    const Content = kind === 'popover' ? UI.SelectPopover : UI.SelectContent;
    await mount(
      <NativeRegistryPalette
        source={family}
        generation={family === 'default' || family === 'new-york' ? 'legacy' : 'modern'}
      >
        <UI.Select defaultOpen>
          <Content testID="surface" placement={placement} offset={offset}>
            <UI.SelectItem value="a">Alpha</UI.SelectItem>
          </Content>
        </UI.Select>
      </NativeRegistryPalette>,
    );
    const style = StyleSheet.flatten(screen.getByTestId('surface').props.style);
    expect(style.alignSelf).toBe(align);
    expect(style.transform?.find((value: any) => 'translateY' in value)?.translateY).toBe(y);
  },
);
test.each(['start', 'left', 'top', 'bottom', 'right', 'end'] as const)(
  'Aria source placement %s retains a concrete native side',
  async (placement) => {
    await mount(
      <Aria.Select defaultOpen>
        <Aria.SelectContent testID="placed" placement={placement}>
          <Aria.SelectItem id="a">Alpha</Aria.SelectItem>
        </Aria.SelectContent>
      </Aria.Select>,
    );
    const transforms = StyleSheet.flatten(screen.getByTestId('placed').props.style).transform;
    const horizontal = ['start', 'left', 'right', 'end'].includes(placement),
      key = horizontal ? 'translateX' : 'translateY';
    const expected =
      placement === 'bottom' || placement === 'right' || placement === 'end' ? -4 : 4;
    expect(transforms?.find((value: any) => key in value)?.[key]).toBe(expected);
    const popup = screen.getByTestId('placed');
    expect(StyleSheet.flatten(popup.props.style).alignSelf).toBe(
      horizontal ? (['start', 'left'].includes(placement) ? 'flex-start' : 'flex-end') : 'center',
    );
    expect(StyleSheet.flatten(popup.parent!.props.style).justifyContent).toBe(
      placement === 'top' ? 'flex-start' : placement === 'bottom' ? 'flex-end' : 'center',
    );
  },
);
test('a disabled native Field blocks Select activation and source IDs retain label association', async () => {
  const view = await mount(
    <UI.Field disabled>
      <UI.Label controlID="choice">Fruit label</UI.Label>
      <UI.Select nativeID="choice">
        <UI.SelectTrigger>
          <UI.SelectValue />
        </UI.SelectTrigger>
        <UI.SelectContent>
          <UI.SelectItem value="a">Alpha</UI.SelectItem>
        </UI.SelectContent>
      </UI.Select>
    </UI.Field>,
  );
  expect(screen.getByRole('combobox')).toBeDisabled();
  await userEvent.press(screen.getByText('Fruit label'));
  expect(screen.queryByRole('radio')).toBeNull();
  await view.rerender(
    <UI.ThemeProvider>
      <UI.Field>
        <UI.Label controlID="choice">Fruit label</UI.Label>
        <UI.Select nativeID="choice">
          <UI.SelectTrigger>
            <UI.SelectValue />
          </UI.SelectTrigger>
          <UI.SelectContent>
            <UI.SelectItem value="a">Alpha</UI.SelectItem>
          </UI.SelectContent>
        </UI.Select>
      </UI.Field>
    </UI.ThemeProvider>,
  );
  await userEvent.press(screen.getByText('Fruit label'));
  expect(screen.getByRole('radio', { name: 'Alpha' })).toBeOnTheScreen();
});

test('logical Select placement and text direction survive native Modal boundaries', async () => {
  await mount(
    <UI.DirectionProvider dir="rtl">
      <Aria.Select defaultOpen>
        <Aria.SelectContent testID="rtl-surface" placement="start">
          <Aria.SelectItem id="a">Alpha</Aria.SelectItem>
        </Aria.SelectContent>
      </Aria.Select>
    </UI.DirectionProvider>,
  );
  const popup = screen.getByTestId('rtl-surface'),
    style = StyleSheet.flatten(popup.props.style);
  expect(style).toMatchObject({ direction: 'rtl', alignSelf: 'flex-end' });
  expect(style.transform?.find((value: any) => 'translateX' in value)?.translateX).toBe(-4);
  expect(StyleSheet.flatten(popup.parent!.props.style).direction).toBe('ltr');
});

test('Select popup surfaces preserve native safe-area bounds outside their source padding', async () => {
  const { SafeAreaInsetsContext } = require('react-native-safe-area-context');
  await mount(
    <SafeAreaInsetsContext.Provider value={{ top: 20, bottom: 30, left: 7, right: 9 }}>
      <UI.Select defaultOpen>
        <UI.SelectContent testID="safe-select">
          <UI.SelectItem value="a">Alpha</UI.SelectItem>
        </UI.SelectContent>
      </UI.Select>
    </SafeAreaInsetsContext.Provider>,
  );
  const popup = screen.getByTestId('safe-select');
  expect(StyleSheet.flatten(popup.parent!.props.style)).toMatchObject({
    paddingTop: 20,
    paddingBottom: 30,
    paddingLeft: 7,
    paddingRight: 9,
  });
  expect(StyleSheet.flatten(popup.props.style)).toMatchObject({
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  });
});

test('compact Select values reserve their intrinsic scaled text line without changing source outer heights', async () => {
  const window = Dimensions.get('window'),
    display = Dimensions.get('screen');
  try {
    for (const fontScale of [1, 2]) {
      Dimensions.set({ window: { ...window, fontScale }, screen: { ...display, fontScale } });
      const view = await mount(
        <UI.Select defaultValue="a">
          <UI.SelectTrigger testID="intrinsic-trigger">
            <UI.SelectValue testID="intrinsic-value" />
          </UI.SelectTrigger>
          <UI.SelectContent>
            <UI.SelectItem value="a">Multi Alpha, Multi Beta</UI.SelectItem>
          </UI.SelectContent>
        </UI.Select>,
      );
      expect(StyleSheet.flatten(screen.getByTestId('intrinsic-value').props.style).minHeight).toBe(
        20 * fontScale,
      );
      expect(StyleSheet.flatten(screen.getByTestId('intrinsic-trigger').props.style).height).toBe(
        32 + 20 * (fontScale - 1),
      );
      await view.unmount();
    }
  } finally {
    Dimensions.set({ window, screen: display });
  }
});

test('search fields retain their own native field scope and never steal the parent Select label target', async () => {
  await mount(
    <UI.Field>
      <UI.Label>Country field</UI.Label>
      <Searchable />
    </UI.Field>,
  );
  await userEvent.press(screen.getByText('Country field'));
  await fireEvent.changeText(screen.getByLabelText('Search options'), 'cote');
  await userEvent.press(screen.getByRole('radio', { name: 'Côte d’Ivoire' }));
  await userEvent.press(screen.getByText('Country field'));
  expect(screen.getByLabelText('Search options')).toBeOnTheScreen();
});

test.each(['base', 'radix', 'aria', 'new-york-v4'] as const)(
  'Select %s item text consumes its source wrapper spacing',
  async (family) => {
    await mount(
      <NativeRegistryPalette generation="modern" source={family}>
        <UI.Select defaultOpen>
          <UI.SelectContent>
            <UI.SelectItem testID="spaced-item" value="a">
              Alpha
            </UI.SelectItem>
          </UI.SelectContent>
        </UI.Select>
      </NativeRegistryPalette>,
    );
    const style = StyleSheet.flatten(screen.getByTestId('spaced-item-text').props.style);
    expect(style).toMatchObject({ flexDirection: 'row', alignItems: 'center', gap: 8 });
    if (family === 'base' || family === 'aria') expect(style.flexGrow).toBe(1);
  },
);

test('focused Select items apply source descendant foreground while preserving native explicit text paint', async () => {
  let expected = '';
  function Capture() {
    expected = UI.useTheme().colors['accent-foreground']!;
    return null;
  }
  const { withRegistryStyles } = require('./.generated/src/native/registry-styles');
  const Description = withRegistryStyles(UI.ItemDescription, 'view');
  await mount(
    <>
      <Capture />
      <UI.Select defaultOpen>
        <UI.SelectContent>
          <UI.SelectItem testID="focused-item" value="a">
            <Description testID="source-description" className="text-muted-foreground">
              Description
            </Description>
            <Description testID="explicit-description" style={{ color: '#ff00ff' }}>
              Explicit
            </Description>
          </UI.SelectItem>
        </UI.SelectContent>
      </UI.Select>
    </>,
  );
  await fireEvent(screen.getByTestId('focused-item'), 'focus');
  expect(StyleSheet.flatten(screen.getByTestId('source-description').props.style).color).toBe(
    expected,
  );
  expect(StyleSheet.flatten(screen.getByTestId('explicit-description').props.style).color).toBe(
    '#ff00ff',
  );
});

function nativeNodes(node: any): any[] {
  return node && typeof node === 'object'
    ? [node, ...(node.children ?? []).flatMap(nativeNodes)]
    : [];
}
test.each(['base', 'default', 'new-york', 'new-york-v4'] as const)(
  'Select %s glyphs inherit the source foreground on dark native surfaces',
  async (family) => {
    let foreground = '',
      muted = '',
      popover = '';
    function Capture() {
      const theme = UI.useTheme();
      foreground = theme.colors.foreground;
      muted = theme.colors['muted-foreground']!;
      popover = theme.colors['popover-foreground']!;
      React.useLayoutEffect(() => theme.setPreference('dark'), []);
      return null;
    }
    await mount(
      <>
        <Capture />
        <NativeRegistryPalette
          source={family}
          generation={family === 'default' || family === 'new-york' ? 'legacy' : 'modern'}
        >
          <UI.Select defaultOpen defaultValue="a">
            <UI.SelectTrigger testID="dark-trigger">
              <UI.SelectValue />
            </UI.SelectTrigger>
            <UI.SelectContent>
              <UI.SelectItem testID="dark-item" value="a">
                Alpha
              </UI.SelectItem>
            </UI.SelectContent>
          </UI.Select>
        </NativeRegistryPalette>
      </>,
    );
    const arrow = screen.getAllByTestId('dark-trigger-icon', { includeHiddenElements: true }),
      check = screen.getAllByTestId('dark-item-indicator-icon', { includeHiddenElements: true });
    expect(arrow.flatMap(nativeNodes).map((node) => node.props.stroke)).toContainEqual({
      type: 0,
      payload: processColor(family === 'default' || family === 'new-york' ? foreground : muted),
    });
    expect(check.flatMap(nativeNodes).map((node) => node.props.stroke)).toContainEqual({
      type: 0,
      payload: processColor(family === 'new-york-v4' ? muted : popover),
    });
  },
);
