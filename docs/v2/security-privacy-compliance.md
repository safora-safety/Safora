# 06 — Security, Privacy and Compliance

> **v2 (21 Sep 2026):** updated for a public product, reporter display names, an emergency medical card, staged chat and your all-ages request. **Not legal advice.** This is an engineering summary to support conversations with your supervisor and the university. Retention periods and legal readings marked "proposal" or 🔬 must be confirmed. Tags: ✅ verified · 📄 documented only · 🔬 needs confirmation · 🗓 planned.

## 1. Principles

1. **Collect the least; keep it the shortest time.** Location exists to protect a walk in progress, not to build a history.
2. **The walker is in control.** Nothing is shared without a visible, revocable consent.
3. **A safety app must not become a surveillance tool.** Guardian features are designed against coercive use (§5).
4. **Honest claims.** The UI never promises what the system does not do (SEC-4).
5. **Defence in depth.** No single control (rate limit, JWT, signed URL) is treated as sufficient.

---

## 2. Data inventory and retention (proposal)

| Data | Where | Sensitivity | Why we hold it | Proposed retention |
|---|---|:---:|---|---|
| Name, email, phone, password hash | `users` | Medium | Account | Until deletion; warn then delete after 24 months inactive |
| Emergency medical card (blood group, allergies, conditions, medications, note) | `medical_cards` (encrypted) | **High — health data** | Shown to guardians/responders **only during an SOS** | Until the user deletes it or the account |
| Display name | `users.display_name`, `reports.reporter_display` | Low–Medium | Shown on public reports (Y4) | Until deletion; anonymous reports store none |
| Guardian names, phones, emails | `trusted_contacts` | Medium — **third-party data** | Alerts | Until removed/revoked or account deleted |
| Hazard reports (location, text, photo) | `reports` | Low–Medium | Community map | Kept; identity never public; `user_id` cleared on deletion |
| Safe Walk route + breadcrumbs | `journeys`, `journey_breadcrumbs` | **High** | Corridor check, escalation | **30 days** (review), consider 7 |
| SOS event (location, battery) | `sos_alerts` | **High** | Response | Full detail 90 days, then anonymised for statistics |
| SOS audio | Cloudinary (signed URL) | **High** | Evidence | **30 days**, then delete asset |
| Tracking links | `tracking_links` | High | Guardian viewing | Expire automatically; rows purged after 30 days |
| Chat messages and contacts list | `messages`, `contacts` | Medium–High | Coordination between accepted contacts | 30 days after last activity; deleted with the account |
| Chat media (voice, images) | Cloudinary (signed, expiring URLs) | High | CHT-3 | Deleted with the message; hard cap 30 days |
| FCM token | `users` | Medium | Delivery | Until logout/revoke/deletion |
| Email codes | `otp_codes` | High (short-lived) | Verification | Hashed; purge 24 h after use/expiry |
| Outgoing email queue | `email_outbox` | Medium | Delivery | 30 days; code payload cleared once sent |
| Server logs | Render | Medium | Debugging | 14 days; **no** coordinates, tokens or codes in logs |

Processors: Neon (database), Render (hosting), Cloudinary (audio/photos), Firebase (push), Brevo (email), tile/routing/search providers (receive queries and coordinates — proxy them through the backend so end users' IPs are not exposed).

---

## 3. Threat model

| # | Threat | Example | Mitigation | Item |
|---|---|---|---|---|
| T1 | Reporter identification | Scrape `/api/reports` to find who reported a stalker ✅ | No identity in public DTOs; staff-only | SEC-2 |
| T2 | Confirmation stuffing | One script fakes "community verified" ✅ | Unique confirmations, self-confirm block, limiter | SEC-3 |
| T3 | Guardian hijack | Stranger registers a guardian's email first and receives alerts ✅ | Verified email + accepted handshake | ACC-2, ACC-5 |
| T4 | Stolen token | Phone/backup theft gives 7-day access ✅ | 15-min access, rotating refresh, Keychain, `token_version` | SEC-5 |
| T5 | Tracking-link leak | Link forwarded or posted | Short life, revocable, minimal fields, `no-store`, rate limit, no history | TRK-6 |
| T6 | IDOR | User A reads User B's journey/contact/audio | Ownership checks exist ✅; add tests for new tables | ENG-3 |
| T7 | Fake SOS / spam | Repeated false alarms exhaust guardians and staff | Per-user limits ✅; drills labelled; staff can mark false alarm; repeated false alarms flagged | ADM-1 |
| T8 | Alert fatigue | Too many false deviations/dead-zone alerts | Tiered watchdog rules; tune in pilot | TRK-4 |
| T9 | Phone dead or taken | No escalation because everything runs on the phone ✅ | Server watchdog | TRK-4 |
| T10 | Secrets exposure | Keys in a public repo ✅ (MapTiler in source; earlier credentials in history, since rotated) | Rotate, proxy, gitleaks in CI and pre-commit | SEC-1, ENG-4 |
| T11 | Admin misuse | Staff browse identities or audio without need | Role scoping, audit log of sensitive views | ADM-1 |
| T12 | Account enumeration | Forgot-password reveals who is registered | Uniform responses/timing | ACC-3 |
| T13 | Brute force | Password/code guessing | Per-email + per-IP limits ✅; code attempts capped | ACC-2/3 |
| T14 | Accessibility-service abuse | Trigger service reads other apps' screens | Key-event filter only, no window content, in-app disclosure, kill switch | TRG-4 |
| T15 | Malicious APK | Fake "Safora" APK circulated | Official releases only, published SHA-256, signed builds, in-app version check | ENG-7 |
| T16 | Public-service abuse | Backend used to scrape Photon/routing quotas | Auth + per-user limits + caching on proxy endpoints | MAP-3, MAP-4 |
| T17 | Coercive guardian use | Someone forces a person to add them and watches them | §5 rules | ACC-5, TRK-6 |
| T18 | Chat abuse and grooming | A stranger contacts a young or vulnerable user | Contacts-only chat (mutual acceptance), block/report, moderation queue, no chat for minors | CHT-2, PUB-3 |
| T19 | Illegal or abusive media | Images/voice notes used to share harmful content | Size and type caps, only accepted contacts, report button, signed expiring URLs, deletion on report | CHT-3, PUB-3 |
| T20 | Reporter exposed by name | Someone who reports a stalker is identified and targeted | Display name only, per-report anonymity, forced anonymity for sensitive categories | SEC-2 |
| T21 | Minors on a location app | A child uses Safe Walk without parental consent | 18+ policy at launch; teen mode only after legal advice | AGE-1 |
| T22 | Medical data leak | Database dump exposes health information | Application-level AES-GCM encryption; separate table; audit log on staff views | MED-1 |

---

## 4. India — DPDP Act 2023 and Rules 2025 (engineering view)

The Digital Personal Data Protection Rules were notified on **13 November 2025** with a phased start; the core obligations for data fiduciaries take effect **13 May 2027**, and one summary says penalty powers switch on from **13 November 2026** [R28][R29] 🔬 (confirm dates). A college project that processes location, audio and third-party contact details should already behave as if these apply.

| Duty (summary) | Safora response | Item |
|---|---|---|
| Clear, itemised notice and valid consent [R28] | Layered privacy notice at sign-up; separate consents for location, microphone, notifications, SMS from the user's SIM | AGE-1 |
| Purpose limitation and retention limits | Retention table in §2; scheduled purge job | ENG-1, SEC-6 |
| Erasure when the purpose ends or consent is withdrawn | Account deletion; withdraw-consent switches | SEC-6 |
| Reasonable security safeguards — encryption, access control, authentication controls, monitoring/logging [R28] | TLS everywhere; role checks; Keychain; refresh rotation; audit log; structured logs | SEC-5, ENG-5 |
| Breach handling — inform affected people without delay in plain language [R28]; reporting to the Board also has a 72-hour element in secondary summaries [R29] 🔬 | Incident playbook (§8) | — |
| **Children (under 18):** verifiable parental consent before processing; tracking and behavioural monitoring of children restricted; exemptions are narrow and mostly by type of organisation (healthcare, schools, crèches, child transport) or specific purposes [R28][R53][R54] | **18+ at launch.** Teen mode later, only with legal advice and a real consent method (see below) | AGE-1, PUB-4 |
| Processor contracts | Keep a list of processors (§2); use each provider's standard data-processing terms | — |
| Contact point for questions | Grievance email in the app and privacy notice | AGE-1, PUB-1 |

### Your "all ages" request in detail (Y5)
- **What the rules say (summaries, not legal advice):** anyone under 18 is a child. A service must get verifiable consent from a parent or lawful guardian *before* processing a child's personal data, and must not track or behaviourally monitor children [R53][R54][R55]. The exemptions in the Fourth Schedule apply to named types of organisation (clinical establishments, educational institutions, crèches, transport for schools) and to certain purposes such as emergency medical care and child-safety monitoring, each with conditions [R53][R54]. A general public safety app is not obviously one of them; whether "the child chooses to share their own location with their own guardians" changes that is exactly what a lawyer should answer.
- **Why it matters here:** Safe Walk collects continuous location, SOS collects audio, and chat and media add more. Those are the high-risk processing types.
- **Consent method:** the Rules describe approved ways to verify a parent, including checks linked to India's DigiLocker identity system [R56]; that is a build-and-integrate task, not a checkbox.
- **Penalties:** the Act allows large penalties for breaches of children's-data duties [R55] 🔬 (confirm amounts in the Act before quoting them).
- **What I recommend:** launch **18+**. Build the guardian model so a **parent** is just an adult guardian, then add a **teen mode (12–17)** with parent-verified consent, chat/media off, and no advertising or profiling. Do this only after PUB-4.
- **What I cannot do:** tell you your exposure. Talk to your supervisor or a lawyer before allowing under-18s.

**Also in this jurisdiction:** the Telecom regulator requires registered templates for application-to-person SMS [R30], which is why Safora sends SMS from the **user's own SIM** instead of a bulk gateway. Recording audio of other people may have legal limits; SOS audio is recorded **from the user's own device, on the user's own trigger, with a clear consent screen**. Get the supervisor's or university legal cell's view before the pilot 🔬.

---

## 5. Anti-coercion design rules (change how guardians work)

Location-sharing apps can be turned into tools of digital coercive control; research links their use in relationships to higher risk [R36], and Android's policy on tracking apps requires clear notice, consent and a persistent notification while tracking happens [R38]. Safety-app guidance also stresses that users must control when, how and with whom their information is shared [R37]. Rules:

| # | Rule | Implementation |
|---|---|---|
| D1 | **No tracking without a walker-started action** | Sharing exists only during a Safe Walk, SOS or check-in the walker starts (or the watchdog escalates) |
| D2 | **Visible while active** | Persistent notification and an in-app banner "Sharing with 2 guardians" whenever any link or guardian can see the location |
| D3 | **One-tap stop** | "Stop sharing" ends links and removes guardians from the current event immediately |
| D4 | **Guardians opt in** | `pending → verified` handshake; nothing but the invitation is sent before acceptance |
| D5 | **Guardians can leave** | In the app; the walker is told |
| D6 | **No forced use** | Nothing in the app requires having a guardian; "for partners" or "monitor someone" wording is never used |
| D7 | **Least revealing viewer** | First name only; no phone; no history except during an escalation |
| D8 | **Transparency** | Settings shows "Who can see me right now" and a log of past sharing (who, when, how long) |
| D9 | **Invite rate limits and blocking** | 10 invites/day; "I don't know this person" blocks the sender |
| D10 | **Safe exit** | "Remove all guardians and end all links" in Settings; also possible after a duress trigger |
| D11 | **Test before trust** | US researchers found several safety apps failed to send correct location or any information [R37]; every release must pass the drill checklist in `08` |

---

## 6. Secrets and supply chain

- `.env` files are git-ignored ✅; `.env.example` lists every variable with no values.
- **Never ship a secret inside the APK.** Anything in the APK is public. Map, routing, geocoding, email and bot keys live only on the backend; the phone calls the backend.
- Keys to keep server-side: `JWT_SECRET`, Cloudinary, Firebase service account, Brevo SMTP/API keys, Stadia/ORS/MapTiler keys, internal tick secret.
- History: earlier credentials sit in 2–3 old commits and were revoked (review) ✅. Run `gitleaks` over the full history once, then on every push (CI) and pre-commit (Husky is already present ✅).
- CI additions (ENG-4): CodeQL, Dependabot, lint, Android debug build, coverage threshold; keep `npm audit` clean (currently 0 vulnerabilities ✅ review).
- Rotate every key when a team member leaves.

---

## 7. APK distribution security

- **Release signing key**: generated once, stored offline (two team members), never committed. Losing it means users must uninstall to update.
- Publish APKs only on the repo's **GitHub Releases** with the SHA-256 checksum and a short verification note in the README; tell users to install nothing else.
- R8/ProGuard enabled ✅ (review); check `android:allowBackup` is `false` and cleartext HTTP is disabled 🔬.
- In-app **update check** against the Releases API (ENG-7) with "critical update" flag for safety fixes.
- Onboarding warns about the Android 13+ extra step for sideloaded apps when enabling accessibility features 🔬.

---

## 8. Incident playbook (short)

1. **Detect:** Sentry/log alert, user report, or a scan finding.
2. **Contain (within hours):** rotate affected keys, revoke sessions (`token_version++`), disable the affected endpoint.
3. **Assess:** which data, which users, since when. Use `staff_audit_log` and provider logs.
4. **Notify:** affected users without delay, in plain language, saying what happened, what data, what to do, and who to contact; prepare the report the regulator may require within the stated time [R28][R29] 🔬.
5. **Fix and learn:** patch, add a regression test, update this document.

---

## 9. Disclaimers to show in the product (final wording to be approved)

- "Safora is a community safety tool and does not replace calling 112. In an emergency call 112 first."
- "During the pilot, only use the **Test SOS** button for drills."
- "Alerts depend on phone signal, battery and settings; delivery is not guaranteed."
- Pilot participation is voluntary, with a written consent form and a way to leave and delete data at any time.

---

## 10. Public-launch readiness checklist (PUB-1…PUB-5)

You told me Safora is for the public, not only for college. That changes the bar. Before anyone outside the beta group installs it:

| # | Item | Why |
|---|---|---|
| 1 | **Terms of use and privacy policy** written for what the app really does (start from a template; have someone qualified read it) | Users' consent depends on it; DPDP notice duty [R28] |
| 2 | **Grievance contact** inside the app (an email you monitor) and a promise of how fast you reply | DPDP; trust |
| 3 | **Account deletion** and "withdraw consent" switches working | SEC-6; DPDP erasure |
| 4 | **Paid, always-on hosting and a paid database** (one small paid instance is usually enough) | A safety app that sleeps is unsafe (R-5) |
| 5 | **Backups and a restore drill** | Neon's free plan has short history and no scheduled backups [R40] |
| 6 | **Moderation queue** for reported hazards and reported chat messages, and a person who checks it daily | Abuse handling; T18–T20 |
| 7 | **Legal review** of: children's data, chat and media (possible intermediary duties), recording audio, map borders 🔬 | PUB-4 |
| 8 | **Support inbox** and an in-app "report a problem" | PUB-5 |
| 9 | **Clear beta wording** in the app: "Beta. Do not rely on Safora as your only safety measure. Call 112." | Honest claims |
| 10 | **Incident playbook** rehearsed once (§8) | Breach duties |

Until items 1–5 are done, keep distribution to the closed beta.

