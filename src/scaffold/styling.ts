import type { RecipeContext } from '../registry/types.js';
import { json, patchPackage, put, readJson } from './files.js';

/** Shared data and a Tailwind v3 preset for Expo/NativeWind. */
export function scaffoldStyling({ root }: RecipeContext): void {
  put(
    root,
    'packages/styling/src/tokens.cjs',
    `exports.light = {
  '--background': '0 0% 100%',
  '--foreground': '0 0% 9%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 9%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '0 0% 9%',
  '--primary': '0 0% 9%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '0 0% 96.1%',
  '--secondary-foreground': '0 0% 9%',
  '--muted': '0 0% 96.1%',
  '--muted-foreground': '0 0% 45.1%',
  '--accent': '0 0% 96.1%',
  '--accent-foreground': '0 0% 9%',
  '--destructive': '0 84.2% 60.2%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '0 0% 89.8%',
  '--input': '0 0% 89.8%',
  '--ring': '0 0% 63.9%',
  '--radius': '0.5rem',
};

exports.dark = {
  ...exports.light,
  '--background': '0 0% 9%',
  '--foreground': '0 0% 98%',
  '--card': '0 0% 9%',
  '--card-foreground': '0 0% 98%',
  '--popover': '0 0% 9%',
  '--popover-foreground': '0 0% 98%',
  '--primary': '0 0% 98%',
  '--primary-foreground': '0 0% 9%',
  '--secondary': '0 0% 14.9%',
  '--secondary-foreground': '0 0% 98%',
  '--muted': '0 0% 14.9%',
  '--muted-foreground': '0 0% 63.9%',
  '--accent': '0 0% 14.9%',
  '--accent-foreground': '0 0% 98%',
  '--destructive': '0 70.9% 59.4%',
  '--border': '0 0% 14.9%',
  '--input': '0 0% 14.9%',
};

exports.spacing = { small: 4, medium: 8, large: 16 };
`,
  );
  put(
    root,
    'packages/styling/tailwind.cjs',
    `const { light, dark } = require('./src/tokens.cjs');
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
`,
  );
  patchPackage(root, 'packages/styling/package.json', {
    exports: { '.': './src/index.ts', './tailwind': './tailwind.cjs' },
  });
  const config = readJson(root, 'packages/styling/tsconfig.json');
  json(root, 'packages/styling/tsconfig.json', {
    ...config,
    compilerOptions: { ...(config.compilerOptions as Record<string, unknown>), allowJs: true },
    include: ['src/**/*.ts', 'src/**/*.cjs', 'tailwind.cjs'],
  });
}
