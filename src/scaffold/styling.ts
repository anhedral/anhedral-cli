import { createRequire } from 'node:module';
import path from 'node:path';
import type { RecipeContext } from '../registry/types.js';
import { json, patchPackage, put, readJson } from './files.js';

/** One shared token source for native components and DOM CSS. */
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
  patchPackage(root, 'packages/styling/package.json', {
    exports: {
      '.': './src/index.ts',
      './globals.css': './globals.css',
    },
  });
  const tokens = createRequire(import.meta.url)(
    path.join(root, 'packages/styling/src/tokens.cjs'),
  ) as { light: Record<string, string>; dark: Record<string, string> };
  const rule = (selector: string, values: Record<string, string>) =>
    selector +
    ' {\n' +
    Object.entries(values)
      .map(([key, value]) => '  ' + key + ': ' + value + ';')
      .join('\n') +
    '\n}\n';
  put(
    root,
    'packages/styling/globals.css',
    rule(':root', tokens.light) +
      '@media (prefers-color-scheme: dark) {\n' +
      rule(':root', tokens.dark) +
      '}\n',
  );
  put(
    root,
    'packages/styling/src/tokens.d.cts',
    'export const light: Record<string, string>;\nexport const dark: Record<string, string>;\nexport const spacing: { small: number; medium: number; large: number };\n',
  );
  const config = readJson(root, 'packages/styling/tsconfig.json');
  json(root, 'packages/styling/tsconfig.json', {
    ...config,
    compilerOptions: { ...(config.compilerOptions as Record<string, unknown>), allowJs: true },
    include: ['src/**/*.ts', 'src/**/*.cjs'],
  });
}
