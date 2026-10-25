import React from 'react';
import { View, Text as NativeText } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  RegistryDescriptionList as List,
  RegistryDescriptionTerm as Term,
  RegistryDescriptionDetails as Details,
  RegistryView,
  RegistryText,
} from './.generated/src/native/registry-styles';
const mount = (children: React.ReactNode) =>
  render(<UI.ThemeProvider>{children}</UI.ThemeProvider>);
test('native description terms and definitions retain association and explicit native IDs across layout wrappers', async () => {
  const term = React.createRef<NativeText>(),
    definition = React.createRef<View>();
  await mount(
    <List>
      <RegistryView>
        <Term nativeID="plan-term" ref={term}>
          Plan
        </Term>
        <Details ref={definition} testID="plan">
          Pro
        </Details>
      </RegistryView>
      <>
        <Term>Region</Term>
        <Details testID="region">Europe</Details>
      </>
    </List>,
  );
  expect(term.current).toBeTruthy();
  expect(definition.current).toBeTruthy();
  expect(screen.getByLabelText('Plan: Pro')).toBe(screen.getByTestId('plan'));
  expect(screen.getByText('Plan').props.nativeID).toBe('plan-term');
  // A labelled-by reference to just the term would replace the definition's value.
  expect(screen.getByTestId('plan').props.accessibilityLabelledBy).toBeUndefined();
  expect(screen.getByLabelText('Region: Europe')).toBe(screen.getByTestId('region'));
});
test('multiple terms and definitions share associations until the next term group and nested lists own their own scope', async () => {
  await mount(
    <List>
      <Term>HTTP</Term>
      <Term>HTTPS</Term>
      <Details testID="protocols">Protocols</Details>
      <Details>Transport</Details>
      <Term>Region</Term>
      <Details>EU</Details>
      <Details>
        <List>
          <Term>Zone</Term>
          <Details>West</Details>
        </List>
      </Details>
    </List>,
  );
  expect(screen.getByLabelText('HTTP, HTTPS: Protocols').props.role).toBe('definition');
  expect(screen.getByLabelText('HTTP, HTTPS: Transport')).toBeTruthy();
  expect(screen.getAllByRole('term')).toHaveLength(4);
  expect(screen.getByLabelText('Region: EU')).toBeTruthy();
  expect(screen.getByLabelText('Zone: West')).toBeTruthy();
});
test('definitions keep embedded native controls individually accessible and preserve actions and editing', async () => {
  const action = jest.fn(),
    change = jest.fn();
  await mount(
    <List>
      <Term>Controls</Term>
      <Details testID="controls">
        <UI.Button onPress={action}>Choose plan</UI.Button>
        <UI.Input accessibilityLabel="Plan name" onChangeText={change} />
        <RegistryText onPress={action}>Inline action</RegistryText>
      </Details>
    </List>,
  );
  expect(screen.getByTestId('controls').props.accessible).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Choose plan' }));
  await fireEvent.changeText(screen.getByLabelText('Plan name'), 'Team');
  expect(action).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenCalledWith('Team');
});
test('definition labels follow changed source values while explicit native labels remain authoritative', async () => {
  const source = (term: string, value: string) => (
    <UI.ThemeProvider>
      <List>
        <Term>{term}</Term>
        <Details>{value}</Details>
        <Details accessibilityLabel="Custom definition">Explicit</Details>
      </List>
    </UI.ThemeProvider>
  );
  const tree = await render(source('Plan', 'Pro'));
  expect(screen.getByLabelText('Plan: Pro')).toBeTruthy();
  await tree.rerender(source('Region', 'West'));
  expect(screen.queryByLabelText('Plan: Pro')).toBeNull();
  expect(screen.getByLabelText('Region: West')).toBeTruthy();
  expect(screen.getByLabelText('Custom definition')).toBeTruthy();
});
test('description styles inherit source typography and a nested explicit text size resets inherited leading', async () => {
  await mount(
    <RegistryView className="text-xs/relaxed">
      <List>
        <Term>Plan</Term>
        <Details>
          <RegistryText testID="inherited">Pro</RegistryText>
        </Details>
      </List>
      <RegistryText testID="reset" className="text-sm">
        Reset
      </RegistryText>
      <RegistryText testID="numeric" className="text-xs/relaxed leading-7">
        Explicit
      </RegistryText>
    </RegistryView>,
  );
  expect(screen.getByTestId('inherited')).toHaveStyle({ fontSize: 12, lineHeight: 19.5 });
  expect(screen.getByTestId('reset')).toHaveStyle({ fontSize: 14, lineHeight: 20 });
  expect(screen.getByTestId('numeric')).toHaveStyle({ fontSize: 12, lineHeight: 28 });
});
for (const base of ['base', 'radix', 'aria'])
  for (const style of ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
    test(`${base}/${style} authored Separator sections retain description values and native layout`, async () => {
      const Component = require(`./.generated/src/examples/${base}/separator-example`).default;
      await mount(
        <UI.NativeComponentStyleProvider style={style}>
          <Component />
        </UI.NativeComponentStyleProvider>,
      );
      for (const title of ['Horizontal', 'Vertical', 'Vertical Menu', 'In List'])
        expect(screen.getByText(title)).toBeOnTheScreen();
      for (const index of [1, 2, 3])
        expect(screen.getByLabelText('Item ' + index + ': Value ' + index)).toBeOnTheScreen();
    });
