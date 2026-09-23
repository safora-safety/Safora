# Admin Panel — V1

## Pages and status

| Page | Status |
|---|---|
| Login | Existing |
| Dashboard (map + KPIs) | Existing |
| SOS Alerts (queue, status, audio playback) | **Changed** — now also shows watchdog-triggered alerts (`source='watchdog'`) alongside manually triggered ones, with no separate UI needed since they use the same `sos_alerts` table and endpoints |
| Hazards (filters, moderation) | Existing — reporter identity still visible here (staff endpoint, unchanged) |
| Safe Walks radar | **Changed** — previously fell back to hard-coded sample journeys when no real data existed; **V1 removes that fallback**. If there are genuinely no active walks, the radar shows an empty state, not fabricated ones. Real positions now come from `journey_breadcrumbs` via `GET /api/journeys/active` |
| Analytics | Existing |
| Users (role/status) | Existing |
| Diagnostics | Existing |
| Settings | Existing |

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
