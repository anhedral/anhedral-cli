import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as UI from './.generated';
import { NativeExampleOptions } from './.generated/src/native/_registry-context';
for (const source of ['base', 'radix', 'aria'])
  for (const preset of ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
    test(`${source}/${preset} authored Input examples retain every section, input type and independent field associations`, async () => {
      const Component = require(`./.generated/src/examples/${source}/input-example`).default;
      await render(
        <UI.ThemeProvider>
          <NativeExampleOptions style={preset}>
            <Component />
          </NativeExampleOptions>
        </UI.ThemeProvider>,
      );
      for (const title of [
        'Basic',
        'Invalid',
        'With Label',
        'With Description',
        'Disabled',
        'Input Types',
        'With Select',
        'With Button',
        'With Native Select',
        'Form',
      ])
        expect(screen.getByText(title)).toBeOnTheScreen();
      expect(screen.getByPlaceholderText('Password').props.secureTextEntry).toBe(true);
      expect(screen.getByPlaceholderText('https://example.com').props.keyboardType).toBe('url');
      expect(screen.getByPlaceholderText('123').props.keyboardType).toBe('numeric');
      expect(
        screen
          .getAllByPlaceholderText('+1 (555) 123-4567')
          .every((field) => field.props.keyboardType === 'phone-pad'),
      ).toBe(true);
      for (const name of ['Date', 'Time', 'File'])
        expect(screen.getByRole('button', { name })).toBeOnTheScreen();
      const username = screen.getByPlaceholderText('Enter your username');
      expect(username.props.accessibilityLabel).toBe('Username');
      expect(username.props.accessibilityHint).toContain('unique username');
      expect(username.props.nativeID).toBe('input-demo-username');
      expect(screen.getByPlaceholderText('name@example.com').props.nativeID).toBe(
        'input-demo-email',
      );
      expect(
        screen.getAllByPlaceholderText('Email').some((field) => field.props.editable === false),
      ).toBe(true);
    });
for (const source of ['base', 'radix', 'aria'])
  test(`${source} authored Textarea examples retain disabled, invalid, associated labels and descriptions`, async () => {
    const Component = require(`./.generated/src/examples/${source}/textarea-example`).default;
    await render(
      <UI.ThemeProvider>
        <Component />
      </UI.ThemeProvider>,
    );
    for (const title of ['Basic', 'Invalid', 'With Label', 'With Description', 'Disabled'])
      expect(screen.getByText(title)).toBeOnTheScreen();
    const fields = screen.getAllByPlaceholderText('Type your message here.');
    expect(fields).toHaveLength(5);
    expect(fields.every((field) => field.props.multiline)).toBe(true);
    expect(fields.every((field) => field.props.numberOfLines === undefined)).toBe(true);
    expect(fields.some((field) => field.props.accessibilityHint?.includes('Invalid value'))).toBe(
      true,
    );
    expect(fields.some((field) => field.props.accessibilityHint?.includes('press enter'))).toBe(
      true,
    );
    expect(fields.filter((field) => field.props.editable === false)).toHaveLength(1);
  });
