# Safora Docs — V2 (Product)

> Builds on `docs/v1/` (the college-submission version). No deadline pressure — this is the roadmap for turning the submission build into something you'd actually trust and let the public use.
>
> **Updated 22 Sep 2026:** moderator role detailed with an abuse-flag queue (SEC-10), escalation ladder replacing simultaneous guardian broadcast (TRK-11), battery dead-man's switch (TRK-10), "walk with me" (TRK-12), scheduled walks (TRK-13), chat duress codeword (CHT-4), "safe stop" verified local spots (MAP-7b), reporter trust score (MAP-9c), duplicate detection (MAP-9d), photo EXIF check (MAP-9e), vibration-pattern accessibility (LOC-5), `parent-of` relationship (AGE-2), and a new file — `environmental-hazards.md` (weather + earthquake data, WX-1…WX-3). **Dropped:** `volunteer_responder` role and all institution-scoped features (your decision).

## Files in this folder

| File | Contents |
|---|---|
| `roadmap.md` | Work items, capacity math, milestones/gates, cut list, risks, open questions |
| `architecture-decisions.md` | ADR-001…018 — every major technical decision and why |
| `api.md` | Index of every new/changed endpoint introduced in V2 |
| `database.md` | Index of every new table/column introduced in V2 |
| `safety-and-tracking.md` | Guardians, alert fan-out, full watchdog, check-in timer, tracking link, on-device SMS, no-unlock SOS triggers, staged chat |
| `map-routing-search.md` | OpenFreeMap basemap, offline packs, search v2, per-mode routing, voice guidance, safest route, safe places (incl. verified "safe stops"), hazard alerts, trust score, duplicate detection |
| `environmental-hazards.md` | Weather overlay (Open-Meteo), earthquake advisories (USGS), static seismic-zone weighting — new file, added 22 Sep 2026 |
| `accounts-email-local.md` | Brevo email, session hardening, account deletion, age policy, `parent-of` relationship, Hindi, Uttarakhand content, admin ops, medical card, **moderator role & abuse-flag queue** |
| `security-privacy-compliance.md` | Threat model, data inventory, DPDP mapping (incl. children's data), anti-coercion rules, public-launch checklist |
| `testing-and-beta.md` | Real-device matrix, scenario tests, CI gates, closed beta plan |
| `references.md` | Every external source cited, `[R1]`…`[R61]`, and what's still to verify |

## Status labels used throughout
✅ verified in code/review · 📄 documented only · 🔬 needs a test/check · 🗓 planned. Sizes: **S** ≈ 1.2–1.5 days · **M** ≈ 4–5 · **L** ≈ 9–12 · **XL** ≈ 19–25 focused days at your pace.

## What changed vs the college build
V1 shipped a deviation-only watchdog, a minimal guardian model (no accept/verify handshake), no email, no session hardening, no OpenFreeMap, no chat, and the current MapTiler-based map/search. V2 replaces or extends every one of those. Read `roadmap.md` §4 for the full work-item list and where each V1 shortcut gets hardened.
