import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  webServer: {
    command: 'npm run dev -- --hostname 0.0.0.0 --port ' + PORT,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
