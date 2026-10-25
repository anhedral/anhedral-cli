import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { nativeExamples } from './examples';
import * as UI from './.generated';
const registry = require('../../assets/ui/native/registry.json');
beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
});
afterEach(() => {
  jest.restoreAllMocks();
});
test('examples and published catalog cover the identical pinned upstream component set', () => {
  expect(Object.keys(nativeExamples).sort()).toEqual(
    registry.components.map((item: { id: string }) => item.id).sort(),
  );
  for (const component of registry.components)
    for (const name of component.exports)
      expect((UI as Record<string, unknown>)[name]).toBeDefined();
});
test.each(Object.entries(nativeExamples))(
  'parity:%s renders with the real native host-text invariant',
  async (_id, example) => {
    await render(<UI.ThemeProvider>{example()}</UI.ThemeProvider>);
    expect(screen.toJSON()).not.toBeNull();
  },
);
