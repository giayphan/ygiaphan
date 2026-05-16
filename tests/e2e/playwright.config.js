// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'report' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'iphone12', use: { ...devices['iPhone 12'] } },
    { name: 'pixel5',   use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npx --yes http-server -p 8080 -c-1 -s .',
    cwd: '../..',
    url: 'http://127.0.0.1:8080/index.html',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
