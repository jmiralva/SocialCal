import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  server: {
    proxy: {
      // The API rejects a mismatched Origin; present the API's own origin through the proxy. The proxy overwrites Origin, so `bad_origin` can't fire through :5173; `server/api.test.ts` covers the check.
      '/api': { target: 'http://localhost:8788', changeOrigin: true, headers: { origin: 'http://localhost:8788' } },
    },
  },
});
