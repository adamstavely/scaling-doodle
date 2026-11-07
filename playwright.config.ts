import { defineConfig, devices } from '@playwright/test';

// Smoke tests run the app against recorded API responses (e2e/fixtures), so CI needs no backend.
const PORT = 4300;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npx ng serve --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
