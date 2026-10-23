import { readFileSync } from 'node:fs';
import type { RecipeContext } from '../registry/types.js';
import { patchPackage, put } from './files.js';

/** One Nova palette; native uses sRGB and WXT retains its Tailwind 3 transport. */
export function scaffoldStyling({ root }: RecipeContext): void {
  const palette = JSON.parse(
    readFileSync(new URL('../../assets/ui/tokens.json', import.meta.url), 'utf8'),
  ) as Record<string, Record<string, string>>;
  const native = Object.fromEntries(
    Object.entries(palette).map(([mode, colors]) => [
      mode,
      Object.fromEntries(Object.entries(colors).map(([key, value]) => [key, nativeColor(value)])),
    ]),
  );
  put(
    root,
    'packages/styling/src/themes.ts',
    `export const themes = ${JSON.stringify(native, null, 2)};\n`,
  );
  const legacy = Object.fromEntries(
    Object.entries(native).map(([mode, colors]) => [
      mode,
      Object.fromEntries(
        Object.entries(colors).map(([key, value]) => ['--' + key, legacyHsl(value)]),
      ),
    ]),
  );
  put(
    root,
    'packages/styling/src/tokens.cjs',
    `exports.light = ${JSON.stringify({ ...legacy.light, '--radius': '0.625rem' }, null, 2)};\nexports.dark = ${JSON.stringify({ ...legacy.dark, '--radius': '0.625rem' }, null, 2)};\nexports.spacing = { small: 4, medium: 8, large: 16 };\n`,
  );
  put(
    root,
    'packages/styling/src/tokens.d.cts',
    'export const light: Record<`--${string}`, string>;\nexport const dark: typeof light;\nexport const spacing: { small: number; medium: number; large: number };\n',
  );
  put(
    root,
    'packages/styling/src/index.ts',
    `import { light, dark, spacing } from './tokens.cjs';
export { themes } from './themes';
export const styling = { colors: { foreground: 'hsl(' + light['--foreground'] + ')', background: 'hsl(' + light['--background'] + ')' }, spacing, themes: { light, dark } };
`,
  );
  put(
    root,
    'packages/styling/tailwind.cjs',
    `const { light, dark } = require('./src/tokens.cjs');
const color = (name) => 'hsl(var(--' + name + '))';
const surface = (name) => ({ DEFAULT: color(name), foreground: color(name + '-foreground') });
module.exports = { darkMode: 'class', theme: { extend: {
  colors: { border: color('border'), input: color('input'), ring: color('ring'), background: color('background'), foreground: color('foreground'), primary: surface('primary'), secondary: surface('secondary'), destructive: color('destructive'), muted: surface('muted'), accent: surface('accent'), popover: surface('popover'), card: surface('card') },
  borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
} }, plugins: [function themeVariables({ addBase }) { addBase({ ':root': light, '.dark:root': dark }); }] };
`,
  );
  patchPackage(root, 'packages/styling/package.json', {
    exports: { '.': './src/index.ts', './tailwind': './tailwind.cjs' },
  });
}
function legacyHsl(value: string): string {
  if (value.startsWith('rgba')) {
    const parts = value.match(/[\d.]+/g)!;
    return '0 0% 100% / ' + parts[3];
  }
  const rgb = [1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16) / 255);
  const [r, g, b] = rgb,
    max = Math.max(...rgb),
    min = Math.min(...rgb),
    delta = max - min,
    l = (max + min) / 2;
  const sat = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !delta
    ? 0
    : max === r
      ? ((g - b) / delta + 6) % 6
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return `${(h * 60).toFixed(3)} ${(sat * 100).toFixed(3)}% ${(l * 100).toFixed(3)}%`;
}

/** Convert OKLCH to sRGB for native color APIs; web keeps the original values. */
function nativeColor(value: string): string {
  const numbers = value.match(/[\d.]+/g)!.map(Number);
  const [l, c, h] = numbers;
  const a = c * Math.cos((h * Math.PI) / 180),
    b = c * Math.sin((h * Math.PI) / 180);
  const x = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const y = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const z = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z,
    -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
    -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z,
  ].map((v) =>
    Math.round(
      Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)) * 255,
    ),
  );
  return numbers.length > 3
    ? `rgba(${rgb.join(',')},${numbers[3] / 100})`
    : '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}
