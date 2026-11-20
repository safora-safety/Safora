# API Reference

| | |
|---|---|
| **Version** | V1 (complete) |
| **Base URL** | The Render backend (see the root README) |
| **Format** | JSON over HTTPS; real-time events over Socket.IO |
| **Authentication** | `Authorization: Bearer <JWT>` (HS256, valid for 7 days) |
| **Size** | 52 REST endpoints in 7 route modules |

Endpoints marked **new** or **changed** were introduced or modified in V1; unmarked endpoints are unchanged from the original code base. Access levels are *public*, *user* (any signed-in user), *staff* (admin or moderator) and *admin*. Entries marked † were derived from the route names; confirm the HTTP method against the route file when implementing a client.

## 1. Authentication – `/api/auth`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/register` | public | E-mail and password registration. Rate limited |
| POST | `/login` | public | Issues a JWT. Rate limited per e-mail and per IP |
| POST | `/google` | public | **New.** Verifies a Google ID token and links or creates the account (see 1.1) |
| GET | `/me` | user | Current profile |
| PATCH | `/profile` | user | **Changed.** Also accepts `age`, `ageNoticeAck` and `termsAcceptedAt` (see 1.2) |
| POST | `/change-password` | user | Requires the current password |

### 1.1 `POST /api/auth/google`

```json
{ "idToken": "<Google ID token>" }
```

Response `200`:

```json
{
  "message": "Authenticated with Google",
  "token": "<Safora JWT>",
  "user": { "id": 4, "name": "…", "email": "…", "role": "citizen",
            "authProvider": "google", "avatarUrl": "…", "age": 21,
            "termsAcceptedAt": "2026-10-18T05:00:00Z" }
}
```

The token is verified with `OAuth2Client.verifyIdToken`. If that call fails because of a network problem, the server falls back to Google's `tokeninfo` endpoint, checking the audience and `email_verified === true`. An existing account with the same e-mail address is linked and no duplicate user is created.

### 1.2 `PATCH /api/auth/profile`

All fields are optional and only the fields present are updated:

```json
{ "age": 22, "ageNoticeAck": true, "termsAcceptedAt": "2026-10-15T10:00:00Z" }
```

## 2. Users – `/api/users`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/fcm-token` | user | Registers the push token |
| GET | `/` | staff | User list |
| GET | `/stats` | staff | Role and status counts |
| PATCH | `/:id/role` | admin | Changes role (citizen, moderator, admin) |
| PATCH | `/:id/status` | admin | Suspends or restores an account |

## 3. Hazard Reports – `/api/reports`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | public | **Changed.** Paginated list; reporter identity removed for non-staff |
| GET | `/nearby` | public | **Changed.** Reports around a point; same DTO rules |
| GET | `/clusters` | public | DBSCAN clusters of active reports (`?eps=&min_points=`). Now used by the mobile map |
| GET | `/safety-score` | public | **Changed.** Score for a point. The client no longer invents a score when the call fails |
| GET | `/analytics/summary` | staff | Aggregates for the admin analytics page |
| POST | `/` | user | Create a report. Limited to 20 per 15 minutes |
| POST | `/upload-photo` | user | Photo upload (5 MB, images only) to Cloudinary folder `safora/hazards`. Now used by the camera/gallery picker |
| PATCH | `/:id/confirm` | user | Adds a community confirmation |
| PATCH | `/:id/moderate` | staff | Sets status: active, resolved, duplicate or fake; adds resolution notes |

**Valid values.** `category`: `lighting`, `road_hazard`, `waterlogging`, `isolated_area`, `traffic`, `other`. `severity`: integer 1 to 5.

### 3.1 Report representations

| Field | Public DTO | Staff DTO |
|---|:---:|:---:|
| `id`, `category`, `title`, `description`, `severity` | ✔ | ✔ |
| `latitude`, `longitude`, `photoUrl`, `source` | ✔ | ✔ |
| `resolutionNotes`, `confirmationsCount`, `status` | ✔ | ✔ |
| `distanceMeters` (nearby queries), `createdAt` | ✔ | ✔ |
| `userId`, `reporterName`, `reporterEmail` | – | ✔ |

### 3.2 List response and pagination

Query parameters: `page` (default 1), `limit` (default 500, maximum 1000), `status`, `category`.

```json
{
  "success": true,
  "count": 20,
  "reports": [ { "id": 123, "category": "lighting", "severity": 4,
                 "description": "Streetlight out near the bus stop",
                 "photoUrl": "https://res.cloudinary.com/…/photo.jpg",
                 "latitude": 30.3110, "longitude": 78.0401,
                 "confirmationsCount": 2, "status": "active",
                 "createdAt": "2026-10-28T19:04:00Z" } ],
  "pagination": { "total": 142, "page": 1, "limit": 20,
                  "totalPages": 8, "hasNext": true, "hasPrev": false }
}
```

Legacy callers that make a non-paginated request receive the `reports` array directly.

## 4. Journeys (Safe Walk) – `/api/journeys`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/start` | user | Starts a journey and registers it with the watchdog |
| PATCH | `/:id/location` | user | **Changed.** Stores a breadcrumb, updates `last_location` and `last_seen_at`, emits `journey:location`, runs the corridor check |
| POST | `/:id/confirm-safe` | user | **New.** Clears `deviated_at`; called from the "Are you OK?" prompt |
| PATCH | `/:id/complete` | user | Ends the walk |
| PATCH | `/:id/cancel` | user | Cancels the walk |
| GET | `/:id/status` | user | Journey state † |
| GET | `/escorting` | user | Walks that the caller is guarding † |
| GET | `/active` | staff | **Changed.** Active journeys with the real last position |
| GET | `/` | staff | Journey history |
| GET | `/config/corridor` | staff | Current corridor threshold † |
| PATCH | `/config/corridor` | staff | Sets the corridor threshold, 20 to 1000 m |
| DELETE | `/:id` | staff | Removes a journey † |

### 4.1 `PATCH /api/journeys/:id/location`

Request:

```json
{ "lat": 30.3125, "lng": 78.0392, "speed": 1.4, "battery": 72 }
```

Response:

```json
{ "deviated": false, "distanceFromRouteM": 12.4 }
```

`lat` and `lng` are required numbers within valid ranges; `speed` and `battery` are optional. The call is rejected when the journey is not `active` or does not belong to the caller.

### 4.2 `POST /api/journeys/:id/confirm-safe`

Empty request body. Response `{ "confirmed": true, "deviatedAt": null }`. `404` if the journey does not exist or is not owned by the caller.

### 4.3 `GET /api/journeys/active`

```json
[ { "id": 42, "userId": 7, "status": "active",
    "lastLocation": { "lat": 30.3125, "lng": 78.0392 },
    "lastSeenAt": "2026-11-02T14:32:10Z", "deviatedAt": null, "mode": "walk" } ]
```

An empty array is a valid answer and the admin console shows an empty state. It never falls back to sample data.

### 4.4 `PATCH /api/journeys/config/corridor`

Request `{ "thresholdMeters": 100 }`. Values below 20 or above 1000 are rejected. The value is held in process memory and starts from the `CORRIDOR_THRESHOLD_METERS` environment variable (default 100).

## 5. SOS – `/api/sos`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/` | user | Creates an alert (GPS, battery, area). 10 per minute |
| GET | `/alerts` | staff | SOS queue, including watchdog alerts |
| PATCH | `/:id/status` | staff | Triage status |
| POST | `/:id/audio-chunk` | user | 5-second audio slice from the native service. 60 per minute |
| POST | `/audio-chunk` | user | Slice upload when the alert ID is not yet in the path † |
| PATCH | `/:id/audio` | user | Master file URL. Calls `AudioStitcherService.handleMasterUploaded` to disarm the watchdog and purge staging |
| POST | `/upload-audio` | user | Audio evidence upload to Cloudinary. 30 per 15 minutes |
| GET | `/check-guardian` | user | Checks whether a contact is a Safora member. 30 per 15 minutes |
| POST | `/test-guardian` | user | Test drill dispatch. 5 per 15 minutes |
| GET | `/guardians/pending` | user | Pending guardian requests † |
| GET | `/guardians/wards` | user | People the caller guards † |
| POST | `/guardians/requests/:id/respond` | user | Accept or decline a guardian request † |
| GET, POST | `/contacts` | user | List or add trusted contacts |
| PUT, DELETE | `/contacts/:id` | user | Update or remove a contact |

The watchdog creates alerts through the same internal service as `POST /`, with `source = 'watchdog'`, so they appear in the existing queue without a separate code path.

## 6. Notifications – `/api/notifications`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List the caller's notifications |
| PATCH | `/:id/read` | Mark one as read |
| PATCH | `/read-all` | Mark all as read |

## 7. Internal – `/api/internal`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/tick` | shared secret | Triggers one watchdog scan |

The header `X-Internal-Secret: <INTERNAL_TICK_SECRET>` is required. It is not a JWT and must not appear in any client. A missing or wrong secret returns `401` with no further detail. Response on success: `{ "scanned": 3, "escalated": 0 }`. A free external scheduler calls the endpoint every 60 seconds.

## 8. Health – unchanged

`GET /api/health` and `GET /api/diagnostics` (staff) report service status, database latency and external-service checks.

## 9. Socket.IO

The handshake carries the JWT in the `auth` option; the server validates it and sets `socket.data.user`.

| Event | Direction | Description |
|---|---|---|
| `journey:join` | client → server | Subscribe to a journey room |
| `journey:update-location` | client → server | Position update over the socket |
| `journey:location` | server → room `journey:{id}` | **Changed.** Now emitted. Payload `{ lat, lng, speed?, battery?, recordedAt }` |
| `sos:alert` | server → rooms `staff`, `user:{id}` | New or updated alert |
| `sos:join`, `sos:leave` | client → server | **New.** Scoped subscription to live audio for one alert (owner, staff or verified guardian) |
| `sos:audio_chunk` | client → server | **New.** 5-second slice (fallback transport) |
| `sos:audio_chunk_ack` | server → client | **New.** Receipt for each slice |
| `sos:live_audio_chunk` | server → rooms `sos:alert:{id}`, `staff`, `user:{guardianId}` | **New.** Real-time slice relay |
| `sos:audio` | server → rooms `staff`, `user:{id}` | **Changed.** Final master or stitched evidence link |
| `error` | server → client | Error report |

Payloads for the audio events are specified in [Dual-pipe audio](./dual-pipe-audio-streaming.md).

## 10. Rate Limits

| Scope | Limit |
|---|---|
| Hazard reports | 20 per 15 minutes per user |
| SOS trigger | 10 per minute |
| Audio slices | 60 per minute |
| Audio evidence upload | 30 per 15 minutes |
| Guardian check | 30 per 15 minutes |
| Test drill | 5 per 15 minutes |
| Login | 10 failed attempts per 15 minutes per e-mail; 100 per 15 minutes per IP |
| Registration | 5 per 15 minutes per e-mail; 60 per 15 minutes per IP |

## 11. Error Format

```json
{ "error": "VALIDATION_ERROR", "message": "lat must be a number between -90 and 90" }
```

New endpoints follow the envelope already used by `reportRoutes.ts` and `sosRoutes.ts`.
