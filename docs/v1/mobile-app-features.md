# Mobile App Features — V1

Screen-by-screen, marking what's existing vs new/changed for V1.

## Onboarding & Accounts
| Feature | Status |
|---|---|
| 4-slide onboarding | Existing |
| Register / Login (JWT) | Existing |
| Guest mode | Existing |
| **Terms & age notice screen** | **New** — shown once after registration: a plain-language Terms/Privacy static page, an age field, and a note ("if you're under 18, please make sure a parent or guardian knows you're using this app") — no verification, just disclosure. Full parental-consent flow is V2 |
| Profile edit, change password | Existing |
| Light/dark theme | Existing |

## Home
| Feature | Status |
|---|---|
| Quick-action cards | Existing |
| Safety score card | **Changed** — on request failure shows a retry state, never an invented number |
| "Live Heatmap" card | **Changed** — now actually opens a heatmap (was previously a pin map with a heatmap label) |

## Hazard Reporting
| Feature | Status |
|---|---|
| Category, severity (1–5), description | Existing |
| Offline queue (AsyncStorage, syncs on reconnect) | Existing |
| **Photo picker (camera/gallery)** | **New** — previously only 3 preset stock images or a pasted URL; now uses the device camera or gallery and uploads to the existing `/upload-photo` endpoint |
| Confirm a report | Existing |
| Public report cards | **Changed** — no longer show the reporter's identity to other users (staff/admin still see it) |

## Map
| Feature | Status |
|---|---|
| Leaflet in WebView, 4 basemaps | Existing (OpenFreeMap swap is V2) |
| Search (Photon → MapTiler) | Existing (tuning is V2) |
| Route preview (Walk/2-Wheeler/Car tabs) | Existing — **known limitation, not fixed in V1:** all three currently show the same car-road geometry; say this plainly in your report rather than claiming per-mode routing works. Real per-mode routing is V2 |
| **Heatmap layer** | **New** — see Home section above |
| 10 km "offline cache" of OSM tiles | Existing — **known limitation:** this uses raster tiles from `tile.openstreetmap.org` in a way their usage policy discourages for bulk prefetch. Not fixed in V1 (fix is the OpenFreeMap/PMTiles migration in V2); mention the limitation rather than the prefetch claim in your report |

## Safe Walk
| Feature | Status |
|---|---|
| Start walk with route preview | Existing |
| Server-side corridor check (150 m) | Existing |
| **Live location visible to a logged-in trusted contact** | **New** — the app now opens a Socket.IO connection and streams position; a contact who is also a Safora user and has the app open during the walk sees it move on a map |
| Phone-side 60 s "I'm safe" countdown | Existing |
| **Server-side deviation alert** | **New** — if the phone-side countdown is missed (or the app is killed), the backend watchdog escalates automatically within about 60 seconds of the deviation (see `safety-algorithms.md` §4) |
| Lost-contact / overdue-arrival alerts, check-in timer | **Not in V1** — V2 |
| **Background tracking with screen locked** | **New (added 22 Sep 2026)** — a native foreground service (`architecture.md` §8) keeps location updates flowing when the screen locks, so the deviation watchdog stays reliable instead of silently degrading once the app backgrounds |
| **Lock-screen audio during SOS** | **New (Dual-Pipe Native Engine)** — runs via `SafeWalkService.kt` foreground service with `FOREGROUND_SERVICE_TYPE_MICROPHONE`. Concurrently slices 5s progressive WAV chunks over Socket.IO and saves local master WAV. Survives screen-off and Doze mode |
| **Distance/ETA notification** | **New** — a persistent notification shows straight-line distance and a rough ETA during Safe Walk, refreshed per location update. **Not turn-by-turn navigation** — no per-step instructions or voice; that needs real per-mode routing, which is V2 (`MAP-4`/`MAP-5`) |

## SOS & Emergency Deterrent
| Feature | Status |
|---|---|
| 5 s cancel countdown, GPS + battery dispatch | Existing (immediate 0s emergency broadcast) |
| **Dual-Pipe Progressive Audio Streaming** | **New** — 16kHz PCM audio sliced in memory into 5s WAV chunks emitted live over Socket.IO (`sos:audio_chunk`) to Guardians & Admin, while simultaneously recording unbroken 30s local master file for Cloudinary archival |
| **Fail-Safe Watchdog Archival** | **New** — if mobile phone is smashed or battery dies mid-stream, server 8s watchdog auto-stitches received slices and uploads partial evidence to Cloudinary |
| **High-Decibel Siren Audio Deterrent** | **New** — 4-second multi-harmonic looping siren (`siren_alarm.wav`) playing at maximum hardware alarm volume (`STREAM_ALARM`) even when phone is on silent |
| **Dual-Mode SOS Execution** | **New** — respecting `@safora_pref_loud_siren`: loud alarm deterrent vs stealth mode (silent progressive audio streaming to Cloudinary) |
| **Personal Panic Siren Quick Card** | **New** — standalone 1-tap siren button on Home screen for immediate on-the-spot street harassment deterrence without triggering police/guardian dispatch |
| Push to guardians (FCM) | Existing |
| SMS/dialer fallback (manual tap) | Existing |
| Test SOS drill | Existing |
| Guardian contacts CRUD, email check | Existing |
| Duress PIN (calculator decoy), fake call | Existing |
| In-app alerts inbox | Existing |

## Settings & Profile
| Feature | Status |
|---|---|
| **Account Password & Security** | **New** — in-app modal (`ChangePasswordModal.tsx`) allowing users to update their credentials with validation and immediate confirmation |
| **Loud Siren Preference Toggle** | **Wired (V1)** — persisted under `@safora_pref_loud_siren`, seamlessly switching between audible deterrent alarm and covert stealth recording |
| **Pull-to-Refresh** | **New** — native `RefreshControl` on Home (re-evaluates real safety score) and Profile |
| Preference toggles (countdown, haptic, battery) | Persisted locally in AsyncStorage |

## Not in V1 at all (see `docs/v2/`)
Chat, Hindi, voice/turn-by-turn navigation, safest-route ranking, safe-places overlay, hazard-proximity push alerts, hardware/no-unlock SOS triggers (volume pattern, Quick Settings tile), medical card, Telegram (dropped entirely, not planned for any version), guardian tracking link for people without the app.

## File map — where each V1 change lives

| Feature | File(s) |
|---|---|
| Terms & age notice screen | `screens/TermsScreen.tsx`, gated in `navigation/RootNavigator.tsx` |
| Safety score card fix | `screens/HomeScreen.tsx`, `services/reportService.ts` |
| Heatmap wiring | `screens/MapScreen.tsx`, `screens/HomeScreen.tsx`, `components/OpenMapView.tsx` |
| Photo picker | `components/ReportHazardModal.tsx` |
| Public report identity removal | Backend only (`reportRepository.ts`, `reportController.ts`) |
| Socket.IO connection | `services/socketService.ts`, initialized on login |
| Live guardian view | `screens/GuardianLiveScreen.tsx`, reuses `components/OpenMapView.tsx` |
| Deviation confirm-safe prompt | `screens/SafeWalkScreen.tsx` ("Are you OK?" prompt calling `confirm-safe`) |
| Foreground Safe Walk service | Native Kotlin `android/app/src/main/java/com/mobile/SafeWalkService.kt` |
| Dual-Pipe Audio Streaming | `SafeWalkService.kt`, `SafeWalkServiceModule.kt`, `services/audioRecorderService.ts`, `services/socketService.ts` |
| Emergency Siren & Panic Button | `services/sirenService.ts`, `screens/HomeScreen.tsx`, `screens/SettingsScreen.tsx` |
| Copy corrections | `screens/HomeScreen.tsx`, `screens/OnboardingScreen.tsx`, SOS success/failure screens |

## Component-level notes for the agent

- **`ReportHazardModal.tsx`:** currently likely has a fixed array of 3 preset image URLs and a text input for a pasted URL. Adding the picker means introducing a new dependency (check `package.json` first — `react-native-image-picker` or similar may already be present for the profile-photo feature; reuse it if so rather than adding a second image-picking library).
- **`SafeWalkScreen.tsx`:** already has the phone-side 60-second countdown logic (existing). The new server-side watchdog (V1 task #7) runs *independently* — don't remove the phone-side countdown, it's still useful as the first, faster layer; the server-side version is the safety net for when the phone-side one is defeated (app killed, phone dead). Both can fire; the phone-side one calling `confirm-safe` on "I'm safe" is what prevents the server-side one from also firing.
- **`HomeScreen.tsx`:** the safety-score card and the heatmap card are likely adjacent in the same quick-actions list — check both are updated together since they share the same "was this actually built or just labelled" problem.

## What "done" looks like for this file
Every row in the two tables above (features and file map) has a ✅ next to it in your own working copy of this doc once implemented — treat this file as a living checklist alongside `tasks.md`, not just a description.
