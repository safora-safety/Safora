# Admin Panel — V1

## Pages and status

| Page | Status |
|---|---|
| Login | Existing |
| Dashboard (map + KPIs) | **Interactive (V1)** — all StatCards clickable with module navigation; live API latency ping measured in ms; priority queue click-through |
| SOS Alerts (queue, status, audio playback) | **Changed** — shows watchdog-triggered alerts (`source='watchdog'`) alongside manual triggers; real-time audio playback |
| Hazards (filters, moderation) | **Interactive (V1)** — KPI StatCards filter table; "Add Resolution Notes" modal dialog with quick municipal preset chips; batch checkboxes with floating action bar |
| Safe Walks radar | **Interactive (V1)** — sample-data fallback removed (SEC-9); KPI StatCards and filter pills; "🗺️ View Corridor" modal with direct Google Maps/OSM navigation links; direct "📞 Call Walker" callback |
| Analytics | Existing |
| Users (role/status) | **Interactive (V1)** — clickable role StatCards (`Admins`, `Moderators`, `Citizens`); "+ Add Staff / Citizen" modal connected to `userService.createUser` |
| Diagnostics | **Interactive (V1)** — top KPI StatCards; individual "Test Service" action buttons for PostGIS, Cloudinary, Firebase, MapTiler, Nominatim, and Express with live measured latency ms |
| Settings | **Interactive (V1)** — credentials change; audible SOS alarm toggle with Web Audio API "🔔 Test Chime" preview button |
| Navigation Sidebar | **Live (V1)** — auto-updating badge counters for active SOS alerts and pending community hazards |

## Why the sample-data fix matters for the submission
An evaluator who opens the admin panel during a demo and sees moving "journeys" that don't correspond to anything real is an easy, damaging thing to notice. This is a small code change (delete the fallback function, show an empty state) with a large credibility payoff — it's in the V1 must-do list (`tasks.md`, SEC-9) for that reason, not because it's technically hard.

## Deferred to V2
Campus/organisation scoping, dispatch workflow (assign responder, call-back log), response-time analytics, PDF evidence export, chat moderation queue (no chat exists yet in V1).

## File map

| Change | File(s) |
|---|---|
| Remove sample-journey fallback | `apps/frontend/src/services/journeyService.ts` — delete `getMockActiveJourneys` and its call site |
| Empty/error states for Safe Walks radar | `apps/frontend/src/pages/SafeWalksPage.tsx` |
| Watchdog-sourced SOS alerts appear in the queue | No admin code change needed — `apps/frontend/src/pages/SosAlertsPage.tsx` already reads from `sos_alerts`/`GET /api/sos/alerts`, which now also contains `source='watchdog'` rows from the backend change in `tasks.md` #7. Confirm the UI doesn't assume `source` is always `'manual'` anywhere (e.g. an icon or label keyed off source) |
| Hazard identity still visible to staff | No change — `apps/frontend/src/pages/HazardsPage.tsx` already calls staff-guarded endpoints, which keep full `StaffReportDto` identity per `tasks.md` #2 |

## Exact pseudocode for the sample-data removal

```ts
// apps/frontend/src/services/journeyService.ts — BEFORE
export async function getActiveJourneys() {
  try {
    const res = await api.get('/journeys/active');
    return res.data.length > 0 ? res.data : getMockActiveJourneys(); // DELETE this fallback
  } catch {
    return getMockActiveJourneys(); // DELETE this fallback
  }
}

// AFTER
export async function getActiveJourneys(): Promise<Journey[]> {
  const res = await api.get('/journeys/active');
  return res.data; // empty array is a valid, real answer — let the page component render it as such
}
```
```tsx
// apps/frontend/src/pages/SafeWalksPage.tsx — add explicit states
const { data: journeys, isLoading, isError } = useActiveJourneys(); // or whatever data-fetching pattern is already used
if (isLoading) return <LoadingSpinner />;
if (isError) return <ErrorState message="Couldn't load active Safe Walks" />;
if (journeys.length === 0) return <EmptyState message="No active Safe Walks right now" />;
return <RadarMap journeys={journeys} />;
```
