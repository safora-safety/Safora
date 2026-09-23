# Tech Stack — V1

> Use this to correct the synopsis's tech list if asked, or to update the synopsis document itself before submission.

## Mobile
| Layer | Technology | Note |
|---|---|---|
| Framework | React Native 0.87.1, Hermes engine, Fabric | |
| State | Zustand | |
| Map | Leaflet inside a WebView | **Differs from synopsis** (which names Google Maps/Mapbox) — explain the switch: no API billing risk, works the same on any Android device |
| Realtime | Socket.IO client | Newly connected in V1 (dependency already existed, unused before) |
| Location | `@react-native-community/geolocation` | Foreground only in V1; background tracking is V2 |
| Push | Firebase Cloud Messaging | |
| Storage | AsyncStorage (offline hazard queue); plaintext JWT storage — **hardening (Keychain) is V2** | |

## Backend
| Layer | Technology | Note |
|---|---|---|
| Runtime | Node.js, Express 5, TypeScript | |
| Realtime | Socket.IO server | |
| Validation | Zod | |
| Auth | JWT (HS256) + bcrypt | 7-day token, no refresh — **hardening is V2** |
| Database access | `pg` (raw SQL), no ORM | **Differs from synopsis** (names TypeORM/Knex) — `typeorm`/`reflect-metadata` are installed but unused; either remove them or note the switch |
| Media storage | Cloudinary (photos + audio) | |
| Push | Firebase Admin SDK | |
| Watchdog | In-process 30s tick, no separate worker | Free-tier-compatible; see `architecture.md` §4 |

## Database
| Layer | Technology |
|---|---|
| Engine | PostgreSQL + PostGIS extension |
| Host | Neon (free tier) |
| Migrations | Inline SQL in `initDatabase()` — a real migration tool (`node-pg-migrate`) is a V2 engineering item |

## Admin web
| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Map | Leaflet |
| Charts | Recharts |
| Hosting | Render static site |

## Hosting (all free tier for V1)
| Service | Role | Known V1 limitation |
|---|---|---|
| Render (web service) | Backend API + Socket.IO | Sleeps after 15 min idle; first request after sleep is slow. The `/api/internal/tick` pinger (see `api.md`) keeps the watchdog alive but does not remove the cold-start delay for a real user's first request of the day — mention this as a known limitation in your report, not a fixed problem |
| Render (static site) | Admin web | No limitation relevant to V1 |
| Neon | PostgreSQL + PostGIS | Compute scales to zero after 5 min idle; each cold query has a short delay |
| Cloudinary | Photo/audio storage | Free-tier storage/bandwidth cap; not a concern at demo scale |
| Firebase | Push notifications | Free at this scale |
| MapTiler | Geocoding fallback only | Your existing key; non-commercial free-tier terms — fine for a college submission, revisit before any public release (`docs/v2`) |

## Explicitly not used in V1 (present in package.json or synopsis but inactive)
- `react-native-background-geolocation` — not installed; not needed since V1 has no background tracking
- `typeorm`, `reflect-metadata` — installed, unused; either wire up or remove
- `react-native-keychain` — installed, unused; V2 item

## What changed from the original synopsis wording
| Synopsis says | Actually used | Recommendation |
|---|---|---|
| Google Maps / Mapbox | Leaflet + OSM/Esri tiles | Update the synopsis wording, or note the substitution in your report's "implementation deviations" section |
| TypeORM / Knex | Raw `pg` queries | Same |
| Background geolocation library | Foreground-only in V1 (native foreground service planned for V2) | Same — be upfront that background reliability is future work |
| iOS + Android | Android only | State this plainly; the synopsis's "cross-platform" claim should be scoped down for the report |

## Added 22 Sep 2026 — background service

| Layer | Technology | Note |
|---|---|---|
| Foreground service | Native Kotlin `Service` (Android SDK, `com.mobile.SafeWalkService`) | No third-party license needed — this is why a hand-rolled native service is preferred over `react-native-background-geolocation` (which needs a paid license for release builds, already excluded per your free-tech rule in the earlier setup discussion) |
| RN↔native bridge | A small custom native module (standard React Native `NativeModules` pattern) | No new npm dependency required beyond what React Native's CLI already scaffolds for native modules |
| Notification | `androidx.core.app.NotificationCompat` | Standard Android library, already available via existing Gradle/AndroidX setup |
