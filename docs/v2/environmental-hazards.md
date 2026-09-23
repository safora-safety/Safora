# Environmental Hazards — Weather & Earthquake (V2)

> New file, added 22 Sep 2026. Covers `WX-1`, `WX-2`, `WX-3` — live weather, earthquake advisories, and static seismic-zone weighting. This is a distinct subsystem (external live-data ingestion) that both the safety-score formula and the advisory delivery system (`accounts-email-local.md` §6.2, Sachet) depend on, which is why it's its own file rather than folded into an existing one.

## 1. Data sources

| Source | Cost | Coverage | What it provides |
|---|---|---|---|
| **Open-Meteo** [R57] | Free, no API key, up to 10,000 calls/day non-commercial | Any lat/lng, including Dehradun/Uttarakhand | Current conditions + hourly/daily forecast: precipitation, wind, visibility-relevant weather codes (fog, thunderstorm), temperature. **Attribution required (CC BY 4.0)** |
| **USGS Earthquake feeds** [R58] | Free, no key, public domain | Global (covers India fine) | Real-time GeoJSON feed of quakes, updated within minutes; magnitude, location, depth, time |
| **India Seismic Zoning Map (BIS)** [R59] | Static reference, no API | India-specific zones | Uttarakhand sits in Seismic Zone IV and V — used as a fixed multiplier, not a live feed (see §4) |

## 2. WX-1 — Live weather overlay

### Design
- Backend proxies Open-Meteo (never call it directly from the mobile app — keeps attribution/rate-limit handling in one place, matches the pattern already used for MapTiler/routing proxying elsewhere in this doc set).
- New endpoint: `GET /api/weather?lat=&lng=` — thin proxy, cached 15 minutes per ~1km grid cell (weather doesn't change fast enough to justify per-request calls).
- **Score integration:** when active precipitation is above a threshold (e.g. Open-Meteo's precipitation intensity codes indicating moderate/heavy rain) for a given area, temporarily boost the weight of the **waterlogging** hazard category in the existing safety-score formula (`docs/v1/safety-algorithms.md` §1) for reports in that area — e.g. multiply the severity weight `S` by 1.3–1.5 while the condition holds, decaying back to normal once conditions clear. This reuses the existing formula rather than building a parallel scoring system.
- **UI:** a small current-conditions chip on the Home/Map screen; a caution banner on Safe Walk start if active heavy rain/fog/thunderstorm is detected along the route ("Heavy rain expected — waterlogging risk is elevated right now").

### Data model
```sql
-- Simple cache, not a permanent record — weather data is inherently transient
CREATE TABLE weather_cache (
  grid_cell TEXT PRIMARY KEY,  -- e.g. rounded lat/lng to ~1km precision, as a string key
  conditions JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
Row expires/refreshes on next request after 15 minutes — a simple TTL check in application code, no need for a cron job.

## 3. WX-2 — Earthquake advisories

### Design
- Poll USGS's GeoJSON feed (e.g. their "past hour"/"past day" significant-quake feed) every 5–10 minutes from a scheduled job (reuse the same external-pinger pattern already set up for the watchdog tick in V1 — `docs/v1/api.md`'s `/api/internal/tick`, or a sibling endpoint `/api/internal/quake-check`).
- Filter to quakes within a configurable radius of Uttarakhand (e.g. 200km) above a minimum magnitude threshold (e.g. M3.5+ — smaller ones aren't meaningfully felt or relevant).
- On a match, create a row in the same `advisories` table already planned for Sachet advisories (§6.2 reference) with `source='usgs'`, `event='earthquake'`, and a plain-language headline ("M4.2 earthquake detected 40km from Dehradun, 2 hours ago — check for road damage before walking near hill cuttings or unstable slopes").
- **Time-limited:** advisory auto-expires after a configurable window (e.g. 48–72 hours) — aftershock/landslide risk elevation is real but shouldn't linger indefinitely as a stale warning.
- Delivered through the same channel as Sachet advisories — no separate notification system needed.

### What this does NOT do
It does **not** feed into live route recalculation ("avoid this specific road because of the earthquake") — a live quake feed tells you an event happened, not which streets are now structurally unsound. That's a job for local authorities/on-the-ground reporting (which your existing hazard-report system with the new landslide/damaged-bridge categories already covers) — the advisory's job is just to raise awareness and prompt caution, not to compute a new route.

## 4. WX-3 — Static seismic-zone weighting

### Design
- A fixed multiplier applied to the existing per-category decay weights (`docs/v2/map-routing-search.md` §9) for **landslide** and **damaged-bridge/river-crossing** hazard categories specifically, when the report's location falls within India's officially mapped Seismic Zone IV or V (Uttarakhand's actual zoning — confirm exact district boundaries against the current BIS map before hardcoding, since zone boundaries can be revised).
- This is **not a live API call** — it's a static geographic lookup (a simple bounding polygon or district list baked into the app/backend), reflecting a genuinely static fact about the region's seismic risk rather than anything that changes day to day.
- Effect: a landslide report in a Zone V area is treated as inherently more severe/slower-to-decay than the same report would be treated in a Zone II area elsewhere — because the underlying geological risk is different, independent of any current event.

## 5. Rate limits, caching, and failure behaviour
- Open-Meteo: cache aggressively (§2) — 10,000 calls/day is generous at Safora's scale, but there's no reason to hit it more than needed.
- USGS: their feeds are designed for polling; a 5–10 minute interval is well within reasonable use.
- **If either service is unreachable:** fail silently for the weather chip/banner (show nothing rather than an error state that alarms the user over a non-critical feature) — but log the failure so you notice if it's down for an extended period. Earthquake advisory polling failing just means a missed poll cycle; the next successful poll catches up, since USGS's feed includes a lookback window, not just "since last check."

## 6. Effort estimate
| Item | Size |
|---|:---:|
| WX-1 (weather overlay + score integration) | M (~4-5 days) |
| WX-2 (earthquake advisory polling + delivery) | M (~4-5 days, mostly reuses the advisory delivery system already planned) |
| WX-3 (static seismic-zone weighting) | S (~1.5 days — it's a lookup table, not a live integration) |
