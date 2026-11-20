# Changelog

All notable changes of the delivered system. The format follows *Keep a Changelog*; work item identifiers refer to [`v1/tasks.md`](v1/tasks.md).

## [1.0.0] – 20 November 2026 (V1 release)

Release build: 34,118,032 bytes, arm64-v8a, verified 20 November 2026.

### Added
- **Safe Walk live tracking:** breadcrumb storage, a Socket.IO client, a live guardian view and a live admin radar (TRK-1, TRK-2, SYN-4).
- **Server-side watchdog:** 30-second tick, 60-second grace, `confirm-safe`, once-per-deviation escalation with source `watchdog`, and a protected `/api/internal/tick` endpoint (SYN-5).
- **Configurable corridor:** default 150 m, range 20–1000 m, staff API and settings page.
- **Foreground service** for lock-screen tracking, a persistent distance and ETA notification, and a vendor battery-exemption guide (TRG-2-lite, NAV-1).
- **Dual-pipe SOS audio:** live 5-second slices, local master file, server rescue after 8 seconds, ordered playback with a jitter buffer, clarity filter and Opus or AAC compression (TRG-6-lite, DUAL-PIPE-1).
- **Siren and stealth mode**, standalone panic-siren button, guardian live SOS screen and Safety Alerts Centre.
- **Google Sign-In** with account linking (AUTH-17); **terms and age notice** (AGE-lite, PUB-1-lite).
- **Camera and gallery photo picker** for reports (SYN-3); **heat-map layer** from clusters (SYN-2).
- **Admin dispatcher tools:** command palette, shortcut manual, offline-failover banner, alert mute, evidence lightbox, range selection.
- **Mobile interface modernisation** in five phases (UI-16).
- **Rate limits** for registration, login, reports, SOS, audio slices, audio upload, guardian checks and drills.
- **Automated tests:** 104 tests in 15 suites, one command (`npm test`), run in CI.
- **Documentation** for V1, V2 and V3 with diagrams.

### Changed
- Public report responses no longer contain reporter identity; staff responses do (SEC-2).
- The safety score uses a 168-hour half-life with a floor of 0.25 (V0 used 24 hours without a floor).
- Report listing is paginated (default limit 500, maximum 1000).
- Overclaiming wording replaced with accurate statements and a "call 112" notice (SEC-4).
- Map canvas rendering fixes: staggered `invalidateSize`, resize observer, no 3D tilt (MAP-PERF).

### Removed
- The fabricated fallback safety score (SYN-1).
- Sample journeys in the admin radar (SEC-9).
- The reliance on the JavaScript thread for emergency audio delivery.

### Fixed
- Login screen flicker after resuming the app (rehydration splash).
- Android back navigation now steps through search results, cards and tabs.
- Hold-to-complete text truncation on small densities.

### Security
- Internal tick endpoint protected by a shared secret.
- Geocoding key kept on the server.
- Parameterised SQL and schema validation on request input.

### Known limitations
Android only; one road geometry for all modes; simplified guardian model; free-tier hosting can sleep; no refresh tokens or secure token storage. See the [project status](project-status.md).

## Planned

[**2.0**](v2/roadmap.md): guardian handshake, e-mail, session hardening, complete watchdog, per-mode routing and voice, no-unlock triggers, chat, medical card, compliance. [**3.x**](v3/README.md): research items.
