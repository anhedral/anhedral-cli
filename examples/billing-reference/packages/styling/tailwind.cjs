const { light, dark } = require('./src/tokens.cjs');
const color = (name) => 'hsl(var(--' + name + '))';
const surface = (name) => ({ DEFAULT: color(name), foreground: color(name + '-foreground') });

module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: color('border'), input: color('input'), ring: color('ring'),
        background: color('background'), foreground: color('foreground'),
        primary: surface('primary'), secondary: surface('secondary'),
        destructive: surface('destructive'), muted: surface('muted'),
        accent: surface('accent'), popover: surface('popover'), card: surface('card'),
      },
      borderRadius: {
        lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [function themeVariables({ addBase }) {
    addBase({ ':root': light, '.dark:root': dark });
  }],
};
