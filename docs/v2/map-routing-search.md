# Specs: Map, Search, Routing, Voice Guidance, Hazard Scoring

> Covers MAP-1…MAP-9 (including MAP-7b, MAP-9c/d/e). **v2 (21 Sep 2026):** the basemap decision changed to **OpenFreeMap** after you asked for something better than MapTiler; PMTiles moved to the offline/fallback role. **Updated 22 Sep 2026:** "safe stop" verified local spots (MAP-7b), reporter trust score (MAP-9c), duplicate detection (MAP-9d), and an optional photo EXIF sanity check (MAP-9e) added. See also `environmental-hazards.md` (WX-1…WX-3) for weather/earthquake-driven scoring adjustments, a related but separate subsystem. Tags: ✅ verified · 📄 documented only · 🔬 needs test · 🗓 planned. Sources in `09-references.md`.

## 0. What is wrong today (verified) ✅

| Symptom you reported | Cause found in code |
|---|---|
| Search does not find local places well | Photon is called with only `lat`/`lon`; no `bbox`, `lang`, `zoom` or `location_bias_scale` [R25]. MapTiler fallback has `country=in` but no proximity |
| Other countries' labels show in their own language | Basemap is OSM raster tiles drawn with local names; no parameter can change this |
| Walk / bike / car look the same | `fetchFootRoute` calls the driving route and only divides distance by a fixed speed; the public OSRM demo also returns car routes whatever the URL says [R24] |
| No voice / turn instructions | Route request has no `steps`; there is no navigation engine or text-to-speech |
| "10 km offline cache" | Prefetches from `tile.openstreetmap.org`, which the tile policy prohibits; attribution is hidden [R18] |

---

## 1. Map tiles and labels (MAP-1) — v2: OpenFreeMap

### Goal
English labels everywhere, good India detail, no keys in the APK, no request limits that can switch the map off, visible attribution, and a plan for when the free host is unavailable.

### Your question: is there something better than MapTiler?
For a **public** app, yes. What I found:

| Option | Key in the app? | Limits | Public/commercial use | Offline | Verdict |
|---|:---:|---|---|:---:|---|
| **OpenFreeMap** (public vector tiles) | **No** | No limits on map views or requests; no registration [R48] | Allowed; attribution required [R48][R49] | No (online only) | **Use for the online map** |
| **MapTiler Cloud, free plan** (what you have) | Yes — visible to anyone who opens the APK | 100,000 requests and 5,000 map sessions a month; service **pauses until next month** when used up [R50][R51] | **Non-commercial only** [R50]; their terms also forbid caching map content on your server [R50] | No | Keep only as a **server-side geocoding fallback** (their terms allow using search results outside the service [R50]) |
| **Protomaps PMTiles** you host | No | You pay for hosting/bandwidth (free options unproven — test in MAP-2) | Allowed (OSM data) | **Yes** | Use for **offline packs and as fallback** (MAP-2) |
| OSM raster tiles | No | Prohibited for prefetch/offline; must show attribution [R18] | Volunteer-run servers; no service guarantee | Not allowed | **Remove** |

Why this matters for Safora: a map key inside the APK can be copied, used up by anyone, and then the **map stops for every user until next month** — unacceptable for a safety app. OpenFreeMap has no key and no quota. Its weakness is that it is donation-funded with no service guarantee, so keep a fallback (below).

### Design
- **Basemap:** OpenFreeMap vector tiles, styles at `tiles.openfreemap.org/styles/{liberty|positron|bright}` [R52]. Offer **Light** (positron) and **Dark** (own dark variant of the same style) plus the optional online-only **Satellite** (Esri imagery, attribution shown, **no prefetch**).
- **Rendering:** MapLibre GL JS inside the existing Leaflet map through a Leaflet–MapLibre bridge plugin (`maplibre-gl-leaflet`), so markers, clusters, polylines and layers already written in Leaflet keep working 🔬 (check WebView performance; the bridge is community-maintained).
- **English labels:** OpenMapTiles-schema tiles carry several name fields (local name, English name, Latin transliteration). Keep **our own copy** of the style JSON in the repo and change the label expression to prefer the English name, then the Latin name, then the local name 🔬 (confirm the field names in the tiles before relying on it).
- **Attribution:** "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" [R49]; MapLibre adds it automatically. Also show "Esri" while satellite is on. Never hide it.
- **Remove** the OSM raster layer, the CSS-inversion "Dark Matrix", and `cacheSurrounding10km` (all requests to `tile.openstreetmap.org`).
- **Keep `noWrap`/`maxBounds`.**
- **Remote-config switch:** the style URL lives in a config value the backend can change, so if OpenFreeMap has an outage we can flip to a self-hosted or MapTiler style without shipping a new APK.

### Fallback ladder (in order)
1. OpenFreeMap online.
2. Cached tiles already loaded in the WebView (short-term).
3. **Offline PMTiles pack for the user's home area (MAP-2)** — the real safety net.
4. If the app must show something with no map: coordinates + a "Open in Google Maps" link.

### Borders
Indian law has specific rules about how the national boundary is drawn. OSM-derived maps show de-facto borders. Low risk for a small beta; ask for advice before a large public launch 🔬.

### Acceptance criteria
- Panning to Tokyo, Kathmandu and Beijing shows English (or Latin-script) labels.
- Network log during a 5-minute session shows **zero** requests to `tile.openstreetmap.org` and **no map key** in any request from the phone.
- Attribution is visible in every screenshot (light, dark, satellite).
- Changing the style URL in remote config changes the basemap without an APK update.

---

## 2. Offline map packs (MAP-2) — recommended before a wide public launch

> v2: this is now the **reliability fallback** for the online basemap and the offline story. It is scheduled in M8, but bring it forward if OpenFreeMap proves unreliable in the beta.

- Region packs as **PMTiles** files rendered with `protomaps-leaflet` [R19] (a separate layer used only when offline or as fallback): *Dehradun* (approx. bbox `77.85,30.20,78.20,30.45`, zoom 0–16) and *Uttarakhand* (approx. bbox `77.5,28.7,81.1,31.5`, zoom 0–12). Bounding boxes are approximate (`minLon,minLat,maxLon,maxLat`); check them on a map before extracting.
- Extract from a public Protomaps build with the `pmtiles` command-line tool 🔬 (confirm the extract command and the resulting file sizes; sizes are unknown until measured).
- Delivery options to test (hosting for packs, decided in MAP-2): bundled in the APK; one-time download from a GitHub Release; Cloudflare R2 (free allowance exists, but an account may require a payment method) [R39]. Pick the simplest that works over mobile data.
- In the app: **Settings → Offline maps** shows installed packs, size, "update" and "delete". The WebView loads the file from local storage.
- Pack version stored in the app; updated maps ship with app releases (ENG-7).

### Acceptance criteria
- With airplane mode on, the Dehradun pack pans and zooms from zoom 10 to 16 and shows road names.
- Pack size and download time on 4G are recorded in the pilot notes.

---

## 3. Search v2 (MAP-3)

### Goal
Typing "Clock Tower", "ISBT", "DBUU", "Rajpur Road" or a misspelling returns the Dehradun result first.

### Design
All lookups go through the backend (also fixes the exposed-key problem):

`GET /api/geo/search?q=…&lat=…&lng=…` (auth, rate-limited 30/min/user) → results.

1. **Curated local places first** (JSON in the repo, ~100 entries): DBUU gates, hostels, library, cafeteria, bus stand, ISBT, Clock Tower, hospitals, police stations. Matched by prefix/fuzzy on name and aliases. Saved and recent places of the user are merged.
2. **Photon with tiered bounding box** [R25]:
   1. Dehradun bbox `77.85,30.20,78.20,30.45`;
   2. if fewer than 3 results → Uttarakhand bbox `77.5,28.7,81.1,31.5`;
   3. if still < 3 → India bbox `68.1,6.7,97.4,35.7`;
   4. finally worldwide.
   Bounding boxes are approximate — verify visually.
3. Parameters: `lang=en`, `lat`/`lon` = user position, `zoom≈12`, `limit=8`, and a **low** `location_bias_scale` (lower values weigh distance more than prominence; 🔬 tune between 0.05 and 0.3 with the test set below) [R25].
4. **Cache** responses 24 h by (normalised query, ~1 km cell). Photon's public server asks users to be fair and throttles heavy use [R26]; the cache and a 300 ms client debounce (minimum 3 characters) keep us well under.
5. Result de-duplication by name+distance; show a subtitle "Rajpur Road, Dehradun".
6. Fallback if Photon fails: MapTiler geocoding **through the backend**, key in environment, `country=in` and proximity.

### Test set (part of CI later, ENG-3)
20 queries with the expected top result inside the Dehradun bbox, including 5 misspellings and 5 Hindi-transliterated names ("Ghantaghar", "Rajpur Road", …). Pass mark: expected place in the top 3 for ≥ 90 %.

### Acceptance criteria
- Median search response < 400 ms after cache warm-up; no client request goes to Photon or MapTiler directly.

---

## 4. Routing service and per-mode routes (MAP-4)

### Goal
Real routes for **walk, scooter, car, bike**, with turn instructions, alternatives and a safety score, behind one API and swappable providers.

### API
`POST /api/route` (auth, rate-limited 20/min/user)
```json
{ "from": {"lat":30.31,"lng":78.03}, "to": {"lat":30.32,"lng":78.04},
  "mode": "walk|scooter|car|bike", "alternatives": true,
  "prefer": "fastest|safest", "language": "en|hi" }
```
Response: `routes[]` each with `geometry` (encoded polyline), `distanceM`, `durationS`, `steps[]` (`instruction`, `maneuver`, `distanceM`, `streetName`, `pointIndex`), `safety` (`score`, `hazardCount`, `unlitShare?`), `provider`.

### Provider chain (adapter interface `RoutingProvider`)
| Order | Provider | Profiles | Notes |
|---|---|---|---|
| 1 | **Stadia Maps (hosted Valhalla)** | `pedestrian`, `motor_scooter`, `auto`, `bicycle` | Instructions localised in 25+ languages [R21]; free tier is for development, evaluation and non-commercial (including academic) use and hard-stops with HTTP 429 when credits run out [R22]. 🔬 Confirm the terms cover the college project and record the monthly credit limit |
| 2 | **OpenRouteService** | `foot-walking`, `cycling-regular`, `driving-car` | Free tier 2,000 directions/day, 40/min [R46]; up to 3 alternatives; avoid-area limits (≤ 200 km², extent ≤ 20 km) [R23]. **No scooter profile → use `driving-car`** |
| 3 | **FOSSGIS OSRM** | separate foot / bike / car endpoints | Free, fair-use. The plain public demo server ignores the profile and returns car routes [R24] — never use it for walking |
| 4 | Offline fallback | straight line × 1.25 winding factor | Only to show *something*; label "approximate" |

Keys stay on the server. Responses cached by (mode, endpoints rounded to 4 decimals, preference) for 10 minutes.

### Durations
Use the provider's duration. The calibrated constants in `routingService.ts` (walk 1.60 m/s, scooter 8.88 m/s + 20 s, car 7.22 m/s + 45 s) become the **offline fallback only**. 🔬 Compare provider walking time against a real 1 km walk on campus before deciding whether to scale it.

### Modes in the map radar and Safe Walk
- The mode chips (Walk / Scooter / Car / Bike) in the radar call `/api/route` with that mode.
- Safe Walk stores `journeys.mode` and uses per-mode defaults (proposals, tune in pilot):

| Mode | Corridor | Location interval | Deviation prompt |
|---|:---:|:---:|---|
| Walk | 150 m | 5 s | 60 s |
| Bike / Scooter | 200 m | 3 s | 45 s |
| Car | 250 m | 3 s | 45 s |

### Acceptance criteria
- Walking and car routes differ for a pair of campus points that have a footpath shortcut.
- Turning off provider 1 (bad key) transparently falls back to provider 2, then 3.
- No provider key appears in the APK (`strings`/decompile check).

---

## 5. Turn-by-turn navigation and voice (MAP-5)

### Goal
Google-Maps-style guidance: next turn text, distance, spoken instructions, automatic re-routing.

### Behaviour
- **Position tracking:** snap the location to the route polyline; find the current step; distance to the next maneuver.
- **Announcement distances (proposals):** walk — at 30 m and at the turn; scooter/car — at 200 m, 50 m and at the turn.
- **Text-to-speech:** Android's built-in `TextToSpeech` (through a React Native TTS module) with English (India) and Hindi voices if installed 🔬; use audio-focus "ducking" so music lowers, not stops. Instruction text comes from the routing provider in the chosen language; if a language is unsupported, fall back to English.
- **Walker-safe modes (default for Walk):** *Earphone-only* (speak only when headphones are connected) and *Haptic* (short/long vibration patterns for left/right). A phone announcing a woman's route out loud at night can be unsafe, so **voice is off by default for Walk** and needs an explicit toggle.
- **Re-routing:** if the user is more than **40 m** off route for **10 s** (walk) or **60 m** for **10 s** (vehicle), request a new route from the current position. Navigation re-routing is separate from Safe Walk's 150 m safety deviation: a re-route inside the corridor is silent; leaving the corridor still starts the deviation prompt.
- **Offline:** last route steps are cached; no re-routing offline; show "Offline — following saved route".
- **Battery:** GPS at 1 Hz only while navigating; screen may sleep with a foreground notification showing the next turn (requires the foreground service from TRG-2 for reliable behaviour with the screen off).

### Acceptance criteria
- On a real 1 km campus walk, spoken instructions arrive at the announced distances (± 15 m) and a deliberate wrong turn triggers a re-route within 15 s.
- With headphones off and *Earphone-only* set, nothing is spoken.

---

## 6. Safest route (MAP-6)

### Goal
Offer "Fastest" and "Safest" and explain the trade-off ("+3 min, 2 fewer hazards"). Rule-based, no AI (AI routing is out of scope per the synopsis).

### Method
1. Request up to 3 alternatives (provider permitting).
2. Sample each route every ~50 m; for each sample, sum `severity × recency × confirmation` of active hazards within 40 m (reuse the existing decay code, with MAP-9's half-lives). That is the route's **risk**.
3. For **walking**, if the provider supports it, request Valhalla's `use_lit` pedestrian option (0–1, higher avoids unlit streets; not a guarantee) [R27].
4. Optionally **exclude** the immediate surroundings of severe, confirmed hazard clusters using `exclude_polygons` (works but is costly per request, so limit to a few small polygons) [R21].
5. Choose the lowest-risk route whose duration is ≤ **1.3 ×** the fastest; otherwise show the fastest with a warning.

### Data-quality note
Lit-street information depends on OSM tagging, which may be sparse in Dehradun; measure the share of tagged ways before promising this in the UI 🔬.

### Acceptance criteria
- On a seeded test area with a known hazard on the direct route, "Safest" avoids it and states the extra time.
- If no alternative exists, the UI says so instead of pretending.

---

## 7. Safe places overlay (MAP-7)

- Layers: police stations, hospitals/clinics, pharmacies, and 24-hour shops.
- Source: OpenStreetMap through a one-off import (not live queries). Store in `safe_places(id, osm_id, type, name, phone, opening_hours, location geography)`; refresh monthly with a script (use Overpass sparingly or a regional extract).
- Query with `ST_DWithin` within 2 km of the user; "Nearest safe place" button opens directions and offers a call button when a phone number is known.
- **Verify by hand** the ~30 places nearest DBUU and central Dehradun (OSM completeness there is unknown 🔬) and add missing ones through the curated list from §3.

### MAP-7b — "Safe stop" verified local spots (added 22 Sep 2026)
Beyond OSM-sourced police/hospitals/pharmacies (which are institutional and static), a **curated, physically-verified** list of local businesses that have agreed to be a place someone can wait or ask for help — modelled on the UK's "Ask for Angela" scheme [R60], where venue staff are trained to respond to a code phrase or request discreetly.
- Separate table (not mixed with OSM-sourced `safe_places`, since the verification process and trust level differ):
  ```sql
  CREATE TABLE safe_stops (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, category VARCHAR(30),  -- cafe|pharmacy|shop|hostel_gate|other
    location GEOGRAPHY(Point,4326) NOT NULL, phone TEXT,
    verified_by INTEGER REFERENCES users(id), verified_at TIMESTAMPTZ,
    notes TEXT,                          -- e.g. "ask for the manager, mention Safora"
    active BOOLEAN NOT NULL DEFAULT true
  );
  ```
- **Verification is manual and physical** — this is exactly the kind of task your support member's task list already includes for safe-places generally; extend it to include: visit the location, confirm they're willing to be listed, record how someone should ask for help there.
- Shown on the map with a distinct icon from OSM-sourced safe places, so users understand these are specifically vetted, not just "any pharmacy."
- Start small (5–10 verified spots near DBUU/central Dehradun) rather than trying to build a large network immediately — a short list of genuinely reliable spots beats a long list of unverified ones.

---

## 8. Hazard proximity alerts (MAP-8)

- Wires up the currently non-functional "Hazard alerts" Settings toggle ✅.
- **Privacy-preserving:** the phone subscribes to FCM **topics per geohash cell** (precision 6 ≈ 1.2 km × 0.6 km) for its own cell and neighbours; the server never stores continuous locations for this.
- When a report with severity ≥ 4 (or with ≥ 2 confirmations) is created, the server publishes to that cell's topic; the phone checks the distance (< 500 m) and shows a notification.
- Night-only option (e.g. 8 pm–6 am) and per-category mute.
- 🔬 Check the FCM limit on topic subscriptions per app instance and the topic-message delivery delay.

---

## 9. Hazard scoring changes (MAP-9)

### Problem
One 24-hour half-life for every category treats a broken streetlight, a waterlogged road and a landslide as if they all fade in a day ✅ (`safetyDecay` is a single constant).

### Proposal (starting values — calibrate in the pilot 🔬)
| Category | Half-life | Rationale |
|---|:---:|---|
| Poor lighting | 14 days | Stays until repaired |
| Road hazard / construction | 7 days | Repairs take days |
| Waterlogging / flash flood | 12 hours | Clears quickly after rain |
| Isolated area | none (static) | Property of the place |
| Harassment / suspicious activity | 72 hours | Fades but matters |
| Landslide / blocked road (new) | until cleared | Persists until someone says it is cleared |
| Wildlife sighting (new) | 48 hours | Animals move |
| Poor mobile coverage (new) | none (static) | Property of the place |

### "Still there / cleared" confirmations
Each hazard card offers **Still there** (extends life) and **Cleared** (after 2 unique "cleared" votes, status becomes `resolved`). Uses the `report_confirmations` table with a `vote` column (`present|cleared`). Unique per user (SEC-3).

### Acceptance criteria
- Unit tests (`safetyDecay`) for each category half-life; a landslide report does not decay until cleared.
- Two "cleared" votes by two different users resolve a hazard; one user cannot vote twice.

### MAP-9c — Reporter trust score (added 22 Sep 2026)
Same anti-gaming pattern Waze uses for traffic reports [R61]: an account with a history of reports that got confirmed by others should count for more than a brand-new or frequently-disputed account's report.
```sql
ALTER TABLE users ADD COLUMN trust_score REAL NOT NULL DEFAULT 1.0;
```
- Recompute periodically (not per-report, to avoid thrash): `trust_score = clamp(0.5, 2.0, 1.0 + 0.1 × (confirmed_reports − disputed_reports))`, where "disputed" means reports later marked `duplicate`/`fake` by staff moderation (already an existing moderation status).
- Applied as an additional multiplier in the safety-score formula (`docs/v1/safety-algorithms.md` §1): `penalty(report) = S × D × T × C × trust_score(reporter) × 5`.
- **New accounts start at neutral trust (1.0)**, not penalized for being new — trust only moves based on actual track record, so this can't be used to unfairly suppress genuine first-time reporters.
- Never shown to the reporter themselves as a visible "score" (avoid gamification pressure or anxiety about a number) — it's an internal weighting signal, not a public reputation display.

### MAP-9d — Duplicate/near-duplicate detection (added 22 Sep 2026)
Two reports of the same category within a short time and short distance are probably the same underlying hazard, not two independent ones — left unhandled, this inflates a cluster's apparent severity and count.
- On report creation, check for existing **unresolved** reports of the **same category** within **~30 metres** and **~2 hours** (tune both during testing).
- If found: don't reject the new report outright (the reporter's experience still matters), but link it (`reports.duplicate_of INTEGER REFERENCES reports(id)`) and **do not double-count it** in cluster/severity calculations — treat it as an additional confirmation of the existing report instead (reuses `report_confirmations` rather than inventing a second mechanism).
- Staff can also mark duplicates manually during moderation (already-existing `moderate` status options) — this is an automatic first pass, not a replacement for human judgement on ambiguous cases.

### MAP-9e — Photo EXIF sanity check (added 22 Sep 2026, optional/weak signal only)
**Important caveat, stated plainly:** many phones strip GPS EXIF data from photos by default for privacy, and users should not be pushed toward *less* privacy to satisfy this check — so this must stay a soft signal, never a requirement.
- If a photo's EXIF **does** contain GPS/timestamp data, compare it loosely against the report's claimed location/time; if wildly inconsistent (e.g. photo GPS is in a different city, or timestamp is months old), flag the report for a closer look in the moderation queue rather than auto-rejecting it.
- If EXIF data is **absent** (the common case), the check simply does nothing — treat absence as neutral, not suspicious, since stripped EXIF is normal privacy-conscious phone behaviour, not evidence of anything.
- This is explicitly a minor anti-abuse aid, not a verification system — don't let it become load-bearing for trust decisions.

---

## 10. Dependencies between map items

`SEC-1` → `MAP-3`, `MAP-4` (keys off the client) · `MAP-1` → `MAP-2`, `MAP-7` · `MAP-4` → `MAP-5`, `MAP-6` · `MAP-9` ← `SEC-3` · `MAP-8` ← `SEC-8`.
