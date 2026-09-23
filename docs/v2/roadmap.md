# Roadmap — V2 (Product)

> This is the **V2** slice of the roadmap: everything beyond the college-submission V1 (see `docs/v1/tasks.md`) and short of the synopsis's open-ended future scope (see `docs/v3/`). V1 ships a narrower, submission-shaped version of the safety features described here (server-side escalation deviation-only, no accounts hardening, no OpenFreeMap, etc.) — this document is the fuller design those V1 shortcuts point back to.
> **v2, 21 September 2026.** Rewritten after your answers: one developer plus one support member, no domain, no Telegram, reporter names shown, all ages wanted, full chat wanted, public product, very small beta, MapTiler account available, medical info kept.
> Merges `full_review_and_roadmap.md`, the feature ideas (hardware SOS, chat, better search, English map, voice guidance, driving modes, Uttarakhand focus, Brevo email) and the research in `09-references.md`.
> Status: 🗓 planned unless stated. Sources: `09-references.md`.

## 1. Principles

1. **Fix what can hurt people first.** Privacy leaks and false claims come before new features.
2. **Server-side safety, not phone-side hope.** Anything that must happen when a phone is dead, offline or taken is done by the backend.
3. **Layered triggers and channels.** No single mechanism (one button, one push, one SMS) is trusted alone.
4. **Free by default, swappable later.** Every external service sits behind a small interface so a paid upgrade is a config change (ADR-002).
5. **Consent and revocability for anything that shares a location** (`06` §5).
6. **Realistic for one developer.** Ship small milestones, each usable on its own. Say "not yet" to anything that does not fit (§4, §6).
7. **Every feature ships with tests, docs and a real-device check** (§8).

### Positioning versus existing apps
Safora should complement, not copy, what already exists in India:
- **112 India / ERSS** [R2][R10]: national emergency number and app with volunteer "SHOUT" alerts. Safora does not replace it; it keeps 112 one tap away and adds guardians, tracking and hazard context.
- **Himmat Plus (Delhi Police)** [R6][R7] and **Haryana "Safe Journey"** [R9]: police-linked SOS with call-back verification and monitored trips. They show the value of a human control room, which the admin console (ADM-1) provides at small scale.
- **Uttarakhand Police App** [R8]: combined citizen services and SOS for the state. It has no community hazard map or guardian-followed Safe Walk, which are Safora's strengths.

---

## 2. Your decisions Y1–Y10 (21 Sep 2026) and how they shape the plan

| # | Your answer | Effect on the plan |
|---|---|---|
| Y1 | Only you work on it; one member supports | Scope cut to a strict order (§4); support member gets the non-code work in §5 |
| Y2 | No domain for two years | Email works without a custom domain (`05` §1); links use the Render URL; no DKIM on our own domain |
| Y3 | No Telegram; use the Safora app | **Telegram dropped** (TRK-7 removed). Guardians are Safora users; on-device SMS remains the safety net |
| Y4 | Reports show the reporter's name only | Public reports show a **display name only** — no user id, email or phone. I recommend two safeguards (SEC-2, `05` §2) — your call |
| Y5 | For all ages; 12+ can be added if needed | **Legal warning** (`06` §4): under-18 data needs verifiable parental consent under India's DPDP Rules and children's tracking is restricted. My recommendation: launch 18+, add a teen mode later (AGE-1) |
| Y6 | Chat should be normal chat: text, audio, media | Staged plan CHT-1…CHT-3 (contacts only, media limits). It is the largest item on the list (~50 focused days) |
| Y7 | Built for public use, not only college | A **public-readiness track** (PUB-*) and staged rollout; hosting upgrade before real users; "beta — do not rely on it alone" wording |
| Y8 | Cannot get many students' data for a pilot | **Closed beta with 5–8 people** (team, family, friends) instead of a campus pilot (`08` §5) |
| Y9 | You have a MapTiler API key | Recommendation: **OpenFreeMap** for the online basemap; keep MapTiler only as a server-side geocoding fallback (`04` §1, ADR-003) |
| Y10 | Keep the medical info (needed when an ambulance comes) | Kept as an **optional emergency medical card**, encrypted, shown only during an SOS (MED-1, `05` §8) |
| — | You tested SMTP on Render's free plan and it works | SMTP is acceptable; keep it behind the `Mailer` interface with the HTTPS API as backup (ADR-006). Correction: my source said those ports are blocked — your test wins |

---

## 3. Capacity math

Corrected assumption (from your actual hours): **18–24 hours/week ≈ 2.5–3 focused days/week**, using a coding agent for a modest ×1.3 speed-up on writing code (not on design, real-device testing, or reviewing generated code). Sizes below are pre-agent-adjustment: **S** = 1.5 days, **M** = 5, **L** = 12, **XL** = 25 focused days (multiply by ~0.77 for your effective pace, i.e. divide by 1.3).

| Milestone | Contents | Focused days | Calendar at 2 d/wk | At 4 d/wk |
|---|---|:---:|:---:|:---:|
| **M1 — Trust fixes** | SEC-1, SEC-2, SEC-3, SEC-4, SEC-7, SEC-8, SEC-9 | 10.5 | ≈ 5 weeks | ≈ 2.5 weeks |
| **M2 — Map quick wins** | MAP-1, MAP-3 | 10 | ≈ 5 weeks | ≈ 2.5 weeks |
| **M3a — Server-side escalation** | ACC-1, ACC-2, TRK-1, TRK-4, ACC-5-lite, TRK-9-lite | 30 | ≈ 15 weeks | ≈ 7.5 weeks |
| **M3b — Live view and SMS** | TRK-2, TRK-3, TRK-5, TRK-8 | 20 | ≈ 10 weeks | ≈ 5 weeks |
| **M4 — Accounts for the public** | SEC-5, SEC-6, ACC-3, ACC-4, AGE-1, MED-1 | 23 | ≈ 11.5 weeks | ≈ 5.75 weeks |
| **M5 — Routing and voice** | MAP-4, MAP-5 (MAP-6 optional +5) | 24 | ≈ 12 weeks | ≈ 6 weeks |
| **M6 — No-unlock triggers** | TRG-1, TRG-2, TRG-3, TRG-6 | 34 | ≈ 17 weeks | ≈ 8.5 weeks |
| **M7 — Chat** | CHT-1, CHT-2, CHT-3 | 49 | ≈ 24.5 weeks | ≈ 12.25 weeks |
| **M8 — Local fit & public readiness** | LOC-1…LOC-4, MAP-2, MAP-7…MAP-9, TRK-6, ADM-1/3/4, PUB-1…PUB-5 | 88.5 | ≈ 44 weeks | ≈ 22 weeks |
| **Engineering (continuous)** | ENG-1, 3, 4, 5, 7, 8 | 33.5 | spread through all milestones | |
| **Total** | | **≈ 322 days** | **≈ 3 years** | **≈ 1.5 years** |

Read this honestly: **the full wish list is roughly 1.5 to 3 years of solo work**, depending on your hours. The plan therefore has three gates (engineering items excluded from the gate totals):

| Gate | Requires | Focused days | At 2 d/wk | At 4 d/wk |
|---|---|:---:|:---:|:---:|
| **Closed beta** (5–8 people, labelled "prototype — do not rely on it alone") | M1 + M2 + M3a | 50.5 | ≈ 6 months | ≈ 3 months |
| **Public beta** (anyone can install; deletion, verification, legal basics in place) | Closed beta + M4 + PUB-1, PUB-2, PUB-4 | 85 | ≈ 10 months | ≈ 5 months |
| **Public v1** (the features you originally asked for, minus chat) | Public beta + M3b + M5 + M6 | 163 | ≈ 19 months | ≈ 9.5 months |

Chat (M7) and Hindi/local polish (M8) come **after** v1. If you cannot commit 4 days a week, decide now what to drop (§6).

> **Note (post-V1):** by the time V1 ships, parts of M1 (SEC-2, SEC-4, SEC-9) and M3a (TRK-1, a minimal TRK-4) will already be done in a lighter form — see `docs/v1/`. Treat those line items here as "harden/extend the V1 version" rather than "build from scratch," and shave the corresponding days off the totals above once V1 is actually finished.

---

## 4. Work items

### Phase 0 — Security & honesty (M1)

| ID | Item | Review ref | Size | Depends |
|---|---|:---:|:---:|---|
| SEC-1 | Rotate MapTiler key; remove from source; proxy geocoding through backend; run gitleaks over full history | #3 | S | — |
| SEC-2 | Public report responses: remove `userId`, email, phone; show **display name only**; per-report "show my name" toggle; forced anonymity for sensitive categories (recommended) | #1 | S | — |
| SEC-3 | `report_confirmations` (unique per report+user), block self-confirm, per-user limit | #2 | S | — |
| SEC-4 | Correct overclaiming UI copy; add "not a replacement for 112" notice | #4 | S | — |
| SEC-7 | Per-user duress PIN in Keychain (library already installed); reject trivial PINs | #7 | S | — |
| SEC-8 | Settings: persist toggles and wire them, or remove the ones that do nothing | new | S | — |
| SEC-9 | Remove or clearly label sample data in the admin dashboard | new | S | — |
| SEC-10 | Moderator role actually used (permission split, abuse-flag queue) — added 22 Sep 2026 | new | M | — |

### Phase 1 — Real escalation (M3)

| ID | Item | Review ref | Size | Depends |
|---|---|:---:|:---:|---|
| TRK-1 | `journey_breadcrumbs` table; persist each update and `last_seen_at` | #8 | S | — |
| TRK-4 | **Watchdog engine**: deviation timeout, lost contact, overdue arrival → server-side escalation; `confirm-safe` endpoint | #10 | L | TRK-1 |
| ACC-5-lite | Guardian handshake in the app: `pending → verified → revoked`; guardian must be a Safora user with a verified email | new | M | ACC-2 |
| TRK-9-lite | Fan-out: FCM push + in-app inbox + delivery log + guardian "I'm on it" + all-clear | new | M | TRK-4 |
| TRK-2 | Mobile Socket.IO client (JWT); rooms; reconnect | #8 | M | TRK-1 |
| TRK-3 | Admin live radar on real data | #8 | M | TRK-2, SEC-9 |
| TRK-8 | On-device SMS from the user's SIM (APK flavour) with delivery status | new | M | — |
| TRK-5 | Check-in timer ("Safety Check") | roadmap #5 | M | TRK-4 |
| TRK-11 | Escalation ladder: priority-tier delivery, replaces simultaneous broadcast — added 22 Sep 2026 | new | M | TRK-9-lite |
| TRK-10 | Battery dead-man's switch: 30s cancel, repeats every 5% drop — added 22 Sep 2026 | new | M | TRK-9-lite |

*(Note: ACC-5-lite needs email verification, so ACC-1 and ACC-2 are pulled forward into M3a. ACC-3/ACC-4 stay in M4.)*

### Phase 2 — Map & search (M2 first, M5 later)

| ID | Item | Size | Depends |
|---|---|:---:|---|
| MAP-1 | **English/India basemap with OpenFreeMap** (MapLibre layer inside the existing Leaflet map), visible attribution, remove OSM prefetch | M | — |
| MAP-3 | Search v2: backend proxy, bbox tiers, `lang=en`, bias tuning, curated local places, cache | M | SEC-1 |
| MAP-4 | Routing service with providers; real profiles for walk / scooter / car / bike; **driving mode in the radar** | L | SEC-1 |
| MAP-5 | Turn-by-turn navigation with voice, earphone-only/haptic options, re-routing | L | MAP-4 |
| MAP-6 | Safest route (hazard ranking; lit streets for walking) | M | MAP-4, MAP-9 |
| MAP-9 | Category-specific decay and "still there / cleared" confirmations | M | SEC-3 |
| MAP-2 | Offline region packs (PMTiles) — also the fallback if the tile host disappears | M | — |
| MAP-7 | Safe places overlay | M | MAP-1 |
| MAP-8 | Hazard proximity alerts (geohash FCM topics) | M | SEC-8 |
| MAP-7b | "Safe stop" verified local spots — added 22 Sep 2026 | M | MAP-7 |
| MAP-9c | Reporter trust score — added 22 Sep 2026 | S | MAP-9 |
| MAP-9d | Duplicate/near-duplicate report detection — added 22 Sep 2026 | S | MAP-9 |
| MAP-9e | Photo EXIF sanity check (weak signal only) — added 22 Sep 2026 | S | SYN-3 (V1) |
| WX-1 | Weather overlay (Open-Meteo) — `environmental-hazards.md`, added 22 Sep 2026 | M | MAP-9 |
| WX-2 | Earthquake advisories (USGS) — `environmental-hazards.md`, added 22 Sep 2026 | M | LOC-3 |
| WX-3 | Static seismic-zone weighting — `environmental-hazards.md`, added 22 Sep 2026 | S | MAP-9 |

### Phase 3 — Accounts for the public (ACC-1/ACC-2 in M3a; the rest in M4)

| ID | Item | Size | Depends |
|---|---|:---:|---|
| ACC-1 | `Mailer` interface; SMTP implementation (already working for you) + HTTPS API backup; template files; outbox; daily-cap guard | S | — |
| ACC-2 | Welcome + email verification (6-digit code) | M | ACC-1 |
| ACC-3 | Forgot / reset password (code); sign out all sessions | M | ACC-1, SEC-5 |
| ACC-4 | "Password changed" and "Account deleted" notices | S | ACC-1 |
| SEC-5 | Session hardening: short access token, rotating refresh token, Keychain, `token_version` | M | — |
| SEC-6 | Account deletion (API + in-app), data removed per `06` §2 | M | SEC-5 |
| AGE-1 | Age policy screen and sign-up gate (18+ at launch; design for a later teen mode) | S | — |
| MED-1 | Optional emergency medical card, encrypted, visible only in an SOS | M | — |
| AGE-2 | `parent-of` relationship (data model only — teen mode itself stays gated on PUB-4) — added 22 Sep 2026 | S | AGE-1 |

### Phase 4 — No-unlock triggers (M6)

| ID | Item | Size | Depends |
|---|---|:---:|---|
| TRG-1 | Native Kotlin module: secure token store, native SOS sender (HTTPS + SMS) | L | SEC-5, TRK-8 |
| TRG-2 | "Guard" foreground service + battery/autostart checklist | L | TRG-1 |
| TRG-3 | Quick Settings tile, notification action, widget | M | TRG-1 |
| TRG-6 | Spike: locked-screen audio evidence (3 approaches, real devices) | M | TRG-2 |
| TRG-4 | Volume-pattern trigger through an AccessibilityService (opt-in) | L | TRG-2 |
| TRG-5 | Shake trigger (opt-in) | S | TRG-2 |

### Phase 5 — Chat (M7, staged)

| ID | Item | Size | Depends |
|---|---|:---:|---|
| CHT-1 | Thread attached to a Safe Walk or SOS: quick replies + text; delivered/read ticks; Socket.IO + FCM | L | TRK-2, ACC-5 |
| CHT-2 | 1:1 text chat between **mutually accepted contacts**; block, mute, report; rate limits | L | CHT-1 |
| CHT-3 | Voice notes and images between accepted contacts; size/duration caps; signed URLs; auto-expiry | XL | CHT-2 |
| CHT-4 | Codeword/duress phrase in chat, silently triggers SOS — added 22 Sep 2026 | S | CHT-1 |
| — | *Not planned:* groups, public chat, chat with strangers, files of any type | — | — |

### Phase 6 — Local fit & public readiness (M8)

| ID | Item | Size |
|---|---|:---:|
| LOC-1 | Hindi + English (strings, TTS voice, TalkBack) | L |
| LOC-5 | Vibration-only alert patterns (deaf/HoH accessibility) — added 22 Sep 2026 | S |
| TRK-12 | "Walk with me" live request (lighter than full Safe Walk) — added 22 Sep 2026 | M |
| TRK-13 | Scheduled/recurring Safe Walk reminders — added 22 Sep 2026 | S |
| LOC-2 | Uttarakhand hazard categories and severity guidance | S |
| LOC-3 | Sachet advisory ingestion + admin broadcast | M |
| LOC-4 | Audit-style rating fields | M |
| TRK-6 | Guardian web tracking link (for guardians without the app) — deferred | L |
| ADM-1 | Dispatch workflow: assign responder, notes, call-back log, audit trail | M |
| ADM-3 | Analytics: time-of-day heatmap, response-time metrics | M |
| ADM-4 | PDF evidence packet | M |
| PUB-1 | Terms of use, privacy policy, grievance contact (drafted with a template, checked by someone qualified) | M |
| PUB-2 | Hosting upgrade to an always-on paid instance and paid database before real users | S |
| PUB-3 | Moderation tools: report queue for hazards and chat reports, block lists | M |
| PUB-4 | Legal review: DPDP, minors, chat and media, audio recording (`06` §4) | M |
| PUB-5 | Support email/contact and an in-app "report a problem" | S |

### Engineering (continuous)

| ID | Item | Size |
|---|---|:---:|
| ENG-1 | `node-pg-migrate`, indexes, remove `typeorm`, move seed to `scripts/` | M |
| ENG-3 | PostGIS integration tests + Maestro flows for SOS and Safe Walk | L |
| ENG-4 | CI: lint, gitleaks, CodeQL, Dependabot, Android build, coverage gate | M |
| ENG-5 | Structured logs, DB-checking health endpoint, optional Sentry | M |
| ENG-7 | In-app update check via GitHub Releases; release-signing procedure | M |
| ENG-8 | Scheduled DB dump and restore drill | S |

*(ENG-2 screen refactoring and ENG-6 OpenAPI are pushed after v1.)*

**Dropped:** TRK-7 Telegram bot (your decision Y3); `volunteer_responder` role and any institution/campus-scoped features (aggregate org data, `org_admin`) — your decision, 22 Sep 2026, both depend on external adoption (institutions/volunteers signing on) rather than pure engineering effort. **Deferred:** TRK-6 tracking link, ADM-2 campus console, PIL-1 campus pilot (replaced by BETA-1 in `08`).

---

## 5. How the support member can help (no coding needed)

| Task | Supports |
|---|---|
| Test on their own phone (brand/Android version) using the checklist in `08` §2 | Device matrix |
| Build the curated Dehradun places list (name, aliases, coordinates) — 100 entries | MAP-3 |
| Verify police stations, hospitals, pharmacies near the beta area by phone or visit | MAP-7 |
| Write Hindi strings and check translations | LOC-1 |
| Recruit and brief the 5–8 beta testers; collect feedback forms | BETA-1 |
| Watch hazard reports for abuse or duplicates during the beta | PUB-3 |
| Draft privacy policy/terms from a template and check what the app really does | PUB-1 |
| Keep the docs' status tags up to date | All |

---

## 6. If time runs short — cut in this order (last cut first)

CHT-3 (media chat) → CHT-2 (1:1 chat) → LOC-3/4 → MAP-7/8 → TRG-4 volume pattern → MAP-6 → MAP-5 voice (keep routing) → TRG-3 widget → LOC-1 Hindi. **Never cut:** SEC-1…SEC-4, TRK-1, TRK-4, ACC-5, SEC-6, PUB-1/2/4.

---

## 7. Critical path

```
SEC-1 ─► MAP-3, MAP-4 ─► MAP-5, MAP-6
MAP-1 (independent)
TRK-1 ─► TRK-4 ─► TRK-9-lite ─► CLOSED BETA
ACC-1 ─► ACC-2 ─► ACC-5-lite ─┘
SEC-5 ─► SEC-6, ACC-3, TRG-1 ─► TRG-2 ─► TRG-3
TRK-2 ─► TRK-3, CHT-1 ─► CHT-2 ─► CHT-3
M4 + PUB-1/2/4 ─► PUBLIC BETA
```

---

## 8. Definition of done (every item)

- [ ] Code merged behind CI (build, type-check, tests, gitleaks) with a test that would fail without the change.
- [ ] Matching spec status tag updated (🗓 → ✅), and any API/DB change written into the spec.
- [ ] Checked on **two real phones**; anything background-related on one non-Pixel, non-Samsung phone (`08` §2).
- [ ] No new secret, key or personal data in the repo or in logs.
- [ ] Privacy check: new personal data? If yes, `06` §2 updated.
- [ ] Failure mode written down: what does the user see if this feature fails?

---

## 9. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|:---:|:---:|---|
| R-1 | One developer: illness, exams, burnout | High | High | Small milestones; the cut list in §6; support member covers testing and content |
| R-2 | Locked-screen audio cannot start from the background on newer Android | High | Medium | TRG-6 spike; send SOS without audio first [R11][R12] |
| R-3 | OEM battery managers kill the Guard service | High | High | Onboarding checklist; server watchdog is the safety net [R17] |
| R-4 | False alarms from hill dead zones | High | Medium | Tiered stale rules; tune during beta |
| R-5 | Render free web service sleeps and delays the first SOS | High | High | Keep-warm ping (ADR-007); paid always-on instance before real users (PUB-2) |
| R-6 | Guardian feature used for stalking or coercion | Medium | High | `06` §5 rules; visible sharing; revoke; guardians can leave |
| R-7 | **Minors on a location app without parental consent** (all-ages decision) | High if Y5 is kept | High | Launch 18+; teen mode only after legal advice (`06` §4) |
| R-8 | **Open chat with media**: abuse, grooming, illegal content, storage cost | Medium | High | Contacts-only chat; block/report; size caps; moderation queue (PUB-3); legal review (PUB-4) |
| R-9 | Reporter names shown publicly expose people who report stalkers or harassment | Medium | High | Per-report anonymity; forced anonymity for sensitive categories; display name (not full legal name) |
| R-10 | Free map/routing providers change terms or disappear | Medium | Medium | Provider adapters; offline PMTiles fallback (MAP-2); documented alternatives |
| R-11 | Scope: 4+ years of work at 2 d/wk | High | High | Gates in §3; cut list in §6 |

---

## 10. Open questions (v2)

| # | Question | My default |
|---|---|---|
| Q1 | How many hours per week can **you** give, and the support member? (This sets the calendar in §3) | 15 h/week for you |
| Q2 | **Age:** are you willing to launch **18+** and add a teen mode after legal advice? (`06` §4) | Yes |
| Q3 | **Reporter names:** OK with a per-report "show my name" toggle, and forced anonymity for harassment, suspicious-activity and isolated-area reports? | Yes |
| Q4 | **Chat:** OK with contacts-only chat (no strangers, no groups), staged as CHT-1 → CHT-3, and clear wording that messages are stored on the server (not end-to-end encrypted)? | Yes |
| Q5 | Which SMTP provider and **port** worked on Render free? (I will record it as tested) | Brevo SMTP, port unknown |
| Q6 | Do you plan a **Play Store** release later? (Decides whether SMS/accessibility code stays in an APK-only flavour) | Maybe; keep APK-only flavour |
| Q7 | Medical card fields you want: blood group, allergies, conditions, medications, emergency note? | Blood group, allergies, conditions, medications, one free-text note — all optional |
| Q8 | Who is the person you trust to review the privacy policy and DPDP points (teacher, family member who is a lawyer)? | Ask your project supervisor |
