# Glossary

Terms used across the Safora documentation, in alphabetical order.

| Term | Meaning |
|---|---|
| **Abuse flag** | A moderator's report that an account behaves abusively; an admin decides. Planned for V2 (`SEC-10`) |
| **ADR** | Architecture Decision Record. A short document that states a decision, its context and its consequences. See [`v2/architecture-decisions.md`](v2/architecture-decisions.md) |
| **AsyncStorage** | React Native key-value storage on the phone, used for the offline report queue, cached hazards, preferences and the session token in V1 |
| **bcrypt** | A slow password-hashing function. Safora uses 10 rounds |
| **Breadcrumb** | One stored GPS point of a walk (`journey_breadcrumbs`) |
| **CAD** | Computer-aided dispatch. Software in an emergency control room; also the style of the admin console's dispatcher tools |
| **CAP** | Common Alerting Protocol, an XML format for public warnings (used by India's Sachet system) |
| **Cluster** | A group of nearby hazard reports found by DBSCAN, shown as one marker |
| **Confirm-before-escalate** | The design in which the walker gets a short prompt to confirm safety before guardians are alerted |
| **Confirmation** | A vote by another user that a hazard report is genuine. It raises the report's weight, up to five |
| **Corridor** | The band of width θ around the planned route. Leaving it starts the deviation process. Default 150 m, configurable 20–1000 m |
| **DBSCAN** | Density-Based Spatial Clustering of Applications with Noise. Groups points that have at least *minpoints* neighbours within ε. Safora: ε = 0.003°, minpoints = 2 |
| **Decay (recency)** | The loss of a report's weight with age: `max(0.25, 2^(−t/168))`, t in hours |
| **Decoy** | A harmless-looking screen (calculator, fake call) that also lets the user start an SOS discreetly |
| **Deviation** | The state in which the walker is farther than θ from the route. Recorded as `deviated_at` |
| **DFD** | Data flow diagram. Shows processes, data stores, external entities and the data that flows between them |
| **Doze** | Android's power-saving mode, which suspends background work when the screen is off |
| **DPDP** | India's Digital Personal Data Protection Act 2023 and its Rules |
| **Dual-pipe audio** | Safora's SOS recording design: live 5-second slices (pipe 1) and a local lossless master file (pipe 2) |
| **Duress PIN** | A PIN that looks like a normal entry but silently starts an SOS (`9999=` in the V1 calculator decoy) |
| **ERSS / 112** | India's Emergency Response Support System and its single emergency number |
| **Escalation ladder** | V2 design: alerts go to guardians in priority tiers with a 2-minute wait between tiers |
| **ETA** | Estimated time of arrival |
| **FCM** | Firebase Cloud Messaging, the push-notification service |
| **Foreground service** | An Android service with a persistent notification that may keep running with the screen off. Safora's `SafeWalkService` tracks location and records audio with it |
| **Geography type** | PostGIS type that stores points as longitude and latitude on the Earth's ellipsoid; distances are in metres |
| **GiST index** | Generalised Search Tree index, used by PostGIS for fast spatial queries |
| **Guardian** | A trusted contact who receives a walker's alerts and live location. A relationship, not a role |
| **Heat map** | The map layer that shows hazard density through clusters |
| **Hermes** | The JavaScript engine used by React Native on Android |
| **Honest error state** | The rule that a failed request shows a retry state and never invented data |
| **Jitter buffer** | A short holding buffer that restores the order of audio slices that arrive out of sequence |
| **JWT** | JSON Web Token. A signed token that proves who the caller is. Safora: HS256, 7 days in V1 |
| **Master file** | The unbroken local recording of the 30-second SOS audio, uploaded when it ends |
| **Mermaid** | A text format for diagrams that GitHub renders. All diagrams in these documents use it |
| **Monorepo** | One repository containing several applications and shared packages (`apps/*`, `packages/*`) |
| **OSRM** | Open Source Routing Machine, used for routes |
| **Photon** | A geocoder built on OpenStreetMap data, used for place search |
| **PCM** | Pulse-code modulation: uncompressed digital audio. Safora records 16 kHz, 16-bit mono PCM |
| **PostGIS** | The spatial extension of PostgreSQL |
| **Public DTO** | The report representation without reporter identity. The staff DTO adds `userId`, `reporterName` and e-mail |
| **Rate limit** | A cap on the number of requests in a time window. Safora applies them per user or per IP |
| **Rescue watchdog** | The server timer (8 s) that stitches received audio slices if the phone stops transmitting |
| **Safe Walk** | A monitored walk with a planned route, live guardian view and automatic escalation |
| **Safety score** | The 0–100 value for a place computed from nearby active reports. Higher is safer |
| **Sachet** | India's national disaster-alert platform (CAP-based) |
| **Slice (audio)** | A 5-second piece of the SOS audio sent while recording continues |
| **SOS** | The emergency alert. Safora sends position, battery, area and audio, and can sound a siren |
| **Socket.IO** | A library for real-time two-way communication over WebSockets with fallbacks |
| **Stealth mode** | An SOS without sound (no siren) |
| **Tick** | One run of the watchdog. In-process every 30 s, and triggered externally every 60 s |
| **Tier** | A priority level (1 to 3) of a trusted contact in the V2 escalation ladder |
| **Trusted contact** | A person the user lists for alerts: name, phone and e-mail |
| **WebView** | An embedded browser component. Safora's Leaflet map runs in one |
| **Zod** | A TypeScript library for validating data against schemas |
