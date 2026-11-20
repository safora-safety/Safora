# API Reference – V2 Additions

> New and changed endpoints introduced in V2, on top of V1 ([`../v1/api.md`](../v1/api.md)). Request and response shapes, rules and rate limits are in the linked specification sections. This file is the index.

## 1. Authentication and Accounts

| Method | Path | Specification |
|---|---|---|
| POST | `/api/auth/verify-email/request` | [`accounts-email-local.md`](./accounts-email-local.md) §1 |
| POST | `/api/auth/verify-email/confirm` | §1 |
| POST | `/api/auth/forgot-password` | §1 |
| POST | `/api/auth/reset-password` | §1 |
| POST | `/api/auth/refresh` | §3 (session hardening) |
| POST | `/api/auth/logout` and `/api/auth/logout-all` | §3 |
| DELETE | `/api/auth/account` | §3 (SEC-6, account deletion) |
| POST | `/api/webhooks/brevo` | §1 (bounce handling) |
| GET, PUT, DELETE | `/api/me/medical-card` | §9 (MED-1) |
| POST | `/api/abuse-flags` | §8 (SEC-10) |
| PATCH | `/api/abuse-flags/:id` | §8 (admin only) |

## 2. Guardians

| Method | Path | Specification |
|---|---|---|
| POST | `/api/guardian/invites/:token/accept` | [`safety-and-tracking.md`](./safety-and-tracking.md) §1 |
| GET | `/api/guardian/links` | §1 |
| DELETE | `/api/guardian/links/:id` | §1 |
| POST | `/api/sos/contacts/:id/resend` | §1 |

## 3. Tracking, Watchdog and Check-Ins

These extend the minimal V1 versions.

| Method | Path | Specification |
|---|---|---|
| GET | `/api/journeys/:id/status` | §4 |
| POST | `/api/journeys/:id/tracking-links` | §5 (guardian web link, deferred) |
| DELETE | `/api/tracking-links/:id` | §5 |
| GET | `/api/track/:token` | §5 (public, rate limited) |
| POST | `/api/checkins` | §6 (Safety Check timer) |
| POST | `/api/checkins/:id/extend` and `/:id/resolve` | §6 |
| POST | `/api/sos/:id/sms-status` | §8 (on-device SMS delivery report) |
| POST | `/api/journeys/start` with `type = walk_with_me` | §6c (TRK-12) |
| CRUD | `/api/scheduled-walks` | §6d (TRK-13) |

Battery warnings (TRK-10) ride on the existing location-update payload and need no new endpoint (§6b).

## 4. Map, Search and Routing

| Method | Path | Specification |
|---|---|---|
| GET | `/api/geo/search` | [`map-routing-search.md`](./map-routing-search.md) §3 |
| POST | `/api/route` | §4 |
| GET | `/api/safe-places` (nearby) | §7 |

## 5. Chat (staged, CHT-1 to CHT-3)

| Interface | Specification |
|---|---|
| Socket room `chat:{id}` | [`safety-and-tracking.md`](./safety-and-tracking.md) §10 |
| POST `/api/contacts/:userId/request`, `/accept`, `/block` | §10 |
| GET `/api/threads/:id/messages` | §10 |
| POST `/api/threads/:id/messages` | §10 |

## 6. Admin and Staff

| Method | Path | Specification |
|---|---|---|
| POST | `/api/sos/:id/assign`, `/notes`, `/callback` | [`accounts-email-local.md`](./accounts-email-local.md) §7 (ADM-1) |
| GET | `/api/analytics/response-times` | §7 (ADM-3) |
| GET | `/api/sos/:id/evidence-packet` (PDF) | §7 and [`safety-and-tracking.md`](./safety-and-tracking.md) §12 (ADM-4) |
| POST | `/api/cad/dispatch-feed` (CAP v1.2 or web-hook) | [`safety-and-tracking.md`](./safety-and-tracking.md) §12 (ADM-5) |

## 7. Environmental Hazards and Advisories

| Method | Path | Specification |
|---|---|---|
| GET | `/api/weather` | [`environmental-hazards.md`](./environmental-hazards.md) §2 (WX-1) |
| Internal | `/api/internal/quake-check` | §3 (WX-2) |
| GET | `/api/advisories` | [`accounts-email-local.md`](./accounts-email-local.md) §6.2 |
| POST | `/api/advisories` (staff, manual broadcast) | §6.2 |

## 8. Internal

| Method | Path | Specification |
|---|---|---|
| POST | `/api/internal/tick` | Exists since V1. V2 extends the watchdog logic it triggers with the lost-contact, overdue and check-in rules |

## 9. Socket.IO Additions

| Event | Specification |
|---|---|
| Room `track:{linkId}` | `safety-and-tracking.md` §5 |
| Room `thread:{id}` (chat) | §10 |
| FCM topic `advisory-uttarakhand` (not a socket room) | `accounts-email-local.md` §6.2 |
| Geohash-cell FCM topics for hazard proximity | `map-routing-search.md` §8 |

## 10. Notes for the Implementer

Unlike [`../v1/api.md`](../v1/api.md), this file stays an index. The specification files already contain full request and response bodies, validation rules and rate limits. Read the linked section before implementing; the table only says *where* something lives, not *how* it behaves.

**Implementation order matters.** Follow the phase order of the roadmap:

1. Session hardening and e-mail (ACC-1 to ACC-4, SEC-5). Everything else in the guardian handshake depends on verified e-mail.
2. The guardian handshake (ACC-5). The tracking link and chat both assume a real accept and revoke model instead of the simplified V1 behaviour.
3. Map and routing (MAP-1 to MAP-6). Independent of the above; can be built in parallel by a second contributor.
4. Everything else follows the dependency graph in [`roadmap.md`](./roadmap.md#7-critical-path).
