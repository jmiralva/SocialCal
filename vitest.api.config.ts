import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';

export default defineConfig(async () => {
  const migrations = await readD1Migrations(fileURLToPath(new URL('./migrations', import.meta.url)));
  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: '2026-08-22',
          d1Databases: ['DB'],
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      include: ['server/**/*.test.ts'],
      setupFiles: ['server/test/apply-migrations.ts'],
    },
  };
});
