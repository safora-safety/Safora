# Testing and Beta Plan – Version 2

> This is the **V2** testing plan: full device-brand coverage, all scenario tests, CI gates and a closed beta of 5 to 8 people before any public release. V1 used a lighter, solo checklist; see [`../v1/testing-and-submission.md`](../v1/testing-and-submission.md). "Beta" here means a limited real-world trial before wide release.
>
> Tests are designed around **failure**: a dead phone, no signal, a killed app, the wrong guardian, a leaked link. Targets marked *(proposed)* are starting points to confirm in the beta. 🔬 marks items that need confirmation.

## 1. Principles

1. **Test the alert, not the button.** A test passes only when a *guardian device* received the alert.
2. **Real devices for anything background.** Emulators do not behave like Xiaomi or Realme phones [R17].
3. **Every safety rule has a simulation test** (clock-driven) **and** a real-phone test.
4. **No real-emergency use during tests.** Drills use **Test SOS** and named test guardians.

## 2. Real-Device Matrix

| Dimension | Minimum coverage | Reason |
|---|---|---|
| Brand and OS skin | Samsung (One UI), Xiaomi, Redmi or POCO (MIUI, HyperOS), Realme, Oppo or Vivo (ColorOS, Funtouch), plus one near-stock phone (Motorola or Pixel) | Battery managers and auto-start rules differ [R17] |
| Android version | 10, 12, 13, 14 or newer | Foreground-service limits [R11][R12]; the "restricted settings" step for sideloaded apps 🔬; the notification permission (13+) |
| RAM | One phone with 3 GB or less | Low-memory kills; WebView map performance |
| SIM | One dual-SIM phone | SIM choice for on-device SMS |
| Network | Wi-Fi, 4G, weak 3G or 2G, airplane mode, data off with the SIM on | SMS fallback, offline queue |

### Per-device checklist (record pass or fail in a shared sheet)

| # | Check | Related items |
|---|---|---|
| D1 | Install the APK, complete onboarding, enable the battery exemption and auto-start through the checklist | TRG-2 |
| D2 | Safe Walk for 20 minutes with the screen locked; breadcrumbs continue | TRG-2, TRK-1 |
| D3 | Force-stop the app during a walk; server escalation fires (rule timings) | TRK-4 |
| D4 | Notification-action SOS with the app swiped away | TRG-3 |
| D5 | Quick Settings tile SOS from the lock screen (note whether unlock is requested) | TRG-3 |
| D6 | Volume-pattern trigger (enable the accessibility service; note the exact taps this vendor needs) | TRG-4 |
| D7 | On-device SMS with data off and the SIM on; delivery status appears later | TRK-8 |
| D8 | Locked-screen audio: which approach (A, B or C) worked | TRG-6 |
| D9 | Map: pan and zoom smoothness, English labels, the offline pack works in airplane mode | MAP-1, MAP-2 |
| D10 | Voice guidance with and without earphones; re-route after a wrong turn | MAP-5 |
| D11 | Battery: percentage drop per hour of Safe Walk (screen off) | TRG-2 |
| D12 | After a system reboot the Guard mode and service state are correct | TRG-2 |

## 3. Scenario Tests (manual drills)

### 3.1 SOS and alerts

| # | Scenario | Expected |
|---|---|---|
| S1 | SOS with one app guardian and one SMS-only contact | One message per channel per guardian; the staff console shows all deliveries |
| S2 | SOS with data off | SMS sent from the phone; the server alert appears after reconnection |
| S3 | Guardian is `pending` or `revoked` | Receives nothing |
| S4 | Two accounts registered for the same guardian e-mail, one unverified | Only the verified, accepted account receives alerts |
| S5 | Cancel during the 3 to 5 second countdown | Nothing is sent |
| S6 | Guardian taps "I'm on it" | The walker and staff see the acknowledgement |
| S7 | Resolve the alert | An all-clear message; the tracking link expires |
| S8 | Drill (`is_test`) | Labelled `[DRILL]`; no staff page |
| S9 | SOS with an emergency medical card, viewed by a guardian in the SOS and by a non-participating guardian | The participant sees the card; the other gets 403; the staff view is audit-logged |

### 3.2 Safe Walk and watchdog

| # | Scenario | Expected (defaults) |
|---|---|---|
| W1 | Walk beyond the corridor, ignore the prompt, app open | Escalation at about 60 s |
| W2 | The same, with the app killed | Escalation at 60 to 90 s (server tick) |
| W3 | Stop updates (airplane mode) mid-walk | A walker push at about 3 min; a soft guardian notice at about 6 min; escalation at about 12 min |
| W4 | Arrive late (ETA plus 10 min) with no response | Prompt, then guardian notice, then escalation per the rules |
| W5 | Reconnect after a *lost contact* notice | Status returns to Active; guardians receive an all-clear if they were notified |
| W6 | Restart the backend mid-walk | No duplicate and no missed alerts |
| W7 | Check-in timer of 15 min, phone off | Escalation at 16 min |
| W8 | Walk through a known dead zone with a longer lost-contact threshold | No false escalation |

### 3.3 Tracking link and privacy

| # | Scenario | Expected |
|---|---|---|
| P1 | Open the link on a laptop during a walk | The marker moves with less than 3 s lag; only first name, position, status and last update |
| P2 | Revoke the link | The viewer stops within 5 s |
| P3 | Use an expired, unknown or revoked token | An identical 404 response and timing |
| P4 | Call `/api/reports` and `/api/reports/nearby` unauthenticated | No `userId`, reporter name, e-mail or phone anywhere |
| P5 | Confirm a report twice, and confirm your own report | The second confirmation is ignored; self-confirmation is rejected |
| P6 | Delete an account | Data removed per `security-privacy-compliance.md` §2; guardians told; audio deleted from Cloudinary |
| P7 | An old JWT after a password reset | Rejected |

### 3.4 Accounts and e-mail

| # | Scenario | Expected |
|---|---|---|
| E1 | Register, e-mail arrives within 60 s, code verifies | `email_verified_at` is set |
| E2 | Forgot-password for an unknown and a known address | The same response |
| E3 | A wrong code six times | Locked until a new code; attempts capped at 5 |
| E4 | 300 sends already used today | Authentication mail queued; an admin warning shown |
| E5 | Does the e-mail land in spam? | Record the result per provider (Gmail, Outlook, college mail) and fix DKIM or sender if so |

### 3.5 Map, search and routing

| # | Scenario | Expected |
|---|---|---|
| M1 | Pan to Tokyo, Kathmandu and Beijing | English or Latin labels |
| M2 | Network log for 5 minutes | Zero requests to `tile.openstreetmap.org`; no provider keys in requests from the phone |
| M3 | A 20-query search set (5 misspellings, 5 Hindi-transliterated) | The expected place in the top 3 for at least 90 % *(proposed)* |
| M4 | Walk versus car route for two campus points with a footpath shortcut | Different geometry and time |
| M5 | Disable provider 1 | Automatic fallback to provider 2, then 3 |
| M6 | "Safest" versus "Fastest" near a seeded hazard | Safest avoids it and shows the extra time |
| M7 | Offline pack, airplane mode | Pan and zoom 10 to 16 with road names |

## 4. Automated Tests and CI Gates (ENG-3, ENG-4)

V1 already provides 15 suites with 104 tests and a CI pipeline (see [`../v1/testing-and-submission.md`](../v1/testing-and-submission.md)). V2 adds:

| Layer | Add | Gate |
|---|---|---|
| Unit | Decay per category, watchdog rules with a fake clock, OTP hashing and expiry, guardian status transitions, DTO redaction | Backend coverage at or above 60 % *(proposed)* |
| Integration | PostGIS in a container: `ST_DWithin`, clusters, corridor, confirmation uniqueness, breadcrumb inserts; run against the migrations | Must pass |
| API contract | Response-shape snapshots (no identity fields; fixed tracking JSON fields) | Must pass |
| Mobile | Component tests for the SOS countdown and offline queue; Maestro flows for "SOS from home" and "Safe Walk start and complete" on an emulator | Nightly, not per push |
| Security | gitleaks, CodeQL, `npm audit --omit=dev`, Dependabot | Must pass |
| Build | Android build in CI; no `--passWithNoTests` | Must pass |
| Migrations | Apply all migrations on an empty database and on a snapshot | Must pass |

A **simulation harness** (backend) starts a fake journey, feeds GPS points from a file, then stops sending or goes off route, and asserts which alerts were created and when. It is the automated form of W1 to W8.

## 5. Closed Beta (before any public release)

### Goals
1. Show that alerts reach guardians reliably on real phones and networks.
2. Measure the false-alarm rate and the battery cost.
3. Learn what people use (hazard reports, Safe Walk, triggers).
4. Collect improvement priorities for the public beta.

### Who and how many
**5 to 8 adult volunteers**, each with **one or two guardians who also install the app**. Aim for at least **two phone brands**, including one Xiaomi, Realme, Oppo or Vivo class device. No student rosters and no bulk personal data: everyone joins by name, on purpose, and can leave at any time.

### Preconditions
- [ ] Gate: M1, M2 and M3a shipped.
- [ ] Each tester signs a one-page consent form (what is collected, how long it is kept, how to delete it).
- [ ] A beta banner in the app: "Beta – do not rely on Safora as your only safety measure. Call 112."
- [ ] D1 to D5 and S1, S2, W2 passed on the team's own phones.
- [ ] A named person on call during each test window, and a written procedure for a real emergency.

### Schedule (7 days)

```mermaid
gantt
    title Closed beta schedule
    dateFormat  YYYY-MM-DD
    axisFormat  Day %d
    section Preparation
    Briefing, install, onboarding checklist, Test SOS drill  :d0, 2027-02-01, 1d
    section Use
    Normal use: one Safe Walk per day, two reports each; surprise drill :d1, after d0, 5d
    Walk through a weak-signal area                         :d3, 2027-02-04, 1d
    section Close
    Survey for testers and guardians                        :d6, 2027-02-07, 1d
    Debrief, export metrics, delete tester data             :d7, after d6, 1d
```

### Safety rules
- Only **Test SOS** for drills; in real emergencies call **112 first**.
- If a real (non-test) SOS arrives, the person on call phones the user and then escalates to 112 or local help.
- Nobody is asked to go anywhere unsafe in order to "test" the app. Testers can withdraw and have their data deleted at any time.

### Metrics and targets *(proposed)*

| Metric | Definition | Target |
|---|---|:---:|
| Alert delivery time (app) | Trigger to guardian push received | median under 10 s, 95th percentile under 30 s |
| Multi-channel success | Drills in which every configured channel delivered | at least 95 % |
| Server-side escalation timing | Off-route or stale to escalation, against the configured time | within ±30 s |
| False escalations | Escalations with no real problem per 10 walks | at most 1 |
| Guardian acknowledgement | Delivery to "I'm on it" | median under 2 min |
| Battery drain | Percentage per hour of Safe Walk with the screen off | at most 10 % |
| Crash-free sessions | Sessions without a crash | at least 99 % |
| Usability | A simple 1 to 5 rating and comments (too few people for a formal score) | at least 4 on "I would use it again" |

With only 5 to 8 people these numbers show **whether things work**, not statistics. Treat any failure as a bug to fix, not as noise.

### Exit criteria
Every configured channel delivered in at least 95 % of drills, no privacy incident, no unhandled real emergency and no open P1 defect. Otherwise repeat the affected drills after the fixes.

### Beta report template
Summary · Setup · Metrics against targets · Device notes per brand · What broke · False alarms · Feedback themes · Recommendations · Data-deletion confirmation.

### Public-beta gate
Do not open the APK to the public until M4 and PUB-1, PUB-2 and PUB-4 are complete (see the roadmap and `security-privacy-compliance.md` §10).

## 6. Release Checklist (every APK)

- [ ] CI is green (build, tests, gitleaks, CodeQL).
- [ ] D1 to D5 and S1, S2, W2 re-run on two phones.
- [ ] Version bumped, changelog written, the "critical update" flag set only for safety fixes.
- [ ] APK signed with the release key; SHA-256 published in the release notes.
- [ ] Status tags in the documents updated for merged items.
- [ ] Backup taken before any migration (ENG-8).
