import { defineConfig, devices } from '@playwright/test';

import { E2E_API_PORT, E2E_WEB_ORIGIN, E2E_WEB_PORT, e2eApiEnv } from './e2e/stack';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // On CI the JSON report feeds the job summary (.github/scripts/e2e-summary.mjs); the HTML
  // report and traces are uploaded when a run fails.
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/e2e.json' }]]
    : 'list',
  use: {
    baseURL: E2E_WEB_ORIGIN,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: '../api',
      env: e2eApiEnv(),
      url: `http://127.0.0.1:${E2E_API_PORT}/api/health/ready`,
      // Never attach to a running server: it could be the dev API on the dev database.
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npx vite --port ${E2E_WEB_PORT} --strictPort`,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${E2E_API_PORT}` },
      url: E2E_WEB_ORIGIN,
      reuseExistingServer: false,
    },
  ],
});
