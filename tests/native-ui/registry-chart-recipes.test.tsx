import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from './.generated';
import manifest from './.generated/NATIVE_RECIPES.json';
import {
  RegistryView,
  RegistryText,
  RegistryButton,
  withRegistryStyles,
} from './.generated/src/native/registry-styles';
import { Button } from './.generated/src/native/button';

for (const recipe of manifest.recipes.filter((recipe) => recipe.kind === 'block')) {
  test(`${recipe.style}/${recipe.name} renders its official data with native SVG and accessible selection`, async () => {
    const warn = jest.spyOn(console, 'warn');
    const error = jest.spyOn(console, 'error');
    const imported = require(`./.generated/src/recipes/${recipe.style}/${recipe.name}`);
    const Component =
      imported.default ??
      Object.entries(imported).find(
        ([name, value]) => name.startsWith('Chart') && typeof value === 'function',
      )?.[1];
    if (typeof Component !== 'function') throw Error('Missing recipe component ' + recipe.name);
    await render(
      <ThemeProvider>
        <Component />
      </ThemeProvider>,
    );
    const canvas = screen.getByRole('adjustable');
    expect(canvas.props.accessibilityValue.text).toMatch(/data points|:/);
    expect(canvas.props.accessibilityValue.max).toBeGreaterThanOrEqual(0);
    expect(canvas.props.accessibilityActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'increment' })]),
    );
    await fireEvent(canvas, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByRole('adjustable').props.accessibilityValue.now).toBeGreaterThanOrEqual(0);
    expect(screen.getByRole('adjustable').props.accessibilityValue.text).toContain(':');
    expect(screen.getByRole('adjustable').props.accessibilityValue.text).not.toMatch(
      /NaN|Infinity/,
    );
    const tree = screen.toJSON();
    expect(tree).not.toBeNull();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });
}

test('native recipe views inherit typography, preserve actions, resolve CSS variables and measure grid containers', async () => {
  const onPress = jest.fn();
  const StyledButton = withRegistryStyles(Button);
  await render(
    <ThemeProvider>
      <RegistryView
        testID="grid"
        className="grid gap-2 grid-cols-2 text-3xl font-medium"
        style={{ '--color-bg': '#112233' }}
      >
        <RegistryView testID="cell">
          <RegistryText>Inherited typography</RegistryText>
        </RegistryView>
        <RegistryButton onPress={onPress} data-active className="data-[active=true]:bg-muted/50">
          <RegistryText>Action</RegistryText>
        </RegistryButton>
        <StyledButton variant="outline">Core component</StyledButton>
        <RegistryView testID="variable" className="bg-(--color-bg)" />
      </RegistryView>
    </ThemeProvider>,
  );
  expect(screen.getByText('Inherited typography')).toHaveStyle({ fontSize: 30, fontWeight: '500' });
  expect(screen.getByTestId('variable')).toHaveStyle({ backgroundColor: '#112233' });
  await fireEvent.press(screen.getByRole('button', { name: 'Action' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByTestId('grid'), 'layout', {
    nativeEvent: { layout: { width: 800, height: 400, x: 0, y: 0 } },
  });
  expect(screen.getByTestId('cell')).toHaveStyle({ width: 396 });
  expect(screen.getByRole('button', { name: 'Action' }).props.accessibilityState).toEqual({
    selected: true,
  });
});

for (const style of ['default', 'new-york', 'new-york-v4']) {
  for (const kind of ['bar', 'line']) {
    test(`${style} interactive ${kind} switches the actual native data series`, async () => {
      const imported = require(`./.generated/src/recipes/${style}/chart-${kind}-interactive`);
      const Component =
        imported.default ??
        imported[kind === 'bar' ? 'ChartBarInteractive' : 'ChartLineInteractive'];
      await render(
        <ThemeProvider>
          <Component />
        </ThemeProvider>,
      );
      const mobile = screen.getByRole('button', { name: /Mobile/ });
      await fireEvent.press(mobile);
      expect(screen.getByRole('button', { name: /Mobile/ }).props.accessibilityState.selected).toBe(
        true,
      );
      await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      });
      expect(screen.getByRole('adjustable').props.accessibilityValue.text).toContain('mobile:');
      await fireEvent.press(screen.getByRole('button', { name: /Desktop/ }));
      expect(screen.getByRole('adjustable').props.accessibilityValue.text).toContain('desktop:');
    });
  }
  test(`${style} area date-range control filters the actual data rather than only changing its label`, async () => {
    const imported = require(`./.generated/src/recipes/${style}/chart-area-interactive`);
    const Component = imported.default ?? imported.ChartAreaInteractive;
    await render(
      <ThemeProvider>
        <Component />
      </ThemeProvider>,
    );
    const initial = screen.getByRole('adjustable').props.accessibilityValue.max;
    await fireEvent.press(screen.getByRole('combobox'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Last 7 days' }));
    expect(screen.getByRole('adjustable').props.accessibilityValue.max).toBeLessThan(initial);
    expect(screen.getByRole('combobox')).toHaveTextContent('Last 7 days');
  });
  test(`${style} pie selection changes active sector and the original value shown in its label`, async () => {
    const imported = require(`./.generated/src/recipes/${style}/chart-pie-interactive`);
    const Component = imported.default ?? imported.ChartPieInteractive;
    await render(
      <ThemeProvider>
        <Component />
      </ThemeProvider>,
    );
    await fireEvent.press(screen.getByRole('combobox'));
    await fireEvent.press(screen.getByRole('radio', { name: /May/i }));
    expect(screen.getByRole('combobox')).toHaveTextContent('May');
    expect(screen.getByRole('adjustable').props.accessibilityValue.now).toBe(4);
    expect(screen.getByRole('adjustable').props.accessibilityValue.text).toContain('209');
  });
}

test.each([false, true])(
  'native recipe hover/touch motion respects reduced motion=%s and unsubscribes on unmount',
  async (reduced) => {
    const { Animated, AccessibilityInfo } = require('react-native');
    const reduce = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(reduced);
    const remove = jest.fn();
    const subscription = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove });
    const timing = jest
      .spyOn(Animated, 'timing')
      .mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
    const { act } = require('@testing-library/react-native');
    const mounted = await render(
      <ThemeProvider>
        <RegistryView
          testID="hover-card"
          className="transition-all ease-in-out hover:-translate-y-0.5"
        >
          <RegistryText>Preview</RegistryText>
        </RegistryView>
      </ThemeProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    await fireEvent(screen.getByTestId('hover-card'), 'pointerEnter', {
      nativeEvent: { pointerType: 'mouse' },
    });
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: -2, duration: reduced ? 0 : 150, useNativeDriver: true }),
    );
    await fireEvent(screen.getByTestId('hover-card'), 'touchEnd', { nativeEvent: {} });
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0 }),
    );
    await mounted.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
    timing.mockRestore();
    subscription.mockRestore();
    reduce.mockRestore();
  },
);
