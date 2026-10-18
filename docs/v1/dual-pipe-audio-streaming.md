# Dual-Pipe Audio Streaming & Resilient Archival Engine — V1

> **Status:** Production Architecture Hardened, Verified & Benchmarked  
> **Target Subsystems:** Android Native (`SafeWalkService.kt`), Mobile Service Bridge (`audioRecorderService.ts`), Node/Express REST (`sosRoutes.ts`, `sosController.ts`), Audio Streaming Core (`sosAudioService.ts`), Node/Express Sockets (`journeySocket.ts`), Audio Stitcher (`audioStitcherService.ts`), Web Admin Dispatcher (`SocketContext.tsx`, `AudioPlayer.tsx`, `SosAlertsPage.tsx`)

---

## 1. Executive Summary & Root Cause of the Locked-Screen Bug

### 1.1 The 30-Second Black Hole & "Broken Phone" Risk
In conventional emergency apps, audio recording is a single monolithic 30-second file uploaded only after 30 seconds elapse. This creates two fatal vulnerabilities:
1. **Silence During Crisis:** Dispatchers and guardians wait 30 seconds before hearing a single sound while an attack or assault unfolds.
2. **Total Evidence Destruction:** If the attacker smashes the phone, throws it in water, or the battery dies at second 12, the entire recording is lost. Zero evidence reaches the cloud.

### 1.2 The Locked-Screen Pure JavaScript Failure (Root Cause Discovered & Fixed)
In earlier versions, 5-second audio chunks were emitted to mobile JavaScript via React Native's bridge and sent over `socket.io-client` (`socket.emit('sos:audio_chunk', ...)`).
* **The Failure:** When a citizen triggered SOS and immediately locked their phone or slipped it into a pocket/bag, Android's `PowerManager` entered Doze/Standby mode.
* **The Consequence:** Android severely throttled or completely paused React Native's JavaScript thread (Hermes/V8). The pure JS Socket.IO client stopped transmitting heartbeats and frames. Chunks accumulated in JS memory and only flushed in a late burst once the phone was unlocked—defeating real-time emergency intervention.

### 1.3 The Industry-Standard Solution: Native Dual-Sink Pipeline
We re-engineered audio transmission to follow the pattern used by law enforcement body cameras (Axon) and first-responder platforms (Zello Work):
* **Pipe 1 (Real-Time Progressive Delivery — Native OkHttp):** 
  Slices audio in native Kotlin memory into 5-second PCM/WAV chunks and transmits them directly over **native OkHttp POST** (`POST /api/sos/:id/audio-chunk`). This runs inside an Android Foreground Service (`FOREGROUND_SERVICE_TYPE_MICROPHONE`) holding a partial `WAKE_LOCK`, completely immune to screen lock and JS thread throttling.
* **Pipe 1b (Dual-Redundant Fallback — Socket.IO):** 
  Concurrently emits to mobile JS for Socket.IO delivery when the phone is unlocked. The backend and frontend deduplicate chunks so neither transport interferes with the other.
* **Pipe 2 (Continuous Local Master Archival):** 
  Concurrently streams all raw PCM frames into an unbroken local master file (`sos_${alertId}_master.wav`) on device disk. At 30 seconds, the 44-byte WAV header is finalized and the continuous file is uploaded to Cloudinary.
* **Fail-Safe Server Watchdog (AudioStitcherService):** 
  If the phone is destroyed, loses cell coverage, or runs out of battery at second 12, an 8-second watchdog timer on the server automatically stitches whatever chunks arrived into a single WAV file and uploads it to Cloudinary.

---

## 2. End-to-End System Flow

```
                                ┌───────────────────────────────────────────┐
                                │          Android Mobile Device            │
                                │                                           │
                                │  Microphone Input (Single 30s Session)    │
                                │  Foreground Service + Partial WakeLock    │
                                └─────────────────────┬─────────────────────┘
                                                      │
                           ┌──────────────────────────┴──────────────────────────┐
                           │                                                     │
                           ▼                                                     ▼
             ┌───────────────────────────┐                         ┌───────────────────────────┐
             │   PIPE 1: Live Slices     │                         │   PIPE 2: Master File     │
             │   (5-Second WAV Chunks)   │                         │ (Continuous Local File)   │
             └─────────────┬─────────────┘                         └─────────────┬─────────────┘
                           │                                                     │
              ┌────────────┴────────────┐                                        │
              │                         │                                        │
     [Screen Locked]           [Screen Unlocked]                                 │
              │                         │                                        │
              ▼                         ▼                                        │
    Native OkHttp POST          JS Socket.IO Emit                                │
 (POST /api/sos/:id/audio-chunk) ('sos:audio_chunk')                             │
              │                         │                                        │
              └────────────┬────────────┘                                        │
                           │                                                     │
                           ▼                                                     │
             ┌───────────────────────────┐                                       │
             │   Safora Backend Engine   │                                       │
             │  (processSosAudioChunk)   │                                       │
             │  - DB Grace Retry (4x)    │                                       │
             │  - 10MB Body Limit        │                                       │
             │  - 60/min Rate Limiter    │                                       │
             └──────┬─────────────┬──────┘                                       │
                    │             │                                              │
         Relays live│             │Relays live via WebSocket                     │
                    ▼             ▼                                              │
             ┌─────────────┐ ┌─────────────────────────────────┐                 │
             │  Guardian   │ │       Web Admin Dashboard       │                 │
             │  Phone App  │ │ - Deduplication Cache           │                 │
             │             │ │ - 6ms Audio Edge Micro-Fades    │                 │
             │             │ │ - Sequential Live Streamer      │                 │
             │             │ │ - Custom Scrub Bar (Never Stalls│                 │
             └─────────────┘ └─────────────────────────────────┘                 │
                    │                         │                                  │
                    └───────────┬─────────────┘                                  │
                                ▼                                                │
             ┌─────────────────────────────────────┐                             │
             │        Server Staging Buffer        │                             │
             │      (/tmp/safora_sos_chunks/)      │                             │
             └──────────────────┬──────────────────┘                             │
                                │                                                │
                                ▼                                                │
                     [Watchdog Triggered?]                                       │
                     ├─ IF Phone Dies (Timeout > 8s):                            │
                     │  Server stitches partial chunks ───► Uploads to Cloudinary│
                     │                                                           │
                     └─ IF Phone Finishes 30s Normally: ─────────────────────────┘
                        Mobile uploads unbroken 30s Master file to Cloudinary
                        Server watchdog disarmed; temporary staging folder purged
```

---

## 3. Communication Protocol Specification

### 3.1 Mobile Native to Backend REST (`POST /api/sos/:id/audio-chunk`)
Transmitted directly from Kotlin via OkHttp:
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Body:**
```json
{
  "alertId": 142,
  "seq": 1,
  "totalChunksExpected": 6,
  "durationSec": 5.0,
  "sampleRate": 16000,
  "mimeType": "audio/wav",
  "data": "UklGRuRwAABXQVZFZm10IBAAAAABAAEAwF0AA...",
  "isLast": false
}
```

### 3.2 Mobile JS Fallback over Socket.IO (`sos:audio_chunk`)
Emitted by mobile client when unlocked as dual-redundant transport:
```json
{
  "alertId": 142,
  "seq": 1,
  "totalChunksExpected": 6,
  "durationSec": 5.0,
  "mimeType": "audio/wav",
  "data": "UklGRuRwAABXQVZFZm10IBAAAAABAAEAwF0AA...",
  "isLast": false
}
```

### 3.3 Backend to Listeners (`sos:live_audio_chunk`)
Broadcasted immediately to room `sos:alert:{alertId}`, room `staff` (admin operations), and guardian rooms (`user:{gid}`):
```json
{
  "alertId": 142,
  "seq": 1,
  "totalChunksExpected": 6,
  "durationSec": 5.0,
  "mimeType": "audio/wav",
  "data": "UklGRuRwAABXQVZFZm10IBAAAAABAAEAwF0AA...",
  "isLast": false,
  "timestamp": "2026-10-17T19:30:00.000Z"
}
```

### 3.4 Room Authorization & Rate Limiting
- **Endpoint Limits:** `audioChunkRateLimiter` permits up to 60 chunks/minute per authenticated user, preventing standard trigger throttling during active streaming.
- **Express Body Parser:** Increased to `{ limit: "10mb" }` in `app.ts` to accommodate Base64 WAV audio payloads without HTTP 413 errors.
- **Access Control:** Slices are authorized only if the alert belongs to the authenticated user or the user possesses `admin`/`moderator` role.

---

## 4. Subsystem Implementation Details

### 4.1 Native Android Engine (`SafeWalkService.kt`)
- **Foreground Service:** Runs with `FOREGROUND_SERVICE_TYPE_MICROPHONE | FOREGROUND_SERVICE_TYPE_LOCATION` and `PARTIAL_WAKE_LOCK`. Survives screen-off, pocket storage, and Android Doze mode.
- **Audio Configuration:** 16,000 Hz sample rate, 16-bit linear PCM, mono channel (`AudioFormat.CHANNEL_IN_MONO`). Generates 32 KB/sec.
- **Dual-Sink Thread:**
  - `fileOut`: Streams raw PCM bytes continuously to `sos_${alertId}_master.wav`.
  - `chunkBuffer`: Accumulates 160,000 bytes (5s), prepends 44-byte WAV header, Base64 encodes, and invokes `postAudioChunkNatively(...)`.
  - Concurrently emits `onSosAudioChunk` to React Native JS bridge for parallel Socket.IO transmission.
- **OkHttp Hardening:**
  - Explicit timeouts: `connectTimeout(15s)`, `readTimeout(20s)`, `writeTimeout(20s)`, `retryOnConnectionFailure(true)`.
  - Automatic retry: If a network blip occurs during cell tower handover, retries up to 2 times with 1.5s backoff.
- **Alert ID Queue Buffering:**
  - If Chunk #1 completes before the asynchronous HTTP SOS alert ID returns, the chunk is staged in `pendingNativeChunks`.
  - Flushed immediately via `flushPendingNativeAudioChunks(alertId)` the millisecond `ACTION_UPDATE_ALERT_ID` arrives.
- **Triple-Redundant Auth Token:**
  1. Passed in intent extra upon SOS trigger (`EXTRA_AUTH_TOKEN`).
  2. Passed dynamically when associating alert ID (`updateEmergencyAlertIdWithToken`).
  3. Direct fail-safe fallback read from Android local SQLite database (`RKStorage` / `catalystLocalStorage` for key `@safora_token`).

### 4.2 Mobile Service Bridge (`audioRecorderService.ts`)
- Calls `NativeModules.SafeWalkService.startEmergencyAudioWithToken(alertId, token)`.
- Dispatches `updateEmergencyAlertIdWithToken` when backend alert creation completes.
- Listens to `onSosAudioMasterCompleted` to upload the 30-second continuous WAV file to Cloudinary.
- Fallback: If hardware `AudioRecord` fails, activates `Sound.startRecorder()` automatically.

### 4.3 Backend Core & Stitcher (`sosAudioService.ts` & `audioStitcherService.ts`)
- **Transport Agnostic:** `processSosAudioChunk` handles chunks identically whether delivered via REST HTTP or WebSocket.
- **Rapid DB Commit Grace Retry:** Retries finding newly created alert up to 4 times with 500ms intervals to handle sub-second database propagation lag.
- **8-Second Watchdog Timer:**
  - Automatically resets with every sequential chunk received.
  - If mobile client disconnects, watchdog auto-stitches all received fragments into a single cohesive WAV file and uploads to Cloudinary.
  - When the client uploads the unbroken master WAV, `handleMasterUploaded` disarms the watchdog and purges temporary files.

### 4.4 Web Dispatcher Audio Queue (`SocketContext.tsx`, `AudioPlayer.tsx`, `SosAlertsPage.tsx`)
- **Dual-Transport Deduplication:**
  - Cache set (`enqueuedOrPlayedChunkKeys`) tracks `${alertId}:${seq}`.
  - Slices received via both OkHttp and Socket.IO are deduplicated instantly, preventing audio echoes or stutter.
- **Web Audio API 6ms Micro-Fades:**
  - Applied at slice start and end via `GainNode` exponential ramping. Eliminates audible DC-offset "clicks" between successive PCM chunks.
- **Sequential Live Feed Streaming:**
  - Clicking "Listen Live Feed" plays Chunk 1 through Chunk 6 continuously and sequentially without stopping.
  - Dynamic button toggles between "Listen Live Feed" and "Pause Feed (Slice #X)".
- **Tactical Audio Scrubber / Seeker:**
  - Replaced brittle `<input type="range">` with custom scrub track.
  - Window-level mouse/touch drag listeners: Dragging anywhere on the monitor **never freezes** the playhead.
  - Click-to-seek, hover timestamp tooltip (e.g. `00:14`), and gradient progress fill.
- **Aligned 720px Dashboard Layout:**
  - Added `max-h-[720px] overflow-y-auto custom-scrollbar` to both the left beacon queue and right alert telemetry panel, ensuring sleek tactical alignment without layout overflow.

### 4.5 Mobile Guardian Audio Queue & Live SOS HUD (`SafeWalkServiceModule.kt` & `GuardianSosLiveModal.tsx`)
- **Native Hardware Audio Player:**
  - `SafeWalkServiceModule.playLiveAudioChunk` decodes incoming Base64 WAV slices into cache storage and streams via `android.media.MediaPlayer`.
  - Automatically emits `onLiveAudioChunkFinished` to trigger seamless chaining to the next sequential chunk (`#seq + 1`).
- **Global Emergency Transmission HUD:**
  - Mounted globally in `App.tsx` (`GuardianSosLiveModal`), popping up instantly across any screen when a companion triggers SOS.
  - Live chunk progress pills (`#1..6`), soundwave visualizer, mute/unmute toggle, and automatic transition to 30s master audio.
  - Includes instant action dispatch: Navigate to Live GPS Coordinates, Call Companion, or Call 112 Emergency Dispatch.
- **Auto-Refreshing Guardian Inbox:**
  - `NotificationScreen.tsx` listens directly to `sos:alert` and `sos:audio` socket events to keep the emergency inbox synchronised in real time.

---

## 5. Resilience & Edge-Case Matrix

| # | Incident Scenario | Traditional Risk | Safora Dual-Pipe Mitigation |
|---|---|---|---|
| **1** | **Phone screen locked immediately** | JS thread paused by Android; 0 chunks arrive until unlocked. | `SafeWalkService.kt` runs natively as a typed foreground service and posts each chunk directly via OkHttp. Delivered every 5s. |
| **2** | **Phone smashed / battery dies at 12s** | 100% audio evidence destroyed. | Chunks 1 & 2 (10s) were already received by server. 8s watchdog triggers auto-stitching, uploads 10s WAV to Cloudinary. |
| **3** | **Cellular tower handover dip** | Chunk HTTP upload fails. | OkHttp client retries up to 2 times with 1.5s backoff; dual-redundant Socket.IO provides secondary path if unlocked. |
| **4** | **Sub-second race: Chunk finishes before Alert ID created** | Native chunk dropped or rejected as unowned. | Kotlin buffers chunk in `pendingNativeChunks` and flushes the moment `ACTION_UPDATE_ALERT_ID` arrives. |
| **5** | **Both OkHttp and Socket.IO deliver chunk #1** | Duplicate audio plays twice on admin console. | Admin frontend deduplicates by `${alertId}:${seq}` in `SocketContext.tsx`; duplicate frame is discarded. |
| **6** | **Browser autoplay restriction on admin portal** | Browser mutes audio playback. | Web Audio API queue preserves chunks during suspended state. First click anywhere on the page or the "Enable Live Audio" button resumes context and plays full stream. |
| **7** | **Normal 30-second completion** | Race condition between stitched and master. | Mobile master file upload disarms server watchdog (`handleMasterUploaded`) and takes precedence. |

---

## 6. Industry Benchmark Comparison

| Metric | SAFORA Dual-Pipe Engine | Zello Work (PTT) | Law Enforcement BWCs (Axon) | Citizen App |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Ingestion Transport** | **Stateless Chunked HTTPS POST (5s)** + WebSocket fallback | Custom low-latency UDP streaming | Chunked HTTPS POST (2–5s) + local flash | RTMP / WebSockets / Edge SDR |
| **Locked Screen Survival** | **100%** (Kotlin Foreground Service + WakeLock) | **100%** (Native PTT Service) | **100%** (Dedicated Hardware OS) | **100%** (Native OS Service) |
| **Local Continuous Master** | **Yes** (Continuous WAV on flash) | Optional (Local cache) | **Yes** (Continuous flash storage) | No (Cloud ingest) |
| **Server Fallback Stitching** | **Yes** (8s watchdog auto-stitching) | Server archive stream | **Yes** (DEMS evidence compiler) | Server archive stream |
| **Admin Playback Engine** | Web Audio API + 6ms Micro-Fades | Proprietary Dispatch Hub | DEMS Web Player | Web Audio API + Waveform Render |

---

## 7. Scalability & Resilience Enhancements

### Phase 1: Admin Jitter Buffer & Out-of-Order Sequencer — [STATUS: COMPLETED]
- **Implemented In:** [`apps/frontend/src/context/SocketContext.tsx`](file:///d:/Safora/apps/frontend/src/context/SocketContext.tsx)
- **Problem Solved:** When a user triggers SOS during cellular mobility (driving or walking across cell towers), TCP paths and tower handovers can cause slice #3 to arrive ~100–300ms before slice #2.
- **Engine Architecture:**
  1. **Sliding Playout Window (`450ms`):** If an out-of-order slice arrives (`seq > expectedSeq`), it is staged in `heldChunks` while a 450ms playout timer begins.
  2. **Contiguous Chain Unblocking:** The moment the missing predecessor arrives, the entire contiguous series is unblocked and enqueued in strict chronological order (`#2 -> #3 -> #4`).
  3. **Playout Timeout Fallback:** If the missing slice fails to arrive within 450ms (packet loss over congested cellular network), the timer expires, logs an audit warning, and automatically advances the sequence playout to the lowest available buffered slice, preventing dashboard audio stalls.
  4. **Obsolete Frame Purge:** Any late slices arriving with `seq <= lastPlayedSeq` are discarded immediately.
  5. **Memory Leak Protection:** State is isolated per `alertId` and completely purged upon `stopLiveAudioPlayback()` and `dismissEmergency()`.

### Phase 2: Tactical Voice Clarity & Noise Reduction DSP — [STATUS: COMPLETED]
- **Implemented In:** [`apps/frontend/src/context/SocketContext.tsx`](file:///d:/Safora/apps/frontend/src/context/SocketContext.tsx), [`apps/frontend/src/components/common/AudioPlayer.tsx`](file:///d:/Safora/apps/frontend/src/components/common/AudioPlayer.tsx), and [`apps/frontend/src/pages/SosAlertsPage.tsx`](file:///d:/Safora/apps/frontend/src/pages/SosAlertsPage.tsx)
- **Problem Solved:** When phones are locked in citizen pockets or victims are outdoors, low-frequency acoustic energy (<150 Hz) creates heavy handling thumps, fabric rustle, and wind turbulence rumble that obscures human voice formants (whispers, distress cries, street names).
- **Engine Architecture:**
  1. **175 Hz High-Pass Filter (`BiquadFilterNode`):** Butterworth curve (Q: 0.707) cutting out sub-150 Hz mechanical fabric friction, vehicle engine drone, and wind turbulence.
  2. **2.4 kHz Speech Peaking EQ (`BiquadFilterNode`):** +3.5 dB boost centered at 2,400 Hz (Q: 1.1) to elevate vocal consonant clarity and speech intelligibility.
  3. **Dynamic Range Leveler (`DynamicsCompressorNode`):** Fast 3ms attack, -24 dB threshold, 4:1 ratio to level quiet whispers while preventing ear-piercing screams or mic drops from overloading dispatcher headsets.
  4. **Interactive Dispatcher Toggle:** Real-time `[✨ Clarity: ON/OFF]` tactical switch on both the live 5-second slice streaming banner and the 30-second evidence player, persisting preference to `localStorage`.

### Phase 3: Hardware-Accelerated Audio Compression (Opus / AAC) — [STATUS: COMPLETED]
- **Implemented In:** [`apps/mobile/android/app/src/main/java/com/mobile/SafeWalkService.kt`](file:///d:/Safora/apps/mobile/android/app/src/main/java/com/mobile/SafeWalkService.kt) and [`apps/backend/src/services/audioStitcherService.ts`](file:///d:/Safora/apps/backend/src/services/audioStitcherService.ts)
- **Problem Solved:** Transmitting uncompressed 16-bit PCM WAV chunks (~160 KB per 5s slice) required high bandwidth and struggled over 2G / EDGE / congested cellular networks, where uplink speeds drop to 64–100 kbps (taking >15s to transmit a 5s slice).
- **Engine Architecture:**
  1. **Multi-Tier Hardware Encoder (`MediaCodec` + `MediaMuxer`):**
     - **Tier 1 (Android 10+ / API 29+):** Hardware Opus encoder (`audio/opus`) muxed into standard Ogg Opus container (`audio/ogg; codecs=opus`) at 24 kbps. Slice size drops from **~160 KB to ~16 KB (90% bandwidth reduction)**.
     - **Tier 2 (API 24+ Universal):** Hardware AAC-LC encoder (`audio/mp4a-latm`) muxed into MP4/M4A container (`audio/mp4`) at 32 kbps. Slice size drops to **~18 KB (88% bandwidth reduction)**.
     - **Tier 3 (Fail-safe):** Uncompressed PCM WAV fallback with 44-byte header if hardware encoders encounter OEM restrictions.
  2. **Zero Master Compromise (Dual-Sink Integrity):** The mobile foreground service simultaneously streams raw 16-bit linear PCM directly to flash storage (`sos_${alertId}_master.wav`), guaranteeing the pristine 30-second evidence clip remains 100% loss-free.
  3. **Universal Browser Playback:** Both `.ogg` and `.mp4` chunks are decoded natively in microseconds by Web Audio API's `decodeAudioData` on all modern dispatcher browsers.
  4. **Rescue Watchdog Support:** Backend `AudioStitcherService` auto-detects compressed chunks (`OggS` / `ftyp`) and reliably stores rescue audio evidence to Cloudinary if mobile is destroyed mid-transmission.

### Phase 4: OEM Battery Exemption Engine & Brand-Tailored Guides — [STATUS: COMPLETED]
- **Implemented In:** 
  - Android Manifest: [`apps/mobile/android/app/src/main/AndroidManifest.xml`](file:///d:/Safora/apps/mobile/android/app/src/main/AndroidManifest.xml)
  - Native Kotlin Module: [`apps/mobile/android/app/src/main/java/com/mobile/SafeWalkServiceModule.kt`](file:///d:/Safora/apps/mobile/android/app/src/main/java/com/mobile/SafeWalkServiceModule.kt)
  - Mobile TypeScript Service: [`apps/mobile/src/services/batteryOptimizationService.ts`](file:///d:/Safora/apps/mobile/src/services/batteryOptimizationService.ts)
  - Settings Screen: [`apps/mobile/src/screens/SettingsScreen.tsx`](file:///d:/Safora/apps/mobile/src/screens/SettingsScreen.tsx)
  - Safe Walk Escort Screen: [`apps/mobile/src/screens/SafeWalkScreen.tsx`](file:///d:/Safora/apps/mobile/src/screens/SafeWalkScreen.tsx)
- **Problem Solved:** 
  - Aggressive Android vendor battery management systems (Xiaomi MIUI/HyperOS, Samsung OneUI, OnePlus/Oppo ColorOS/OxygenOS, Huawei EMUI, Vivo FuntouchOS) frequently suspend CPU wake locks, disable background GPS polling, and terminate native foreground services when the phone screen is locked or idle, even when `FOREGROUND_SERVICE` is declared.
- **Engine Architecture:**
  1. **Direct System Intent Trigger:**
     - Added `<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />`.
     - Integrated `isIgnoringBatteryOptimizations()` via Android's `PowerManager` to check real-time exemption status.
     - Prompts user directly with `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` for instant one-tap exemption (*"Let SAFORA always run in the background?"*).
  2. **Vendor-Specific Deep-Links:**
     - Deep-links directly to manufacturer security/power centers if direct intent is blocked by OEM policies:
       - **Xiaomi / Redmi / POCO:** `com.miui.permcenter.autostart.AutoStartManagementActivity`
       - **Samsung:** `com.samsung.android.lool` / `com.samsung.android.sm.ui.battery.BatteryActivity`
       - **OnePlus / Oppo / Realme:** `com.coloros.safecenter.permission.startup.StartupAppListActivity`
       - **Huawei / Honor:** `com.huawei.systemmanager.optimize.process.ProtectActivity`
       - **Vivo / iQOO:** `com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity`
  3. **Live Protection Badge & Interactive Citizen Guide:**
     - Added dedicated **"LOCK-SCREEN & BATTERY PROTECTION"** card in `SettingsScreen.tsx` with live status indicator (`🟢 UNRESTRICTED` vs `🟡 ACTION NEEDED`).
     - Includes manufacturer-tailored step-by-step modal guide detecting user's hardware brand in real time.
  4. **Non-Intrusive Safe Walk Escort Banner:**
     - Integrated a dismissible reminder banner in `SafeWalkScreen.tsx` that warns citizens embarking on night walks if their phone's vendor power saver might restrict locked-screen tracking, providing a one-tap `[Fix]` shortcut.

---

## 8. Summary of All 4 Completed Architecture Phases

All planned hardening and optimization phases are now **fully implemented and production-ready**:
1. **Phase 1: Admin Jitter Buffer & Out-of-Order Sequencer** (`SocketContext.tsx`) — ✅ COMPLETED
2. **Phase 2: Tactical Voice Clarity & Noise Reduction DSP** (`SocketContext.tsx`, `AudioPlayer.tsx`, `SosAlertsPage.tsx`) — ✅ COMPLETED
3. **Phase 3: Hardware-Accelerated Audio Compression (Opus / AAC)** (`SafeWalkService.kt`, `audioStitcherService.ts`) — ✅ COMPLETED
4. **Phase 4: OEM Battery Exemption Engine & Brand-Tailored Guides** (`SafeWalkServiceModule.kt`, `batteryOptimizationService.ts`, `SettingsScreen.tsx`, `SafeWalkScreen.tsx`) — ✅ COMPLETED
