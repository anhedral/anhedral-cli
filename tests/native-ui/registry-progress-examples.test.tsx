import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as UI from './.generated';
test.each(['default', 'new-york', 'new-york-v4'])(
  'authored %s progress demo retains its initial value, delayed update, width and timer cleanup',
  async (style) => {
    jest.useFakeTimers();
    const clear = jest.spyOn(globalThis, 'clearTimeout');
    const schedule = jest.spyOn(globalThis, 'setTimeout');
    try {
      const Component = require(`./.generated/src/examples/${style}/progress-demo`).default;
      const view = await render(
        <UI.ThemeProvider>
          <Component />
        </UI.ThemeProvider>,
      );
      expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 13, max: 100 });
      expect(StyleSheet.flatten(screen.getByRole('progressbar').props.style).width).toBe('60%');
      await act(() => jest.advanceTimersByTime(499));
      expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 13 });
      await act(() => jest.advanceTimersByTime(1));
      expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 66 });
      await view.unmount();
      const timer = schedule.mock.calls.findIndex((call) => call[1] === 500);
      expect(timer).toBeGreaterThanOrEqual(0);
      expect(clear).toHaveBeenCalledWith(schedule.mock.results[timer]!.value);
    } finally {
      clear.mockRestore();
      schedule.mockRestore();
      jest.useRealTimers();
    }
  },
);
