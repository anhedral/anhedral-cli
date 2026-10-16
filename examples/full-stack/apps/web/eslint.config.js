import { globalIgnores } from 'eslint/config';
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
