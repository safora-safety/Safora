# Safety Algorithms — V1

> Formulas below are copied from the actual implementation (`apps/backend/src/services/reportService.ts`) so this doc cannot drift from the code. If you change a constant in the code, update it here too.

## 1. Safety score

For a location, every nearby report within `radiusMeters` contributes a **penalty**:

```
penalty(report) = S(severity) × D(distance) × T(age) × C(confirmations) × 5
totalPenalty     = Σ penalty(report)  over all nearby reports
safetyScore      = clamp(0, 100, round(100 − totalPenalty))
riskLevel        = "safe"     if safetyScore ≥ 80
                    "moderate" if 50 ≤ safetyScore < 80
                    "high"     if safetyScore < 50
```

**S — severity weight** (1–5 maps to 1.0–6.0, non-linear so severity 5 counts much more than severity 1):
| Severity | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Weight | 1.0 | 1.5 | 2.5 | 4.0 | 6.0 |

**D — distance falloff** (linear to zero at the search radius):
```
D(dist) = max(0, 1 − dist / radiusMeters)
```

**T — recency decay** (exponential half-life, default **24 hours** — the same half-life for every category in V1; per-category half-lives are a V2 item, `docs/v2/map-routing-search.md` §9):
```
λ = ln(2) / 24
T(ageHours) = e^(−λ × ageHours)
```

**C — community confirmation multiplier** (each confirmation adds 15%, capped at 5 confirmations):
```
C(confirms) = 1.0 + 0.15 × min(max(0, confirms), 5)
```

### Worked example
A severity-4 report, 50 m away (radius 200 m), 6 hours old, with 2 confirmations:
- S = 4.0
- D = 1 − 50/200 = 0.75
- T = e^(−ln(2)/24 × 6) ≈ 0.841
- C = 1 + 0.15×2 = 1.3
- penalty = 4.0 × 0.75 × 0.841 × 1.3 × 5 ≈ **16.4**

A location with only this report nearby scores `100 − 16 = 84` → **moderate**.

### V1 fix: no fake fallback
Previously, if this endpoint failed, the Home screen showed an invented `84 / "safe"`. **V1 removes this** — a failed request shows a retry/error state instead. This is the single highest-priority fix in the whole V1 list (see `tasks.md`, SYN-1): a fabricated safety number is the opposite of what a safety app should do.

## 2. Heatmap / clustering (DBSCAN)

`GET /api/reports/clusters` (existing endpoint) groups nearby reports so the map shows density instead of individual pins at low zoom:

```
epsDegrees = 0.003   (~330 m at this latitude)
minPoints  = 2        (at least 2 reports to form a cluster)
```
This is a standard DBSCAN over report coordinates. **V1 change:** this endpoint already existed and worked, but nothing in the mobile app or admin panel called it — the Home screen's "Live Heatmap" card led to a plain pin map. V1 wires the map screen to call `/clusters` and render density circles (radius scaled by cluster size, colour scaled by average severity in the cluster) — this is what actually makes the existing claim true.

## 3. Safe Walk corridor check

Unchanged in V1 — already implemented server-side in `journeyService`:
- On each location update, the server computes the shortest distance from the reported point to the planned route polyline (segment-by-segment distance, not PostGIS `ST_DWithin` — a documentation correction from earlier drafts of this project's docs).
- If that distance exceeds **150 metres**, the journey is marked deviated.

## 4. Deviation escalation (new in V1 — watchdog, deviation rule only)

```
IF journeys.deviated_at IS NOT NULL
   AND now() − deviated_at > 60 seconds
   AND no confirm-safe call received since deviated_at
THEN create sos_alerts (source='watchdog'), notify guardians, set escalated_at
```
Runs on a 30-second in-process tick (`architecture.md` §4). This is deliberately the simplest possible version of the full watchdog design in `docs/v2/safety-and-tracking.md` §4 (which adds lost-contact and overdue-arrival rules, both deferred to V2).

## 5. What's unchanged from the original code (not re-documented here)
Report severity input (1–5, user-selected), confirmation counting (`PATCH /:id/confirm`), report categories (poor lighting, road hazard, waterlogging, isolated area, harassment/suspicious activity). Per-category decay half-lives, "still there / cleared" voting, and safest-route ranking are V2 (`docs/v2/map-routing-search.md`).
