# SAFORA — Shared TypeScript Types

The `@safora/shared-types` package defines the universal TypeScript interfaces, schemas, and enums shared across the entire SAFORA monorepo (`apps/backend`, `apps/frontend`, and `apps/mobile`).

---

## Shared Domains

- **User & Auth**: User profiles, roles (`user`, `guardian`, `dispatcher`, `admin`), JWT session payloads, login/registration schemas.
- **Hazards & Reports**: Hazard categories (`lighting`, `harassment`, `waterlogging`, `isolated`, `infrastructure`, `other`), verification statuses, severity levels (1–5).
- **Journeys & Safe Walk**: Journey statuses (`active`, `completed`, `deviated`, `escalated`), corridor configuration, breadcrumb coordinate frames.
- **SOS Alerts & Evidence**: Emergency alert payloads, dual-pipe audio chunk structures, siren settings, rescue metadata.
- **Sockets & Telemetry**: WebSocket event definitions for journey tracking, live escort streams, and SOS dispatches.

---

## Build

To compile the TypeScript declaration files (`dist/index.d.ts` and `dist/index.js`):
```bash
npm run build --workspace=packages/shared-types
```
