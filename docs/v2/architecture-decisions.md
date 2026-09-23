# 07 — Architecture Decision Records (ADRs) — v2

> Format: **Context → Decision → Consequences → Revisit when**. Status values: **Accepted** (you decided it), **Proposed** (my recommendation — needs your yes/no), **Superseded/Dropped**.
> **v2 (21 Sep 2026)** updates ADR-002, 003, 005, 006, 009, 010, 011 after your answers and adds ADR-013…015. Sources in `09-references.md`. Tags: 🔬 needs test.

| ADR | Title | Status |
|---|---|---|
| 001 | Distribute as an APK | **Accepted** |
| 002 | Free-by-default stack behind swappable interfaces | **Accepted** (limits of Render/Neon/Cloudinary free plans not designed around; upgrade before real users) |
| 003 | Online basemap: OpenFreeMap; PMTiles for offline/fallback; MapTiler only server-side | **Proposed** (v2, replaces PMTiles-first) |
| 004 | Routing behind a provider adapter (Stadia/Valhalla → ORS → FOSSGIS OSRM) | Proposed |
| 005 | Guardian channels: FCM app push + on-device SMS (+ web link later); **no Telegram** | **Accepted** (your decision) |
| 006 | Email through Brevo: SMTP primary (tested by you), HTTPS API backup | **Accepted** |
| 007 | Watchdog runs inside the backend with an external keep-warm ping | Proposed |
| 008 | Layered no-unlock SOS triggers; volume pattern is opt-in | Proposed |
| 009 | Chat: staged, contacts-only, text → voice/images | **Accepted in principle** (your request); staging **Proposed** |
| 010 | Public reports show a display name only; per-report anonymity; forced anonymity for sensitive categories | **Accepted** (name shown); safeguards **Proposed** |
| 011 | Age policy: 18+ at launch, teen mode later after legal advice | **Proposed** — conflicts with your "all ages" wish (needs your decision) |
| 012 | Server-side breadcrumbs with 30-day retention | Proposed |
| 013 | Emergency medical card: optional, encrypted, shown only in an SOS | **Accepted** (your request); details Proposed |
| 014 | Staged public rollout: closed beta → public beta → v1 | **Proposed** |
| 015 | Solo-developer scope order and cut list | **Proposed** |
| 016 | Roles vs. relationships: `moderator` actually used, `volunteer_responder` dropped, `parent-of`/`guardian-of` stay relationships not roles | **Accepted** |
| 017 | SOS delivery follows a priority-tier escalation ladder, not simultaneous broadcast to all guardians | **Accepted** (your decision) |
| 018 | Environmental hazard data: Open-Meteo (weather) + USGS (earthquake) + static BIS seismic zoning, no live routing recalculation from either | **Accepted** |

---

## ADR-001 — Distribute as an APK
**Context.** Safora is a college project for this and next year. Publishing on Google Play adds review, policy constraints and account costs.
**Decision.** Build signed APKs and publish them on GitHub Releases with checksums.
**Consequences.**
- *Unlocks:* AccessibilityService volume trigger without Play review [R13]; `SEND_SMS` for on-device SMS, which Play restricts to default handlers with narrow exceptions [R14]; no Data Safety form.
- *Costs:* users must allow installs from unknown sources; updates are manual (mitigated by the in-app update check, ENG-7); Android 13+ shows an extra "restricted settings" step for sideloaded apps that use accessibility 🔬; a lost signing key means reinstalling.
- *Design rule:* keep Play-restricted code (SMS, accessibility) in an **APK-only build flavour** so a Play build stays possible later.
**Revisit when** the pilot ends and a public launch is planned.

## ADR-002 — Free-by-default stack behind swappable interfaces
**Context.** No budget for paid services now; paid upgrades are acceptable if Safora becomes popular. You told me not to design around the Render, Neon and Cloudinary free-plan limits.
**Decision.** Prefer free/open services; wrap each in a small interface (`Mailer`, `RoutingProvider`, `GeocodingProvider`, `PushSender`, `TileSource`) so replacing one is a configuration change. Stay on the current free hosting for development and the closed beta.
**Consequences.** Features are not bent around quotas. Two cheap safeguards remain (ADR-007, and a scheduled DB dump, ENG-8). Free-tier terms change without notice, so each provider has a documented fallback.
**Revisit when** real users arrive: upgrade the backend to an always-on paid instance and the database to a paid plan **before** the public beta (PUB-2). A sleeping server or a paused database is a safety failure, not an inconvenience.

## ADR-003 — Online basemap: OpenFreeMap; PMTiles for offline and fallback; MapTiler only server-side
**Context.** OSM's raster tiles show local-language labels, cannot be prefetched legally, and require attribution [R18]. You have a MapTiler key, but its free plan is **non-commercial only**, limited to 100,000 requests and 5,000 sessions a month, **pauses when exhausted**, forbids caching map content server-side, and the key would sit inside the APK where anyone can copy it [R50][R51]. OpenFreeMap serves vector tiles with no key, no registration and no limits on views or requests, commercial use allowed, attribution required [R48][R49].
**Decision.** Use OpenFreeMap for the online map (MapLibre GL layer inside the existing Leaflet map, own copy of the style with English-first labels). Build PMTiles region packs with `protomaps-leaflet` [R19] as the offline map and the fallback if OpenFreeMap is unavailable. Keep MapTiler only as a **server-side geocoding fallback** (its terms allow using search results outside the service [R50]). The style URL is a remote-config value.
**Alternatives.** MapTiler in the client (key exposure, monthly pause, non-commercial); MapLibre React Native rewrite (bigger change, PMTiles support unconfirmed [R45]); OSM raster (policy).
**Consequences.** No key to steal, no quota that can switch the map off, English labels after a style tweak 🔬, legal offline packs. Costs: dependence on a donation-funded service with no guarantee (hence the fallback ladder in `04` §1); a Leaflet–MapLibre bridge to test on real phones 🔬.
**Revisit when** OpenFreeMap has an outage in the beta (bring MAP-2 forward) or the app becomes large enough to justify a paid tile provider.

## ADR-004 — Routing behind a provider adapter
**Context.** The current router returns car routes for all modes and has no instructions [R24]. Valhalla offers pedestrian, motor scooter, auto and bicycle costing, localised instructions and options such as `use_lit` and `exclude_polygons` [R20][R21][R27]; Stadia hosts it and its free tier covers non-commercial/academic use with hard limits [R22]; OpenRouteService has a free tier (2,000 directions/day) with walk/bike/car and alternatives [R23][R46].
**Decision.** `POST /api/route` on our backend calls Stadia first, then OpenRouteService, then FOSSGIS OSRM; results cached; keys server-side.
**Consequences.** Real per-mode routes, voice-ready steps, no keys in the APK. Costs: three integrations to maintain; scooter approximated by car on fallbacks; terms of Stadia's free tier must be confirmed for the project 🔬.
**Revisit when** free credits run out (self-host Valhalla on a student-credit VM [R43], or pay).

## ADR-005 — Guardian channels: app push + on-device SMS; no Telegram
**Context.** No free server-side SMS in India (registered templates required [R30]). You decided guardians should use the Safora app, so the app itself grows.
**Decision.** Two channels in parallel: **FCM push + in-app inbox** to verified guardians, and **on-device SMS from the walker's SIM** (APK flavour) as the safety net for people who are not on the app or for a phone with no internet. A private web tracking link (TRK-6) is deferred. Telegram is **dropped**. Delivery tracked per channel.
**Alternatives rejected.** Telegram bot (your decision), paid SMS gateway (cost + template registration), WhatsApp Business API (paid, approval), email for emergencies (slow, capped at 300/day [R32]).
**Consequences.** Simple and free. Costs: a guardian must install an APK to receive push (friction — the SMS fallback covers the gap); SMS charges fall on the walker's plan.
**Revisit when** guardians without the app prove common in the beta (then build the web link).

## ADR-006 — Email through Brevo: SMTP primary, HTTPS API backup
**Context.** Welcome, verification and password-reset mail are needed. Brevo's free plan allows 300 emails/day and full transactional access [R32]. You tested SMTP on Render's free plan and it works; my source claimed those ports are blocked [R33] — your direct test overrides it. You have no domain and will not have one for two years.
**Decision.** A `Mailer` interface with `BrevoSmtpMailer` (primary), `BrevoApiMailer` (HTTPS backup) and `ConsoleMailer` (development). Templates as repo files; an outbox with priority and a 280/day guard; Brevo webhooks for bounces. Emails never carry emergencies.
**Consequences.** Works today, survives a host change. Costs: without your own domain, Brevo may rewrite the sender and inbox placement will be weaker, so email must stay non-critical and messages short and consistent (`05` §1).
**Revisit when** deliverability is poor in the beta or volume nears 300/day.

## ADR-007 — Watchdog inside the backend with a keep-warm ping
**Context.** Escalation must not depend on the phone (finding #10). Render's free web service sleeps after 15 minutes idle and has no free background workers or cron [R41]; Neon's free compute scales to zero after 5 minutes and includes a limited number of compute-hours [R40].
**Decision.** Run the watchdog as an in-process tick (30 s) with the active-journey list in memory; call `POST /api/internal/tick` every minute from an external free scheduler (Cloudflare Worker cron, which the free plan supports [R39], or cron-job.org). Idle ticks make no database queries. All rules are idempotent and timestamp-driven.
**Consequences.** Works today at zero cost; survives restarts. Costs: a single instance is a single point of failure; the external pinger is one more thing to monitor.
**Revisit when** moving to a paid always-on instance (then the pinger can go; consider a separate worker).

## ADR-008 — Layered no-unlock triggers; volume pattern opt-in
**Context.** India's phones already have a power-button 112 panic [R1][R47]; Google's Personal Safety has a five-press SOS [R3]. Reliable background detection of volume keys needs an AccessibilityService or fragile workarounds [R15][R16]; foreground services using location/microphone generally cannot start from the background [R11][R12]; OEM battery managers kill background work [R17].
**Decision.** Provide several triggers (notification action, Quick Settings tile, widget, shake, opt-in volume pattern), all going through a **native** SOS sender that does not need the React Native runtime. Do not intercept the power button. Server watchdog stays the safety net.
**Consequences.** Robust to any single trigger failing. Costs: native Kotlin work; onboarding for battery/autostart; audio evidence after a locked-screen trigger needs the TRG-6 spike.
**Revisit when** TRG-6 shows which audio approach works on the reference devices.

## ADR-009 — Chat: staged, contacts-only
**Context.** You want normal chat with text, audio and media. That is a messenger: storage, moderation, abuse handling, media risk and possible intermediary duties under Indian IT rules 🔬 — roughly 50 focused days.
**Decision.** Build in stages: **CHT-1** thread on a Safe Walk/SOS, **CHT-2** 1:1 text between **mutually accepted contacts**, **CHT-3** voice notes and images between the same contacts. No strangers, no groups, no arbitrary files. Messages are stored on the server (not end-to-end encrypted) and the UI says so. Retention 30 days after last activity. Chat and media stay off for any future under-18 accounts.
**Consequences.** Delivers what you asked for while keeping the abuse surface small. Costs: large effort in year 2; moderation duty (PUB-3); legal review (PUB-4).
**Revisit when** the beta shows most value is in walk/SOS threads (then stop after CHT-1/CHT-2).

## ADR-010 — Public reports show a display name only
**Context.** Public endpoints currently return reporter name **and** user id ✅. You decided names should show.
**Decision.** Public responses show `reporterName` (a display name) and nothing else about the person — no `userId`, email or phone. Recommended safeguards: a per-report "show my name / anonymous" toggle and forced anonymity for harassment, suspicious-activity and isolated-area reports.
**Consequences.** Removes the account-linking leak; meets your product wish. Residual risk: people reporting a specific person can be identified by name if they choose to show it (R-9). Staff still see identity for moderation.
**Revisit when** beta users report feeling unsafe about names (make anonymous the default).

## ADR-011 — Age policy: 18+ at launch, teen mode later
**Context.** You want Safora for everyone, 12+ if needed. India's DPDP Rules treat under-18s as children: verifiable parental consent before processing, and tracking/behavioural monitoring restricted, with narrow exemptions [R53][R54][R55]. Safora's core features (continuous location, audio, chat) are the risky kind.
**Decision (proposed).** Launch **18+** (checkbox + enrolled beta). Do not collect birth dates. Design the guardian model so a parent is a special guardian, and add a **teen mode** only after legal advice and a real consent method.
**Consequences.** Lower legal risk and less to build now. Cost: you cannot serve schoolchildren yet, which is a real limitation of your goal.
**Revisit when** PUB-4 gives a clear answer or you find a legitimate consent path.
**Needs your decision:** this is the one place where my recommendation and your request differ.

## ADR-012 — Server-side breadcrumbs with 30-day retention
**Context.** Live tracking, watchdog and evidence packets need positions stored; storing forever creates risk.
**Decision.** Store breadcrumbs during active journeys only; delete after 30 days (consider 7); SOS audio after 30 days; scheduled purge job (ENG-1).
**Consequences.** Enables TRK-3/TRK-4/ADM-4 while limiting exposure. Retention numbers to be confirmed with the supervisor (`06` §2).
## ADR-013 — Emergency medical card
**Context.** You want to keep blood group and similar information because it helps when an ambulance arrives. It is health data — high sensitivity.
**Decision.** An **optional** card (blood group, allergies, conditions, medications, one note) stored in its own table, encrypted at the application level (AES-GCM, key in an environment variable), visible only to the user, and to guardians/staff **only inside an active SOS**; staff views are audit-logged; deleted with the account or on request.
**Consequences.** Useful in the moment it matters; a database dump reveals nothing readable. Costs: key management (losing the key loses the cards) and a small amount of crypto code.
**Revisit when** the legal review (PUB-4) advises a different consent flow.

## ADR-014 — Staged public rollout
**Context.** You are building for public use, but cannot recruit many testers and have one developer.
**Decision.** Three gates: **closed beta** (5–8 people, "prototype — do not rely on it alone") after M1+M2+M3a; **public beta** after M4 and PUB-1/2/4; **v1** after M3b, M5, M6. Nothing goes public before server-side escalation, account deletion, email verification, paid always-on hosting and the legal basics.
**Consequences.** Real risk control; honest communication. Costs: the public date is months away; keep testers' data small and deletable.

## ADR-015 — Solo-developer scope order and cut list
**Context.** The full wish list is about 322 focused days (1.5 years at 4 days/week, 3 years at 2).
**Decision.** Order: M1 trust fixes → M2 map quick wins → M3 escalation → M4 accounts → M5 routing/voice → M6 triggers → M7 chat → M8 local fit and public readiness. Cut order when short: media chat → 1:1 chat → advisories/audits → safe places/alerts → volume trigger → safest route → voice → widget → Hindi. Never cut trust fixes, watchdog, guardian handshake, account deletion or the PUB legal items.
**Consequences.** Something visible early (maps) and the core safety promise next. Costs: chat and triggers arrive late; be honest about that with users.

## ADR-016 — Roles vs. relationships: `moderator` actually used, `volunteer_responder` dropped
**Context.** The backend already has three roles in code (`user`, `moderator`, `admin`) but `moderator` has never been assigned or given a distinct UI — everyone is either `user` or full `admin`. Separately, we discussed a `volunteer_responder` role (public community members pinged on nearby SOS, SHOUT-style) and an `org_admin` role (multi-institution scoping) — you dropped both institution/volunteer-network ideas as "not good."
**Decision.** Draw a clear line: a **role** changes what dashboard/permissions an account has; a **relationship** just links two accounts. `moderator` is a real role — use it, with the permission split documented in `accounts-email-local.md` §8 (moderators flag abuse, admins act on it, per your explicit decision). `guardian-of` and the new `parent-of` (`accounts-email-local.md` §4, AGE-2) stay **relationships**, not roles — any ordinary `user` can hold either. `volunteer_responder` and `org_admin` are **not built** — dropped/deferred per your calls, since both depend on external adoption (institutions signing on, volunteers showing up) rather than pure engineering effort.
**Consequences.** A small, stable role list that doesn't sprawl every time a new feature involves "someone with extra visibility." Costs: none identified — this is a clarity gain, not a trade-off.

## ADR-017 — Escalation ladder, not simultaneous broadcast
**Context.** The original fan-out design (`safety-and-tracking.md` §2) notified every verified guardian at once for any SOS. You asked for a priority order instead: primary contacts first, secondary/tertiary only if primary doesn't acknowledge.
**Decision.** `trusted_contacts.priority_tier` (1/2/3); the fan-out orchestrator notifies tier 1 immediately, advances to tier 2 after 2 minutes with no acknowledgement, then tier 3 after another 2 minutes; **if no tier acknowledges and there's no next tier, it stays with primary — no fallback to "notify everyone."** On-device SMS (TRK-8) still fires to everyone immediately regardless of tier, since it costs nothing extra and doesn't depend on server orchestration. A forward-reference is recorded to V3's mesh-messaging work (`docs/v3/02-offline-emergency-messaging.md`) as the natural future extension for "primary truly unreachable, no signal at all."
**Consequences.** More realistic dispatch-style behaviour; a walker with only one contact effectively has no ladder (documented, not hidden). Costs: slightly slower worst-case notification of secondary/tertiary contacts (up to 4 minutes) compared to the old "everyone at once" — accepted trade-off per your decision.
**Revisit when** real usage data (post-beta) shows the 2-minute-per-tier timing is wrong in either direction, or when V3's mesh work is actually undertaken and the "stay with primary" fallback gets a real successor.

## ADR-018 — Environmental hazard data sources
**Context.** You asked for weather and earthquake data to improve route-safety accuracy. Needed a free, reliable source for each, and a decision on how live data should (and shouldn't) affect routing.
**Decision.** Open-Meteo for weather (free, no key, 10k calls/day) feeds a temporary boost to waterlogging-category weighting during active rain — reuses the existing safety-score formula rather than a parallel system. USGS for earthquakes (free, public domain, real-time) drives time-limited advisories through the same delivery path as Sachet advisories, **not** live route recalculation — a quake event doesn't tell you which specific roads are now unsafe, only that caution is warranted for a period. India's official (BIS) seismic zoning map is used as a **static** multiplier for landslide/bridge hazard severity in Zone IV/V areas (Uttarakhand), independent of any live feed, since that's a genuinely static geological fact, not a live one.
**Consequences.** Both data sources are free and fit the no-cost constraint. The static/dynamic split keeps the design honest — no false implication that a live earthquake feed can tell you "this road is now dangerous," which it genuinely can't.
**Revisit when** real usage shows the waterlogging-weight boost needs tuning, or if USGS/Open-Meteo terms change.
