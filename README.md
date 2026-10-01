# socialcal

Find a day that works for a group. Create a calendar, share the link, and everyone marks the days they're free.

Design: `docs/superpowers/specs/2026-09-30-socialcal-design.md`

## Develop

```bash
npm install
npm run db:migrate:local
npm run build && npm run dev:api   # API + built app on http://localhost:8788
npm run dev                        # Vite with hot reload on http://localhost:5173 (proxies /api to 8788)
```

## Test

```bash
npm test            # unit + API tests
npm run test:e2e    # Playwright, mobile viewport
npm run typecheck
```

## Deploy

```bash
npx wrangler login                 # once
npm run db:migrate:remote
npm run db:migrate:preview         # same migrations on the preview database
npm run deploy
```

Preview deployments (every branch pushed to GitHub except `main`) use the separate `socialcal-preview` database, set in `wrangler.toml` under `[env.preview]`. Run every new migration against both databases.
