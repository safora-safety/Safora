# Developer Setup Guide

This guide takes a new developer from a clean machine to a running backend, admin console and Android app. Version-specific additions are listed in [`v1/setup.md`](v1/setup.md).

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 22.11 or later | `node --version` |
| npm | Bundled with Node | The repository is an npm workspace monorepo |
| PostgreSQL | 15 or later with the **PostGIS** extension | A free Neon project is sufficient |
| Android SDK | Platform 34 or 35 | Install through Android Studio |
| Android NDK | 27.1.12297006 | Required by React Native 0.87 |
| JDK | OpenJDK 17 | `java -version` |
| Android device or emulator | Android 10 or later | Use a physical device for location, audio and battery tests |

## 2. Get the Code and Install

```bash
git clone https://github.com/safora-safety/Safora.git
cd Safora
npm install
```

The root `package.json` defines the workspaces `apps/*` and `packages/*`. Husky installs the Git hooks during `npm install`.

## 3. Configure the Environment

Each application reads its configuration from a `.env` file that is **not** committed. Copy the `.env.example` file in the application folder, if present, and fill in the values.

### 3.1 Backend (`apps/backend/.env`)

| Variable | Purpose |
|---|---|
| Database connection string | PostgreSQL and PostGIS (Neon). The exact variable name is in `.env.example` |
| `JWT_SECRET` | Signing key for access tokens. Use a long random string |
| `JWT_EXPIRES_IN` | Optional. Default `7d` |
| `INTERNAL_TICK_SECRET` | Authenticates `POST /api/internal/tick` (the watchdog trigger) |
| `CORRIDOR_THRESHOLD_METERS` | Optional. Default corridor in metres, 20 to 1000. Default `100` |
| Cloudinary credentials | Photo and audio storage |
| Firebase service-account credentials | Push notifications |
| Google OAuth client identifier | Verifies Google ID tokens |
| MapTiler key | Geocoding fallback. **Server side only** |

### 3.2 Admin console (`apps/frontend/.env`)
The base URL of the API (and of the WebSocket gateway if separate). For local work use `http://localhost:5000`.

### 3.3 Mobile (`apps/mobile`)
`API_BASE_URL` points to the backend. For a physical device on the same network use the computer's LAN address; for the Android emulator use `http://10.0.2.2:5000`. The Firebase configuration file `google-services.json` and the Google Sign-In web client identifier are needed for push notifications and Google sign-in.

> **Secrets.** Never commit `.env` files, service-account files or signing keys. Anything compiled into the APK is public, so map, routing and e-mail keys belong only on the backend.

## 4. Database

`initDatabase()` creates all tables and indexes when the backend starts against an empty database. To prepare an existing database or to inspect the V1 schema changes, see [`v1/database.md`](v1/database.md#5-v1-migration-script). Confirm that PostGIS is enabled:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
SELECT postgis_full_version();
```

## 5. Run

```bash
# Terminal 1 – backend (http://localhost:5000/api, health: /api/health)
cd apps/backend && npm run dev

# Terminal 2 – admin console (http://localhost:5173)
cd apps/frontend && npm run dev

# Terminal 3 – Metro bundler
cd apps/mobile && npm start -- --reset-cache

# Terminal 4 – install and launch on a connected device or emulator
cd apps/mobile && npm run android
```

The 30-second watchdog runs inside the backend process, so no extra worker is needed locally.

## 6. Test

```bash
npm test                  # all workspaces: 15 suites, 104 tests
npm run test:backend      # Jest and Supertest
npm run test:frontend     # Vitest and Happy-DOM
npm run test:mobile       # Jest and React Test Renderer
```

Run `npm run lint` before committing. CI runs lint and the whole test suite for every push and pull request.

## 7. Build Android Packages

```bash
cd apps/mobile/android
./gradlew assembleDebug        # debug APK: app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease      # release APK: app/build/outputs/apk/release/app-release.apk
```

Use `gradlew.bat` on Windows. The release build targets `arm64-v8a`, is about 34 MB and must be signed with the project's release key. Keep the key outside the repository.

## 8. Deploy

`render.yaml` describes the Render services (backend web service and admin static site). Set the environment variables in the Render dashboard. After the first deployment:

1. Open `/api/health` and `/api/diagnostics` to check the services.
2. Create a free scheduler job that calls `POST /api/internal/tick` every **60 seconds** with the header `X-Internal-Secret`. See [`v1/setup.md`](v1/setup.md#3-watchdog).

## 9. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Metro cannot resolve a shared package | Start Metro with `--reset-cache`; check `extraNodeModules` in `metro.config.js` |
| The app cannot reach the backend on a device | Use the computer's LAN address, allow the port in the firewall, and check that both are on the same network |
| `postgis` functions are missing | Run `CREATE EXTENSION postgis;` on the database |
| Push notifications do not arrive | Check the Firebase credentials on the backend and `google-services.json` in the app; confirm the FCM token is registered |
| Location stops with the screen locked | Disable battery optimisation for the app; follow the vendor guide in Settings |
| First request after a long idle is slow | The free Render instance and the Neon compute were asleep; the scheduler keeps the watchdog alive but not the first-request latency |
| Android build fails on NDK | Install NDK 27.1.12297006 and set `ANDROID_HOME` |
