# SAFORA — System Architecture Document

## 1. Executive Overview

**SAFORA** is a community-driven safety and emergency assistance platform tailored for urban and campus environments. It empowers individuals through:
- **Crowdsourced Hazard Reporting**: Real-time reporting of infrastructure and safety hazards (e.g., poor lighting, road hazards, waterlogging, harassment hotspots).
- **Safety Heatmaps**: PostGIS-powered geospatial scoring indicating risk levels in real time.
- **Safe Walk Mode**: Live journey tracking with intelligent route deviation detection and automated escalation.
- **One-Tap Emergency SOS**: Instant location broadcasting to trusted contacts and responders.

```mermaid
flowchart TD
    subgraph ClientLayer ["Mobile Client Tier (React Native + TypeScript)"]
        UI["Mobile App UI<br/>(Screens: Home, Map, SafeWalk, SOS)"]
        Zustand["Global State & Storage<br/>(Zustand + AsyncStorage)"]
        LocService["Location Engine<br/>(GPS Watcher / Background Tracking)"]
        UI --> Zustand
        UI --> LocService
    end

    subgraph APILayer ["Backend Application Tier (Node.js + Express + TypeScript)"]
        Gateway["HTTP REST & WebSocket Gateway<br/>(Express + Socket.IO)"]
        AuthModule["Auth & Security Guard<br/>(JWT + bcrypt + Helmet)"]
        ReportModule["Hazard Ingestion & DBSCAN Clustering"]
        SafeWalkModule["Journey Corridor Monitor & Deviation Engine"]
        SOSModule["Emergency SOS Dispatcher"]
        
        Gateway --> AuthModule
        Gateway --> ReportModule
        Gateway --> SafeWalkModule
        Gateway --> SOSModule
    end

    subgraph DataLayer ["Data & Spatial Tier (PostgreSQL + PostGIS)"]
        PG[("PostgreSQL 15+ Database")]
        PostGIS["PostGIS Spatial Engine<br/>(Geography Point 4326 + GiST Indexes)"]
        PG --- PostGIS
    end

    subgraph ExternalServices ["External Infrastructure"]
        FCM["Firebase Cloud Messaging (FCM)<br/>(Push Notifications)"]
        Cloudinary["Cloudinary CDN<br/>(Hazard Photo Storage)"]
    end

    ClientLayer <==>|"HTTPS (REST) & WSS (Socket.IO)"| Gateway
    ReportModule -->|"ST_DWithin & ST_ClusterDBSCAN"| PG
    SafeWalkModule -->|"Corridor Queries & Journey Log"| PG
    SOSModule -->|"Incident Insert"| PG
    AuthModule -->|"User Credential Validation"| PG
    
    SOSModule -->|"Dispatch Alert Payload"| FCM
    SafeWalkModule -->|"Escalation Warning Push"| FCM
    ReportModule -.->|"Store Image URL"| Cloudinary
```

---

## 2. Monorepo Structure

The project is managed as an npm workspace monorepo:

```
safora/
├── apps/
│   ├── backend/                # Express + TypeScript API server
│   │   ├── src/
│   │   │   ├── config/         # Database pool, diagnostics, environment
│   │   │   ├── controllers/    # Route controllers (auth, reports)
│   │   │   ├── middleware/     # Auth guards, validation, rate limiting
│   │   │   ├── routes/         # Express routers
│   │   │   └── app.ts          # Server bootstrap & Socket.IO initialization
│   │   └── package.json
│   │
│   └── mobile/                 # React Native mobile application
│       ├── android/            # Android native Gradle project (New Arch / Fabric)
│       ├── src/
│       │   ├── screens/        # UI screens (Home, Map, SafeWalk, Profile, Auth)
│       │   ├── navigation/     # RootNavigator (Native Stack)
│       │   ├── services/       # API client (Axios), location service
│       │   ├── store/          # Global state (Zustand)
│       │   └── theme/          # Typography, colors, spacing
│       └── package.json
│
├── packages/
│   └── shared-types/           # Shared TypeScript contracts & interfaces
│       ├── src/
│       │   └── index.ts        # User, HazardReport, TrustedContact
│       └── package.json
│
└── docs/                       # Technical documentation & project blueprints
```

---

## 3. Core Subsystems

### 3.1 Mobile Client Subsystem
- **Engine**: React Native 0.87.1 running the **Hermes** JavaScript engine with **New Architecture (Fabric)** enabled.
- **State Management**: **Zustand** stores for lightweight, decoupled authentication and active journey state.
- **Mapping & Geolocation**:
  - `react-native-maps` for interactive vector map rendering.
  - Native geolocation providers for coordinate retrieval and live coordinate streaming.
- **Navigation**: `@react-navigation/native-stack` offering native platform transitions between onboarding, authentication, and core safety features.

### 3.2 Backend API & Real-Time Gateway
- **Framework**: Express.js with strict TypeScript compilation.
- **Security & Headers**: `helmet` for secure HTTP headers, `cors` configured for mobile API clients.
- **Real-Time Layer**: `socket.io` for bi-directional streaming of live walker coordinates and real-time hazard updates.
- **Authentication**: Stateless JSON Web Tokens (`jsonwebtoken`) with salted `bcryptjs` password hashing.

### 3.3 Database & Spatial Layer
- **Engine**: PostgreSQL 15+ with the **PostGIS** extension.
- **Coordinate Handling**: Geospatial points stored using `geography(Point, 4326)` for geodetic, spheroidal calculations without planar distortion.
- **Spatial Indexing**: GiST indexes on spatial columns for high-throughput $O(\log N)$ bounding-box and radius queries (`ST_DWithin`).

---

## 4. Data Flow Diagrams (DFD)

### 4.1 DFD Level 0 — System Context Diagram

The Level 0 context diagram models the information boundary between external entities and the central SAFORA system.

```mermaid
flowchart TD
    User["👤 Mobile User / Walker"]
    Contacts["👥 Trusted Emergency Contacts"]
    Admin["🛡️ System Administrator"]
    FCMService["📱 Push Notification Gateway (FCM)"]

    System(("0.0<br/>SAFORA Community Safety<br/>& Safe Walk System"))

    User -->|"Credentials, Profile Info"| System
    User -->|"Hazard Reports (Category, Severity, Coordinates, Photos)"| System
    User -->|"Live GPS Route & Waypoints (Safe Walk)"| System
    User -->|"Emergency Trigger (One-Tap SOS)"| System

    System -->|"Auth Token & Safety Heatmap Overlays"| User
    System -->|"Nearby Hazard Alerts & Route Warnings"| User
    System -->|"Emergency Alert Notification & Tracking Link"| FCMService
    FCMService -->|"Loud Alarm & SMS / Push Dispatch"| Contacts

    Contacts -->|"View Walker's Live Location Stream"| System

    Admin -->|"Moderation Decisions (Approve, Reject, Flag Duplicate)"| System
    System -->|"System Diagnostics & Incident Analytics"| Admin
```

---

### 4.2 DFD Level 1 — Decomposed Functional System Diagram

The Level 1 DFD decomposes the system into core operational processes and shows their read/write interactions with PostGIS data stores.

```mermaid
flowchart TD
    %% External Entities
    User["👤 Mobile User"]
    Contacts["👥 Trusted Contacts"]
    Admin["🛡️ Administrator"]
    FCM["📱 Firebase Cloud Messaging"]

    %% Processes
    P1(("1.0<br/>User Authentication<br/>& Session Management"))
    P2(("2.0<br/>Hazard Ingestion,<br/>Validation & Clustering"))
    P3(("3.0<br/>Safe Walk Tracking<br/>& Corridor Verification"))
    P4(("4.0<br/>Emergency SOS<br/>Alert Processing"))
    P5(("5.0<br/>Heatmap & Safety<br/>Score Calculation"))
    P6(("6.0<br/>Moderation & System<br/>Diagnostics"))

    %% Data Stores
    D1[("D1: Users Store")]
    D2[("D2: Hazard Reports Store (PostGIS)")]
    D3[("D3: Journeys Store")]
    D4[("D4: SOS Alerts Store")]
    D5[("D5: Trusted Contacts Store")]

    %% P1 Auth Flow
    User -->|"Login / Signup Request"| P1
    P1 <-->|"Verify & Store User Records"| D1
    P1 -->|"Issue JWT Token"| User

    %% P2 Hazard Reporting
    User -->|"Submit Hazard (lat, lng, cat, severity)"| P2
    P2 -->|"Sanitize & Insert Report"| D2
    P2 -->|"Broadcast New Hazard"| User

    %% P5 Safety Score & Heatmap
    User -->|"Query Bounds / Radius"| P5
    D2 -->|"Fetch Active Hazards (ST_DWithin)"| P5
    P5 -->|"Calculated Score & Heatmap Tiles"| User

    %% P3 Safe Walk
    User -->|"Start Journey (Origin, Destination, Route)"| P3
    P3 -->|"Record Journey Session"| D3
    D5 -->|"Read Assigned Contacts"| P3
    User -->|"Stream GPS Points"| P3
    P3 -->|"Check Corridor Buffer (ST_DWithin)"| D3
    P3 -.->|"Deviation Warning / Countdown"| User
    P3 -->|"Escalate Unresponsive Timeout"| FCM

    %% P4 SOS
    User -->|"Trigger SOS Alert"| P4
    P4 -->|"Log Emergency Incident"| D4
    D5 -->|"Lookup Contact Phones/Tokens"| P4
    P4 -->|"Dispatch Emergency Payload"| FCM
    FCM -->|"Emergency Alert"| Contacts

    %% P6 Moderation & Admin
    Admin -->|"Review / Update Report Status"| P6
    P6 <-->|"Update Report Flags / Query Logs"| D2
    P6 -->|"Analytics & Health Metrics"| Admin
```

---

## 5. Architectural Sequence Flows

### 5.1 Hazard Reporting & Distribution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Mobile App (User)
    participant API as Backend API
    participant DB as PostgreSQL + PostGIS
    actor Others as Other Active Users

    User->>API: POST /api/reports (coords, category, severity, description)
    API->>API: Validate input & sanitize free text
    API->>DB: INSERT INTO reports (location, category, ...)
    DB-->>API: Created record
    API-->>User: 201 Created (Report Object)
    API->>Others: Socket.IO broadcast "report:new"
```

### 5.2 Safe Walk & Deviation Alerting Flow

```mermaid
sequenceDiagram
    autonumber
    actor Walker as Walker
    participant App as Mobile App
    participant Svc as Backend Socket / API
    actor Contact as Trusted Contact

    Walker->>App: Start Safe Walk (Destination, Contacts selected)
    App->>Svc: POST /api/journeys/start
    loop Every 5-10 seconds
        App->>Svc: Send location update (lat, lng)
        Svc->>Svc: Calculate distance from expected corridor
    end
    alt Deviation Detected (> 150m off route)
        Svc->>App: Emit "journey:warning"
        App->>Walker: Display "Are you safe?" prompt (60s timer)
        alt User confirms "I am okay"
            Walker->>App: Confirm safe
            App->>Svc: POST /api/journeys/:id/confirm-safe
        else Timer expires without response
            Svc->>Contact: Dispatch High-Priority Push / SMS Alert
        end
    end
```

### 5.3 Emergency One-Tap SOS Flow

```mermaid
sequenceDiagram
    autonumber
    actor Victim as User in Distress
    participant App as Mobile App
    participant Svc as Backend API
    participant FCM as Firebase Cloud Messaging
    actor Contacts as Trusted Contacts

    Victim->>App: Press & hold SOS button (1.5s)
    App->>App: Capture high-accuracy GPS fix
    App->>Svc: POST /api/sos (coords, battery, timestamp)
    Svc->>Svc: Store SOS alert record in DB
    Svc->>FCM: Dispatch emergency notification payload
    FCM->>Contacts: Deliver loud notification with live tracking URL
    Svc-->>App: 200 OK (SOS Active)
```

---

## 6. Security & Privacy Considerations

1. **Ephemeral Journey Data**: Location history collected during Safe Walk is strictly used for route compliance and is purged or anonymized once the journey is marked `completed` or `cancelled`.
2. **Contact Protection**: Trusted contact phone numbers and notifications are transmitted over TLS; contacts receive temporary tracking links that expire when the session finishes.
3. **Abuse Mitigation**:
   - Rate limiting on report submissions to prevent spam.
   - Text filtering on user-submitted hazard descriptions to block personal identification or doxxing.
   - Confidence scoring: unverified single reports require community confirmation before affecting primary safety scores.
