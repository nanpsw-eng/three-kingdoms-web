import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_WEBKIT_PORT ?? 4174);

export default defineConfig({
  testDir: 'e2e',
  testMatch: [
    'shell.spec.ts',
    'pwa-responsive.spec.ts',
    'vertical-slice.spec.ts',
  ],
  timeout: 120_000,
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['iPhone 14'],
    browserName: 'webkit',
    viewport: { width: 390, height: 844 },
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite preview --strictPort --port ${port} --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'webkit-390' }],
});
