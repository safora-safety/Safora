# Setup – Version 1 Additions

This page lists what V1 adds to the standard setup in [`../setup.md`](../setup.md). Prerequisites, `.env` files and the `npm install` and `npm run dev` steps are unchanged.

## 1. New Environment Variables

`apps/backend/.env`:

```env
# Authenticates the external watchdog trigger (POST /api/internal/tick)
INTERNAL_TICK_SECRET=<long random string>

# Optional: default corridor width in metres (20-1000). Default is 100
CORRIDOR_THRESHOLD_METERS=100

# Optional: session lifetime. Default is 7d
JWT_EXPIRES_IN=7d
```

The mobile app needs no new variables; the Socket.IO client reuses the host of `API_BASE_URL`.

## 2. Database

`initDatabase()` creates the new V1 tables and columns the first time the backend starts against a fresh database. For an **existing** database with data, run the statements in [`database.md`](./database.md#5-v1-migration-script) once, before deploying the V1 backend.

## 3. Watchdog

- **Local development.** The 30-second in-process tick runs while `npm run dev` is running. No external scheduler is needed.
- **Deployed backend (once, before a demonstration).** Render's free instance sleeps after 15 minutes without traffic, so an external scheduler must call the tick endpoint:

  1. Create a job on a free scheduler such as cron-job.org.
  2. Method `POST`, URL `https://<backend>/api/internal/tick`, interval **every 60 seconds**.
  3. Header `X-Internal-Secret: <INTERNAL_TICK_SECRET>`.
  4. Check the Render logs to confirm that the job fires; the response is `{"scanned":N,"escalated":N}`.

  A wrong or missing secret returns `401`.

## 4. Two-Device Test

Live tracking and the deviation alert need a second phone or emulator that is signed in as a trusted contact. A single device cannot demonstrate the flow. See [Testing](./testing-and-submission.md).

## 5. Android Build Notes

- The foreground service requires the permissions declared in `AndroidManifest.xml` (location, microphone, foreground-service types and `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`).
- Release build: about 34 MB, arm64-v8a.
- Do not compile the MapTiler key into the mobile bundle. It is used only by the backend; verify with `strings` on the APK before release.
