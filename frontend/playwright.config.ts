import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Ports apart from `npm run dev` (3000 / 5176), so both can run at once (overridable for parallel runs). */
const API_PORT = Number(process.env.E2E_API_PORT ?? 3100);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5186);

// One database per run, shared with the workers (and the teardown) through the environment.
process.env.E2E_DATABASE ??= join(tmpdir(), `money-manager-e2e-${Date.now()}.db`);

/** The API the tests talk to directly when the screen is not what they are about. */
export const API_URL = `http://localhost:${API_PORT}/api`;

export const DEMO_USER = { email: 'demo@moneymanager.local', password: 'e2e-Password-1' };

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/teardown.ts',
  // One shared database: tests run in order, each with its own data.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'es-ES',
    trace: 'retain-on-failure',
    // A step that cannot be done fails in seconds, not when the whole test times out.
    actionTimeout: 15_000,
  },
  // The installed Chrome (also preinstalled on GitHub runners): no browser download.
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/api/health`,
      timeout: 120_000,
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        DATABASE_PATH: process.env.E2E_DATABASE,
        APP_URL: `http://localhost:${WEB_PORT}`,
        SEED_DEMO_USER: 'true',
        SEED_DEMO_EMAIL: DEMO_USER.email,
        SEED_DEMO_PASSWORD: DEMO_USER.password,
        RATE_LIMIT_DISABLED: 'true',
        AI_PROVIDER: 'none',
        // The crypto console's prices are invented on the server: the tests never call the Internet.
        CRYPTO_MARKET: 'demo',
      },
    },
    {
      // public/ocr is not in git: the receipt and screenshot reader needs it, as `npm run dev` does.
      command: `node scripts/copy-ocr.mjs && npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 120_000,
      env: { VITE_API_URL: `http://localhost:${API_PORT}/api` },
    },
  ],
});
