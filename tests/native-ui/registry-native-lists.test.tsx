import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  RegistryOrderedList as Ordered,
  RegistryUnorderedList as Unordered,
  RegistryListItem as Item,
  RegistryView,
  RegistryText,
} from './.generated/src/native/registry-styles';
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);

test('ordered list numbering follows fragments, start, reversed and explicit item values', async () => {
  await mount(
    <Ordered className="list-decimal" start={4}>
      <Item>Fourth</Item>
      <>
        <Item value={8}>Eighth</Item>
        <Item>Ninth</Item>
      </>
    </Ordered>,
  );
  expect(screen.getByText('4.')).toBeTruthy();
  expect(screen.getByText('8.')).toBeTruthy();
  expect(screen.getByText('9.')).toBeTruthy();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});
test('nested lists own their counters and interactive item children keep independent accessibility', async () => {
  const action = jest.fn();
  await mount(
    <Ordered className="list-decimal" reversed>
      <Item>
        <RegistryText>Outer</RegistryText>
        <Unordered className="list-disc">
          <Item>Inner</Item>
        </Unordered>
      </Item>
      <Item>
        <UI.Button onPress={action}>Choose</UI.Button>
      </Item>
    </Ordered>,
  );
  expect(screen.getByText('2.')).toBeTruthy();
  expect(screen.getByText('1.')).toBeTruthy();
  expect(screen.getByText('•')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Choose' }));
  expect(action).toHaveBeenCalledTimes(1);
});
test('list markers retain source typography and can be suppressed by list-none', async () => {
  await mount(
    <Ordered className="list-none">
      <Item>Plain</Item>
    </Ordered>,
  );
  expect(screen.queryByText('1.')).toBeNull();
  expect(screen.getByText('Plain')).toBeTruthy();
});
test('source overflow hosts create bounded native scroll containers with content layout styles', async () => {
  await mount(
    <RegistryView
      testID="scroll"
      className="max-h-48 space-y-4 overflow-y-scroll border-t px-6 py-4"
    >
      <RegistryText>First</RegistryText>
      <RegistryText>Last</RegistryText>
    </RegistryView>,
  );
  expect(screen.getByTestId('scroll')).toHaveStyle({ maxHeight: 192, borderTopWidth: 1 });
  expect(screen.getByTestId('scroll').props.contentContainerStyle).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        paddingLeft: 24,
        paddingRight: 24,
        paddingTop: 16,
        paddingBottom: 16,
        rowGap: 16,
      }),
    ]),
  );
  expect(screen.getByTestId('scroll').props.horizontal).toBe(false);
});

test('unstyled source lists follow the pinned Tailwind preflight and do not invent markers', async () => {
  await mount(
    <>
      <Ordered>
        <Item>Ordered plain</Item>
      </Ordered>
      <Unordered>
        <Item>Unordered plain</Item>
      </Unordered>
    </>,
  );
  expect(screen.queryByText('1.')).toBeNull();
  expect(screen.queryByText('•')).toBeNull();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});
