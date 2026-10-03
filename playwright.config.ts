import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Chromium responsive smoke tests at the PRD widths (360/390/412).
 * PW_CHROMIUM_PATH (or the managed-container default) pins a preinstalled Chromium;
 * otherwise Playwright's own downloaded browser is used.
 * NOTE: Chromium mobile emulation is NOT real Android Chrome or iPhone Safari evidence.
 */
const preinstalled = process.env.PW_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const executablePath = existsSync(preinstalled) ? preinstalled : undefined;
const port = Number(process.env.E2E_PORT ?? 4173);

const mobile = (width: number, height: number) => ({
  ...devices['Pixel 7'],
  browserName: 'chromium' as const,
  viewport: { width, height },
  launchOptions: executablePath ? { executablePath } : {},
});

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: {
    command: `npx vite preview --strictPort --port ${port} --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium-360', use: mobile(360, 780) },
    { name: 'chromium-390', use: mobile(390, 844) },
    { name: 'chromium-412', use: mobile(412, 915) },
  ],
});
