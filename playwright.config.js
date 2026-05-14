import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.js',
  use: {
    baseURL: 'http://localhost:8081',
  },
  webServer: {
    command: 'npx vite --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
  },
});
