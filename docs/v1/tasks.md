# V1 Task List — Implementation Detail

> Priority order. Each task names the exact files to touch (from the real repo structure), the change to make, pseudocode/schema where useful, and a concrete test. Written so you can hand a single task to a coding agent as its whole brief. Sizes are focused-day estimates at your pace (18–24 h/week + agent).
>
> **Updated 22 Sep 2026:** three tasks added (13–15, foreground service / lock-screen audio / ETA notification) after review — they strengthen the core "Safe Walk alerts a guardian" objective rather than being separate scope. **New total ≈ 34 days**, against an ~18–20 day mid-November budget. This realistically means **V1 now targets your end-November college deadline, not the mid-November personal buffer** — flagged plainly rather than left implicit. Cut list at the end is updated accordingly.

## Repo map (for reference across every task below)
```
apps/backend/src/
  routes/         reportRoutes.ts, journeyRoutes.ts, sosRoutes.ts, ...
  services/       reportService.ts, journeyService.ts, sosService.ts, firebaseService.ts
  repositories/   reportRepository.ts, journeyRepository.ts, userRepository.ts
  middleware/     rateLimiter.ts, auth guards
apps/mobile/src/
  screens/        HomeScreen.tsx, MapScreen.tsx, SafeWalkScreen.tsx, SettingsScreen.tsx, ProfileScreen.tsx
  components/     ReportHazardModal.tsx, OpenMapView.tsx, ContactModal.tsx
  services/       reportService.ts, (new) socketService.ts
apps/frontend/src/
  pages/          DashboardPage.tsx, SafeWalksPage.tsx, HazardsPage.tsx, SosAlertsPage.tsx
  services/       journeyService.ts (contains getMockActiveJourneys)
```

---

## Must-do (do not cut)

### 1. SYN-1 — Remove the fake safety-score fallback
**Size:** S (~1.2 days) · **Files:** `apps/mobile/src/screens/HomeScreen.tsx`, `apps/mobile/src/services/reportService.ts`

**Current behaviour:** `reportService.ts` has a fallback that returns a hard-coded `{score: 84, riskLevel: 'safe', nearbyHazards: 3}` (or similar) when the `/api/reports/safety-score` request fails; `HomeScreen.tsx` renders whatever it gets with no distinction between real and fallback data.

**Change:**
1. In `reportService.ts`, delete the fallback object. Let the fetch function throw or return `null`/a typed error on failure — do not synthesize a fake success response.
2. In `HomeScreen.tsx`, add three render states for the safety-score card: `loading` (skeleton), `error` (retry button + "Couldn't load your safety score" message), `success` (the real card). Use a simple state machine (`useState<'loading'|'error'|'success'>`) or whatever async-state pattern the rest of the screen already uses.
3. Search the rest of the codebase for any other hard-coded fallback numbers tied to safety score (`grep -rn "84\|86" apps/mobile/src` as a starting point, but read each hit — those are common numbers that may appear for unrelated reasons too).

**Test:** Turn off Wi-Fi and mobile data, open Home screen, confirm you see the error/retry state and no number. Turn connectivity back on, tap retry, confirm the real score loads.

---

### 2. SEC-2 — Strip reporter identity from public report responses
**Size:** S (~1.2 days) · **Files:** `apps/backend/src/repositories/reportRepository.ts`, wherever `ReportModel.fromRow` (or equivalent mapping function) lives, `apps/backend/src/routes/reportRoutes.ts`

**Current behaviour:** `findAll` and `nearby` in `reportRepository.ts` join against `users` and the row-mapping function returns `userId`/`reporterName` (and possibly email/phone) regardless of caller.

**Change:**
1. Define two response shapes (TypeScript interfaces or two separate mapping functions):
   ```ts
   interface PublicReportDto {
     id: number; category: string; severity: number; description: string;
     photoUrl?: string; location: { lat: number; lng: number };
     confirmationsCount: number; createdAt: string;
     // deliberately no userId, reporterName, email, phone
   }
   interface StaffReportDto extends PublicReportDto {
     userId: number; reporterName: string; reporterEmail?: string;
   }
   ```
2. In the route handlers for `GET /`, `GET /nearby` (and any other non-staff report endpoint), map rows to `PublicReportDto`.
3. In staff-only routes (already guarded by `requireStaff`/`requireAdmin` — confirm the guard is actually applied on the analytics/moderation routes), map to `StaffReportDto`.
4. Leave the underlying SQL query and `reports.user_id` column untouched — this is a response-shaping change only, not a schema change.

**Test:**
```bash
curl -s https://<backend>/api/reports | jq 'map(has("userId") or has("reporterName") or has("email"))' 
# expect: every entry false
curl -s -H "Authorization: Bearer <staff-jwt>" https://<backend>/api/reports/analytics/summary | jq 'has("userId")'
# staff route: identity still present where the route intentionally includes it
```

---

### 3. SEC-9 — Remove/label admin sample data
**Size:** S (~1.2 days) · **Files:** `apps/frontend/src/services/journeyService.ts` (contains `getMockActiveJourneys`), `apps/frontend/src/pages/SafeWalksPage.tsx`

**Current behaviour:** when the backend returns no active journeys (or fails), the frontend service falls back to a hard-coded sample list, flagged internally as `isSimulated` but rendered identically to real data on the map.

**Change:**
1. Delete `getMockActiveJourneys` and its call site.
2. In `SafeWalksPage.tsx`, add an explicit empty state: "No active Safe Walks right now" when the API returns `[]`, and a distinct error state when the API call itself fails (don't conflate "no data" with "request failed").

**Test:** With no Safe Walk running anywhere, open the admin dashboard and confirm the radar shows the empty state, not moving markers.

---

### 4. TRK-1 — Persist journey breadcrumbs
**Size:** S (~1.2 days) · **Files:** `apps/backend/src/services/journeyService.ts`, `apps/backend/src/repositories/journeyRepository.ts`, DB migration (see `database.md` §2)

**Current behaviour:** `updateLocation` computes the corridor-deviation distance but does not persist the incoming coordinate anywhere, and does not update `journeys.last_location`.

**Change (pseudocode for `journeyService.updateLocation`):**
```ts
async function updateLocation(journeyId: number, lat: number, lng: number, speed?: number, battery?: number) {
  const journey = await journeyRepository.findById(journeyId);
  if (!journey || journey.status !== 'active') throw new NotFoundOrInactiveError();

  await journeyRepository.insertBreadcrumb(journeyId, lat, lng, speed, battery); // NEW
  await journeyRepository.updateLastLocation(journeyId, lat, lng);               // NEW

  const distanceFromRoute = computeCorridorDistance(journey.routePolyline, lat, lng); // existing logic
  if (distanceFromRoute > CORRIDOR_METERS) {
    await journeyRepository.setDeviatedAt(journeyId, new Date());  // NEW — see task 7
  }

  emitSocketEvent(`journey:${journeyId}`, 'journey:location', { lat, lng, speed, recordedAt: new Date() }); // NEW — see task 5
  return { deviated: distanceFromRoute > CORRIDOR_METERS };
}
```
Add matching repository methods `insertBreadcrumb`, `updateLastLocation`, `setDeviatedAt` to `journeyRepository.ts` using the schema in `database.md` §2.

**Test:** Start a walk via the app, send a few location updates, then query directly:
```sql
SELECT * FROM journey_breadcrumbs WHERE journey_id = <id> ORDER BY recorded_at;
```
Confirm rows exist and `journeys.last_location`/`last_seen_at` are updated.

---

### 5. TRK-2 — Mobile Socket.IO client
**Size:** M (~4 days) · **Files:** new `apps/mobile/src/services/socketService.ts`, `apps/mobile/src/screens/SafeWalkScreen.tsx`

**Note:** `socket.io-client` is already in `package.json` — it has just never been imported anywhere.

**New file `socketService.ts` (pseudocode):**
```ts
import { io, Socket } from 'socket.io-client';
let socket: Socket | null = null;

export function connectSocket(jwt: string) {
  if (socket?.connected) return socket;
  socket = io(API_BASE_URL, { auth: { token: jwt }, reconnection: true, reconnectionDelay: 1000 });
  socket.on('connect_error', (err) => console.warn('socket connect error', err));
  return socket;
}

export function joinJourneyRoom(journeyId: number) {
  socket?.emit('journey:join', { journeyId }); // if the backend expects an explicit join event —
  // otherwise the server may auto-join based on JWT + active journey lookup; confirm against
  // whatever journeyService.ts / socket auth middleware does server-side before assuming either shape
}

export function onJourneyLocation(cb: (payload: {lat:number; lng:number; recordedAt:string}) => void) {
  socket?.on('journey:location', cb);
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```
Call `connectSocket(jwt)` once after login (e.g. in whatever root auth-state effect already exists), and `joinJourneyRoom` when a Safe Walk starts in `SafeWalkScreen.tsx`. Handle reconnect gracefully — if the socket drops, location updates should keep going via the existing REST `PATCH /:id/location` call regardless, so tracking never fully stops even if realtime delivery hiccups.

**Test:** Two devices logged in as the same test walker + a trusted-contact account; confirm the second device's socket receives `journey:location` events as the first device's coordinates change (can simulate with mock-location tools instead of physically walking).

---

### 6. SYN-4 — Live location visible to a guardian
**Size:** M (~4 days, shares work with #5) · **Files:** new small screen/component in `apps/mobile/src`, reusing `OpenMapView.tsx`

**Change:** When a logged-in user has an active `trusted_contacts` relationship pointing *at* them from a walker (i.e., they are someone else's contact) and that walker has an active journey, show a lightweight screen: a map (reuse `OpenMapView.tsx`) with a single marker driven by `onJourneyLocation` from task 5, plus the walker's name and last-updated timestamp.

**Simplification, stated explicitly (write this in your report too):** V1 has no separate "guardian accepts an invite" step — any existing trusted contact who also happens to be a Safora user sees this automatically once a walk starts. This is weaker than the full handshake design in `docs/v2/safety-and-tracking.md` §1 (verified email, pending/accepted/revoked states) — that hardening is explicitly a V2 item, not an oversight.

**Test:** the two-device flow in `testing-and-submission.md` T4 — this *is* that test.

---

### 7. SYN-5 — Server-side deviation watchdog (deviation rule only)
**Size:** M (~4 days) · **Files:** new `apps/backend/src/services/watchdogService.ts`, `apps/backend/src/app.ts` (or wherever the server bootstraps), new route in `journeyRoutes.ts`, new internal route

**New file `watchdogService.ts` (pseudocode):**
```ts
const activeJourneys = new Map<number, { deviatedAt: Date | null }>(); // in-memory, loaded at boot + kept in sync on start/complete/cancel

export function startTick() {
  setInterval(async () => {
    const now = Date.now();
    for (const [journeyId, state] of activeJourneys) {
      if (state.deviatedAt && (now - state.deviatedAt.getTime()) > 60_000) {
        await escalate(journeyId);
        activeJourneys.delete(journeyId); // or mark escalated, don't re-fire
      }
    }
  }, 30_000);
}

async function escalate(journeyId: number) {
  const journey = await journeyRepository.findById(journeyId);
  await sosService.createAlert({ userId: journey.userId, source: 'watchdog',
    location: journey.lastLocation, battery: null }); // reuses the EXISTING sos creation path —
    // do not write a second, parallel notification code path
  await journeyRepository.setEscalatedAt(journeyId, new Date());
}
```
- Populate `activeJourneys` from the database at server boot (`SELECT id, deviated_at FROM journeys WHERE status='active'`) and keep it in sync: add on `POST /start`, remove on `complete`/`cancel`, update `deviatedAt` from task 4's `setDeviatedAt` call (either via a shared in-memory update or by re-reading — simplest is to update the in-memory map directly from `journeyService.updateLocation` rather than round-tripping through the DB).
- New endpoint: `POST /api/journeys/:id/confirm-safe` — clears `deviated_at` in both the DB and the in-memory map, cancelling a pending escalation.
- New internal endpoint: `POST /api/internal/tick` — protected by a shared-secret header (`X-Internal-Secret`, compare against `process.env.INTERNAL_TICK_SECRET`), triggers one manual scan of `activeJourneys` immediately (needed because Render's free tier can sleep and the in-process `setInterval` doesn't run while asleep — an external pinger hitting this endpoint both wakes the instance and forces a scan).
- Call `startTick()` once at server startup, alongside registering the internal route.

**Test:**
1. Start a journey, manually set a deviation (either walk off-route or add a temporary debug endpoint that calls `setDeviatedAt` directly for testing).
2. Wait ~60s with no `confirm-safe` call — confirm an `sos_alerts` row appears with `source='watchdog'` and the guardian's device gets a push.
3. Repeat, but call `confirm-safe` before 60s — confirm no alert is created.

---

## Should-do (cut only if genuinely out of time)

### 8. SYN-2 — Wire the heatmap
**Size:** M (~4 days) · **Files:** `apps/mobile/src/screens/MapScreen.tsx`, `apps/mobile/src/screens/HomeScreen.tsx`, `apps/mobile/src/components/OpenMapView.tsx`

**Change:** `GET /api/reports/clusters` already exists and works server-side (DBSCAN, see `safety-algorithms.md` §2) — no backend change needed. Call it from `MapScreen.tsx`, render each cluster as a circle on the Leaflet WebView map (radius scaled by cluster point count, fill colour scaled by average severity — e.g. green→yellow→red), and change the Home screen's "Live Heatmap" card's `onPress` to actually route to this view instead of the plain pin map if it currently doesn't.

**Test:** Create 3–4 nearby reports (within ~330 m of each other, the default `epsDegrees`), confirm a cluster circle renders; create isolated reports elsewhere, confirm they render as regular pins (below `minPoints`).

---

### 9. SEC-4 — Correct overclaiming copy
**Size:** S (~1.2 days) · **Files:** `apps/mobile/src/screens/HomeScreen.tsx`, `apps/mobile/src/screens/OnboardingScreen.tsx`, SOS-related screens

**Change:** `grep -rn -i "police\|112 dispatch\|256-bit\|encrypted coordinates" apps/mobile/src` and replace each hit per the table in `docs/v2/accounts-email-local.md` §3 (SEC-4) — e.g. "Dispatches live coordinates to Family Guardians & Police 112" → "Sends live coordinates and audio to your guardians. Quick-dial 112 is one tap away." Add a one-line persistent note somewhere visible (Home footer or onboarding): "Safora does not replace calling 112."

**Test:** Manual read-through of every screen touched; no remaining false claims.

---

### 10. AGE-lite — Age field + notice
**Size:** S (~1.2 days) · **Files:** new step in `apps/mobile/src/screens/OnboardingScreen.tsx` or `RegisterScreen.tsx`, `apps/backend/src/routes/authRoutes.ts` (profile update), DB migration (see `database.md` §2)

**Change:** One screen after registration: numeric age input, a static text note ("If you're under 18, please make sure a parent or guardian knows you're using Safora"), and a checkbox that also covers Terms acceptance (task 11) to avoid a separate screen. On submit, `PATCH /api/auth/profile` with `{ age, ageNoticeAck: true }`.

**Test:** Register a new account, confirm the screen appears once and not again on subsequent logins (`users.age_notice_ack` gates it).

---

### 11. PUB-1-lite — Terms & Privacy static screen
**Size:** S (~1.2 days) · **Files:** new `apps/mobile/src/screens/TermsScreen.tsx` (static content, no API call except the accept action)

**Change:** Plain-language static screen: what's collected (location during Safe Walk, hazard reports, SOS data, audio), why, that it's a beta/college project, a contact email for questions. On accept, `PATCH /api/auth/profile` with `{ termsAcceptedAt: now }`. **Not legally reviewed — say so explicitly in your project report**, and treat `docs/v2/security-privacy-compliance.md` §10 (PUB-1) as the real version to do before any public release.

**Test:** New registration flow shows this screen once; existing test accounts (if `terms_accepted_at` is already set) don't see it again.

---

## Must-do, added 22 Sep 2026 (strengthens the core objective — do not treat as optional)

### 13. TRG-2-lite — Foreground service for background Safe Walk tracking
**Size:** L (~6 days) · **Files:** new `apps/mobile/android/app/src/main/java/com/mobile/SafeWalkService.kt`, a small native-module bridge file (e.g. `SafeWalkServiceModule.kt` + `SafeWalkServicePackage.kt`) registered in `MainApplication.kt`, `apps/mobile/src/services/socketService.ts` and `screens/SafeWalkScreen.tsx` (call the new native module instead of/alongside the JS-side location watcher), `AndroidManifest.xml` (declare the service + `FOREGROUND_SERVICE_LOCATION` permission)

**Change:**
1. New Kotlin `Service` subclass that:
   - Acquires location updates via `FusedLocationProviderClient` (or whatever the existing `@react-native-community/geolocation` setup already uses under the hood — check before adding a second location API).
   - Posts each update to the backend via a simple HTTP call (or bridges back to the existing JS `PATCH /journeys/:id/location` call — simplest is usually to keep the JS side making the actual API calls and have the native service just keep the JS thread/location callbacks alive, rather than duplicating network code natively; confirm this approach with whichever library you use for the RN↔native bridge).
   - Shows a persistent `NotificationCompat` notification, updated per location tick (§8c logic — distance/ETA).
2. Start the service from `SafeWalkScreen.tsx` when a walk begins (`NativeModules.SafeWalkService.start(journeyId, destinationLat, destinationLng)`), stop it on complete/cancel.
3. Declare in `AndroidManifest.xml`: `<service android:name=".SafeWalkService" android:foregroundServiceType="location">` and the `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` permissions (Android 14+ requires the specific type permission, not just the general one — confirm your target SDK version and adjust).

**Test:** Start a Safe Walk, lock the screen, wait several minutes, confirm `journey_breadcrumbs` rows keep arriving at roughly the same interval as with the screen unlocked (compare timestamps before/after locking).

---

### 14. TRG-6-lite — Lock-screen audio for SOS during an active Safe Walk (honest version)
**Size:** M (~4 days) · **Files:** extends `SafeWalkService.kt` from task 13, `apps/mobile/src/screens/SafeWalkScreen.tsx` (SOS trigger path), existing audio recording code (find wherever the current SOS flow records the 30s clip and reuse it — do not write a second recording implementation)

**Change:**
1. When SOS is triggered **while `SafeWalkService` is running**, call into the service to start audio recording using the microphone access already held by the foreground service (declare `android:foregroundServiceType="location|microphone"` — combined types are allowed).
2. When SOS is triggered **with no active Safe Walk** (app foreground or background, no service running), attempt the existing recording path as today; if it fails (background restriction), **send the SOS immediately without audio** — do not block SOS delivery waiting for a recording that may never start. Log this distinctly (e.g. `audioAttempted: true, audioSucceeded: false`) so you can see in testing how often this actually happens on your reference devices.
3. See `architecture.md` §8b for the exact constraint this task is built around — **do not** try to build a workaround that starts background microphone access outside of an active foreground service; that's fighting the OS, not a bug to fix.

**Test:** (a) Start a Safe Walk, lock screen, trigger SOS — confirm audio recording starts and an audio URL appears on the resulting `sos_alerts` row. (b) With no active Safe Walk and screen locked, trigger SOS via whatever locked-screen-accessible trigger V1 has (or simulate) — confirm the alert is still created and delivered, just without audio, and confirm this doesn't throw an unhandled error anywhere.

---

### 15. NAV-1 — Simple distance/ETA notification during Safe Walk
**Size:** S (~2 days, mostly reuses task 13's notification plumbing) · **Files:** `SafeWalkService.kt` (notification content), wherever straight-line distance/ETA is already computed for route preview (likely in `MapScreen.tsx` or a shared util — reuse the existing calibrated speed constants rather than introducing new ones)

**Change:** On each location update inside the foreground service, recompute straight-line distance to the destination and a rough ETA (`distance / calibrated_speed_for_mode`), update the persistent notification text: `"320m to go — about 4 min"`. **Not turn-by-turn** — no per-step instructions, no voice, just a live distance/ETA readout. Real turn-by-turn navigation needs actual per-mode routing (`docs/v2/map-routing-search.md` §4–§5), which V1 doesn't have — say this explicitly if asked in your demo, rather than letting the notification imply more than it does.

**Test:** Start a Safe Walk with a destination set, confirm the notification's distance decreases and ETA updates plausibly as you move (or simulate movement via mock location).

---

## Nice-to-have (cut first)

### 12. SYN-3 — Photo picker for hazard reports
**Size:** M (~4 days) · **Files:** `apps/mobile/src/components/ReportHazardModal.tsx`

**Change:** Add a camera/gallery picker (e.g. `react-native-image-picker`, check it's not already a dependency before adding a new one) replacing/supplementing the 3 preset images + URL-paste option. On selection, upload via the existing `POST /api/reports/upload-photo` endpoint (already implemented server-side, just unused by the picker) before submitting the report, then include the returned URL in the report payload.

**If cut:** the app still works with presets — say in your report that a real picker is the immediate next step.

---

## Cut order if you run out of time (drop from the top first)
1. **SYN-3** (photo picker) — keep presets.
2. **NAV-1** (ETA notification) — keep the plain "Safe Walk active" notification from task 13 with no distance/ETA text; cheap to add back later since task 13's plumbing already exists.
3. **AGE-lite** — fold into a single added sentence on the Terms screen (task 11) instead of a separate screen.
4. **SEC-9** — if truly no time, at minimum relabel the admin radar "Demo data" so it isn't presented as real.
5. **SYN-2** (heatmap) — demo the plain pin map, explain the heatmap is next.
6. **TRG-6-lite** (lock-screen audio) — if genuinely out of time, ship task 13 (foreground service, tracking works) without the audio piggyback; SOS still sends GPS/battery, just never gets audio when triggered during a locked-screen Safe Walk. State this as a known limitation, not a silent gap.
7. **Never cut:** SYN-1 (fake number), SEC-2 (identity leak), TRK-1 / TRK-2 / SYN-4 / SYN-5 / **TRG-2-lite (task 13, foreground service)** — together these ARE the "Safe Walk alerts a guardian" objective, the centrepiece of the synopsis, and task 13 is now load-bearing for the others to actually work reliably with the screen locked.

## After each item
- [x] Run the specific test listed above.
- [x] One line in your project report: what it does, why it was needed, any known limitation.
- [x] Commit with a clear message referencing the item ID (e.g. `SYN-1: remove fake safety score fallback`).
