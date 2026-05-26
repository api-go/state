import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.js',
  use: {
    baseURL: 'http://127.0.0.1:8081',
  },
  webServer: {
    command: 'npx vite --port 8081 --host 127.0.0.1',
    url: 'http://127.0.0.1:8081',
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
  },
});
