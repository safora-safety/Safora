# Technology Stack

| | |
|---|---|
| **Version** | V1 (complete) |
| **Principle** | Open-source components and free-tier services only |

## 1. Mobile (`apps/mobile`)

| Layer | Technology | Notes |
|---|---|---|
| Framework | React Native 0.87.1, React 19.2.3, TypeScript, Hermes, New Architecture | Android only |
| State | Zustand | Session and UI state |
| Map | Leaflet inside a WebView | OpenStreetMap and Esri tiles. No billing risk; behaves the same on every device |
| Realtime | Socket.IO client 4.8 | Live tracking, SOS alerts and audio slices |
| Location and tracking | Native `SafeWalkService` (Kotlin) with `@react-native-community/geolocation` | Foreground service that survives screen lock. GPS watcher: every 3 s or 5 m, high accuracy |
| Emergency audio | Native `AudioRecord` and `MediaPlayer`; `MediaCodec` for Opus and AAC | 16 kHz, 16-bit mono PCM with dual-sink streaming; see [Dual-pipe audio](./dual-pipe-audio-streaming.md) |
| Siren | Looping `siren_alarm.wav` (about 4 s) on `STREAM_ALARM` | Plays at maximum alarm volume, even on silent |
| Push | Firebase Cloud Messaging | High-priority messages |
| Sign-in | `@react-native-google-signin/google-signin` 16.1 | Google account picker |
| Storage | AsyncStorage | Offline hazard queue (`@safora_offline_pending_reports`), cached hazards (`@safora_cached_nearby_hazards`), preferences. The JWT is stored in plain AsyncStorage; secure storage is a V2 item |
| Release build | About 34 MB (34,118,032 bytes), arm64-v8a | Built 2026-10-18 |

## 2. Backend (`apps/backend`)

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 22+, Express 5.2, TypeScript | |
| Validation | Zod 3.23 | Request schemas |
| Realtime | Socket.IO server 4.8 | Live location, deviation alerts, audio relay |
| Authentication | JWT (HS256, 7 days) and bcrypt (10 rounds); Google ID-token verification | No refresh tokens in V1 |
| Database access | `pg` 8.23 with raw SQL | No ORM. `typeorm` and `reflect-metadata` are installed but unused and can be removed |
| Media | Cloudinary | Photos (folder `safora/hazards`) and audio evidence |
| Push | Firebase Admin SDK 14 | |
| Audio | `AudioStitcherService` | Zero-dependency Buffer and WAV assembly with an 8 s watchdog |
| Watchdog | In-process 30 s tick | No separate worker; see [Architecture](./architecture.md) |
| Rate limiting | In-memory limiter middleware | See [API](./api.md#10-rate-limits) |

## 3. Database

| Item | Value |
|---|---|
| Engine | PostgreSQL 15+ with PostGIS |
| Host | Neon (free tier) |
| Spatial | `GEOGRAPHY(Point, 4326)`, GiST index, `ST_DWithin`, `ST_ClusterDBSCAN` |
| Migrations | Inline SQL in `initDatabase()` |

## 4. Admin Console (`apps/frontend`)

| Layer | Technology | Notes |
|---|---|---|
| Framework | React 19.2.3, Vite 6, TypeScript | |
| Styling | Tailwind CSS 3.4 | |
| Charts | Recharts 2.15 | |
| Map | Leaflet | |
| Audio | Web Audio API | Ordered queue, jitter buffer, clarity filter |
| Hosting | Render static site | |

## 5. Quality Tooling

| Area | Tooling |
|---|---|
| Backend tests | Jest and Supertest (8 suites, 72 tests) |
| Admin tests | Vitest and Happy-DOM (2 suites, 12 tests) |
| Mobile tests | Jest and React Test Renderer (5 suites, 20 tests) |
| CI | GitHub Actions: lint and tests on every push and pull request |
| Hooks | Husky |

## 6. Hosting

| Service | Role | Known limitation |
|---|---|---|
| Render (web service) | Backend and Socket.IO | Free instances sleep after 15 minutes without traffic. The scheduled tick keeps the watchdog alive but does not remove the cold-start delay for a user's first request of the day |
| Render (static site) | Admin console | None relevant to V1 |
| Neon | PostgreSQL and PostGIS | Compute scales to zero after 5 minutes idle, so a first query can be slow |
| Cloudinary | Photos and audio | Free storage and bandwidth cap; not a concern at college scale |
| Firebase | Push notifications | Free at this scale |
| MapTiler | Geocoding fallback | Free non-commercial terms. Revisit before any public release |
| cron-job.org | Calls `/api/internal/tick` every 60 s | |

## 7. Size of the Code Base

| Workspace | Files | Lines (TypeScript, TSX, Kotlin) |
|---|---:|---:|
| `apps/backend` | 56 | 11,192 |
| `apps/mobile` (including Kotlin) | 74 | 29,471 |
| `apps/frontend` | 46 | 10,183 |
| `packages/shared-types` | 1 | 151 |
| **Total** | **177** | **50,997** |

The backend exposes 52 REST endpoints and seven Socket.IO listeners over seven database tables.

## 8. Differences from the Original Synopsis

| Synopsis | Used in V1 | Explanation |
|---|---|---|
| Google Maps or Mapbox | Leaflet with OpenStreetMap and Esri tiles | No billing risk and no API key in the app |
| TypeORM or Knex | Raw `pg` queries | Simpler, explicit spatial SQL |
| Background-geolocation library | Custom Kotlin foreground service | Avoids a paid licence and also provides lock-screen audio |
| One 30-second audio file | Dual-pipe streaming with a server rescue | Live listening and loss-proof evidence |
| iOS and Android | Android only | The cross-platform claim is scoped down |

## 9. Present but Inactive

- `react-native-background-geolocation`: not installed. The native service replaces it.
- `typeorm`, `reflect-metadata`: installed, unused; remove or adopt.
- `react-native-keychain`: installed, unused; planned for session hardening in V2.
