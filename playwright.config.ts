import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { ...devices['Pixel 7'], baseURL: 'http://localhost:8788' },
  webServer: {
    command: 'npm run build && npm run db:migrate:local && npx wrangler pages dev --port 8788',
    url: 'http://localhost:8788',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
