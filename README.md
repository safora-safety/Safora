# Safora — Community Safety & Safe Walk App

Safora is a mobile app where users report unsafe locations (poor lighting,
accidents, hazards, waterlogging, etc.), see a live community-generated
safety heatmap, share their journey with trusted contacts during Safe Walk
mode, and send a one-tap SOS in an emergency.

This is the **minor project scope**. Offline (Bluetooth/Wi-Fi Direct) SOS
communication and AI-based safe-route scoring are explicitly **out of
scope** here — they belong to a future major-project phase. Do not
implement them in this build.

---

## 1. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile app | React Native + TypeScript | Pure mobile app, no separate web frontend |
| Backend | Node.js + Express + TypeScript | REST API |
| Database | PostgreSQL + PostGIS | Use the `geography` type for coordinates, **not** `geometry` — this app needs real-world distance accuracy |
| ORM | TypeORM or Knex | Must have working native support for PostGIS spatial queries. Do not use Prisma with raw-SQL workarounds for this project |
| Background location | `react-native-background-geolocation` | Chosen specifically because it keeps tracking under iOS/Android background restrictions — required for Safe Walk mode to work when the phone is asleep |
| Maps | Google Maps SDK or Mapbox | Confirm pricing/quota before locking in |
| Real-time | Socket.IO | Live location updates during a journey |
| Notifications | Firebase Cloud Messaging (FCM) | Safe Walk start/end, SOS, arrival timeout |
| Auth | JWT | Optional Google OAuth later — not required for minor scope |
| Image storage | Cloudinary | Optional report photo attachments |
| Deployment (backend) | Render or Railway | |
| Deployment (database) | Neon (managed PostgreSQL + PostGIS) or equivalent | |

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
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── reports/        # CRUD + PostGIS queries + clustering
│       │   │   ├── safety-score/   # scoring + decay logic
│       │   │   ├── journeys/       # Safe Walk state, deviation/timeout logic
│       │   │   ├── sos/
│       │   │   ├── trusted-contacts/
│       │   │   └── admin/          # moderation, analytics
│       │   ├── db/
│       │   │   ├── migrations/
│       │   │   └── entities/       # TypeORM entities (or Knex schema)
│       │   ├── middleware/         # auth guard, rate limiter
│       │   ├── sockets/            # Socket.IO handlers
│       │   └── index.ts
│       ├── .env.example
│       └── package.json
│
├── packages/
│   └── shared-types/           # Shared TS interfaces: Report, User, SafetyScore,
│                                # Journey, TrustedContact, SosAlert — imported by
│                                # both apps/mobile and apps/backend
│       ├── src/
│       └── package.json
│
├── docs/
│   ├── architecture.md
│   └── api.md
│
└── README.md
```

Use a monorepo tool (npm workspaces, pnpm workspaces, or Turborepo) so
`packages/shared-types` can be imported directly by both `apps/mobile` and
`apps/backend` without publishing to a registry.

---

## 3. Prerequisites

- Node.js 20+
- npm or pnpm
- PostgreSQL 15+ with the PostGIS extension enabled
- React Native development environment (Android Studio and/or Xcode)
- A Google Maps or Mapbox API key
- A Firebase project (for FCM)
- A Cloudinary account (optional, for report photos)

---

## 4. Environment Variables

Create `apps/backend/.env` from `.env.example`:

```
DATABASE_URL=postgresql://user:password@host:5432/safora
JWT_SECRET=replace-me
FCM_SERVER_KEY=replace-me
CLOUDINARY_URL=replace-me
PORT=4000
```

Create `apps/mobile/.env`:

```
API_BASE_URL=http://localhost:4000
GOOGLE_MAPS_API_KEY=replace-me
```

---

## 5. Database Setup

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Core tables (implement as TypeORM entities or Knex migrations):

- **users** — id, name, phone/email, password_hash, created_at
- **reports** — id, user_id, category, description, photo_url (nullable),
  location `geography(Point, 4326)`, severity, status (active/resolved/duplicate/fake),
  confirmations_count, created_at
- **trusted_contacts** — id, user_id, contact_name, contact_phone, relationship
- **journeys** — id, user_id, destination `geography(Point, 4326)`,
  planned_route, trusted_contact_ids, status (active/completed/cancelled),
  started_at, expected_arrival_at, ended_at
- **sos_alerts** — id, user_id, journey_id (nullable), location, status, created_at

Key spatial query pattern (use this for "find reports near me" and for
clustering — do not do naive lat/lng math in application code):

```sql
SELECT * FROM reports
WHERE ST_DWithin(location, ST_MakePoint($lng, $lat)::geography, $radius_meters)
AND status = 'active';
```

A GiST index on the `location` column is required:

```sql
CREATE INDEX reports_location_idx ON reports USING GIST (location);
```

---

## 6. Setup & Run

```bash
# Install all workspace dependencies
npm install

# Backend
cd apps/backend
npm run migrate      # run DB migrations
npm run dev          # starts Express server with hot reload

# Mobile (in a separate terminal)
cd apps/mobile
npm run android       # or: npm run ios
```

---

## 7. Core Feature Implementation Notes

Build in this order — each phase depends on the previous one working:

1. **Auth + Report CRUD + PostGIS query** — prove the geospatial query
   pattern works end to end before building anything on top of it.
2. **Safety Score & clustering**
   - Score = `report frequency + severity + recency + confirmations`.
   - Recency must be an actual decay function (e.g. exponential falloff by
     report age), not a fixed one-time weight — stale reports must count
     for less over time, or the map will mislead users.
   - Cluster/deduplicate reports within **50 meters or less** using
     `ST_ClusterDBSCAN` or an equivalent distance-bounded grouping query.
     Do not use a wider radius — it risks merging genuinely separate
     hazards into one.
   - Report category input: a structured dropdown (accident, broken
     light, waterlogging, road hazard, unsafe area, animal hazard) plus a
     free-text "other" field. The free-text field must be filtered against
     a blocklist (no naming individuals) and flagged for admin review
     before it affects the safety score.
   - Anti-abuse: rate-limit reports per user, flag rapid/duplicate
     submissions, weight multi-user-confirmed reports higher than a single
     unverified one.
3. **Safe Walk mode**
   - Background location via `react-native-background-geolocation` —
     test on a real Android and iOS device early, this is the highest-risk
     part of the whole build.
   - Deviation handling: **warn first, let the user confirm they're okay,
     escalate to trusted contacts only if they don't respond** within a
     configured window. Do not auto-escalate on deviation alone — this
     causes false alarms.
   - Location sharing must auto-expire the moment the journey ends or is
     cancelled.
4. **SOS + Trusted Contacts** — capture location, create alert, notify
   trusted contacts via FCM, store the event. Offline SOS is out of scope.
5. **Admin Dashboard** — report counts/analytics, map view, moderation
   (mark duplicate/fake/resolved) — ties directly into the anti-abuse logic
   above.

---

## 8. API Overview

See `docs/api.md` for full request/response shapes. Core endpoints:

```
POST   /auth/signup
POST   /auth/login

GET    /reports?lat=&lng=&radius=
POST   /reports
PATCH  /reports/:id/confirm
PATCH  /reports/:id/moderate      (admin only)

GET    /safety-score?lat=&lng=

POST   /journeys/start
PATCH  /journeys/:id/location
PATCH  /journeys/:id/complete
PATCH  /journeys/:id/cancel

POST   /sos

GET    /trusted-contacts
POST   /trusted-contacts
DELETE /trusted-contacts/:id

GET    /admin/reports
GET    /admin/analytics
```

---

## 9. Testing

**Backend**
```bash
cd apps/backend
npm run test          # unit tests (Jest)
npm run test:e2e      # API integration tests against a test DB
```
Cover at minimum: PostGIS distance query correctness, safety score decay
calculation, clustering radius behavior, rate-limiting on report creation,
deviation-warning-before-escalation logic.

**Mobile**
```bash
cd apps/mobile
npm run test           # component tests (Jest + React Native Testing Library)
```

**Manual test checklist before demo/submission**
- [ ] Create a report, confirm it appears on the map and affects the heatmap
- [ ] Confirm heatmap color updates as reports age (decay visible over test data)
- [ ] Two reports within 50m cluster into one; two reports beyond 50m stay separate
- [ ] Start Safe Walk, deviate from route, confirm warning appears before any
      contact is notified
- [ ] Let a Safe Walk timeout expire without confirming — trusted contact gets notified
- [ ] End a Safe Walk — confirm location sharing stops immediately
- [ ] Trigger SOS with and without internet connectivity (offline should
      fail gracefully, not crash — offline SOS is out of scope, but the
      app must not break when there's no signal)
- [ ] Background location keeps working after the phone screen locks (test
      on a real device, not just an emulator)
- [ ] Free-text report field rejects/flags a submission containing a name
- [ ] Admin can mark a report duplicate/fake and it stops counting toward
      the safety score

---

## 10. Explicitly Out of Scope (Minor Project)

Do not build these — they belong to the major-project phase:

- Offline Bluetooth/Wi-Fi Direct mesh communication for SOS
- AI-based safe-route scoring/recommendation (lighting/crowd/weather models)
- AI image-based hazard detection from photos
- Wearable/SOS device integration

---

## 11. For an AI Coding Agent Picking This Up

If you are an AI agent implementing this from scratch:

1. Scaffold the monorepo structure in Section 2 first, with the shared-types
   package before either app, since both depend on it.
2. Implement Section 5–6 (DB + setup) and get the PostGIS distance query in
   Section 5 working and tested before writing any other backend logic.
3. Follow the build order in Section 7 exactly — each phase is a
   prerequisite for the next, not an independent task list.
4. Treat every "Decision" note in this file as a hard constraint, not a
   suggestion — they exist because a simpler alternative was already
   considered and rejected for a stated reason.
5. Stop at the boundary in Section 10. If asked to add anything listed
   there, flag that it's a major-project feature rather than implementing it.
