# Safora Docs — V1 (College Submission)

> **Scope:** the six objectives in `SAFORA_Synopsis_Formatted.pdf`, built honestly, on top of what already exists in the codebase.
> **Target:** mid-November 2026 (your buffer) / end-November 2026 (college deadline).
> **Updated 22 Sep 2026:** background Safe Walk tracking (foreground service), lock-screen SOS audio (with an honest platform limitation), and a simple distance/ETA notification were pulled into V1 — they strengthen the core objective rather than being separate scope. This adds ~9–12 focused days; **V1's realistic target is now your end-November college deadline, not the mid-November personal buffer.** See `tasks.md` for the updated total and cut list.
>
> **Not in V1:** accounts hardening, email, OpenFreeMap, real per-mode routing/turn-by-turn voice, Quick Settings/volume-button/no-unlock triggers (only the foreground-service tracking above is V1; the rest of no-unlock trigger work is `TRG-3`/`TRG-4` in V2), chat, Hindi, medical card, legal/DPDP work — all of that is `docs/v2/`.
> **Out of scope entirely for now:** AI routing, offline mesh messaging, AI image detection — those are `docs/v3/`.

## Files in this folder

| File | Contents |
|---|---|
| `architecture.md` | System diagram, what's existing vs new-in-V1 |
| `api.md` | Every V1 endpoint and socket event, with what changed |
| `database.md` | Schema: existing tables + the V1 additions |
| `tech-stack.md` | Actual technology used, corrected against the synopsis |
| `safety-algorithms.md` | Safety score, heatmap/clusters, corridor check, deviation escalation |
| `mobile-app-features.md` | What the app does, screen by screen, for V1 |
| `admin-panel.md` | What the admin site does for V1 |
| `setup.md` | Local dev setup (mostly unchanged from your current docs) |
| `tasks.md` | The concrete V1 ticket list, in priority order, with a cut list |
| `testing-and-submission.md` | Self-testing checklist and demo/viva readiness |

## One-paragraph summary for your report

Safora V1 is a community safety platform: users report hazards on a map that generates a live safety-score heatmap, start a "Safe Walk" that shares their live location with trusted contacts and automatically alerts them if the walker deviates from the route, and can trigger an SOS with GPS, battery and audio sent to guardians. All spatial queries run on PostgreSQL/PostGIS; the mobile app is React Native with a Leaflet map in a WebView; the backend is Node/Express with Socket.IO for realtime updates; an admin web dashboard lets staff review hazard reports and monitor active Safe Walks and SOS alerts.
