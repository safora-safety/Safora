# API Reference — V1

Base URL: your Render backend (see root README). All authenticated routes require `Authorization: Bearer <JWT>`. Unchanged endpoints are marked **existing**; anything else is **new in V1** or **changed in V1**.

## Auth — `/api/auth`
 
| Method | Path | Notes |
|---|---|---|
| POST | `/register` | Standard email/password citizen registration |
| POST | `/login` | Email/password login; issues JWT token |
| POST | `/google` | **New in V1:** Google OAuth token verification via `idToken`; links existing email accounts or creates new profile; returns JWT |
| GET | `/me` | Returns current user profile |
| PATCH | `/profile` | **changed:** now also accepts `age` (integer) and `termsAcceptedAt` is set server-side on first call after the Terms screen |
| POST | `/change-password` | Updates user password with current password verification |

## Users — `/api/users` (existing, unchanged)

`POST /fcm-token` · `GET /` (staff) · `GET /stats` (staff) · `PATCH /:id/role` (admin) · `PATCH /:id/status` (admin)

## Reports (hazards) — `/api/reports`

| Method | Path | V1 status |
|---|---|---|
| GET | `/` | **changed:** response DTO no longer includes `userId`, `email`, `phone` for **non-staff** callers. Staff (`requireStaff`) responses are unchanged and keep full reporter identity, per your requirement that admin can see who posted |
| GET | `/nearby` | same DTO change as above |
| GET | `/clusters` | **existing endpoint, newly consumed** — the mobile map and the Home safety card now call this to render the heatmap layer (previously built but unused by the client) |
| GET | `/safety-score` | **changed:** the mobile client's fallback-to-fake-number behaviour is removed; on failure the app shows a retry state, not an invented score |
| GET | `/analytics/summary` (staff) | existing |
| POST | `/` | existing |
| POST | `/upload-photo` | **existing endpoint, newly wired** — the report screen gets a camera/gallery picker calling this instead of only offering presets |
| PATCH | `/:id/confirm` | existing |
| PATCH | `/:id/moderate` (staff) | existing |

### `PublicReportDto` (new in V1)
```json
{
  "id": 123,
  "category": "poor_lighting",
  "severity": 4,
  "description": "…",
  "photoUrl": "…",
  "location": { "lat": 30.31, "lng": 78.03 },
  "confirmationsCount": 2,
  "createdAt": "2026-10-01T18:00:00Z"
}
```
No `userId`, `reporterName`, `email` or `phone`. The staff DTO is unchanged and still includes reporter identity.

## Journeys (Safe Walk) — `/api/journeys`

| Method | Path | V1 status |
|---|---|---|
| POST | `/start` | existing |
| PATCH | `/:id/location` | **changed:** now inserts a row into `journey_breadcrumbs`, updates `journeys.last_location`/`last_seen_at`, and emits the `journey:location` socket event (previously computed the corridor check but stored nothing and emitted nothing) |
| PATCH | `/:id/complete` | existing |
| PATCH | `/:id/cancel` | existing |
| POST | `/:id/confirm-safe` | **new** — clears `deviated_at`; call this from the "Are you OK?" prompt |
| GET | `/active` (staff) | **changed:** now returns the real `last_location`/`last_seen_at` instead of the journey's origin point; admin radar reads this |
| GET | `/` (staff) | existing |

## SOS — `/api/sos`
`POST /` · `GET /alerts` (staff) · `PATCH /:id/status` (staff) · `PATCH /:id/audio` · `POST /upload-audio` · `GET /check-guardian` · `POST /test-guardian` · `GET/POST /contacts` · `PUT/DELETE /contacts/:id`

**Note:**
- The watchdog's automatic deviation escalation creates an `sos_alerts` row with `source='watchdog'` through the same internal service the manual `POST /` route uses, so it appears in the existing SOS queue and admin UI with no separate code path.
- `PATCH /:id/audio` now calls `AudioStitcherService.handleMasterUploaded(alertId)` to disarm the server-side watchdog timer and purge temporary disk staging when the pristine 30-second master recording arrives from mobile.

## Notifications — `/api/notifications` (existing, unchanged)

`GET /` · `PATCH /:id/read` · `PATCH /read-all`

## Internal — new in V1

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/internal/tick` | Not user-facing. Triggers one watchdog scan. Protected by a shared-secret header (`X-Internal-Secret`), **not** JWT. Call it from a free external scheduler (cron-job.org or similar) every 5 minutes so the watchdog keeps working even if Render's free instance would otherwise sit idle between real user requests. |

## Socket.IO events

| Event | Direction | V1 status |
|---|---|---|
| `journey:location` | server → room `journey:{id}` | **changed:** now actually emitted (payload: `{lat, lng, speed?, battery?, recordedAt}`) |
| `sos:alert` | server → rooms `staff`, `user:{id}` | existing |
| `sos:audio` | server → rooms `staff`, `user:{id}` | **changed:** broadcasts final master/stitched Cloudinary audio attachment |
| `sos:audio_chunk` | mobile → server | **new in V1:** streams 5s progressive PCM/WAV audio slices (`{alertId, seq, data, isLast}`) |
| `sos:audio_chunk_ack` | server → mobile | **new in V1:** receipt acknowledgment for each audio slice |
| `sos:live_audio_chunk` | server → rooms `sos:alert:{id}`, `staff`, `user:{gid}` | **new in V1:** relays live audio slices in real time to dispatchers and guardians |
| `sos:join` / `sos:leave` | client ⇄ server | **new in V1:** scoped room subscription for live alert audio (owner, staff, or verified guardian) |

Handshake: JWT in `socket.io-client`'s `auth` option (server validates HS256 JWT and sets `socket.data.user`).
See [`dual-pipe-audio-streaming.md`](./dual-pipe-audio-streaming.md) for full protocol payloads, buffer sizing, and edge-case mitigations.

## Health/diagnostics — unchanged
`GET /api/health` · `GET /api/diagnostics`

## Full request/response schemas for new/changed V1 endpoints

### `PATCH /api/journeys/:id/location` (changed)
Request:
```json
{ "lat": 30.3125, "lng": 78.0392, "speed": 1.4, "battery": 72 }
```
Response (unchanged shape, new `deviated` semantics now backed by real persistence):
```json
{ "deviated": false, "distanceFromRouteM": 12.4 }
```
Validation (Zod sketch): `lat`/`lng` required numbers in valid ranges; `speed`/`battery` optional numbers; reject if journey is not `status='active'` or does not belong to the authenticated user (existing ownership check — confirm it's still applied after this change).

### `POST /api/journeys/:id/confirm-safe` (new)
Request: empty body.
Response:
```json
{ "confirmed": true, "deviatedAt": null }
```
Errors: `404` if journey not found/not owned by caller; `409` if journey has no active deviation to confirm (optional — a no-op 200 is also acceptable for V1 simplicity).

### `POST /api/internal/tick` (new, internal only)
Headers: `X-Internal-Secret: <INTERNAL_TICK_SECRET>` — **not** a JWT, not user-facing, do not expose in any client code or API docs shown to end users.
Request: empty body.
Response:
```json
{ "scanned": 3, "escalated": 0 }
```
`401` if the header is missing or wrong — respond with no body detail beyond the status code.

### `GET /api/journeys/active` (staff, changed)
Response — each entry now reflects real tracked position instead of the journey's origin:
```json
[
  {
    "id": 42,
    "userId": 7,
    "status": "active",
    "lastLocation": { "lat": 30.3125, "lng": 78.0392 },
    "lastSeenAt": "2026-11-02T14:32:10Z",
    "deviatedAt": null,
    "mode": "walk"
  }
]
```
Empty array `[]` when there are genuinely no active journeys — **the frontend must render an empty state for this, not fall back to sample data** (see `tasks.md` #3).

### `GET /api/reports` / `GET /api/reports/nearby` (changed — public DTO & Pagination)
Optional query parameters: `page` (default: 1), `limit` (default: 20, max: 100), `status`, `category`.

Response envelope (paginated):
```json
{
  "success": true,
  "count": 20,
  "reports": [
    {
      "id": 123,
      "category": "poor_lighting",
      "severity": 4,
      "description": "Streetlight out near the bus stop",
      "photoUrl": "https://res.cloudinary.com/.../photo.jpg",
      "location": { "lat": 30.3110, "lng": 78.0401 },
      "confirmationsCount": 2,
      "createdAt": "2026-10-28T19:04:00Z"
    }
  ],
  "pagination": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```
*Note: For non-paginated requests or legacy endpoints, `reports` array is returned directly for seamless backward compatibility.*

Same endpoint, staff caller (via `Authorization` header carrying a staff/admin JWT):
Includes all public fields plus `userId`, `reporterName`, and `reporterEmail`.

### `PATCH /api/auth/profile` (changed — new optional fields)
Request now also accepts:
```json
{ "age": 22, "ageNoticeAck": true, "termsAcceptedAt": "2026-10-15T10:00:00Z" }
```
All three optional per-call; only the fields present are updated (standard partial-update semantics — confirm this matches how the existing handler already treats other profile fields like `name`/`bloodGroup`).

### `POST /api/auth/google` (new in V1)
Request:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```
Response (`200 OK`):
```json
{
  "message": "Authenticated with Google",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": 4,
    "name": "Jane Doe",
    "email": "jane@gmail.com",
    "role": "citizen",
    "authProvider": "google",
    "avatarUrl": "https://lh3.googleusercontent.com/a/...",
    "age": 21,
    "termsAcceptedAt": "2026-10-18T05:00:00Z"
  }
}
```
*Note: Validates incoming Google ID token via `google-auth-library` `OAuth2Client` with fallback to Google's `tokeninfo` endpoint for network resilience. If email matches an existing email/password account, links `google_id` seamlessly without duplicating user rows.*

## Error response shape (apply consistently to every new endpoint above)
```json
{ "error": "VALIDATION_ERROR", "message": "lat must be a number between -90 and 90" }
```
Match whatever error envelope the existing routes already use (check `reportRoutes.ts` or `sosRoutes.ts` for the established pattern) rather than inventing a new shape for just the V1 additions.
