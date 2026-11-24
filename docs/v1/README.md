# Safora Documentation – Version 1

> **Status: complete.** Version 1 is the college-submission release of Safora. All six objectives of the synopsis are implemented, deployed and verified (104 automated tests and 143 field test cases, all passing).

## Summary

Safora is a community safety platform for students and women in campus and urban settings. Users report hazards on a map, and the reports are turned into a live safety score and heat map. A user can start a **Safe Walk**: the live location is shared with trusted contacts, and if the walker leaves the planned corridor and does not confirm safety, the server raises an alert automatically. A one-tap **SOS** sends the position and battery level at once, streams 30 seconds of audio to guardians and dispatchers while it is being recorded, and can sound a siren. All spatial queries run on PostgreSQL with PostGIS. The mobile app is React Native with a native Kotlin foreground service, the backend is Node.js and Express with Socket.IO, and a React admin console lets staff moderate reports and monitor walks and alerts.

## Document Index

| Document | Contents |
|---|---|
| [`srs.md`](./srs.md) | Functional and non-functional requirements with identifiers |
| [`use-cases.md`](./use-cases.md) | Actors, use case diagram and specifications |
| [`architecture.md`](./architecture.md) | System context, data flow diagrams (levels 0 to 2), core flows, watchdog, foreground service, deployment |
| [`sequence-diagrams.md`](./sequence-diagrams.md) | Sign-in, reporting, score, Safe Walk, SOS, guardian check, moderation, scheduler |
| [`state-machines.md`](./state-machines.md) | Life cycles of reports, journeys, deviations, SOS, audio, sessions and contacts |
| [`api.md`](./api.md) | Every REST endpoint and Socket.IO event, with request and response shapes |
| [`database.md`](./database.md) | Tables, entity-relationship diagram, indexes, migration script |
| [`data-dictionary.md`](./data-dictionary.md) | Enumerations, fields, payloads and constants |
| [`safety-algorithms.md`](./safety-algorithms.md) | Safety score, clustering, corridor check, deviation escalation |
| [`dual-pipe-audio-streaming.md`](./dual-pipe-audio-streaming.md) | Live audio slicing, master archival, server rescue, hardening phases |
| [`mobile-app-features.md`](./mobile-app-features.md) | Screen-by-screen feature list and file map |
| [`admin-panel.md`](./admin-panel.md) | Admin console pages and dispatcher tools |
| [`roles-and-permissions.md`](./roles-and-permissions.md) | Permission matrix and how access is enforced |
| [`security-and-privacy.md`](./security-and-privacy.md) | Controls delivered, data handled, known gaps |
| [`tech-stack.md`](./tech-stack.md) | Technologies, versions, hosting, code size |
| [`setup.md`](./setup.md) | V1-specific setup steps |
| [`operations-runbook.md`](./operations-runbook.md) | Deployment, routine checks, incident playbook, backups |
| [`performance-testing.md`](./performance-testing.md) | Load, stress, spike, soak, and volume testing, API latencies, market benchmarks |
| [`testing-and-submission.md`](./testing-and-submission.md) | Test strategy, automated suites, field verification, demonstration script |
| [`tasks.md`](./tasks.md) | Delivery record of the V1 work items |
| [`safora-v1-features-industry-research.md`](./safora-v1-features-industry-research.md) | Feature comparison with existing platforms |
| [`../v1_manual_testing_checklist.md`](../v1_manual_testing_checklist.md) | The 143-case field checklist |

## Scope

| In V1 | Not in V1 |
|---|---|
| Hazard reporting, score, heat map, clusters | Account hardening, e-mail, refresh tokens (V2) |
| Safe Walk with live guardian view and server watchdog | Lost-contact, overdue-arrival and check-in rules (V2) |
| Foreground service, lock-screen tracking and audio | No-unlock SOS triggers, volume-key and tile triggers (V2) |
| Dual-pipe SOS audio, siren, SMS fallback, decoys | Chat, medical card, Hindi content (V2) |
| Admin console with live radar and dispatcher tools | Per-mode routing and voice guidance (V2) |
| Google Sign-In, terms and age notice | AI routing, mesh messaging, image detection, voice trigger (V3) |

## Known Limitations (stated openly)

- Android only.
- The three travel modes share the same road geometry; times differ by mode.
- Guardian model is simplified: a contact with a Safora account sees the walk without an acceptance step.
- The free-tier backend can sleep; the scheduled tick keeps the watchdog alive but does not remove the first-request delay.
- The offline map cache prefetches raster tiles, which the tile provider discourages for bulk use.
- Tokens are stored in AsyncStorage without secure hardware storage.

## Related Documentation

[`../v2/README.md`](../v2/README.md) describes the product roadmap and [`../v3/README.md`](../v3/README.md) the research items.
