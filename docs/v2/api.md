# API Reference — V2 Additions

> This lists **new/changed endpoints introduced in V2**, on top of V1 (`docs/v1/api.md`). Full behaviour, request/response shapes and rules are in the linked spec sections — this file is the index.

## Auth & accounts

| Method | Path | Spec |
|---|---|---|
| POST | `/api/auth/verify-email/request` | `accounts-email-local.md` §1 |
| POST | `/api/auth/verify-email/confirm` | §1 |
| POST | `/api/auth/forgot-password` | §1 |
| POST | `/api/auth/reset-password` | §1 |
| POST | `/api/auth/refresh` | §3 (session hardening) |
| POST | `/api/auth/logout` / `/api/auth/logout-all` | §3 |
| DELETE | `/api/auth/account` | §3 (SEC-6, account deletion) |
| POST | `/api/webhooks/brevo` | §1 (bounce handling) |

## Guardians

| Method | Path | Spec |
|---|---|---|
| POST | `/api/guardian/invites/:token/accept` | `safety-and-tracking.md` §1 |
| GET | `/api/guardian/links` | §1 |
| DELETE | `/api/guardian/links/:id` | §1 |
| POST | `/api/sos/contacts/:id/resend` | §1 |

## Tracking, watchdog, check-ins (extends V1's minimal versions)

| Method | Path | Spec |
|---|---|---|
| GET | `/api/journeys/:id/status` | §4 |
| POST | `/api/journeys/:id/tracking-links` | §5 (guardian web link, deferred feature) |
| DELETE | `/api/tracking-links/:id` | §5 |
| GET | `/api/track/:token` | §5 — public, rate-limited |
| POST | `/api/checkins` (Safety Check timer) | §6 |
| POST | `/api/checkins/:id/extend` / `/:id/resolve` | §6 |
| POST | `/api/sos/:id/sms-status` | §8 (on-device SMS delivery report) |

## Map, search, routing

| Method | Path | Spec |
|---|---|---|
| GET | `/api/geo/search` | `map-routing-search.md` §3 |
| POST | `/api/route` | §4 |
| GET | `/api/safe-places` (nearby) | §7 |

## Chat (staged — CHT-1 → CHT-3)

| Method | Path | Spec |
|---|---|---|
| Socket room `chat:{id}` | — | `safety-and-tracking.md` §10 |
| POST | `/api/contacts/:userId/request` / `/accept` / `/block` | §10 |
| GET | `/api/threads/:id/messages` | §10 |
| POST | `/api/threads/:id/messages` | §10 |

## Medical card

| Method | Path | Spec |
|---|---|---|
| GET / PUT / DELETE | `/api/me/medical-card` | `accounts-email-local.md` §8 |

## Admin/staff (V2 additions)

| Method | Path | Spec |
|---|---|---|
| POST | `/api/sos/:id/assign` / `/notes` / `/callback` | `accounts-email-local.md` §7 (ADM-1) |
| GET | `/api/analytics/response-times` | §7 (ADM-3) |
| GET | `/api/sos/:id/evidence-packet` (PDF) | §7 (ADM-4) |

## Environmental hazards (added 22 Sep 2026)

| Method | Path | Spec |
|---|---|---|
| GET | `/api/weather` | `environmental-hazards.md` §2 (WX-1) |
| Internal | `/api/internal/quake-check` | `environmental-hazards.md` §3 (WX-2) |

## Roles & moderation (added 22 Sep 2026)

| Method | Path | Spec |
|---|---|---|
| POST | `/api/abuse-flags` | `accounts-email-local.md` §8 (SEC-10) |
| PATCH | `/api/abuse-flags/:id` | §8 |

## Escalation ladder & battery switch (added 22 Sep 2026)

| Method | Path | Spec |
|---|---|---|
| POST | `/api/journeys/:id/type=walk_with_me` (start) | `safety-and-tracking.md` §6c (TRK-12) |
| CRUD | `/api/scheduled-walks` | §6d (TRK-13) |
| (internal, no new endpoint — battery warnings ride the existing location-update payload) | — | §6b (TRK-10) |

## Advisories (Uttarakhand-specific)

| Method | Path | Spec |
|---|---|---|
| GET | `/api/advisories` | `accounts-email-local.md` §6.2 |
| POST | `/api/advisories` (staff, manual broadcast) | §6.2 |

## Internal

| Method | Path | Spec |
|---|---|---|
| POST | `/api/internal/tick` | Already exists from V1; V2 extends the watchdog logic it triggers (lost-contact, overdue, check-in rules) |

## Socket.IO events (V2 additions)

| Event | Spec |
|---|---|
| `track:{linkId}` room | `safety-and-tracking.md` §5 |
| `thread:{id}` room (chat) | §10 |
| `advisory:uttarakhand` (FCM topic, not a socket room) | `accounts-email-local.md` §6.2 |
| geohash-cell FCM topics for hazard proximity | `map-routing-search.md` §8 |

For full request/response bodies, validation rules, and rate limits, read the linked spec file — this index exists so you don't have to open all six files to find where something lives.

## Notes for whoever (or whichever agent) implements V2

Unlike `docs/v1/api.md`, this file stays an index rather than inlining every schema — the six spec files it points to already contain full request/response bodies, validation rules and rate limits for each endpoint (e.g. guardian invite tokens in `safety-and-tracking.md` §1, OTP code handling in `accounts-email-local.md` §1). Read the linked section before implementing, not just this table — the table only tells you *where* something lives, not *how* it behaves.

**Implementation order matters.** A sensible sequence, following the roadmap's phase order (`roadmap.md` §4):
1. Session hardening + email (`ACC-1`…`ACC-4`, `SEC-5`) — everything else in the guardian handshake depends on verified email existing.
2. Guardian handshake (`ACC-5`) — the tracking-link and chat features both assume a real accept/revoke model, not V1's simplified "any existing contact sees it."
3. Map/routing (`MAP-1`…`MAP-6`) — independent of the above, can be built in parallel by a second contributor if you ever have one.
4. Everything else follows the dependency graph in `roadmap.md` §7.
