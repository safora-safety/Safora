# Feature Audit and Comparison with Existing Platforms

| | |
|---|---|
| **Version** | V1 (complete) |
| **Purpose** | Document what Safora V1 does, how it relates to established safety platforms, and which design choices are deliberate |
| **Method** | Feature inventory from the code base; platform capabilities taken from official help pages, app-store listings, government pages and published studies (section 8). Where a source does not state a capability it is marked "not stated" and is never assumed to be absent |

## 1. Summary

Personal-safety technology is spread across separate kinds of product:

1. **Check-in and sharing features** built into phones (Apple Check In, Google Safety Check) and family trackers.
2. **Panic buttons and monitored dispatch** (Noonlight, bSafe) and the national emergency apps (112 India and state police apps).
3. **Community mapping platforms** (My Safetipin, Safecity) that turn audits and reports into safety information.
4. **Dispatch software** used inside emergency control rooms.

Each of these is established and several already provide timed check-ins with automatic escalation, live location sharing and recorded evidence. Safora's contribution is not any single idea. It is the combination, in one free application for Android phones of any make:

- a **time-decayed community hazard score** with clustering,
- **corridor-based monitoring** of a planned route with a short confirmation window and a **server-side watchdog**, and
- a **live audio-evidence relay** that survives the loss of the phone,

together with a dispatcher console for staff. The following sections document these features and the comparison on which that statement rests.

## 2. Design Foundations

Two established criminology frameworks informed the design:

- **Crime Prevention Through Environmental Design** (Jeffery, 1971; Newman's *Defensible Space*, 1972) and natural surveillance (Jacobs, 1961). Crowdsourced reports on lighting, isolation and waterlogging make hazards visible and help walkers choose better-lit, busier routes. Visible maintenance problems are the "disorder cues" described in the broken-windows argument (Kelling and Wilson, 1982).
- **Situational crime prevention** (Clarke, 1983; Cornish and Clarke, 2003): raise the perceived risk (live evidence and automatic alerts), increase the effort (loud siren, immediate guardian notification) and reduce provocation (discreet decoy features).

## 3. Feature Inventory

| # | Feature | Summary | Main files |
|--:|---|---|---|
| 1 | Safe Walk escort | Planned route with a configurable corridor (default 150 m) and live guardian view | `journeyService.ts`, `SafeWalkScreen.tsx` |
| 2 | Server watchdog | Escalates an unconfirmed deviation after 60 s; works even if the phone is lost | `watchdogService.ts` |
| 3 | Dual-sink audio engine | Live 5-second slices and a lossless master file | `SafeWalkService.kt`, `audioRecorderService.ts` |
| 4 | Hardware compression | Opus or AAC slices, PCM fallback | `SafeWalkService.kt` |
| 5 | Server rescue stitcher | Stores partial evidence when the phone stops transmitting | `audioStitcherService.ts` |
| 6 | Voice clarity filter | High-pass, speech boost and compressor on the dispatcher side | `SocketContext.tsx`, `AudioPlayer.tsx` |
| 7 | Jitter buffer | Re-orders slices that arrive out of sequence | `SocketContext.tsx` |
| 8 | Multi-channel SOS | Push to guardians, live relay to admins, pre-filled SMS fallback | `sosService.ts`, `HomeScreen.tsx` |
| 9 | Lock-screen operation | Foreground service with wake lock | `SafeWalkService.kt` |
| 10 | Calculator decoy | Working calculator; duress PIN sends a silent SOS | `CalculatorDecoyModal.tsx` |
| 11 | Fake call | Bilingual (English and Hindi) simulated incoming call | `FakeCallModal.tsx` |
| 12 | Siren | Looping siren on the alarm stream at maximum volume | `sirenService.ts` |
| 13 | Safety score | Penalty model with decay, distance and confirmations; no fallback value | `reportService.ts` |
| 14 | Clustering | PostGIS DBSCAN (ε about 330 m) | `reportRepository.ts` |
| 15 | Reporting | Photo evidence, rate limiting, moderation, identity removed from public responses | `reportController.ts`, `Report.ts` |
| 16 | Dispatcher console and battery shield | Live radar, command palette, vendor battery-exemption guides | `apps/frontend`, `batteryOptimizationService.ts` |

Details of each feature are in the other V1 documents.

## 4. Comparison with Existing Platforms

Table cells state what the cited source describes. **n/s** means the capability is not stated in the sources reviewed; the platform may still offer it.

| Capability | My Safetipin | 112 India | bSafe | Noonlight | Apple Check In | Google Safety Check | **Safora V1** |
|---|---|---|---|---|---|---|---|
| SOS alert with location | n/s | Yes | Yes | Yes | Partial | Yes | **Yes** |
| Live location shared with contacts | Yes | n/s | Yes | Yes | On failure | Yes | **Yes** |
| Timed check-in with automatic escalation | n/s | n/s | Yes | Yes | Yes (15 min) | Yes (60 s) | **Yes (60 s)** |
| Route deviation monitoring | Partial | n/s | n/s | n/s | Yes | n/s | **Yes (corridor)** |
| Escalation if the phone is lost | n/s | n/s | n/s | n/s | Yes | n/s | **Yes (server)** |
| Community hazard map or score | Yes | n/s | n/s | n/s | n/s | n/s | **Yes** |
| Time decay of community reports | n/s | n/s | n/s | n/s | n/s | n/s | **Yes** |
| Safest-route recommendation | Yes | n/s | n/s | n/s | n/s | n/s | Planned (V2) |
| Audio or video evidence | n/s | n/s | Yes | n/s | n/s | Yes | **Yes (audio)** |
| Siren or loud alarm | n/s | n/s | Yes | n/s | n/s | Yes | **Yes** |
| Fake call or decoy | n/s | n/s | Yes | n/s | n/s | n/s | **Yes** |
| Available on | Android, iOS | Android, iOS | Android, iOS | Android, iOS (US only) | iPhone | Pixel phones | **Android** |
| Cost | Free | Free | Free and premium | Free and paid plan | Built in | Built in | **Free** |

### 4.1 What the comparison shows

- **Confirm-before-escalate is a proven pattern.** Google's Safety Check gives 60 seconds, Apple's Check In 15 minutes, and Noonlight and bSafe use a cancel PIN or timer. Safora's 60-second window is in line with existing practice.
- **Apple's Check In also handles a lost phone**, so a server-side escalation is not unique in itself. Its limitation is that it is iPhone-only and needs iOS 17 or later on both sides.
- **No reviewed platform is described as combining** a decayed community hazard score, a monitored pedestrian corridor with a short confirmation window, and a live audio relay with a server-side rescue, on Android phones of any make.
- **Government apps connect the user to the police** and do not describe a hazard map or journey monitoring.

### 4.2 Where Safora is behind

- No safest-route ranking yet (My Safetipin has one; it is a V2 item).
- No monitored professional dispatch (Noonlight); Safora relies on guardians and campus staff.
- Android only.
- Guardian handshake is simplified.

## 5. Engineering Differences Worth Stating

| Design choice | Reason |
|---|---|
| Native foreground service posts audio itself | The JavaScript thread is throttled when the phone is locked |
| Local lossless master plus server-side stitching | Evidence survives destruction of the phone |
| Server-side watchdog in addition to the phone prompt | Covers a killed app or lost phone |
| Honest error states and no fallback score | A safety number must never be invented |
| Free-tier, open-source components only | A campus or small city can adopt Safora without recurring cost |

Compressed slices are small: a 5-second slice is 160,000 bytes as 16 kHz mono PCM, about 15,000 bytes at 24 kbps (Opus) and about 20,000 bytes at 32 kbps (AAC), before container overhead. That is a reduction of roughly 87 to 91 per cent, which is what makes live delivery practical on weak mobile networks.

## 6. Resilience to Severe Scenarios

| Scenario | What a simple app does | Safora response |
|---|---|---|
| Phone destroyed at second 12 of an SOS | Local recording lost | Slices 1 and 2 are already on the server; after 8 s the stitcher stores 10 s of audio |
| Walker taken off the route | Alert waits for the planned arrival time | Deviation beyond the corridor starts the 60 s prompt; the server escalates if there is no answer |
| Phone inspected under threat | A visible SOS screen provokes violence | Calculator decoy; the duress PIN starts a silent SOS and audio capture |
| Vendor battery manager kills background services | Tracking stops after a few minutes | Foreground service, battery-exemption request and vendor-specific guides |
| No data connection | Streaming fails | Master file kept on the device and a pre-filled SMS with the position |
| Malicious or false reports | Map filled with false alarms | Rate limit (20 per 15 minutes), community confirmations and moderator triage (fake or duplicate) |

## 7. Privacy and Integrity Notes

- Public report responses omit reporter name, e-mail and phone; staff representations include them.
- Microphone use is explained in plain language and happens only during an SOS.
- Offline reports are kept in on-device storage and synchronised on reconnection.
- The score is always computed from real reports; there is no placeholder value.

## 8. Sources

Accessed 23 October 2026.

| Platform or topic | Source |
|---|---|
| My Safetipin | Safetipin, "My Safetipin app", https://safetipin.com/my-safetipin-app/ |
| Safecity | Red Dot Foundation profile, https://end-violence.org/members/red-dot-foundation |
| 112 India (ERSS) | MHA content on Vikaspedia, https://en.vikaspedia.in/social-welfare/women-and-child-development/emergency-response-support-system |
| Uttarakhand Police App, Gaura Shakti | https://www.publicservicesmap.in/schemes/gaura-shakti-yojana--gsy |
| bSafe | App Store listing, https://apps.apple.com/us/app/bsafe/id459709106 ; AppleVis entry, https://applevis.com/apps/ios/lifestyle/bsafe-never-walk-alone |
| Noonlight | Help centre: https://help.noonlight.com/en/articles/2060965-how-does-noonlight-work and https://help.noonlight.com/en/articles/3270559-how-much-does-noonlight-cost ; CBS Philadelphia test report ; SafeWise review (United States only) |
| Apple Check In | https://support.apple.com/guide/personal-safety/ips56b5bc469/web |
| Google Safety Check | https://store.google.com/magazine/new-pixel-safety-features/ ; https://blog.google/products-and-platforms/devices/pixel/google-pixel-phone-watch-safety-features/ |
| Bengaluru Suraksha, Andhra Pradesh Shakti | The Better India and Deccan Herald reports |
| Research | Viswanath and Basu (2015); Ford et al. (2022); Islam et al. (2021); Fatmi and Abbas (2025); Salve et al. (2026) – see the project paper |
| Criminology | Jacobs (1961); Jeffery (1971); Newman (1972); Kelling and Wilson (1982); Clarke (1983); Cornish and Clarke (2003) |

## 9. Conclusion

All sixteen features are implemented and verified. Safora does not claim to have invented SOS alerts, check-ins or community mapping. Its contribution is to bring a decayed community hazard score, monitored corridors with server-side escalation and loss-proof live audio together in one free Android application, with a console for the people who respond.
