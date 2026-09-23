# Setup — V1 (delta from your existing `docs/setup.md`)

Your current `docs/setup.md` is accurate and does not need a rewrite — keep using it for prerequisites, `.env` files, and `npm install`/`npm run dev` steps. This file only lists what changes for V1.

## New environment variables

`apps/backend/.env` — add:
```env
# Watchdog tick endpoint auth (V1)
INTERNAL_TICK_SECRET=some_long_random_string
```

No new mobile `.env` variables for V1 (Socket.IO reuses `API_BASE_URL`'s host with the Socket.IO path).

## New setup steps

1. **Run the schema update.** Since `initDatabase()` creates tables inline, the new V1 columns/table (`database.md` §2) will be created automatically the next time the backend starts against a fresh database. **For an existing database with data**, run the `ALTER TABLE`/`CREATE TABLE` statements from `database.md` §2 manually once.
2. **Keep the watchdog alive locally.** For local development you don't need the external pinger — the 30-second in-process tick runs as long as `npm run dev` is running. Only the deployed Render instance needs the external `POST /api/internal/tick` scheduler (see `api.md`), because it can sleep after 15 minutes idle.
3. **Set up the external pinger for the deployed backend** (once, before your demo/submission):
   - Use a free scheduler such as cron-job.org.
   - Configure it to `POST` to `https://<your-render-backend>/api/internal/tick` every 5 minutes with header `X-Internal-Secret: <INTERNAL_TICK_SECRET>`.
   - This also has the side effect of preventing Render's free instance from sleeping, which reduces (does not eliminate) cold-start delay for real demo traffic.
4. **Two-device test for live tracking (Architecture §3, `testing-and-submission.md` T4).** You need a second phone or emulator logged in as a trusted contact to see the live location and deviation alert land. A single device cannot demonstrate this flow to yourself.

## Nothing else changes
Android Studio/SDK/NDK versions, PostgreSQL/PostGIS requirement, and the monorepo `npm install` flow are all unchanged from your existing `docs/setup.md`.
