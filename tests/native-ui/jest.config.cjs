module.exports = {
  preset: '@react-native/jest-preset',
  haste: {
    defaultPlatform: process.env.NATIVE_UI_PLATFORM === 'android' ? 'android' : 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  collectCoverage: true,
  coverageThreshold: { global: { lines: 90, statements: 85, functions: 75, branches: 70 } },
  collectCoverageFrom: ['.generated/src/native/**/*.{ts,tsx}', '.generated/src/theme.tsx'],
  coverageDirectory: '../../.artifacts/native-ui/' + (process.env.NATIVE_UI_PLATFORM ?? 'ios'),
  testMatch: ['<rootDir>/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  moduleNameMapper: { '^@workspace/styling$': '<rootDir>/.generated/styling/src/index.ts' },
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm/|(?:(jest-)?react-native|@react-native(-community)?|react-native-svg|react-native-safe-area-context)(?:/|$))',
  ],
};
