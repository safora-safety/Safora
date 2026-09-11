# Safora — Community Safety & Safe Walk App

> **Academic Context**: Minor Project-I submitted to **Dev Bhoomi Uttarakhand University (DBUU)**, Dehradun  
> **Batch**: 2026 – 2027 | **Supervisor**: Mr. Mukesh Rajput (Assistant Professor, Dept. of CSE, SoEC, DBUU)  
> **Team**: Arushi Saxena, Anurag Suyal, Aman Singh Kunwar, Shubham Kumar

Safora is a mobile app where users report unsafe locations (poor lighting, accidents, hazards, waterlogging, etc.), see a live community-generated safety heatmap, share their journey with trusted contacts during Safe Walk mode, and send a one-tap SOS in an emergency.

This is the **minor project scope**. Offline (Bluetooth/Wi-Fi Direct) SOS communication and AI-based safe-route scoring are explicitly **out of scope** here — they belong to a future major-project phase.

---

## Documentation Quick Links

| Document | Description |
|---|---|
| [System Architecture](file:///D:/Safora/docs/architecture.md) | High-level system design, monorepo setup, component diagrams, DFD Level 0/1, and data flows. |
| [REST API Specification](file:///D:/Safora/docs/api.md) | Complete endpoints reference, request/response schemas, JWT auth, and Socket.IO events. |
| [Database & PostGIS Architecture](file:///D:/Safora/docs/database.md) | PostgreSQL schema, PostGIS geography types, GiST indexes, and spatial query patterns. |
| [Mobile Application Guide](file:///D:/Safora/docs/mobile-guide.md) | React Native (Fabric/Hermes), screen catalog, Zustand state, Metro monorepo resolver, and Android APK builds. |
| [Safety Algorithms & Core Logic](file:///D:/Safora/docs/safety-algorithms.md) | Mathematical safety score decay formulation, DBSCAN 50m clustering, and Safe Walk state machine. |
| [Developer Setup & Run Guide](file:///D:/Safora/docs/setup.md) | Prerequisites, environment variables, database initialization, and running mobile & backend servers. |
| [Engineering Standards & Best Practices](file:///D:/Safora/docs/standards-and-best-practices.md) | Codebase standards, feature-first folder structures, clean backend architecture, and PostGIS idioms. |
| [Project Status & Roadmap](file:///D:/Safora/docs/project-status-and-roadmap.md) | Completion progress scorecard (~94%), what is done, and remaining tasks for final submission. |
| [Project Synopsis (PDF)](file:///D:/Safora/docs/SAFORA_Synopsis_Formatted.pdf) | Academic Minor Project-I synopsis submitted to DBUU. |

---

## 1. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile app | React Native + TypeScript | Pure mobile app, no separate web frontend (Hermes + Fabric enabled) |
| Backend | Node.js + Express + TypeScript | REST API + Socket.IO real-time gateway + In-memory RAM cache (<2ms responses) |
| Database | PostgreSQL + PostGIS | Uses `geography(Point, 4326)` for coordinates with GiST spatial indexes |
| ORM / Driver | `pg` Pool / TypeORM | Native PostGIS spatial queries via SQL |
| Background location | Dual-strategy GPS + Geolocation Watcher | Fine GPS + network fallback; continuous tracking for Safe Walk corridor monitoring |
| Spatial Mapping | Open Geospatial Canvas (`OpenMapView.tsx`) | Leaflet engine inside WebView with 10km HTML5 `CacheStorage` tile pre-caching and layer switcher (Satellite/Street/Clean) |
| Routing Engine | OSRM + Multi-Modal Travel Time Matrix | Street geometry with calibrated walking speed ($1.60\text{ m/s} \approx 10\text{ min/km}$) and 2-wheeler/car buffers |
| Real-time | Socket.IO | Live location updates during a journey (`journey:${id}`) |
| Notifications | Firebase Cloud Messaging (FCM) v14 | Safe Walk start/end, SOS dispatch, arrival timeout |
| Auth & Onboarding | JWT + bcrypt + 4-Step Carousel | Stateless bearer tokens, first-install onboarding flow, session rehydration |
| Image storage | Cloudinary | Optional report photo attachments |
| Deployment (backend) | Render | Zero-downtime container deployment with `/api/health` |
| Deployment (database) | Neon (managed PostgreSQL + PostGIS) | Serverless PostgreSQL with PostGIS extensions |

---

## 2. Repository Structure

```
safora/
├── apps/
│   ├── mobile/                 # React Native + TypeScript app
│   │   ├── src/
│   │   │   ├── screens/        # Map, ReportIssue, SafeWalk, SOS, TrustedContacts, Auth, AdminDashboard
│   │   │   ├── components/
│   │   │   ├── navigation/
│   │   │   ├── services/       # API client, socket client, location service
│   │   │   ├── hooks/
│   │   │   └── store/          # app state (journey status, auth, etc.)
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── backend/                # Express + TypeScript API
│       ├── src/
│       │   ├── config/         # Database pool, diagnostics, environment
│       │   ├── controllers/    # Route controllers (auth, reports)
│       │   ├── middleware/     # Auth guards, validation, rate limiting
│       │   ├── routes/         # Express routers
│       │   ├── sockets/        # Socket.IO handlers
│       │   └── app.ts          # Express + HTTP server bootstrap
│       ├── .env
│       └── package.json
│
├── packages/
│   └── shared-types/           # Shared TS interfaces: User, HazardReport, TrustedContact
│       ├── src/
│       └── package.json
│
├── docs/                       # Comprehensive documentation suite
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   ├── mobile-guide.md
│   ├── safety-algorithms.md
│   ├── setup.md
│   ├── SAFORA_Synopsis_Formatted.pdf
│   └── README.md
│
└── README.md
```

Managed via **npm workspaces** so `packages/shared-types` is imported directly by both `apps/mobile` and `apps/backend` without publishing to a registry.

---

## 3. Prerequisites

- Node.js 20+
- npm or pnpm
- PostgreSQL 15+ with the PostGIS extension enabled
- React Native development environment (Android Studio / OpenJDK 17)
- A Firebase project (for FCM push alerts)
- A Cloudinary account (optional, for report photos)

---

## 4. Environment Variables

### Backend (`apps/backend/.env`)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@ep-sample-pooler.region.neon.tech/safora?sslmode=require
DATABASE_URL_DIRECT=postgresql://user:password@ep-sample.region.neon.tech/safora?sslmode=require
JWT_SECRET=your_super_secret_jwt_key
FCM_SERVER_KEY=replace-me
CLOUDINARY_URL=replace-me
```

### Mobile (`apps/mobile/.env`)
```env
# Use 10.0.2.2 for Android Emulator or your PC's local LAN IP for physical device
API_BASE_URL=http://10.0.2.2:5000/api
```

---

## 5. Database Setup

Enable PostGIS extension:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Core Tables:
- **`users`** — id, name, phone/email, password_hash, role, created_at
- **`reports`** — id, user_id, category, title, description, photo_url, location `geography(Point, 4326)`, severity, status (active/resolved/duplicate/fake), confirmations_count, created_at
- **`trusted_contacts`** — id, user_id, contact_name, contact_phone, relationship
- **`journeys`** — id, user_id, origin, destination `geography(Point, 4326)`, planned_route, trusted_contact_ids, status (active/completed/cancelled), started_at, expected_arrival_at, ended_at
- **`sos_alerts`** — id, user_id, journey_id, location, status, created_at

### Key Spatial Query Pattern (Radius Search):
```sql
SELECT * FROM reports
WHERE ST_DWithin(location, ST_MakePoint($lng, $lat)::geography, $radius_meters)
AND status = 'active';
```

### Spatial Index:
```sql
CREATE INDEX reports_location_idx ON reports USING GIST (location);
```

---

## 6. Setup & Run

```powershell
# 1. Install all workspace dependencies
npm install

# 2. Start Backend API Server
cd apps/backend
npm run dev

# 3. Start Mobile Metro Bundler (in a separate terminal)
cd apps/mobile
npm start -- --reset-cache

# 4. Run Mobile App on Android
cd apps/mobile
npm run android

# 5. Build Standalone Debug APK
cd apps/mobile/android
.\gradlew assembleDebug
```

Compiled APK Output:  
`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 7. Core Feature Implementation Notes

Build in this order — each phase depends on the previous one working:

1. **Auth + Report CRUD + PostGIS query** — prove the geospatial query pattern works end to end before building anything on top of it.
2. **Safety Score & clustering**
   - Score = `report frequency + severity + recency + confirmations`.
   - Recency must be an actual decay function (e.g. exponential falloff by report age, half-life = 24h), not a fixed one-time weight — stale reports must count for less over time, or the map will mislead users.
   - Cluster/deduplicate reports within **50 meters or less** using `ST_ClusterDBSCAN` or an equivalent distance-bounded grouping query. Do not use a wider radius — it risks merging genuinely separate hazards into one.
   - Report category input: a structured dropdown (accident, broken light, waterlogging, road hazard, unsafe area, animal hazard) plus a free-text "other" field. The free-text field must be filtered against a blocklist (no naming individuals) and flagged for admin review before it affects the safety score.
   - Anti-abuse: rate-limit reports per user, flag rapid/duplicate submissions, weight multi-user-confirmed reports higher than a single unverified one.
3. **Safe Walk mode**
   - Background location via `react-native-background-geolocation` / GPS watcher — test on a real Android device early.
   - Deviation handling: **warn first, let the user confirm they're okay, escalate to trusted contacts only if they don't respond** within a configured window (60 seconds). Do not auto-escalate on deviation alone — this causes false alarms.
   - Location sharing must auto-expire the moment the journey ends or is cancelled.
4. **SOS + Trusted Contacts** — capture location, create alert, notify trusted contacts via FCM, store the event. Offline SOS is out of scope.
5. **Admin Dashboard** — report counts/analytics, map view, moderation (mark duplicate/fake/resolved) — ties directly into the anti-abuse logic above.

---

## 8. API Overview

See `docs/api.md` for full request/response shapes. Core endpoints:

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/reports?lat=&lng=&radius=
POST   /api/reports
PATCH  /api/reports/:id/confirm
PATCH  /api/reports/:id/moderate      (admin only)

GET    /api/safety-score?lat=&lng=

POST   /api/journeys/start
PATCH  /api/journeys/:id/location
PATCH  /api/journeys/:id/complete
PATCH  /api/journeys/:id/cancel

POST   /api/sos

GET    /api/trusted-contacts
POST   /api/trusted-contacts
DELETE /api/trusted-contacts/:id

GET    /api/health
GET    /api/diagnostics
```

---

## 9. Testing & Evaluation

### Backend
```bash
cd apps/backend
npm run test          # unit tests (Jest)
npm run test:e2e      # API integration tests against a test DB
```
Cover at minimum: PostGIS distance query correctness, safety score decay calculation, clustering radius behavior, rate-limiting on report creation, deviation-warning-before-escalation logic.

### Mobile
```bash
cd apps/mobile
npm run test          # component tests (Jest + React Native Testing Library)
```

### Manual Verification Checklist
- [x] Create a report, confirm it appears on the radar/map and affects the safety score
- [x] Confirm safety score updates as reports age (exponential decay)
- [x] Two reports within 50m cluster into one; two reports beyond 50m stay separate
- [x] Start Safe Walk, deviate from route (>150m), confirm warning appears before any contact is notified
- [x] Let a Safe Walk timeout expire without confirming — trusted contact gets notified
- [x] End a Safe Walk — confirm location sharing stops immediately
- [x] Trigger SOS with and without internet connectivity (fails gracefully without crashing)
- [x] Background location continues updating
- [x] Free-text report field rejects/flags a submission containing personal names
- [x] Admin can mark a report duplicate/fake and it stops counting toward the safety score

---

## 10. Explicitly Out of Scope (Minor Project)

Do not build these — they belong to the major-project phase:
- Offline Bluetooth / Wi-Fi Direct mesh communication for SOS
- AI-based safe-route scoring/recommendation (lighting/crowd/weather models)
- AI image-based hazard detection from photos
- Wearable / SOS hardware device integration

---

## 11. Project Synopsis Mapping

| Synopsis Section (PDF) | Implemented Module | Status |
|---|---|---|
| Section 4.2 Module 1 | User Authentication & Profile Management | Complete (`/api/auth`) |
| Section 4.2 Module 2 | Community Hazard Reporting | Complete (`/api/reports`) |
| Section 4.2 Module 3 | Safety Score & Heatmap Engine | Complete (`/api/safety-score`, DBSCAN) |
| Section 4.2 Module 4 | Safe Walk Mode & Trusted Contacts | Complete (`/api/journeys`, `/api/trusted-contacts`) |
| Section 4.2 Module 5 | One-Tap SOS Alert System | Complete (`/api/sos`) |
| Section 4.2 Module 6 | Administrative Dashboard & Moderation | Complete (`/api/reports/:id/moderate`, `/api/diagnostics`) |
