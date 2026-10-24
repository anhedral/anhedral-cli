module.exports = {
  preset: '@react-native/jest-preset',
  haste: {
    defaultPlatform: process.env.NATIVE_UI_PLATFORM === 'android' ? 'android' : 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  transform: { '^.+\\.[cm]?[jt]sx?$': 'babel-jest' },
  collectCoverage: true,
  coverageThreshold: { global: { lines: 90, statements: 85, functions: 75, branches: 70 } },
  collectCoverageFrom: ['.generated/src/native/**/*.{ts,tsx}', '.generated/src/theme.tsx'],
  coverageDirectory: '../../.artifacts/native-ui/' + (process.env.NATIVE_UI_PLATFORM ?? 'ios'),
  testMatch: ['<rootDir>/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  moduleNameMapper: { '^@workspace/styling$': '<rootDir>/.generated/styling/src/index.ts' },
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm/|(?:(jest-)?react-native|@react-native(-community)?|react-native-svg|react-native-safe-area-context|shiki|@shikijs|oniguruma-to-es|regex|regex-recursion|regex-utilities|oniguruma-parser|hast-util-to-html|hast-util-whitespace|ccount|character-entities-html4|character-entities-legacy|comma-separated-tokens|dequal|devlop|html-void-elements|mdast-util-to-hast|micromark-util-character|micromark-util-encode|micromark-util-sanitize-uri|micromark-util-symbol|micromark-util-types|property-information|space-separated-tokens|stringify-entities|trim-lines|unist-util-is|unist-util-position|unist-util-stringify-position|unist-util-visit-parents|unist-util-visit|vfile-message|vfile|zwitch|@ungap)(?:/|$))',
  ],
};
