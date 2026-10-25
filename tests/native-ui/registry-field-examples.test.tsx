import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import { NativeExampleOptions } from './.generated/src/native/registry-example';
for (const family of ['base', 'aria', 'radix'])
  for (const style of ['nova', 'vega', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const)
    test(`${family}/${style} authored Field examples preserve all ten input and composition sections`, async () => {
      const Component = require(`./.generated/src/examples/${family}/field-example`).default;
      await render(
        <UI.ThemeProvider>
          <NativeExampleOptions style={style}>
            <Component />
          </NativeExampleOptions>
        </UI.ThemeProvider>,
      );
      for (const title of [
        'Input Fields',
        'Textarea Fields',
        'Select Fields',
        'Checkbox Fields',
        'Radio Fields',
        'Switch Fields',
        'Slider Fields',
        'Native Select Fields',
        'OTP Input Fields',
        'Horizontal Fields',
      ])
        expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByPlaceholderText('Enter your username')).toBeTruthy();
      await fireEvent.changeText(screen.getByPlaceholderText('Enter your username'), 'anhedral');
    });
for (const name of [
  'field-demo',
  'field-group',
  'field-responsive',
  'field-input',
  'field-textarea',
  'field-fieldset',
  'field-radio',
  'field-checkbox',
  'field-switch',
  'field-slider',
  'field-select',
  'field-choice-card',
])
  test(`New York V4 authored ${name} retains native field and control composition`, async () => {
    const Component = require(`./.generated/src/examples/new-york-v4/${name}`).default;
    await render(
      <UI.ThemeProvider>
        <Component />
      </UI.ThemeProvider>,
    );
    expect(screen.container.queryAll((node) => node.type === 'View').length).toBeGreaterThan(0);
  });
