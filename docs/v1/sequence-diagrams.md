# Sequence Diagrams

| | |
|---|---|
| **Version** | V1 (as built) |
| **Purpose** | The main runtime interactions, step by step. The Safe Walk and SOS audio flows are also shown in [Architecture](./architecture.md) and [Dual-pipe audio](./dual-pipe-audio-streaming.md) |

## 1. Sign-In and Session Restore

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant A as Mobile app
    participant API as Backend
    participant DB as PostgreSQL
    participant G as Google

    alt E-mail and password
        U->>A: Enter e-mail and password
        A->>API: POST /api/auth/login
        API->>API: Rate limit per e-mail and per IP
        API->>DB: Find user by e-mail
        API->>API: bcrypt compare
        API-->>A: JWT (7 days) and user
    else Google
        U->>A: Choose Google account
        A->>G: Account picker, obtain ID token
        A->>API: POST /api/auth/google (idToken)
        API->>G: verifyIdToken (fallback: tokeninfo)
        API->>DB: Link or create user (no duplicate by e-mail)
        API-->>A: JWT and user
    end
    A->>A: Store token in AsyncStorage
    Note over A: Next start: the splash screen restores the session<br/>before the first screen, so the login form never flickers
```

## 2. Hazard Report with Offline Queue

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant A as Mobile app
    participant Q as AsyncStorage queue
    participant API as Backend
    participant CLD as Cloudinary
    participant DB as PostgreSQL

    U->>A: Fill report, attach photo
    alt Online
        A->>API: POST /api/reports/upload-photo (5 MB, image)
        API->>CLD: Stream to folder safora/hazards
        API-->>A: photoUrl
        A->>API: POST /api/reports
        API->>API: Validate (Zod), rate limit 20 per 15 min
        API->>DB: INSERT report (geography point)
        API->>API: Invalidate cache "reports_"
        API-->>A: Created report
    else Offline
        A->>Q: Save @safora_offline_pending_reports
        A-->>U: "Saved, will sync when online"
        Note over A: Connection returns
        A->>Q: Read pending reports
        loop each report
            A->>API: POST /api/reports
            API-->>A: Created
            A->>Q: Remove from queue
        end
    end
```

## 3. Safety Score and Heat Map Request

```mermaid
sequenceDiagram
    autonumber
    participant A as Mobile app
    participant API as Backend
    participant C as In-memory cache
    participant DB as PostgreSQL

    A->>API: GET /api/reports/safety-score?lat&lng&radius
    API->>C: Look up key
    alt Hit within TTL
        C-->>API: Cached score
    else Miss
        API->>DB: Active reports within radius (ST_DWithin)
        DB-->>API: Rows with distance
        API->>API: Sum S x D x T x C x 5, clamp 0 to 100
        API->>C: Store
    end
    API-->>A: score and risk level
    A->>API: GET /api/reports/clusters
    API->>DB: ST_ClusterDBSCAN (eps 0.003, minpoints 2)
    API-->>A: clusters (count, average severity, centre)
    Note over A: On error the score card shows a retry state, never a number
```

## 4. Safe Walk from Start to Completion

```mermaid
sequenceDiagram
    autonumber
    participant W as Walker app
    participant FS as Foreground service
    participant API as Backend
    participant WD as Watchdog map
    participant DB as PostgreSQL
    participant G as Guardian app

    W->>API: POST /api/journeys/start (route, destination, mode)
    API->>DB: INSERT journey
    API->>WD: Track journey
    API-->>W: journey id
    W->>FS: Start service (notification: distance and ETA)
    loop every ~3 s or 5 m
        FS->>API: PATCH /api/journeys/:id/location
        API->>DB: INSERT breadcrumb, UPDATE last_location
        API->>API: Distance to route segments
        API-->>G: journey:location (over Socket.IO)
        FS->>FS: Update notification
    end
    W->>W: Hold "End walk" for 1.5 s
    W->>API: PATCH /api/journeys/:id/complete
    API->>DB: status = completed
    API->>WD: Stop tracking
    W->>FS: Stop service
    W-->>W: Arrival celebration, optional "I reached safely" message
```

## 5. SOS: Alert, Live Audio and Master Upload

```mermaid
sequenceDiagram
    autonumber
    participant U as Walker
    participant A as Mobile app
    participant S as Foreground service
    participant API as Backend
    participant FCM as Firebase
    participant G as Guardian
    participant ADM as Admin console

    U->>A: Tap SOS
    A->>A: 5 s cancel countdown (abort possible)
    A->>API: POST /api/sos (position, battery, area)
    API->>API: Rate limit 10 per minute
    API->>FCM: High-priority push to guardians
    FCM-->>G: Notification, full-screen alert
    API-->>ADM: sos:alert
    A->>S: Start dual-pipe audio, siren unless stealth
    loop 6 slices
        S->>API: POST /api/sos/:id/audio-chunk
        API-->>G: sos:live_audio_chunk
        API-->>ADM: sos:live_audio_chunk
    end
    S->>API: PATCH /api/sos/:id/audio (master file URL)
    API-->>ADM: sos:audio (final)
    API-->>G: sos:audio (final)
```

## 6. Guardian Contact Check

```mermaid
sequenceDiagram
    autonumber
    participant U as Walker
    participant A as Mobile app
    participant API as Backend
    participant DB as PostgreSQL

    U->>A: Type contact name, phone and e-mail
    A->>API: GET /api/sos/check-guardian?email=...
    API->>API: Rate limit 30 per 15 min
    API->>DB: findByEmail, then findByPhone
    DB-->>API: user or none
    API-->>A: member or not
    A-->>U: "Safora member: in-app alerts and audio" or "Direct SMS only"
    U->>A: Save
    A->>API: POST /api/sos/contacts
    API->>DB: INSERT trusted_contact
```

## 7. Hazard Moderation

```mermaid
sequenceDiagram
    autonumber
    participant S as Staff member
    participant ADM as Admin console
    participant API as Backend
    participant DB as PostgreSQL
    participant C as Cache

    S->>ADM: Select reports, choose "fake" and add notes
    ADM->>API: PATCH /api/reports/:id/moderate (staff JWT)
    API->>API: Role check (admin or moderator)
    API->>DB: UPDATE status, resolution_notes
    API->>C: Invalidate "reports_"
    API-->>ADM: Updated report
    Note over DB: Reports that are not active no longer count in the score
```

## 8. Watchdog Trigger by the External Scheduler

```mermaid
sequenceDiagram
    autonumber
    participant CR as cron-job.org
    participant API as Backend (Render)
    participant WD as Watchdog service
    participant DB as PostgreSQL

    loop every 60 s
        CR->>API: POST /api/internal/tick (X-Internal-Secret)
        alt wrong or missing secret
            API-->>CR: 401, no body detail
        else valid
            API->>WD: Scan now
            WD->>DB: Read active journeys if needed
            WD-->>API: scanned, escalated
            API-->>CR: 200 {scanned, escalated}
        end
    end
    Note over API: The request also keeps the free instance awake.<br/>The in-process 30 s tick keeps running while the process is alive.
```
