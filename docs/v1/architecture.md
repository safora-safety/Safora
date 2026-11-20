# Architecture

| | |
|---|---|
| **Version** | V1 (complete) |
| **Audience** | Developers, evaluators, maintainers |
| **Related** | [API](./api.md) · [Database](./database.md) · [Safety algorithms](./safety-algorithms.md) · [Dual-pipe audio](./dual-pipe-audio-streaming.md) |

## 1. Overview

Safora is a three-tier system organised as an npm monorepo (`apps/mobile`, `apps/backend`, `apps/frontend`, `packages/shared-types`).

| Tier | Components |
|---|---|
| Client | React Native Android app with a native Kotlin foreground service; React admin console |
| Service | Node.js and Express REST API, Socket.IO gateway, in-process watchdog, audio stitcher |
| Data and external | PostgreSQL with PostGIS (Neon), Firebase Cloud Messaging, Cloudinary, OSRM, Photon and MapTiler, OpenStreetMap and Esri tiles |

## 2. System Context

```mermaid
flowchart LR
    subgraph Clients
        MOB["Android app<br/>React Native + Kotlin service"]
        ADM["Admin console<br/>React + Vite"]
    end

    subgraph Backend["Backend (Render web service)"]
        API["REST API<br/>Express 5"]
        SIO["Socket.IO gateway"]
        WD["Watchdog<br/>30 s tick"]
        AUD["AudioStitcherService"]
    end

    subgraph Data["Data (Neon)"]
        DB[("PostgreSQL + PostGIS")]
    end

    subgraph External
        FCM["Firebase Cloud Messaging"]
        CLD["Cloudinary"]
        OSRM["OSRM routing"]
        GEO["Photon / MapTiler"]
        TILES["OSM / Esri tiles"]
        GSI["Google Sign-In"]
        CRON["External scheduler<br/>cron-job.org"]
    end

    MOB -->|"HTTPS"| API
    MOB <-->|"WSS"| SIO
    ADM -->|"HTTPS"| API
    ADM <-->|"WSS"| SIO
    API --> DB
    SIO --> DB
    WD --> DB
    WD --> FCM
    API --> FCM
    API --> CLD
    API --> AUD
    AUD --> CLD
    API --> GSI
    MOB --> OSRM
    MOB --> GEO
    MOB --> TILES
    ADM --> TILES
    CRON -->|"POST /api/internal/tick<br/>every 60 s"| API
```

## 3. Data Flow Diagrams

The diagrams use these conventions: rectangles are external entities, rounded boxes are processes, and cylinders are data stores.

### 3.1 Level 0 – Context Diagram

```mermaid
flowchart LR
    CIT["Citizen / Walker"]
    GRD["Guardian"]
    STF["Admin / Moderator"]
    EXT["External services<br/>FCM, Cloudinary, OSRM,<br/>Google Sign-In"]

    S(("Safora<br/>Safety Platform"))

    CIT -->|"hazard reports, location,<br/>SOS, audio, profile"| S
    S -->|"safety score, map, route,<br/>alerts"| CIT
    GRD -->|"acknowledgements"| S
    S -->|"live location, SOS alert,<br/>live audio"| GRD
    STF -->|"moderation, role changes,<br/>corridor setting"| S
    S -->|"live radar, SOS queue,<br/>diagnostics"| STF
    S <-->|"push, media, routes,<br/>identity tokens"| EXT
```

### 3.2 Level 1 – Main Processes

```mermaid
flowchart TB
    CIT["Citizen / Walker"]
    GRD["Guardian"]
    STF["Admin / Moderator"]

    P1("1.0 Authenticate<br/>and manage users")
    P2("2.0 Manage<br/>hazard reports")
    P3("3.0 Compute safety score<br/>and clusters")
    P4("4.0 Run Safe Walk<br/>and track journey")
    P5("5.0 Detect deviation<br/>and escalate")
    P6("6.0 Handle SOS<br/>and audio evidence")
    P7("7.0 Notify and relay<br/>in real time")
    P8("8.0 Administer<br/>and moderate")

    D1[("D1 users and<br/>trusted_contacts")]
    D2[("D2 reports")]
    D3[("D3 journeys and<br/>journey_breadcrumbs")]
    D4[("D4 sos_alerts")]
    D5[("D5 notifications")]
    D6[("D6 evidence media<br/>Cloudinary")]

    CIT -->|"credentials, profile"| P1
    P1 <--> D1
    P1 -->|"JWT"| CIT

    CIT -->|"new report, photo, confirmation"| P2
    P2 <--> D2
    P2 -->|"photo"| D6

    CIT -->|"map query"| P3
    D2 --> P3
    P3 -->|"score, clusters"| CIT

    CIT -->|"route, GPS positions"| P4
    P4 <--> D3
    P4 --> P5
    P5 <--> D3
    P5 -->|"watchdog SOS"| P6

    CIT -->|"SOS, audio slices, master file"| P6
    P6 <--> D4
    P6 --> D6
    P6 --> P7
    D1 -->|"guardian lookup"| P7

    P7 --> D5
    P7 -->|"push, live location, live audio"| GRD
    GRD -->|"acknowledge"| P7
    P7 -->|"alerts, radar updates"| STF

    STF -->|"moderate, roles, corridor"| P8
    P8 <--> D2
    P8 <--> D1
    P8 --> P5
```

### 3.3 Level 2 – Hazard Reporting and Scoring (processes 2.0 and 3.0)

```mermaid
flowchart LR
    CIT["Citizen"]
    P21("2.1 Validate input<br/>Zod schema, rate limit")
    P22("2.2 Upload photo<br/>5 MB, image only")
    P23("2.3 Store report<br/>geography point")
    P24("2.4 Moderate or confirm")
    P31("3.1 Select reports<br/>within radius")
    P32("3.2 Apply S, D, T, C<br/>weights")
    P33("3.3 Sum penalties<br/>clamp 0-100")
    P34("3.4 Cluster with<br/>DBSCAN")
    CACHE[("In-memory cache<br/>20 s / 30 s")]
    D2[("D2 reports")]
    CLD[("Cloudinary")]

    CIT -->|"report data"| P21
    CIT -->|"image"| P22
    P22 --> CLD
    P21 --> P23
    P22 -->|"photo URL"| P23
    P23 --> D2
    P23 -->|"invalidate"| CACHE
    CIT -->|"confirm"| P24
    P24 <--> D2
    P24 -->|"invalidate"| CACHE

    CIT -->|"lat, lng, radius"| P31
    CACHE <--> P31
    D2 --> P31
    P31 --> P32 --> P33
    P33 -->|"score, risk level"| CIT
    D2 --> P34
    P34 -->|"cluster markers"| CIT
```

### 3.4 Level 2 – Safe Walk and Escalation (processes 4.0 and 5.0)

```mermaid
flowchart LR
    W["Walker phone"]
    G["Guardian"]
    P41("4.1 Start journey<br/>store route polyline")
    P42("4.2 Receive position<br/>store breadcrumb")
    P43("4.3 Compute distance<br/>to route segment")
    P44("4.4 Relay position<br/>journey:location")
    P51("5.1 Set deviated_at")
    P52("5.2 Confirm safe<br/>clear deviated_at")
    P53("5.3 Watchdog tick<br/>every 30 s")
    P54("5.4 Create SOS<br/>source = watchdog")
    D3[("journeys")]
    D3B[("journey_breadcrumbs")]
    D4[("sos_alerts")]
    MEM[("In-memory<br/>watchdog map")]

    W -->|"destination, mode"| P41
    P41 --> D3
    P41 --> MEM
    W -->|"lat, lng, speed, battery<br/>every 3 s"| P42
    P42 --> D3B
    P42 --> D3
    P42 --> P43
    P43 -->|"outside corridor"| P51
    P43 -->|"inside corridor"| P52
    P51 --> D3
    P51 --> MEM
    P42 --> P44 -->|"live marker"| G
    W -->|"I am safe"| P52
    P52 --> D3
    P52 --> MEM
    MEM --> P53
    P53 -->|"deviation older than 60 s"| P54
    P54 --> D4
    P54 -->|"FCM push"| G
```

### 3.5 Level 2 – SOS and Audio Evidence (process 6.0)

```mermaid
flowchart LR
    W["Walker phone"]
    G["Guardian app"]
    A["Admin console"]
    P61("6.1 Create alert<br/>GPS, battery, area")
    P62("6.2 Find guardians<br/>email or phone")
    P63("6.3 Receive audio slice<br/>REST or Socket.IO")
    P64("6.4 Relay live slice")
    P65("6.5 Store master file")
    P66("6.6 Rescue watchdog<br/>stitch after 8 s")
    D4[("sos_alerts")]
    D1[("trusted_contacts")]
    STG[("Server staging<br/>chunk files")]
    CLD[("Cloudinary")]

    W -->|"SOS"| P61
    P61 --> D4
    D1 --> P62
    P61 --> P62
    P62 -->|"FCM push + sos:alert"| G
    P62 -->|"sos:alert"| A
    W -->|"5 s slices"| P63
    P63 --> STG
    P63 --> P64
    P64 -->|"sos:live_audio_chunk"| G
    P64 -->|"sos:live_audio_chunk"| A
    W -->|"30 s master WAV"| P65
    P65 --> CLD
    P65 --> D4
    P65 -->|"disarm and purge"| STG
    STG --> P66
    P66 --> CLD
    P66 --> D4
```

## 4. What Is New in V1 Compared with the Original Codebase

| Layer | Pre-existing | Added in V1 |
|---|---|---|
| Mobile | Screens, offline hazard queue, map, route preview, SOS countdown, decoy and fake call | Socket.IO client, photo picker, heat-map layer, honest error state on the score card, Google Sign-In, terms and age notice, guardian live SOS screen, foreground service, dual-pipe audio, siren, hold-to-confirm walk end, UI modernisation (five phases) |
| Backend | Auth, hazard CRUD, SOS trigger, corridor distance function | Breadcrumb persistence, live location relay, watchdog tick, `confirm-safe`, public report DTO, audio stitcher, live audio relay, Google OAuth, rate limiting, configurable corridor |
| Database | users, reports, trusted_contacts, journeys, sos_alerts, notifications | `journey_breadcrumbs`; `journeys.last_location`, `last_seen_at`, `deviated_at`, `escalated_at`; `users.age`, `age_notice_ack`, `terms_accepted_at`, Google columns |
| Admin console | Dashboard, SOS queue, hazard moderation | Real Safe Walk radar, live audio queue, command palette, shortcuts manual, offline-failover banner, batch moderation, diagnostics tests |
| Maps and routing | Leaflet with OSM and Esri tiles, Photon and MapTiler search | Unchanged in V1. Per-mode routing and a new basemap are V2 items |

## 5. Safe Walk with Live Tracking (core V1 flow)

```mermaid
sequenceDiagram
    autonumber
    participant W as Walker phone
    participant API as Backend API
    participant SIO as Socket.IO
    participant DB as PostgreSQL
    participant WD as Watchdog
    participant G as Guardian phone
    participant FCM as Firebase

    W->>API: POST /api/journeys/start
    API->>DB: INSERT journeys
    W->>SIO: connect (JWT), join journey room
    G->>SIO: connect (JWT), join journey room
    loop about every 3 s while walking
        W->>API: PATCH /api/journeys/:id/location
        API->>DB: INSERT breadcrumb, UPDATE last_location
        API->>API: Corridor check (segment distance)
        API-->>SIO: journey:location
        SIO-->>G: marker moves on guardian map
        alt outside corridor
            API->>DB: SET deviated_at if empty
            Note over W: 60 s "Are you OK?" prompt on the phone
        end
    end
    loop every 30 s
        WD->>DB: Scan active journeys with deviated_at set
    end
    alt deviated_at older than 60 s and no confirm-safe
        WD->>DB: INSERT sos_alerts (source = watchdog), SET escalated_at
        WD->>FCM: Push to guardians
        FCM-->>G: Deviation alert
    else walker taps "I am safe"
        W->>API: POST /api/journeys/:id/confirm-safe
        API->>DB: CLEAR deviated_at
    end
```

## 6. Watchdog

The watchdog implements one rule in V1: unconfirmed deviation.

- It runs as a 30-second in-process loop inside the Express service. No separate worker is needed.
- It keeps a `Map<journeyId, { deviatedAt, lastLocation }>` of active journeys. A tick with no active journeys performs no database query.
- A position outside the corridor sets `deviatedAt` if it is empty. A position back inside the corridor, or a `confirm-safe` call, clears it.
- When `deviatedAt` is more than 60 seconds old, the watchdog creates an SOS alert with `source = 'watchdog'`, sets `escalated_at`, pushes to the guardians and removes the journey from the map. It therefore fires once per deviation, between 60 and 90 seconds after the deviation.
- On start-up the map is rebuilt from `SELECT id, deviated_at FROM journeys WHERE status = 'active'`.
- An external scheduler calls `POST /api/internal/tick` every 60 seconds with the `X-Internal-Secret` header, so the free-tier instance does not sleep and the watchdog keeps running.

```mermaid
stateDiagram-v2
    [*] --> NotTracked
    NotTracked --> Active: POST /journeys/start
    Active --> Active: position inside corridor
    Active --> Deviated: position outside corridor, deviatedAt = now
    Deviated --> Active: back inside corridor or confirm-safe
    Deviated --> Escalated: tick finds deviatedAt older than 60 s
    Escalated --> NotTracked: SOS created, journey removed from map
    Active --> NotTracked: complete or cancel
    Deviated --> NotTracked: complete or cancel
```

### Phone-side and server-side layers

The phone shows its own 60-second "Are you OK?" countdown, which is the first and fastest layer. The server-side watchdog is the safety net when the phone-side layer is defeated, for example when the app is killed or the phone is destroyed. Both can fire. Tapping "I am safe" calls `confirm-safe`, which prevents the server-side alert.

## 7. Foreground Service

`com.mobile.SafeWalkService` (Kotlin) starts when a Safe Walk begins and stops when it ends.

1. Location updates continue with the screen locked. Without the service, Android can throttle location callbacks and the deviation watchdog would degrade silently.
2. A persistent notification shows the distance and estimated time to the destination, for example "Safe Walk active – 320 m to destination, about 4 min". It is refreshed on every location update and uses straight-line distance and the calibrated speed constants in [Safety algorithms](./safety-algorithms.md).
3. If an SOS is triggered while the service is running, audio recording uses the same service (see [Dual-pipe audio](./dual-pipe-audio-streaming.md)).

### Microphone constraint on Android

Android generally does not allow an application to start microphone access from the background. A foreground service that is already running with the microphone type is one of the few permitted exceptions. Consequently:

- An SOS during an active Safe Walk records audio even with the screen locked.
- An SOS with no active walk and a locked screen may be unable to start recording on newer Android versions. In that case the SOS is sent immediately with GPS and battery data and without audio; recording starts later if the screen is unlocked. The application never pretends that audio was recorded.
- The behaviour varies by Android version and vendor and was verified on the project's test devices.

## 8. Failure Modes

| Failure | Expected behaviour |
|---|---|
| Socket.IO drops during a walk | Location continues over REST. The socket only carries real-time delivery to the guardian, so the watchdog still works |
| `/api/internal/tick` called with a wrong or missing secret | HTTP 401 with no body detail; nothing is scanned |
| FCM push fails (invalid token) | The `sos_alerts` row still exists and appears in the admin queue. Retry and alternative channels are a V2 item |
| Two location updates arrive out of order | `last_location` reflects the last processed update, not the latest `recorded_at`. Ordering by `recorded_at` is a V2 item |
| Journey without a route polyline | The distance to the straight line from origin to destination is used |
| Journey without a destination | No deviation is possible, so no deviation check is made |
| Backend restarts during a walk | The in-memory map is rebuilt from the database; a deviation that occurred in the few seconds around the restart may be missed (V2 makes the rules idempotent and clock-driven) |

## 9. Deployment

```mermaid
flowchart LR
    DEV["Developer"] -->|"push, pull request"| GH["GitHub Actions<br/>lint + tests"]
    GH --> REPO["main branch"]
    REPO --> RB["Render web service<br/>Backend + Socket.IO"]
    REPO --> RS["Render static site<br/>Admin console"]
    RB --> NEON[("Neon PostgreSQL + PostGIS")]
    RB --> FCM2["Firebase"]
    RB --> CLD2["Cloudinary"]
    CRON2["cron-job.org<br/>every 60 s"] --> RB
    APK["Release APK<br/>arm64-v8a, about 34 MB"] --> PHONE["Android devices"]
    PHONE --> RB
    BROWSER["Browser"] --> RS
    RS --> RB
```

All hosting is on free tiers. Known consequences are listed in [Tech stack](./tech-stack.md).

## 10. Deferred to V2

Session hardening, account deletion, e-mail, a verified guardian invitation handshake, on-device SMS delivery reporting, tracking links for guardians without the app, an open basemap, tuned search, per-mode routing, voice guidance, no-unlock SOS triggers, chat, Hindi and Uttarakhand-specific content, a medical card, and legal compliance work. See `docs/v2/`.

**V1 guardian model (simplified).** A trusted contact who has a Safora account and is logged in when the walk starts can see the live location and receive the deviation alert, with no separate acceptance step. This is weaker than the V2 design and is stated as a known limitation.
