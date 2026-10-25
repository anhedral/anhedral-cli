import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from './.generated';
import manifest from './.generated/NATIVE_RECIPES.json';
import { NativeExampleOptions } from './.generated/src/native/registry-example';
for (const recipe of manifest.recipes.filter((recipe) => recipe.kind === 'example')) {
  test(`${recipe.style}/${recipe.name} retains the official chart example data and native interactions`, async () => {
    const Component = require(`./.generated/src/examples/${recipe.style}/${recipe.name}`).default;
    const error = jest.spyOn(console, 'error'),
      warn = jest.spyOn(console, 'warn');
    await render(
      <ThemeProvider>
        <Component />
      </ThemeProvider>,
    );
    const charts = screen.queryAllByRole('adjustable');
    if (recipe.name === 'chart-tooltip-demo') {
      expect(charts).toHaveLength(0);
      expect(screen.getByText('Page Views')).toBeOnTheScreen();
      expect(screen.getByText('186')).toBeOnTheScreen();
      expect(screen.getByText('80')).toBeOnTheScreen();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      warn.mockRestore();
      error.mockRestore();
      return;
    }
    expect(charts).toHaveLength(recipe.name === 'chart-example' ? 6 : 1);
    for (const chart of charts) {
      await fireEvent(chart, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
      expect(chart.props.accessibilityValue.text).toContain(':');
    }
    if (recipe.name.startsWith('chart-bar-demo')) {
      expect(screen.getByRole('adjustable').props.accessibilityValue.text).toContain(
        'desktop: 186',
      );
      expect(screen.getByRole('adjustable').props.accessibilityValue.text).toContain('mobile: 80');
    }
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    error.mockRestore();
    warn.mockRestore();
  });
}
test.each(['nova', 'lyra', 'sera'] as const)(
  'native preview style %s preserves the upstream explicit bar-corner condition',
  async (style) => {
    const Component = require('./.generated/src/examples/radix/chart-example').default;
    await render(
      <ThemeProvider>
        <NativeExampleOptions style={style}>
          <Component />
        </NativeExampleOptions>
      </ThemeProvider>,
    );
    const bar = screen.getByTestId('chart-bar-0-0', { includeHiddenElements: true });
    const corner = /H([-\d.]+)Q([-\d.]+),/.exec(bar.props.d);
    expect(corner).not.toBeNull();
    expect(Number(corner![2]) - Number(corner![1])).toBeCloseTo(style === 'nova' ? 4 : 0);
  },
);
