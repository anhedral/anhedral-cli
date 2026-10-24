jest.mock('./.generated/src/theme-storage', () => ({
  readPreference: async () => 'light',
  savePreference: async () => {},
  applyTheme: () => {},
  subscribePreference: () => () => {},
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
