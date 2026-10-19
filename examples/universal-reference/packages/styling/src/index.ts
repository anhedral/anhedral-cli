import { light, dark, spacing } from './tokens.cjs';

export const styling = {
  colors: {
    foreground: 'hsl(' + light['--foreground'] + ')',
    background: 'hsl(' + light['--background'] + ')',
  },
  spacing,
  themes: { light, dark },
};
