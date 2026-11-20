# Data Dictionary

| | |
|---|---|
| **Version** | V1 (as built) |
| **Purpose** | One place for the meaning, type and allowed values of the data that Safora stores and exchanges |
| **Related** | [Database](./database.md) · [API](./api.md) · [Safety algorithms](./safety-algorithms.md) |

## 1. Enumerated Values

| Name | Allowed values | Notes |
|---|---|---|
| User role | `citizen`, `moderator`, `admin` | `moderator` and `admin` are *staff* |
| Authentication provider | `email`, `google` | |
| Hazard category | `lighting`, `road_hazard`, `waterlogging`, `isolated_area`, `traffic`, `other` | Defined in `packages/shared-types` and in the request schema |
| Severity | integer 1 to 5 | 1 minor, 5 critical |
| Report status | `active`, `resolved`, `duplicate`, `fake` | Only `active` reports count in the score and clusters |
| Journey status | `active`, `completed`, `cancelled` | |
| Travel mode | `walk`, `two_wheeler`, `car` | Determines the time estimate only in V1 |
| SOS source | `manual`, `watchdog` | |
| Risk level | `safe`, `moderate`, `high` | From the score: 80 or more, 50 to 79, below 50 |

## 2. Spatial Data

| Item | Definition |
|---|---|
| Point | `GEOGRAPHY(Point, 4326)`: longitude and latitude in WGS 84. Distances are on the ellipsoid, in metres |
| Index | GiST index on `reports.location` |
| Radius query | `ST_DWithin(location, point, radiusMeters)` |
| Cluster | `ST_ClusterDBSCAN(location::geometry, eps := 0.003, minpoints := 2)`; ε is in degrees (about 330 m at this latitude) |
| Route | A polyline of coordinates; the walker distance is the minimum point-to-segment distance on a local metric plane |

## 3. Core Records

### 3.1 User

| Field | Type | Description |
|---|---|---|
| `id` | integer | Primary key |
| `name`, `email` | text | Display name and unique e-mail address |
| `password_hash` | text | bcrypt hash; empty for accounts created only with Google |
| `role` | enum | See section 1 |
| `auth_provider`, `google_id`, `avatar_url` | text | Google sign-in details |
| `blood_group`, `emergency_contact` | text | Optional profile data |
| `age` | smallint | Entered on the age notice screen |
| `age_notice_ack` | boolean | The user saw the notice |
| `terms_accepted_at` | timestamp | When the terms were acknowledged |
| `suspended` | boolean | Suspended accounts cannot sign in |
| `created_at` | timestamp | |

### 3.2 Hazard report

| Field | Type | Description |
|---|---|---|
| `id` | integer | |
| `user_id` | integer | The reporter; never exposed in public responses |
| `category`, `severity` | enum, 1–5 | |
| `title`, `description` | text | |
| `photo_url` | text | Cloudinary URL, optional |
| `location` | geography point | |
| `confirmations_count` | integer | Community confirmations |
| `status` | enum | Moderation state |
| `resolution_notes` | text | Added by staff |
| `source` | text | Origin of the report (for example the app) |
| `created_at` | timestamp | Used for the recency decay |

### 3.3 Trusted contact

| Field | Type | Description |
|---|---|---|
| `id`, `user_id` | integer | Owner |
| `name`, `phone`, `email` | text | Used for the lookup of a guardian account and for the SMS fallback |
| `relationship` | text | Free text |

### 3.4 Journey

| Field | Type | Description |
|---|---|---|
| `id`, `user_id` | integer | |
| `origin`, `destination` | geography point | |
| `route_polyline` | text/array | Planned route |
| `mode` | enum | |
| `status` | enum | |
| `last_location`, `last_seen_at` | point, timestamp | Latest position |
| `deviated_at` | timestamp | Set when the walker leaves the corridor; cleared on return or confirmation |
| `escalated_at` | timestamp | Set once when the watchdog raises an alert |
| `started_at`, `completed_at` | timestamp | |

### 3.5 Journey breadcrumb

| Field | Type | Description |
|---|---|---|
| `id` | bigint | |
| `journey_id` | integer | Deleted with the journey |
| `location` | geography point | |
| `speed` | real | Metres per second, optional |
| `battery` | smallint | Percentage, optional |
| `recorded_at` | timestamp | |

### 3.6 SOS alert

| Field | Type | Description |
|---|---|---|
| `id`, `user_id` | integer | |
| `location` | geography point | Position at the trigger |
| `battery` | smallint | |
| `status` | text | Staff triage status |
| `source` | enum | `manual` or `watchdog` |
| `audio_url` | text | Master file, or the stitched rescue file |
| `created_at` | timestamp | |

### 3.7 Notification

| Field | Type | Description |
|---|---|---|
| `id`, `user_id` | integer | Recipient |
| `type` | text | For example SOS alert or audio ready |
| `payload` | json | Data for the in-app card |
| `read_at`, `created_at` | timestamp | |

## 4. Responses

### 4.1 Safety score

The response carries the integer score (0 to 100) and the risk level (`safe`, `moderate`, `high`) for the requested point and radius. An illustrative shape:

```json
{ "score": 84, "riskLevel": "safe" }
```

Exact field names are defined in `reportController.ts` and the shared types. The calculation is described in [Safety algorithms](./safety-algorithms.md).

### 4.2 Cluster

The clustering query returns one row per cluster:

| Field | Description |
|---|---|
| `cid` | Cluster number assigned by DBSCAN |
| `count` | Reports in the cluster (at least 2) |
| average severity | Mean severity, rounded to one decimal |
| `center_lat`, `center_lng` | Centroid of the member reports |

## 5. Socket.IO Payloads

| Event | Payload |
|---|---|
| `journey:location` | `{ lat, lng, speed?, battery?, recordedAt }` |
| `sos:audio_chunk` (client to server) | `{ alertId, seq, totalChunksExpected, durationSec, mimeType, data (Base64), isLast }` |
| `sos:audio_chunk_ack` | Acknowledgement for the slice (illustrative: alert id and sequence number) |
| `sos:live_audio_chunk` | The slice fields plus `timestamp` |
| `sos:audio` | Link to the final master file or the stitched rescue file for the alert |
| `sos:alert` | The alert record (position, battery, source, status) |

## 6. Constants

| Constant | Value | Where |
|---|---|---|
| Score radius default | 1000 m (nearby reports: 50,000 m) | `reportService.ts` |
| Severity weights | 1.0, 1.5, 2.5, 4.0, 6.0 | `reportService.ts` |
| Recency half-life and floor | 168 h and 0.25 | `reportService.ts` |
| Confirmation step and cap | +0.15 and 5 | `reportService.ts` |
| Cache TTL | 20 s nearby, 30 s clusters, 15 s default | `reportService.ts`, `cache.ts` |
| DBSCAN | ε 0.003°, minpoints 2 | `reportRepository.ts` |
| Corridor | 150 m default, 20–1000 m | `journeyService.ts` |
| Grace and tick | 60 s and 30 s | `watchdogService.ts` |
| GPS update | 3 s or 5 m | `locationService.ts` |
| SOS countdown | 5 s | `HomeScreen.tsx` |
| Audio | 30 s, 5 s slices, 16 kHz, 16-bit, mono | `SafeWalkService.kt` |
| Audio rescue timeout | 8 s | `audioStitcherService.ts` |
| JWT lifetime | 7 days | `authService.ts` |
| bcrypt rounds | 10 | `authService.ts` |
| Photo limit | 5 MB, `image/*` | `reportRoutes.ts` |
| Pagination | page 1, limit 500, maximum 1000 | `reportController.ts` |
| Offline tile cache | 10 km radius, zoom 15, at most 25 preloaded tiles | `OpenMapView.tsx` |
