import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name:'chromium', use:{ ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node --env-file=.env.test scripts/start-e2e.js',
    url: 'http://127.0.0.1:3100/health',
    reuseExistingServer: false,
    timeout: 30000
  }
});
