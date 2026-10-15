import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './browser-tests',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  outputDir: '../../../.artifacts/dashboard/browser-results',
  use: {
    baseURL: 'http://127.0.0.1:4326',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: 'node --import tsx browser-tests/server.ts',
    url: 'http://127.0.0.1:4326',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
