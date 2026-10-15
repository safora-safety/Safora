# Dual-Pipe Audio Streaming & Resilient Archival Engine — V1

> **Status:** Production Architecture Built & Verified  
> **Target Subsystems:** Android Native (`SafeWalkService.kt`), Mobile Service Bridge (`audioRecorderService.ts`), Node/Express Sockets (`journeySocket.ts`), Audio Stitcher (`audioStitcherService.ts`), Web Admin Dispatcher (`SocketContext.tsx` & `SosAlertsPage.tsx`)

---

## 1. Executive Summary & Problem Solved

### The 30-Second Black Hole & "Broken Phone" Risk
In conventional emergency apps, audio recording is a single monolithic 30-second file uploaded only after 30 seconds elapse. This creates two fatal vulnerabilities:
1. **Silence During Crisis:** Dispatchers and guardians wait 30 seconds before hearing a single sound while an attack or assault unfolds.
2. **Total Evidence Destruction:** If the attacker smashes the phone, throws it in water, or the battery dies at second 12, the entire recording is lost. Zero evidence reaches the cloud.

### Naive File Chunking Failure
Attempting to stop and restart hardware `MediaRecorder` every 5 seconds creates 300–800ms encoder teardown latency gaps (cutting words) and truncates or overwrites static output files (the 4-second cutoff bug).

### The Solution: Dual-Pipe Architecture
A single continuous hardware microphone capture session runs in a foreground service, concurrently feeding two independent sinks:
- **Pipe 1 (Real-Time Progressive Delivery):** Slices audio in memory into sequential 5-second PCM/WAV chunks and broadcasts them over Socket.IO directly to Guardians and Admin dispatchers in real time (~5s latency).
- **Pipe 2 (Continuous Local Master Archival):** Concurrently streams all raw PCM frames into an unbroken local master file (`sos_${alertId}_master.wav`) on device disk.
- **Fail-Safe Server Concatenator:** If the phone is smashed or disconnects mid-stream, an 8-second watchdog timer on the server automatically stitches whatever chunks arrived into a single WAV file and uploads it to Cloudinary.

---

## 2. End-to-End System Flow

```
                                ┌───────────────────────────────────────────┐
                                │             Android Device                │
                                │                                           │
                                │  Microphone Input (Single 30s Session)    │
                                └─────────────────────┬─────────────────────┘
                                                      │
                           ┌──────────────────────────┴──────────────────────────┐
                           │                                                     │
                           ▼                                                     ▼
             ┌───────────────────────────┐                         ┌───────────────────────────┐
             │   PIPE 1: Live Slices     │                         │   PIPE 2: Master File     │
             │  (Emits 5s Audio Slices)  │                         │ (Continuous Local File)   │
             └─────────────┬─────────────┘                         └─────────────┬─────────────┘
                           │ Socket.IO ('sos:audio_chunk')                       │
                           ▼                                                     │
             ┌───────────────────────────┐                                       │
             │      Safora Backend       │                                       │
             │ (Relays to Alert Room)    │                                       │
             └──────┬─────────────┬──────┘                                       │
                    │             │                                              │
         Relays live│             │Relays live                                   │
                    ▼             ▼                                              │
             ┌─────────────┐ ┌─────────────┐                                     │
             │  Guardian   │ │  Web Admin  │                                     │
             │  Phone App  │ │  Dashboard  │                                     │
             │ (Queue Audio│ │ (Queue Audio│                                     │
             │   Player)   │ │   Player)   │                                     │
             └─────────────┘ └─────────────┘                                     │
                    │             │                                              │
                    └──────┬──────┘                                              │
                           ▼                                                     │
             ┌───────────────────────────┐                                       │
             │ Server Staging Buffer     │                                       │
             │ (/tmp/safora_sos_chunks/) │                                       │
             └─────────────┬─────────────┘                                       │
                           │                                                     │
                           ▼                                                     │
                [Watchdog Triggered?]                                            │
                ├─ IF Phone Dies (Timeout > 8s):                                 │
                │  Server stitches partial chunks ───► Uploads to Cloudinary     │
                │                                                                │
                └─ IF Phone Finishes 30s Normally: ──────────────────────────────┘
                   Mobile uploads unbroken 30s Master file directly to Cloudinary
                   Server watchdog disarmed; temporary staging folder purged
```

---

## 3. Communication Protocol Specification

### 3.1 Mobile Client to Backend (`sos:audio_chunk`)
Emitted by mobile client every 5 seconds over the authenticated Socket.IO channel:
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

### 3.2 Backend to Listeners (`sos:live_audio_chunk`)
Relayed immediately to room `sos:alert:{alertId}`, room `staff`, and guardian user personal rooms (`user:{gid}`):
```json
{
  "alertId": 142,
  "seq": 1,
  "totalChunksExpected": 6,
  "durationSec": 5.0,
  "mimeType": "audio/wav",
  "data": "UklGRuRwAABXQVZFZm10IBAAAAABAAEAwF0AA...",
  "isLast": false,
  "timestamp": "2026-10-15T18:50:00.000Z"
}
```

### 3.3 Server Acknowledgment to Mobile (`sos:audio_chunk_ack`)
```json
{
  "alertId": 142,
  "seq": 1,
  "receivedAt": "2026-10-15T18:50:00.120Z"
}
```

### 3.4 Room Authorization (`sos:join` / `sos:leave`)
Clients request to join an active SOS channel:
- **Authorized:** Alert owner, verified staff (admin/moderator), or verified guardian (matching trusted contact phone/email).
- **Unauthorized:** Rejected with `Forbidden: Not authorized to join this SOS channel`.

---

## 4. Subsystem Implementation Details

### 4.1 Native Android Engine (`SafeWalkService.kt`)
- **Foreground Service:** Runs with `FOREGROUND_SERVICE_TYPE_MICROPHONE` and `PARTIAL_WAKE_LOCK`. Survives screen-off and Doze mode.
- **Audio Configuration:** 16,000 Hz sample rate, 16-bit linear PCM, mono channel (`AudioFormat.CHANNEL_IN_MONO`). Generates 32 KB/sec.
- **Dual-Sink Thread:**
  - `fileOut`: Streams raw PCM bytes to `sos_${alertId}_master.wav`.
  - `chunkBuffer`: Accumulates 160,000 bytes (5s), generates 44-byte WAV header, Base64 encodes, and emits `onSosAudioChunk` across the React Native bridge.
  - On 30s completion or stop: Writes standard 44-byte WAV header to the start of the master file and emits `onSosAudioMasterCompleted`.

### 4.2 Mobile Service Bridge (`audioRecorderService.ts`)
- Manages `onSosAudioChunk` listener to immediately call `socketService.emitSosAudioChunk()`.
- Listens to `onSosAudioMasterCompleted` to invoke `uploadAndAttachMaster()` via `/api/sos/alerts/:id/attach-audio`.
- Fallback support: If native foreground module is unavailable, cleanly falls back to `NitroSound.startRecorder()`.

### 4.3 Backend Fail-Safe Assembly (`audioStitcherService.ts`)
- **Zero-Dependency Stitching:** Operates purely on raw PCM buffers and standard 44-byte RIFF/WAVE headers. Does not require external binaries like `ffmpeg`.
- **8-Second Watchdog Timer:**
  - Timer resets upon arrival of each chunk `N`.
  - If phone dies/drops, timer expires and auto-assembles all received chunks into a unified WAV file, uploads to Cloudinary via `CloudinaryService.uploadAudioEvidence`, updates PostgreSQL DB, and broadcasts `broadcastSosAudio`.
  - If phone completes 30s and uploads master file, `AudioStitcherService.handleMasterUploaded(alertId)` cancels watchdog and deletes temporary directory.

### 4.4 Web Dispatcher Audio Queue (`SocketContext.tsx` & `SosAlertsPage.tsx`)
- **In-Memory Ordered Web Audio API Queue:**
  - Audio chunks are decoded via `AudioContext.decodeAudioData()`.
  - Enqueued in strict sequential order by `seq`.
  - Consecutive chunks play seamlessly without clipping, gaps, or overlapping.
- **UI Feedback:** Displays `LIVE STREAMING CHUNK #N/6` badge with real-time buffer progress, automatically switching to the full Cloudinary scrubber player upon alert finalization.

---

## 5. Resilience & Edge-Case Matrix

| # | Incident Scenario | Traditional Risk | Safora Dual-Pipe Mitigation |
|---|---|---|---|
| **1** | **Phone smashed / battery dies at 12s** | 100% audio evidence destroyed. | Chunks 1 & 2 (10s) were already received by server. 8s watchdog triggers auto-stitching, uploads 10s WAV to Cloudinary, and links to incident report. |
| **2** | **Airplane mode / zero connectivity** | Audio upload fails; evidence lost. | Pipe 2 continues recording unbroken 30s to device disk. `AudioRecorderService.recoverPendingEvidence()` uploads master file upon signal recovery. |
| **3** | **Network latency / out-of-order chunks** | Slices play out of order, scrambling voice. | Every chunk carries integer `seq: 1..6`. Web Audio API queue sorts by `seq` before playback. |
| **4** | **Browser autoplay restriction on admin portal** | Browser blocks audio playback. | Dispatcher clicking "Acknowledge" or "Respond Now" satisfies user interaction gesture, resuming `AudioContext`. |
| **5** | **Normal 30-second completion** | Race condition between stitched and master. | Mobile master file upload disarms server watchdog (`handleMasterUploaded`) and takes precedence. |

---

## 6. Verification & Test Suite

- **Unit Tests:** `apps/backend/src/__tests__/audioStitcher.test.ts`
  - Validates RIFF/WAVE 44-byte header byte-level offsets.
  - Validates PCM data extraction and concatenation.
  - Validates watchdog timer auto-assembly on interruption.
  - Validates watchdog disarming on master upload.
  - **Result: 8 test suites passed, 72 tests total (100% passing).**
- **Type Checking:** `npx tsc --noEmit` exited with 0 errors across `backend`, `frontend`, and `mobile`.
