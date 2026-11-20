# Software Requirements Specification (SRS)

| | |
|---|---|
| **Product** | Safora – community safety and Safe Walk application |
| **Version** | V1 (as built) |
| **Purpose** | State what the delivered system does, in testable form, and provide stable requirement identifiers for tests and reports |
| **Related** | [Use cases](./use-cases.md) · [Requirements traceability](../requirements-traceability.md) · [Architecture](./architecture.md) |

Requirement identifiers have the form `FR-<area>-<n>` (functional) and `NFR-<area>-<n>` (non-functional). They are used in the traceability matrix and may be cited in the project report.

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements of Safora V1. It describes the system **as implemented**, so that every statement can be checked against the code, an automated test or a field test case.

### 1.2 Scope
Safora is an Android application with a web administration console and a backend service. It lets users report and view community hazards, obtain a safety score for a place, walk with live guardian monitoring and automatic escalation, and raise an emergency alert with audio evidence.

Out of scope for V1 (documented in [`../v2/`](../v2/README.md) and [`../v3/`](../v3/README.md)): iOS, e-mail workflows, verified guardian invitations, per-mode routing, voice guidance, no-unlock triggers, chat, a medical card, and any machine-learning feature.

### 1.3 Definitions
See the [glossary](../glossary.md). Key terms: *corridor*, *deviation*, *watchdog*, *guardian*, *SOS slice*, *master file*.

### 1.4 Users and roles

| Role | Description |
|---|---|
| Guest | Browses the map and scores without an account. Cannot report, walk or raise an SOS |
| Citizen | Registered user: reports hazards, uses Safe Walk and SOS, manages trusted contacts |
| Guardian | A Citizen who is a trusted contact of another user. A relationship, not a separate role |
| Moderator | Staff member who moderates reports and handles alerts |
| Admin | Staff member with all moderator rights plus user, role and system management |

## 2. Overall Description

### 2.1 System context
See the context diagram in [Architecture §2](./architecture.md#2-system-context). The system consists of the mobile application, the backend (REST API, Socket.IO gateway, watchdog, audio stitcher), a PostgreSQL/PostGIS database and the admin console. It relies on Firebase Cloud Messaging, Cloudinary, OSRM, Photon and MapTiler, OpenStreetMap and Esri tiles, and Google Sign-In.

### 2.2 Assumptions and dependencies
- The user's phone runs Android and has GPS. Hazard viewing needs a data connection, with an offline cache for the area around the user.
- Guardians must have a Safora account to receive in-app alerts and live audio; other contacts receive a direct SMS only.
- Free-tier hosting is used. A sleeping instance can delay a user's first request.
- Android does not allow silent SMS sending, so the SMS fallback needs the user to confirm the send.

### 2.3 Constraints
Open-source components and free-tier services only; Android only; no payment for map, routing or push services.

## 3. Functional Requirements

### 3.1 Accounts and sessions (AUTH)

| ID | Requirement |
|---|---|
| FR-AUTH-1 | A user shall be able to register and sign in with an e-mail address and password. Passwords shall be stored as bcrypt hashes (10 rounds) |
| FR-AUTH-2 | A user shall be able to sign in with Google. The server shall verify the Google ID token and link it to an existing account with the same e-mail address, without creating a duplicate |
| FR-AUTH-3 | The application shall offer a guest mode with read-only access to the map and scores |
| FR-AUTH-4 | A session shall be a JWT valid for 7 days. The application shall restore the session on start-up without showing the login screen |
| FR-AUTH-5 | The system shall distinguish the roles citizen, moderator and admin and shall enforce them on every protected route |
| FR-AUTH-6 | After registration the application shall show a terms and age notice once, record the acknowledgement and the age, and shall not use it to block access |
| FR-AUTH-7 | A signed-in user shall be able to change their password after entering the current one |
| FR-AUTH-8 | Registration and login shall be rate limited per e-mail address and per IP address |

### 3.2 Hazard reporting (HAZ)

| ID | Requirement |
|---|---|
| FR-HAZ-1 | A signed-in user shall be able to report a hazard with a category (lighting, road hazard, waterlogging, isolated area, traffic, other), a severity from 1 to 5, a description, a location and an optional photo |
| FR-HAZ-2 | A photo shall be taken with the camera or chosen from the gallery, limited to 5 MB and to image types, and stored in cloud storage |
| FR-HAZ-3 | When the device is offline, the application shall keep the report in local storage and shall submit it automatically when the connection returns; a banner and a manual action shall be available |
| FR-HAZ-4 | The system shall limit each user to 20 hazard reports per 15 minutes |
| FR-HAZ-5 | Any signed-in user other than the reporter shall be able to confirm a report. Confirmations shall raise its weight in the score up to five confirmations |
| FR-HAZ-6 | Public report responses shall not contain the reporter's user id, name or e-mail. Staff responses shall |
| FR-HAZ-7 | A moderator or admin shall be able to set a report to active, resolved, duplicate or fake and to add resolution notes, individually or in batches |
| FR-HAZ-8 | The latest nearby hazards shall be cached on the device for offline viewing |

### 3.3 Safety score, clusters and map (SCORE)

| ID | Requirement |
|---|---|
| FR-SCORE-1 | The system shall compute a safety score from 0 to 100 for a location from the active reports within a search radius (default 1000 m), using severity weights, distance falloff, recency decay and the confirmation multiplier defined in [Safety algorithms](./safety-algorithms.md) |
| FR-SCORE-2 | The score shall be classified as safe (80 or more), moderate (50 to 79) or high risk (below 50) |
| FR-SCORE-3 | If the score request fails, the application shall show a retry state and shall never display an invented score |
| FR-SCORE-4 | The system shall group active reports by density (DBSCAN, ε = 0.003°, minimum 2 points) and the map shall show each cluster with a size and severity-based style |
| FR-SCORE-5 | Nearby-report and cluster results shall be cached for 20 and 30 seconds, and the cache shall be invalidated when a report is created, moderated or confirmed |
| FR-SCORE-6 | The map shall offer several base layers and filter chips by hazard category |

### 3.4 Routing and search (ROUTE)

| ID | Requirement |
|---|---|
| FR-ROUTE-1 | The application shall show a route preview between two places with an estimated time for walking, two-wheeler and car. Times shall be computed from calibrated speeds (1.60, 8.88 and 7.22 m/s with buffers) |
| FR-ROUTE-2 | The application shall search places with proximity bias and shall fall back to a second provider if the first fails |
| FR-ROUTE-3 | The application shall pre-cache map tiles for a radius of about 10 km around the user for offline viewing |

### 3.5 Safe Walk (WALK)

| ID | Requirement |
|---|---|
| FR-WALK-1 | A user shall be able to start, complete and cancel a Safe Walk. Completing a walk shall require a deliberate hold of 1.5 seconds |
| FR-WALK-2 | During a walk the application shall send the position to the server about every 3 seconds or 5 metres and shall store each position as a breadcrumb |
| FR-WALK-3 | A trusted contact who is a Safora user shall see the walker's live position on a map |
| FR-WALK-4 | The server shall compute the distance from each position to the planned route. The corridor threshold shall default to 150 m and staff shall be able to set it between 20 and 1000 m |
| FR-WALK-5 | When the walker leaves the corridor, the application shall show a 60-second "Are you OK?" prompt with haptic feedback, and the server shall record the deviation time |
| FR-WALK-6 | A walker shall be able to confirm safety, which clears the deviation |
| FR-WALK-7 | If the deviation is older than 60 seconds and has not been confirmed, a server-side watchdog running every 30 seconds shall create an SOS alert with source "watchdog", notify the guardians and do so only once per deviation |
| FR-WALK-8 | The watchdog shall run even if the phone is switched off, the app is killed or the connection is lost |
| FR-WALK-9 | Tracking shall continue with the screen locked, using a foreground service with a persistent notification showing distance and estimated time |
| FR-WALK-10 | The application shall request an exemption from vendor battery optimisation and shall show a status and a vendor-specific guide |
| FR-WALK-11 | A journey without a destination shall never be flagged as deviated, and a journey without a route polyline shall be measured against the straight line to the destination |

### 3.6 SOS and evidence (SOS)

| ID | Requirement |
|---|---|
| FR-SOS-1 | A user shall be able to raise an SOS with one tap. A 5-second cancel countdown shall precede dispatch |
| FR-SOS-2 | The alert shall be created immediately with position, battery level and a reverse-geocoded area name and shall be rate limited to 10 per minute |
| FR-SOS-3 | The system shall find the guardians by e-mail address or phone number and send them high-priority push notifications with a map link |
| FR-SOS-4 | The application shall record 30 seconds of audio at 16 kHz, 16-bit mono, split it into six 5-second slices and send each slice to the server while recording continues, and shall also save an unbroken master file |
| FR-SOS-5 | The server shall relay each slice immediately to the administrators and to the guardians, who shall be able to play the slices in order |
| FR-SOS-6 | On completion the application shall upload the master file; the server shall then store it as the evidence and discard the staged slices |
| FR-SOS-7 | If no slice arrives for 8 seconds, the server shall assemble the received slices into a valid WAV file and store it as partial evidence |
| FR-SOS-8 | Audio recording shall continue with the screen locked (foreground service) |
| FR-SOS-9 | A user shall be able to choose a loud siren (looping, alarm stream, maximum volume) or a silent (stealth) SOS, and shall have a standalone panic-siren button that notifies nobody |
| FR-SOS-10 | When there is no internet, the application shall open a pre-filled SMS containing the coordinates, battery level, area name and a map link; the user shall confirm the send |
| FR-SOS-11 | A user shall be able to manage trusted contacts (name, phone, e-mail). The application shall show whether a contact is a Safora member or will receive a direct SMS only |
| FR-SOS-12 | A user shall be able to run a Test SOS drill that exercises the in-app alert without raising a real alarm |
| FR-SOS-13 | A guardian shall see a full-screen alert with vibration, live audio slices, a map button, a call button for the walker and a call button for 112 |
| FR-SOS-14 | The application shall provide a Safety Alerts Centre with an unread counter, card views and a 30-second audio player |
| FR-SOS-15 | The application shall provide a calculator decoy in which a duress PIN starts a silent SOS, and a simulated incoming call |

### 3.7 Administration (ADM)

| ID | Requirement |
|---|---|
| FR-ADM-1 | The admin console shall accept staff accounts only |
| FR-ADM-2 | The dashboard shall show key figures, a map and an API latency measurement, and each card shall open its module |
| FR-ADM-3 | The SOS page shall list all alerts, including watchdog alerts, allow status changes and play live and archived audio |
| FR-ADM-4 | The hazard page shall allow filtering, moderation, batch actions and photo inspection |
| FR-ADM-5 | The Safe Walks page shall show active walkers with breadcrumb trails and an explicit empty state when no walk is active. It shall never show sample data |
| FR-ADM-6 | An admin shall be able to change a user's role and status |
| FR-ADM-7 | Staff shall be able to change the corridor threshold from the settings page |
| FR-ADM-8 | The diagnostics page shall test PostGIS, Cloudinary, Firebase, MapTiler, the geocoder and the API with measured latency |
| FR-ADM-9 | The console shall provide a command palette, a keyboard-shortcut manual, an offline-failover banner, an alert mute switch, a photo lightbox and range selection |

## 4. Non-Functional Requirements

### 4.1 Reliability and safety

| ID | Requirement |
|---|---|
| NFR-REL-1 | Escalation of an unconfirmed deviation shall not depend on the phone: the watchdog shall run on the server and escalate 60 to 90 seconds after the deviation |
| NFR-REL-2 | Loss of the socket shall not stop tracking or escalation, because position updates use REST and the watchdog uses stored state |
| NFR-REL-3 | Partial audio shall be preserved if the phone stops transmitting during an SOS |
| NFR-REL-4 | After a backend restart the watchdog shall rebuild its list of active journeys from the database |
| NFR-REL-5 | A failed push delivery shall not prevent the alert from appearing in the staff queue |
| NFR-REL-6 | The system shall never present fabricated data (score, sample journeys) to the user |

### 4.2 Security and privacy

| ID | Requirement |
|---|---|
| NFR-SEC-1 | All client–server traffic shall use HTTPS or secure WebSockets |
| NFR-SEC-2 | Protected routes shall verify the JWT and the role. Ownership shall be checked for journeys, alerts and audio |
| NFR-SEC-3 | Rate limits shall apply to registration, login, report creation, SOS, audio slices, audio upload, guardian checks and drills (see [API §10](./api.md#10-rate-limits)) |
| NFR-SEC-4 | The internal watchdog endpoint shall require a shared secret and shall answer 401 without further detail on failure |
| NFR-SEC-5 | Secrets shall not be committed or compiled into the application. The geocoding key shall be used only on the server |
| NFR-SEC-6 | Input shall be validated on the server with schemas |
| NFR-SEC-7 | The application shall not claim to replace emergency services and shall make 112 one tap away |

### 4.3 Performance

| ID | Requirement |
|---|---|
| NFR-PERF-1 | Repeated map and score queries within the cache window shall be answered from memory without a database query |
| NFR-PERF-2 | The corridor check shall run in memory and shall not need a spatial query per GPS update |
| NFR-PERF-3 | Spatial queries shall use a GiST index on the geography column |
| NFR-PERF-4 | Live audio slices shall be small enough for weak networks (compressed with Opus or AAC where the device supports it) |

### 4.4 Usability and accessibility

| ID | Requirement |
|---|---|
| NFR-USE-1 | First-time users shall see a four-slide onboarding that can be skipped |
| NFR-USE-2 | Emergency actions shall be reachable in few steps and shall be cancellable during the countdown |
| NFR-USE-3 | Numbers that change continuously (time, speed, coordinates) shall use tabular figures to avoid jitter |
| NFR-USE-4 | Errors shall be shown as clear states (loading, error with retry, empty) and not as blank screens |
| NFR-USE-5 | Android hardware back navigation shall step back through search results, cards and tabs, with a double tap to exit on the home screen |

### 4.5 Maintainability and quality

| ID | Requirement |
|---|---|
| NFR-MNT-1 | The code base shall be a TypeScript monorepo with shared types between backend, admin console and mobile application |
| NFR-MNT-2 | The backend shall be layered into routes, controllers, services and repositories |
| NFR-MNT-3 | Automated tests shall run on every push and pull request (104 tests at V1) |
| NFR-MNT-4 | The documentation shall be kept consistent with the code (see [engineering standards](../engineering-standards.md)) |

### 4.6 Cost and portability

| ID | Requirement |
|---|---|
| NFR-COST-1 | The system shall run on free tiers of hosting, database, push and media services |
| NFR-COST-2 | Map, routing and geocoding services shall be open-source or free of charge |

## 5. External Interfaces

| Interface | Detail |
|---|---|
| Mobile ↔ backend | REST (JSON) and Socket.IO. See [API](./api.md) |
| Admin console ↔ backend | REST and Socket.IO |
| Backend ↔ database | PostgreSQL with PostGIS through `pg` |
| Backend ↔ Firebase | Firebase Admin SDK, high-priority messages |
| Backend ↔ Cloudinary | Upload of photos and audio |
| Mobile ↔ Google | Google Sign-In account picker |
| Mobile ↔ routing and search | OSRM, Photon, MapTiler |
| Scheduler ↔ backend | `POST /api/internal/tick` with a shared secret |

## 6. Acceptance

Each requirement is verified by at least one of the 104 automated tests or the 143 field test cases. The mapping is in the [traceability matrix](../requirements-traceability.md).
