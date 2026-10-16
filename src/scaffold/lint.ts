import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { json, put, readJson } from './files.js';

/** Fresh bootstrap only: framework-specific lint tooling belongs to its app. */
export function normalizeSharedLint(root: string): void {
  const file = 'packages/eslint-config/package.json';
  if (!existsSync(path.join(root, file))) return;
  const manifest = readJson(root, file);
  for (const group of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const dependencies = manifest[group];
    if (dependencies && typeof dependencies === 'object' && !Array.isArray(dependencies))
      delete (dependencies as Record<string, unknown>)['@next/eslint-plugin-next'];
  }
  if (manifest.exports && typeof manifest.exports === 'object' && !Array.isArray(manifest.exports))
    delete (manifest.exports as Record<string, unknown>)['./next-js'];
  json(root, file, manifest);
  rmSync(path.join(root, 'packages/eslint-config/next.js'), { force: true });
}

/** Keep the starter's React/TypeScript rules and add the web app's Next API rules. */
export function writeWebLint(root: string): void {
  put(
    root,
    'apps/web/eslint.config.js',
    `import { globalIgnores } from 'eslint/config';
import pluginNext from '@next/eslint-plugin-next';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import { config as reactConfig } from '@workspace/eslint-config/react-internal';

export default [
  ...reactConfig,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: { parser: typescriptParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { '@typescript-eslint': typescriptPlugin },
    rules: { 'no-unused-vars': 'off', '@typescript-eslint/no-unused-vars': 'error' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    // TypeScript checks undefined names; ESLint's core rule cannot model types.
    rules: { 'no-undef': 'off' },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', '.open-next/**', '.wrangler/**', '.void/**', 'dist/**', 'cloudflare-env.d.ts']),
  {
    plugins: { '@next/next': pluginNext },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
];
`,
  );
}
