# Accounts, Email, Reports Privacy, Language, Uttarakhand Content, Admin, Roles

> Covers SEC-2…SEC-7, SEC-10, ACC-1…ACC-4, AGE-1, AGE-2, MED-1, LOC-1…LOC-5, ADM-1…ADM-4. **v2 (21 Sep 2026):** SMTP confirmed working by you; no domain; reporter display name shown; age policy revised; medical card added. **Updated 22 Sep 2026:** moderator role detailed with an abuse-flag queue (SEC-10), `parent-of` relationship documented (AGE-2), vibration-pattern accessibility (LOC-5). Tags: ✅ verified · 📄 documented only · 🔬 needs test · 🗓 planned.

## 1. Transactional email with Brevo (ACC-1…ACC-4)

### Decision (v2)
Use Brevo through a **`Mailer` interface with two implementations**:
1. **`BrevoSmtpMailer`** (nodemailer) — you tested SMTP on Render's free plan and it works, so this is the primary path. *(Correction: my research source said Render's free plan blocks outbound ports 25, 465 and 587 [R33]. Your test wins; a different port or provider is probably what worked — please tell me which so I can record it, Q5.)*
2. **`BrevoApiMailer`** (`POST https://api.brevo.com/v3/smtp/email`, header `api-key`) — HTTPS backup if SMTP ever stops working after a host change. The API key and SMTP key are two different credentials [R32].
A `ConsoleMailer` is used locally and in tests. Brevo's free plan allows 300 emails per day with full transactional access and no credit card [R32].

### What we send
| Email | Trigger | Content | Priority |
|---|---|---|:---:|
| **Welcome + verify** | Registration | Greeting, 6-digit code (valid 10 min), what Safora is, "not a replacement for 112" line | 1 |
| **Verification code (resend)** | User taps resend (60 s cooldown) | Code | 1 |
| **Password reset** | Forgot password | 6-digit code (10 min), "ignore if this was not you" | 1 |
| **Password changed** | After change/reset | Time, device hint, "if this was not you, reset now", note that other sessions were signed out | 2 |
| **Guardian invitation** | Walker adds a contact with an email | Who added you, what you will receive, accept link/QR, "I don't know this person" link | 2 |
| **Account deleted** | After deletion | Confirmation and what was removed | 3 |
| *(optional later)* **Safe Walk summary**, **new-device sign-in** | — | — | 4 |

Emails are **never** part of SOS delivery (they are slow and capped). SOS uses FCM push, on-device SMS and (later) the tracking link.

### Design
```
Route handler ─► MailService.enqueue(template, to, vars, priority)
                       │
                 email_outbox (queued)
                       │  worker tick every 15 s
                       ▼
        daily-cap guard (defer if sent today ≥ 280)
                       ▼
        Mailer.send()  (SMTP first, API as backup) ──► Brevo
                       ▲
        Brevo webhook (bounce / spam) → mark address bad, stop sending
```
- **Templates are files in the repo** (`apps/backend/src/mail/templates/*.html|.txt`, English now, Hindi later) with `{{variables}}`, so wording is reviewed in pull requests instead of living in a dashboard.
- **Provider interface** `Mailer { send(msg): Promise<{id}> }` with `BrevoSmtpMailer`, `BrevoApiMailer` and `ConsoleMailer` (local development and tests).
- **Retries:** 3 attempts with exponential back-off; permanent failures (invalid address) are not retried.
- **Daily cap:** the free plan allows 300 sends/day; excess transactional mail is held in a retry queue of up to 1,000 by Brevo, and beyond that is not delivered [R32]. Our guard stops at 280 and defers lower-priority mail; an admin warning appears at 80 %.
- **Branding:** the free plan adds a small "Sent with Brevo" footer [R32]; acceptable for the pilot.

### Sender identity — no domain (Y2)
You will work without a domain for two years, so the mail cannot be authenticated with your own DKIM/SPF records. What to expect and how to cope:
- Brevo lets you send from a **verified single sender address**. If that address is on a big free-mail provider (for example Gmail) that publishes strict domain-authentication rules, Brevo may rewrite the sender to its own domain instead [R32]. Mail still goes out, but it looks less personal and is more likely to land in spam.
- **So make email non-critical:** nothing safety-related depends on it (`Emails are never part of SOS delivery`). Codes are short and forgiving: 10-minute life, resend after 60 s, and the app says "Check your spam folder".
- Use a plain, consistent subject ("Your Safora code: 482913"), no images, a short text alternative, and the same sender every time.
- Keep the 300/day guard (below) and never send marketing.
- If deliverability is bad in the beta, the cheapest fixes are a free student-pack domain [R43] (an option only if you change your mind) or another transactional provider behind the same `Mailer` interface.

### Data model
```sql
ALTER TABLE users
  ADD COLUMN email_verified_at TIMESTAMPTZ,
  ADD COLUMN email_bounced_at TIMESTAMPTZ,
  ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN language VARCHAR(5) NOT NULL DEFAULT 'en';

CREATE TABLE otp_codes (
  id BIGSERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL, purpose VARCHAR(20) NOT NULL,     -- verify_email|reset_password
  code_hash TEXT NOT NULL, attempts SMALLINT DEFAULT 0, expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON otp_codes (email, purpose, created_at DESC);

CREATE TABLE email_outbox (
  id BIGSERIAL PRIMARY KEY, to_email VARCHAR(255) NOT NULL, template VARCHAR(40) NOT NULL,
  vars JSONB NOT NULL DEFAULT '{}', priority SMALLINT DEFAULT 2, status VARCHAR(12) DEFAULT 'queued', -- queued|sent|failed|skipped
  attempts SMALLINT DEFAULT 0, last_error TEXT, provider_id TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT now(), sent_at TIMESTAMPTZ
);
```
Codes are stored **hashed** (HMAC-SHA-256 with a server secret); `vars` for code emails contain the code only until sent, then are cleared (so codes do not sit in the outbox).

### Endpoints
| Endpoint | Behaviour |
|---|---|
| `POST /api/auth/verify-email/request` (auth) | Sends a code; 60 s cooldown; 5 per hour per user |
| `POST /api/auth/verify-email/confirm` `{code}` (auth) | Max 5 attempts per code; sets `email_verified_at` |
| `POST /api/auth/forgot-password` `{email}` | **Always returns 202** with the same body whether or not the account exists; 3 per hour per email, 10 per hour per IP |
| `POST /api/auth/reset-password` `{email, code, newPassword}` | Validates code, sets password, **increments `token_version`** (signs out all sessions), sends "Password changed" |
| `POST /api/webhooks/brevo` | Shared-secret check; marks bounced/complained addresses |

### Rules
- Unverified users can use the app, **but cannot be added or matched as guardians and cannot receive guardian invitations** (closes the alert-interception gap in `03` §1).
- Never put codes in URLs or logs; redact `email_outbox.vars` in logs.
- Same response time for existing and unknown emails (do the hashing work either way).

### Mobile screens
`VerifyEmailScreen` (code entry, resend timer), `ForgotPasswordScreen`, `ResetPasswordScreen`; banner "Verify your email" until done.

### Acceptance criteria
- Register → receive email within 60 s → enter code → `email_verified_at` set.
- Forgot password for an unknown email returns the same response as for a known one.
- After reset, the previous JWT no longer works.
- With 300 sends already used, a verification email is queued, not lost, and an admin warning is visible.

---

## 2. Reports privacy and confirmations (SEC-2, SEC-3)

### SEC-2 — what public report responses may show ✅ (leak confirmed)
`reportRepository.findAll` and `nearby` join `users`, and `ReportModel.fromRow` returns `userId` and `reporterName` on unauthenticated endpoints.

**Your decision (Y4):** public reports show the reporter's **name only**. Implementation:
- Two DTOs: `PublicReportDto` and `StaffReportDto`.
- `PublicReportDto` carries `reporterName` (a **display name**) and nothing else about the person: **no `userId`, no email, no phone, no profile link.** Removing `userId` stops anyone from listing all reports of one person.
- `StaffReportDto` adds `userId` and contact details for moderation only.
- New profile field `display_name` (defaults to the first name). Users can change it; it is what appears on reports.

**Two safeguards I recommend (your call, Q3):**
1. **Per-report toggle "Show my name / Report anonymously"**, remembered as a default in Settings.
2. **Forced anonymity for sensitive categories** — harassment, suspicious activity, isolated area at night, anything a user marks "someone is involved". People who report a specific person can be found and targeted through their name; in these categories the app never shows the name publicly.

`reports.reporter_display` stores the name shown (or `NULL` for anonymous), so changing a profile name later does not rewrite old reports.

**Test:** an automated check that no public response contains `userId`, `user_id`, `email`, `phone`, and that `reporterName` is absent whenever the report is anonymous.

### SEC-3 — unique confirmations
```sql
CREATE TABLE report_confirmations (
  report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  vote VARCHAR(8) NOT NULL DEFAULT 'present',      -- present|cleared (see 04 §9)
  created_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (report_id, user_id)
);
```
`confirmReport` receives `req.user.id`, rejects the reporter, uses `INSERT … ON CONFLICT DO NOTHING`, recomputes `confirmations_count` from the table, and is rate-limited to 30 per 15 minutes per user.

---

## 3. Sessions, deletion, duress PIN (SEC-5, SEC-6, SEC-7)

### SEC-5 — session hardening ✅ (7-day JWT in plain AsyncStorage confirmed)
- Access token: JWT HS256, **15 minutes**, contains `sub`, `role`, `tv` (token version).
- Refresh token: random 256-bit, **rotating**, valid 30 days, stored **hashed** in `refresh_tokens(id, user_id, family_id, token_hash, expires_at, revoked_at, replaced_by, created_at, user_agent)`. Re-use of an old refresh token revokes the whole family.
- Endpoints: `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`.
- `users.token_version` checked on every request; password change/reset increments it.
- Mobile: tokens in **Keychain/Keystore** (`react-native-keychain` is installed but unused ✅); Axios interceptor refreshes once on 401 then retries.
- Socket.IO handshake uses the current access token; on refresh, reconnect.

### SEC-6 — account deletion
`DELETE /api/auth/account` (re-enter password) and **Profile → Delete account**.
Deletes: credentials, refresh tokens, trusted contacts, contacts and chat messages, medical card, journeys (+ breadcrumbs), tracking links, FCM token, notifications received, threads, pending emails; deletes audio files from Cloudinary; **anonymises** hazard reports (`user_id = NULL`) and SOS records kept for staff statistics (name/phone removed, coordinates rounded to ~100 m). Sends the "Account deleted" email, and tells guardians the link ended. A 7-day undo period is optional (decide with Q5/Q10).

### SEC-7 — duress PIN
Per-user 4–6 digit PIN set in Settings, stored in Keychain, rejected if trivial (`0000`, `1234`, `1111`, `9999`, repeated or sequential digits). The calculator triggers the silent SOS only for the exact PIN followed by `=` with no operator pressed. Existing `9999` default removed.

### SEC-4 — copy corrections (exact replacements)
| Where | Now | Replace with |
|---|---|---|
| `HomeScreen` | "Dispatches live coordinates to Family Guardians & Police 112" | "Sends live coordinates and audio to your guardians. Quick-dial 112 is one tap away." |
| `OnboardingScreen` | "256-bit encrypted coordinates" | "Encrypted (HTTPS) transmission" |
| SOS success/failure | any mention of police being alerted | remove |
| Onboarding, SOS screen | — | "Safora does not replace 112. Call 112 first in an emergency." |

---

## 4. Age policy and consent (AGE-1)

### What you asked (Y5)
Safora is for everyone; "above 12 we can add if need". The intention is good: many young people walk to school or tuition alone. **But under India's DPDP Rules, a user under 18 is a "child"**: the service must obtain **verifiable consent from a parent/guardian before processing the child's data**, and tracking or behavioural monitoring of children is restricted [R53][R54]. The exemptions are narrow and listed by type of organisation (healthcare, schools, crèches, child-transport) or purpose; a general safety app is not clearly inside them [R53][R54]. Safe Walk, live location and audio are exactly the kind of processing that matters here. **This is a legal question I cannot settle** — see `06` §4 and PUB-4.

### Recommendation
| Stage | Policy |
|---|---|
| Closed beta and public beta | **18+ only.** Confirmation checkbox at sign-up plus the beta being enrolled by hand |
| Later | Add a **teen mode (12–17)** only after (a) legal advice, (b) a real parental-consent method, (c) a parent account linked to the teen's account. Chat and media stay off for teens |

### Design so a teen mode can be added later
- Store only a boolean `age_confirmed_18_plus` and the date confirmed; **do not** collect birth dates now.
- Keep the guardian model general (any adult guardian), so a parent is just a special guardian later.
- Write the privacy notice in simple language now; teens and parents need to understand it.

### AGE-2 — the `parent-of` relationship (added 22 Sep 2026)
When teen mode is eventually built, a parent needs more than an ordinary guardian's alert-visibility — they need **consent authority**: the ability to approve the teen's account at signup and deactivate it later. This is deliberately a **relationship**, not a new role (see `architecture-decisions.md` for the roles-vs-relationships reasoning) — any ordinary `user` account can hold a `parent-of` link to a teen account, the same way any user can be a guardian.

```sql
CREATE TABLE parent_links (
  id SERIAL PRIMARY KEY,
  parent_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teen_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consented_at TIMESTAMPTZ,           -- NULL until the parent actually approves
  can_deactivate BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (teen_user_id)               -- one parent-of-record per teen account for V2's first version
);
```
- A teen account (`users.age < 18`, once real ages are collected under teen mode) cannot leave `consented_at IS NULL` state — no Safe Walk, no chat, no SOS-relevant features until a parent has approved.
- The parent's account gets a **guardian link automatically** (they're also a guardian, not just a consent-holder) — `parent_links` sits alongside `trusted_contacts`, doesn't replace it.
- **This entire section stays unbuilt until PUB-4's legal review is done** — it's documented now so the data model doesn't need retrofitting later, not because teen mode is scheduled.

### Consent screens (all users)
- Layered **privacy notice**: what we collect, why, who sees it, how long we keep it, how to delete it, contact for grievances [R28].
- Separate, unbundled consents: location for Safe Walk, microphone for SOS audio, notifications, SMS from the user's SIM. Each can be withdrawn in Settings.
- Persistent line: "Safora does not replace calling 112."

---

## 5. Language and accessibility (LOC-1)

- Libraries: `i18next` + `react-i18next` (or equivalent). Strings in `locales/en.json` and `locales/hi.json`; **no hard-coded UI text**. Use keys, plurals and interpolation.
- `users.language` drives push-notification and email templates; the backend sends **message codes + parameters**, the app renders them.
- TTS voice follows the app language where an installed voice exists 🔬.
- TalkBack: `accessibilityLabel`/`Role` on the SOS button, cancel countdown, map markers, hazard cards, Safe Walk controls; large-touch targets (≥ 48 dp) for emergency actions; do not rely on colour alone for severity.
- Test with long Hindi strings on small screens; Devanagari uses the system font stack.
- Admin panel stays English.

### LOC-5 — Vibration-only alert patterns (added 22 Sep 2026)
For deaf/hard-of-hearing users, distinct haptic patterns communicate what an audio/visual alert would — this reuses the same infrastructure already planned for the earphone-only/haptic voice-guidance mode (`map-routing-search.md` §5), repurposed for accessibility rather than discretion:

| Event | Pattern (proposal — tune with real deaf/HoH user feedback if possible) |
|---|---|
| Deviation prompt ("are you OK?") | Two short pulses |
| SOS sent successfully | One long pulse |
| SOS failed / no connectivity | Three short pulses, repeated once |
| Guardian acknowledged your alert | A single short pulse |
| Incoming alert from someone you guard | A distinct pattern, different from the above (e.g. long-short-long) so it's not confused with your own SOS state |

Implement via React Native's `Vibration` API with pattern arrays; expose as a Settings toggle ("Vibration patterns for alerts") rather than assuming — some users want both sound and vibration, some want vibration only.

---

## 6. Uttarakhand-specific content (LOC-2, LOC-3, LOC-4)

### 6.1 Hazard categories and severity guidance (LOC-2)
| Category | Severity 1–2 | 3 | 4–5 |
|---|---|---|---|
| Poor lighting | One lamp out | Stretch dark | Long unlit road/forest edge at night |
| Road hazard | Pothole | Broken footpath / open drain | Deep trench, missing barrier |
| Waterlogging / flash flood | Puddle | Ankle-deep water | Fast water, nala overflow, submerged crossing |
| **Landslide / blocked road** (new) | Loose stones | Partial blockage | Road closed / active slide |
| **Wildlife sighting** (new) | Monkeys / stray animals | Leopard signs | Confirmed big-cat or elephant near path |
| **Poor mobile coverage** (new) | Patchy | Frequent drops | No signal for > 500 m |
| Isolated area | Quiet | Empty at night | No people, no lights, no exit |
| Harassment / suspicious activity | Catcalling | Following | Threat / assault |
| **Damaged bridge / river crossing** (new) | Slippery | Weak rail | Unsafe to cross |

### 6.2 Sachet advisories (LOC-3) 🔬
India's national alert system (Sachet, built on the Common Alerting Protocol) publishes location-based disaster warnings from IMD, CWC and other agencies, with public RSS/CAP feeds per state [R31].
- Job: poll the Uttarakhand feed every 10 minutes, parse CAP (`event`, `severity`, `urgency`, `effective`, `expires`, `area` polygon/circle), store in `advisories`, de-duplicate on the CAP identifier.
- Delivery: in-app banner + map polygon; FCM topic `advisory-uttarakhand`; admin can also publish a **manual advisory** ("Rajpur Road waterlogged, avoid").
- 🔬 Confirm the exact Uttarakhand feed URL and its terms of use before building; if the feed is unusable, ship manual advisories only.
```sql
CREATE TABLE advisories (
  id BIGSERIAL PRIMARY KEY, source VARCHAR(20) NOT NULL, external_id TEXT, event TEXT, severity VARCHAR(12),
  urgency VARCHAR(12), headline TEXT NOT NULL, description TEXT, area GEOGRAPHY(Geometry,4326),
  effective TIMESTAMPTZ, expires TIMESTAMPTZ, created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source, external_id)
);
```

### 6.3 Audit-style ratings (LOC-4)
SafetiPin's method is a nine-factor safety audit (lighting, openness, visibility, crowd, security presence, walk-path condition, public transport, presence of women and children, feeling of safety) [R35]. Add an optional **Rate this place** flow with these factors on a 1–5 scale.
```sql
CREATE TABLE place_audits (
  id BIGSERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  location GEOGRAPHY(Point,4326) NOT NULL, lighting SMALLINT, openness SMALLINT, visibility SMALLINT,
  crowd SMALLINT, security SMALLINT, footpath SMALLINT, transport SMALLINT, diversity SMALLINT, feeling SMALLINT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
Audits are shown as an aggregated score per ~100 m cell; they feed the safety score with a **low weight** until the pilot shows they are reliable.

### 6.4 Other local items
- Local helplines page (112, 108, 1090 — as already in the app; add verified DBUU security and nearest police station numbers after checking them by phone).
- Monsoon mode (June–September): reminder banner, stronger waterlogging/landslide visibility.
- Dead-zone awareness: warn before a Safe Walk starts if the route crosses reported no-signal areas, and suggest a longer *lost-contact* threshold for that walk.

---

## 7. Admin and campus operations (ADM-1…ADM-4)

### ADM-1 — dispatch workflow
- SOS states: `dispatched → acknowledged → assigned → resolved` (+ `false_alarm`).
- Actions: assign responder (name/phone), add note, **log a call-back attempt** (a call to the user within ~10 seconds is how Delhi Police's Himmat Plus verifies alerts before acting [R7]), mark false alarm.
- Every action is written to an append-only audit table.
```sql
CREATE TABLE sos_events (
  id BIGSERIAL PRIMARY KEY, sos_id INTEGER REFERENCES sos_alerts(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id), type VARCHAR(20) NOT NULL, -- status|assign|note|callback|false_alarm
  data JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now()
);
```
- Staff actions on sensitive records (view audio, view identity) are logged in `staff_audit_log`.

### ADM-2 — campus console
`organizations(id, name)`, `users.org_id`, role `campus_admin`; staff see only alerts and users of their organisation (row-level checks in every staff route). Needed only after the pilot proves the workflow.

### ADM-3 — analytics
Incidents by hour/day (heatmap), time-to-acknowledge and time-to-resolve, false-alarm rate, top hazard clusters, guardian ack rate. Exportable CSV.

### ADM-4 — evidence packet (PDF)
Timeline of events, coordinate list and last-known position, battery log, audio link, guardian acknowledgements. Footer: "Generated by Safora; not certified evidence." No claim of court admissibility — electronic-evidence rules have specific certification requirements (review).

---

## 8. Moderator role — actually using it (SEC-10, added 22 Sep 2026)

> Your backend already has this: `middleware/auth.ts`'s `requireStaff` accepts `role === 'admin' OR role === 'moderator'`; `requireAdmin` accepts `admin` only. The role has simply never been assigned to a real account or given its own UI. This section documents how it should actually work, since — per your own note — nothing has been built around it yet.

### Why this exists
Right now your only realistic choice is "give someone full `admin`" or "give them nothing." As soon as more than one person touches the admin panel (your support member, and later any additional staff), that's a real least-privilege gap — a support member moderating hazard reports doesn't need the ability to change another user's role or view system diagnostics.

### Permission split
| Capability | `moderator` | `admin` only |
|---|:---:|:---:|
| View/moderate hazard reports (approve, reject, mark duplicate/resolved) | ✅ | |
| View and manage the SOS alert queue, including audio playback | ✅ | |
| View active Safe Walks, all users list, usage stats | ✅ | |
| Dispatch actions — assign responder, notes, call-back log (`ADM-1`) | ✅ | |
| **Flag a user account for abuse** (spam/fake reports) — reports to admin, does not act directly (per your decision) | ✅ | |
| Change a user's role (assign/revoke `moderator`/`admin`) | | ✅ |
| Suspend/unsuspend a user account | | ✅ |
| View system diagnostics (`/api/diagnostics`) | | ✅ |
| Anything touching environment config, keys, billing | | ✅ |

This matches your existing `requireStaff`/`requireAdmin` code split exactly — the work here is (a) actually assigning `moderator` to real accounts via the admin Users page, (b) building the abuse-flag queue below, and (c) making sure any *new* V2 admin route picks the right guard rather than defaulting everything to `requireAdmin` out of caution.

### Abuse-flag queue (moderator reports, admin decides)
A moderator reviewing hazard reports may notice a pattern — repeated spam, fake reports, harassment via the report-text field — that needs account-level action (suspension) they're not permitted to take directly. Per your decision: **moderators flag, admins act.**

```sql
CREATE TABLE abuse_flags (
  id SERIAL PRIMARY KEY,
  flagged_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flagged_by INTEGER NOT NULL REFERENCES users(id),   -- the moderator
  reason TEXT NOT NULL,
  evidence_report_ids INTEGER[] DEFAULT '{}',          -- linked reports.id values, if relevant
  status VARCHAR(20) NOT NULL DEFAULT 'open',           -- open | actioned | dismissed
  reviewed_by INTEGER REFERENCES users(id),             -- the admin who resolved it
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- New admin-panel page/tab: **Flagged Accounts** — a dedicated queue (your decision: separate queue, not just a note on the user record), showing `open` flags first, who flagged, why, and one-click links to the evidence reports.
- `POST /api/abuse-flags` (moderator or admin) creates a flag; `PATCH /api/abuse-flags/:id` (admin only) sets `status` to `actioned` (and typically also suspends the user via the existing `PATCH /users/:id/status` endpoint as a separate, explicit action) or `dismissed`.
- A moderator flagging the same user repeatedly with no admin action is itself a useful signal — worth a simple count/sort in the queue UI rather than new logic.

### What NOT to build
Don't let a moderator's flag *automatically* suspend anyone, even after N flags — per your decision, the human admin decision stays in the loop. Automatic suspension is a different (riskier) feature, not what was asked for.

## 9. Emergency medical card (MED-1)

### What you asked (Y10)
Keep the medical information because it helps when an ambulance comes. Agreed — it is useful, so it stays, but it is **sensitive health data** and needs stricter handling than the rest of the profile.

### What it is
An **optional** card the user fills in if they wish: blood group, allergies, medical conditions, regular medications, and one free-text note ("I carry an inhaler"). Nothing is required to use Safora.

### Who can see it, and when
| Viewer | When |
|---|---|
| The user | Always (Profile → Emergency medical card) |
| Verified guardians | **Only inside an active SOS** they received — never in normal use |
| Staff/responders | Only inside an SOS they are handling; each view is written to `staff_audit_log` |
| Everyone else | Never |
It is **not** shown on hazard reports, tracking links or chat, and it is excluded from analytics and exports.

### Storage and protection
- Encrypt the card **at rest in the application** (AES-256-GCM with a server key kept in an environment variable, one random nonce per row), so a database dump alone does not reveal it.
- Store separately from the main profile: `medical_cards(user_id PK, ciphertext BYTEA, nonce BYTEA, key_version SMALLINT, updated_at)`.
- Included in account deletion (SEC-6); the user can delete just the card at any time.
- The privacy notice names this data and its purpose ("shown to your guardians and responders during an SOS").
- Response never logged; SOS payload includes the card only if `include_medical=true` on that alert (user can toggle per SOS in Settings, default on when a card exists).

### API
`GET/PUT/DELETE /api/me/medical-card` (auth, own data only). The SOS fan-out (TRK-9) attaches a decrypted copy to the alert record for authorised viewers and clears it when the alert is anonymised.

### Acceptance criteria
- A database dump contains no readable medical text.
- A guardian who is not part of the active SOS cannot fetch the card (403).
- Every staff view appears in the audit log.
- After the user deletes the card, no future SOS includes it and the row is gone.

