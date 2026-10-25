// Next source API slice: internal compound controls must pass their button type into a composed registry Button.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { withRegistryStyles } from './.generated/src/native/registry-styles';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
const SourceButton = withRegistryStyles(UI.Button, 'button');
test('composed select controls keep a source Button from implicitly submitting the surrounding form', async () => {
  const submit = jest.fn();
  await render(
    <UI.ThemeProvider>
      <NativeRegistryPalette source="radix" generation="modern">
        <UI.NativeForm onSubmit={submit}>
          <UI.Select defaultValue="one">
            <UI.SelectTrigger asChild>
              <SourceButton>Choose plan</SourceButton>
            </UI.SelectTrigger>
            <UI.SelectContent>
              <UI.SelectItem value="one">Personal</UI.SelectItem>
              <UI.SelectItem value="two">Team</UI.SelectItem>
            </UI.SelectContent>
          </UI.Select>
          <SourceButton>Submit form</SourceButton>
        </UI.NativeForm>
      </NativeRegistryPalette>
    </UI.ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('combobox', { name: 'Choose plan' }));
  expect(submit).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('radio', { name: 'Team' }));
  expect(submit).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Submit form' }));
  expect(submit).toHaveBeenCalledTimes(1);
});

test('composed button form dispatch belongs to its final host and reports synchronous validation failures once', async () => {
  const submit = jest.fn(),
    error = jest.fn();
  const { RegistryInput } = require('./.generated/src/native/registry-form-controls');
  await render(
    <UI.ThemeProvider>
      <UI.NativeForm onSubmit={submit} onError={error}>
        <RegistryInput required accessibilityLabel="Required field" />
        <UI.Button type="submit" asChild>
          <SourceButton>Validate composed</SourceButton>
        </UI.Button>
      </UI.NativeForm>
    </UI.ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Validate composed' }));
  expect(submit).not.toHaveBeenCalled();
  expect(error).toHaveBeenCalledTimes(1);
});

test('composed buttons inherit a form association while explicit child type and association win', async () => {
  const first = jest.fn(),
    second = jest.fn(),
    reset = jest.fn();
  await render(
    <UI.ThemeProvider>
      <UI.NativeFormScope>
        <UI.NativeForm nativeID="first" onSubmit={first} />
        <UI.NativeForm nativeID="second" onSubmit={second} onReset={reset} />
        <UI.Button type="submit" form="first" asChild>
          <SourceButton>Inherited form</SourceButton>
        </UI.Button>
        <UI.Button type="submit" form="first" asChild>
          <SourceButton type="reset" form="second">
            Child form
          </SourceButton>
        </UI.Button>
      </UI.NativeFormScope>
    </UI.ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Inherited form' }));
  expect(first).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Child form' }));
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).not.toHaveBeenCalled();
  expect(reset).toHaveBeenCalledTimes(1);
});

test('a composed native link navigates without becoming a submit button', async () => {
  const submit = jest.fn(),
    navigate = jest.fn();
  await render(
    <UI.ThemeProvider>
      <UI.NativeForm onSubmit={submit}>
        <UI.Button type="submit" asChild>
          <UI.NativeLink href="/destination" onNavigate={navigate}>
            Linked action
          </UI.NativeLink>
        </UI.Button>
      </UI.NativeForm>
    </UI.ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('link', { name: 'Linked action' }));
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(submit).not.toHaveBeenCalled();
});

test('a composed native Button recalculates source geometry for its real content and inherits explicit typography', async () => {
  const { Dimensions, StyleSheet } = require('react-native');
  const original = Dimensions.get('window');
  Dimensions.set({ window: { ...original, fontScale: 2 } });
  try {
    await render(
      <UI.ThemeProvider>
        <UI.NativeComponentStyleProvider style="nova">
          <UI.Button
            size="sm"
            textColor="purple"
            textStyle={{ fontSize: 18, lineHeight: 24 }}
            asChild
          >
            <UI.Button textStyle={{ color: 'blue', lineHeight: 30 }}>Nested typography</UI.Button>
          </UI.Button>
        </UI.NativeComponentStyleProvider>
      </UI.ThemeProvider>,
    );
    expect(screen.getByText('Nested typography')).toHaveStyle({
      fontSize: 18,
      lineHeight: 30,
      color: 'blue',
    });
    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: 'Nested typography' }).props.style)
        .height,
    ).toBeCloseTo(68.8);
  } finally {
    Dimensions.set({ window: original });
  }
});
