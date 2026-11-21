import parser from '@typescript-eslint/parser';
import plugin from '@typescript-eslint/eslint-plugin';
export const config = [{ ignores: ['dist/**', '.output/**', '.wrangler/**', 'worker-configuration.d.ts'] }, { files: ['**/*.{ts,tsx,cts,mts}'], languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } }, plugins: { '@typescript-eslint': plugin }, rules: { ...plugin.configs.recommended.rules, 'no-undef': 'off', 'no-unused-vars': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } }];
