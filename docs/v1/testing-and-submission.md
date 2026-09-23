# Testing & Submission Readiness — V1

No formal pilot for V1 — you're testing solo, plus occasional help from your support member. This is scoped to what a demo/viva will actually expose, not full production testing (that's V2).

## Core checklist

| # | Check | Why | Minimum setup |
|---|---|---|---|
| T1 | Full loop: register → accept terms → report a hazard → see it on the map/heatmap → safety score updates | The core demo path | Your phone |
| T2 | Kill network mid-session (airplane mode) | Confirms the fake-fallback removal (SYN-1) shows an honest state, not a crash or a lie | Your phone |
| T3 | Start a Safe Walk, deviate from the route (walk off it, or use a mock-GPS tool) | Confirms the server-side deviation alert (SYN-5) actually fires at ~60s | Your phone |
| T4 | **Guardian device receives the live location and the deviation alert** | The one flow that needs more than one phone — it's the actual promise of synopsis objective 3 | **Two devices** — borrow one if needed, at least once |
| T5 | Confirm a hazard report from a second account; try to confirm your own report | Sanity-check reporter privacy/identity handling | Two accounts |
| T6 | Open the admin panel with no active walks | Confirms no fabricated sample data appears (SEC-9) | Browser |
| T7 | Photo report end-to-end (if SYN-3 made the cut) | Matches the synopsis's evidence claim | Your phone |
| T8 | Full walkthrough with someone who hasn't seen the app | Catches confusing screens before a viva panel does | 15–20 minutes, support member |
| T9 | Check `GET /api/reports` with no auth header | Confirms SEC-2 — no `userId`/email/phone in the response | curl/Postman |

## What's deliberately not tested for V1
Multiple Android brand/OEM coverage, battery-killer behaviour over hours, background reliability, load testing. These matter once no-unlock triggers and always-on tracking exist (V2) — testing them now would spend days the V1 budget doesn't have.

## Demo/viva prep
- Have a short script: register → report a hazard → show it on the heatmap → start Safe Walk on a second device as "guardian" → deviate → show the alert arriving → trigger SOS.
- Know your **known limitations** by heart (routing shows the same geometry for all modes, no background tracking, no per-user duress PIN, Settings toggles are placeholders unless you wired them) — stating them proactively reads as competence, not weakness.
- Bring the `docs/v1/tasks.md` and `docs/v2/roadmap.md` as evidence of a real plan if asked "what's next."
- Have `docs/v1/tech-stack.md`'s deviation table ready if asked why the implementation differs from the synopsis's named technologies.

## Release checklist (once, before the submission build)
- [x] All "must-do" items in `tasks.md` pass their test.
- [ ] APK built in release mode, signed, installed fresh (not over a dev build) and re-run through T1–T4.
- [x] `INTERNAL_TICK_SECRET` set on Render and the external pinger configured and firing (check Render logs).
- [x] No secrets visible if you `strings` the APK (MapTiler key is server-side only in this backend — verify it isn't compiled into the mobile bundle).

## Detailed steps for T3/T4 (the two hardest to test alone)

### T3 — Server-side deviation alert, single device
1. Start a Safe Walk with a real destination (so a route polyline exists).
2. If you can't physically walk off-route during testing, use Android's mock-location developer setting (Developer Options → Select mock location app) with a simple location-simulator app, or add a temporary debug button in a dev build that calls a test-only endpoint to force `deviated_at`.
3. Do **not** interact with the phone-side "I'm safe" countdown.
4. Watch the admin SOS queue (or your own guardian device's notification) — confirm an alert appears roughly 60 seconds after the deviation was recorded, not immediately and not never.
5. Repeat, this time tapping "I'm safe" (which should call `confirm-safe`) before 60 seconds — confirm no alert fires.

### T4 — Guardian sees live location and the alert (needs two devices)
1. Device A: your test walker account, with Device B's account added as a trusted contact.
2. Device B: logged in as the trusted contact, app open, on the new live-guardian-view screen.
3. Device A: start a Safe Walk.
4. Confirm Device B's map marker moves as Device A's location updates (or as you feed mock locations).
5. Trigger a deviation on Device A (per T3) and confirm Device B receives the push/in-app alert.
6. If you genuinely cannot get a second physical device even once, the fallback is two emulators on the same machine (one logged in as walker, one as guardian) — slower and less convincing for a demo, but sufficient to prove the flow works before relying on a borrowed phone for the actual viva.

## Quick reference: curl commands for backend-only checks (no app needed)

```bash
# Confirm public reports have no identity
curl -s https://<backend>/api/reports | jq '.[0]'

# Confirm the internal tick endpoint rejects a bad secret
curl -s -X POST https://<backend>/api/internal/tick -H "X-Internal-Secret: wrong" -o /dev/null -w "%{http_code}\n"
# expect: 401

# Confirm the internal tick endpoint accepts the real secret
curl -s -X POST https://<backend>/api/internal/tick -H "X-Internal-Secret: <your real secret>"
# expect: {"scanned": N, "escalated": N}
```

## New checks for the foreground service / lock-screen audio / ETA notification (added 22 Sep 2026)

| # | Check | Why | Minimum setup |
|---|---|---|---|
| T10 | Start Safe Walk, lock screen, leave for 5+ minutes, unlock and check breadcrumb timestamps | Confirms location updates didn't stop/throttle once backgrounded | Your phone |
| T11 | SOS triggered during an active Safe Walk with screen locked | Confirms audio recording starts (piggybacking on the foreground service) and reaches the SOS alert | Your phone |
| T12 | SOS triggered with **no** active Safe Walk, screen locked | Confirms the alert still sends (GPS/battery) even if audio can't start — should not error or silently drop the SOS | Your phone |
| T13 | Notification content during a walk | Confirms distance/ETA numbers update plausibly as you move (or via mock location) and the notification persists (can't be swiped away while the walk is active) | Your phone |
| T14 | Force-stop the app entirely (not just lock screen) during an active Safe Walk | Understand and document what actually happens — a force-stop is more aggressive than locking the screen and may kill the foreground service too; know this limitation rather than assume T10 covers it | Your phone |

T14 is worth being explicit about in your report: a **locked screen** and a **force-stopped app** are different failure modes, and the foreground service only protects against the first. The server-side watchdog (`SYN-5`) is what still catches the second case, just on its own slower timeline (60s+ after a deviation was last recorded, not instantly).
