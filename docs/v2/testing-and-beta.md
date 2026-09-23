# Testing & Beta Plan — V2

> This is the **V2** testing plan: full device-brand coverage, all scenario tests, CI gates, and a closed beta of 5–8 people before any public release. V1 uses a much lighter solo-testing checklist instead — see `docs/v1/testing-and-submission.md`. "Pilot"/"beta" here means a limited real-world trial before wide release. Tests are designed around **failure**: dead phone, no signal, killed app, wrong guardian, leaked link. Targets marked *(proposed)* are starting points to confirm in the beta. Tags: 🔬 needs confirmation.

## 1. Principles

1. **Test the alert, not the button.** A test passes only when a *guardian device* received the alert.
2. **Real devices for anything background.** Emulators do not behave like Xiaomi or Realme phones [R17].
3. **Every safety rule has a simulation test** (clock-driven) **and** a real-phone test.
4. **No real-emergency use during tests.** Drills use **Test SOS** and named test guardians.

---

## 2. Real-device matrix

Use the phones the team and beta testers actually own; cover at least these dimensions:

| Dimension | Minimum coverage | Why |
|---|---|---|
| Brand / OS skin | Samsung (One UI), Xiaomi/Redmi/POCO (MIUI/HyperOS), Realme/Oppo/Vivo (ColorOS/Funtouch), plus one near-stock (Motorola/Pixel) | Battery managers and autostart rules differ [R17] |
| Android version | 10, 12, 13, 14 or newer | Foreground-service limits [R11][R12]; restricted settings step for sideloaded apps 🔬; notification permission (13+) |
| RAM | One phone with ≤ 3 GB | Low-memory kills; WebView map performance |
| SIM | One dual-SIM phone | On-device SMS SIM choice |
| Network | Wi-Fi, 4G, weak 3G/2G, airplane mode, data off with SIM on | SMS fallback, offline queue |

### Per-device checklist (record pass/fail in a shared sheet)
| # | Check | Related items |
|---|---|---|
| D1 | Install APK, complete onboarding, enable battery exemption/autostart via the checklist | TRG-2 |
| D2 | Safe Walk for 20 minutes with screen locked; breadcrumbs continue | TRG-2, TRK-1 |
| D3 | Force-stop app during a walk → server escalation fires (rule timings) | TRK-4 |
| D4 | Notification-action SOS with app swiped away | TRG-3 |
| D5 | Quick Settings tile SOS from lock screen (note whether unlock is requested) | TRG-3 |
| D6 | Volume-pattern trigger (enable accessibility service, note the exact taps needed on this OS) | TRG-4 |
| D7 | On-device SMS with data off and SIM on; delivery status appears later | TRK-8 |
| D8 | Locked-screen audio: which approach (A/B/C) worked | TRG-6 |
| D9 | Map: pan/zoom smoothness, English labels, offline pack works in airplane mode | MAP-1/2 |
| D10 | Voice guidance with and without earphones; re-route after wrong turn | MAP-5 |
| D11 | Battery: % drop per hour of Safe Walk (screen off) | TRG-2 |
| D12 | After a system reboot, Guard mode/service state is correct | TRG-2 |

---

## 3. Scenario tests (manual drills)

### 3.1 SOS and alerts
| # | Scenario | Expected |
|---|---|---|
| S1 | SOS with one app guardian and one SMS-only contact | One message per channel per guardian; staff console shows all deliveries |
| S2 | SOS with data off | SMS sent from the phone; server alert appears after reconnect |
| S3 | Guardian is `pending` or `revoked` | Receives nothing |
| S4 | Two accounts registered for the same guardian email, one unverified | Only the verified, accepted account receives alerts |
| S5 | Cancel during the 3–5 s countdown | Nothing sent |
| S6 | Guardian taps "I'm on it" | Walker and staff see the acknowledgement |
| S7 | Resolve the alert | All-clear message; tracking link expires |
| S8 | Drill (`is_test`) | Labelled `[DRILL]`; no staff page |
| S9 | SOS with an emergency medical card, viewed by a guardian in the SOS and by a non-participating guardian | Participant sees the card; the other gets 403; staff view is audit-logged |

### 3.2 Safe Walk and watchdog
| # | Scenario | Expected (defaults) |
|---|---|---|
| W1 | Walk 200 m off route, ignore prompt, app open | Escalation at ~60 s |
| W2 | Same, but app killed | Escalation at 60 ± 5 s (server) |
| W3 | Stop updates (airplane mode) mid-walk | Walker push at ~3 min; soft guardian notice at ~6 min; escalation at ~12 min |
| W4 | Arrive late (ETA + 10 min) with no response | Prompt, then guardian notice, then escalation per rules |
| W5 | Reconnect after a *lost contact* notice | Status returns to Active; guardians get an all-clear if they were notified |
| W6 | Restart backend mid-walk | No duplicate or missed alerts |
| W7 | Check-in timer 15 min, phone off | Escalation at 16 min |
| W8 | Walk through a known dead zone with a longer lost-contact threshold | No false escalation |

### 3.3 Tracking link and privacy
| # | Scenario | Expected |
|---|---|---|
| P1 | Open the link on a laptop during a walk | Marker moves with < 3 s lag; only first name, position, status, last update |
| P2 | Revoke the link | Viewer stops within 5 s |
| P3 | Use an expired/unknown/revoked token | Identical 404 response and timing |
| P4 | Call `/api/reports` and `/api/reports/nearby` unauthenticated | No `userId`, `reporterName`, email or phone anywhere |
| P5 | Confirm a report twice, and confirm your own report | Second confirm ignored; self-confirm rejected |
| P6 | Delete account | Data removed per `06` §2; guardians told; audio deleted from Cloudinary |
| P7 | Old JWT after password reset | Rejected |

### 3.4 Accounts and email
| # | Scenario | Expected |
|---|---|---|
| E1 | Register → email arrives ≤ 60 s → code verifies | `email_verified_at` set |
| E2 | Forgot password for unknown and known email | Same response |
| E3 | Wrong code 6 times | Locked until a new code; attempts capped at 5 |
| E4 | 300 sends already used today | Auth mail queued, admin warning shown |
| E5 | Email lands in spam? | Record the result per provider (Gmail, Outlook, college mail) and fix DKIM/sender if so |

### 3.5 Map, search and routing
| # | Scenario | Expected |
|---|---|---|
| M1 | Pan to Tokyo, Kathmandu, Beijing | English/Latin labels |
| M2 | Network log for 5 minutes | Zero requests to `tile.openstreetmap.org`; no provider keys in requests from the phone |
| M3 | 20-query search set (5 misspellings, 5 Hindi-transliterated) | Expected place in top 3 for ≥ 90 % *(proposed)* |
| M4 | Walk vs car route for two campus points with a footpath shortcut | Different geometry and time |
| M5 | Disable provider 1 | Automatic fallback to provider 2, then 3 |
| M6 | "Safest" vs "Fastest" near a seeded hazard | Safest avoids it, shows extra time |
| M7 | Offline pack, airplane mode | Pan/zoom 10–16 with road names |

---

## 4. Automated tests and CI gates (ENG-3, ENG-4)

| Layer | Add | Gate |
|---|---|---|
| Unit | Decay per category, watchdog rules with a fake clock, OTP hashing/expiry, guardian status transitions, DTO redaction | Coverage ≥ 60 % backend, up from ~32 % (proposed) |
| Integration | PostGIS in a container: `ST_DWithin`, clusters, corridor, confirmations uniqueness, breadcrumb inserts; run against migrations | Must pass |
| API contract | Response-shape snapshots (no identity fields; tracking JSON fields fixed) | Must pass |
| Mobile | Component tests for SOS countdown and offline queue; Maestro flows for "SOS from home" and "Safe Walk start/complete" on an emulator | Nightly, not per push |
| Security | gitleaks, CodeQL, `npm audit --omit=dev`, Dependabot | Must pass |
| Build | Android debug APK build in CI; remove `--passWithNoTests` | Must pass |
| Migrations | Apply all migrations on an empty database and on a snapshot | Must pass |

Simulation harness (backend): a script that starts a fake journey, feeds GPS points from a file, then stops sending or goes off route, and asserts which alerts were created and when. It is the automated form of W1–W8.

---

## 5. Closed beta (before a public release)



### What "pilot" / "beta" means
A limited, real-world trial with a few volunteers *before* the app is released widely. The goal is to find failures (dead zones, battery killers, confusing screens, false alarms) while the audience is small and known. You asked what a pilot is — this is it, sized to what you can actually recruit.

### Goals
1. Show that alerts reach guardians reliably on real phones and networks.
2. Measure false-alarm rate and battery cost.
3. Learn what people actually use (hazard reports, Safe Walk, triggers).
4. Collect improvement priorities for the public beta.

### Who and how many
**5–8 adult volunteers** (you, your support member, family, friends, anyone in Dehradun), each with **one or two guardians who also install the app**. Aim for at least **two different phone brands** including one Xiaomi/Realme/Oppo/Vivo-class device. No student rosters and no bulk personal data: everyone joins by name, on purpose, and can leave any time.

### Preconditions
- [ ] Gate: M1 + M2 + M3a shipped (`02` §3).
- [ ] Each tester signs a one-page consent (what is collected, how long kept, how to delete) — `06` §9.
- [ ] Beta banner in the app: "Beta — do not rely on Safora as your only safety measure. Call 112."
- [ ] D1–D5 and S1, S2, W2 passed on your own phones.
- [ ] A named person on call during each test window and a written procedure for a real emergency.

### Schedule (7 days)
| Day | Activity |
|---|---|
| 0 | Briefing, install, onboarding checklist, drill: everyone runs **Test SOS** with each trigger they enabled |
| 1–5 | Normal use: at least one Safe Walk per day (one after dark on a lit route), two hazard reports each; one **surprise drill** per participant at a random time |
| 3 | A walk through an area with weak signal to observe lost-contact behaviour |
| 6 | Short survey (usability + custom questions) for testers and guardians |
| 7 | Debrief; export the metrics; **delete each tester's data** unless they opt in to keep it |

### Safety rules
- Only **Test SOS** for drills; real emergencies → **call 112 first**.
- If a real (non-test) SOS arrives: the on-call person calls the user, then escalates to 112/local help.
- Nobody is asked to go anywhere unsafe to "test" the app. Testers can withdraw and have data deleted at any time.

### Metrics and targets *(proposed)*
| Metric | Definition | Target |
|---|---|:---:|
| Alert delivery time (app) | Trigger → guardian push received | median < 10 s, p95 < 30 s |
| Multi-channel success | Drills where every configured channel delivered | ≥ 95 % |
| Server-side escalation timing | Off-route/stale → escalation vs configured time | within ± 30 s |
| False escalations | Escalations with no real problem per 10 walks | ≤ 1 |
| Guardian acknowledgement | Delivery → "I'm on it" | median < 2 min |
| Battery drain | % per hour of Safe Walk with screen off | ≤ 10 % |
| Crash-free sessions | Sessions without crash | ≥ 99 % |
| Usability | Simple 1–5 rating + comments (too few people for a formal score) | ≥ 4 on "I would use it again" |

With only 5–8 people these numbers show **whether things work**, not statistics. Treat any failure as a bug to fix, not noise.

### Exit criteria
Every configured channel delivered in ≥ 95 % of drills, no privacy incident, no unhandled real emergency, no open P1 defect. Otherwise repeat the affected drills after fixes.

### Beta report template
Summary · Setup · Metrics vs targets · Device notes per brand · What broke · False alarms · Feedback themes · Recommendations · Data-deletion confirmation.

### Public-beta gate (after this)
Do not open the APK to the public until M4 and PUB-1, PUB-2 and PUB-4 are complete (`02` §3, `06` §10).

---

## 6. Release checklist (every APK)

- [ ] CI green (build, tests, gitleaks, CodeQL).
- [ ] `08` §2 D1–D5 and S1, S2, W2 re-run on two phones.
- [ ] Version bumped, changelog written, "critical update" flag set only for safety fixes.
- [ ] APK signed with the release key, SHA-256 published in the release notes.
- [ ] Docs status tags updated for merged items.
- [ ] Backup taken before any migration (ENG-8).
