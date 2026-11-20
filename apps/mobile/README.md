# SAFORA — Mobile Safety Application

The **SAFORA Mobile Application** is a personal safety and navigation platform designed for university students, women, and citizens navigating urban corridors and campus perimeters.

It combines crowdsourced hazard telemetry, background walking escorts, automated corridor compliance monitoring, emergency SOS broadcasting with progressive dual-pipe audio evidence capture, and discreet decoy tools.

---

## Key Features

1. **Geospatial Safety Radar & Map**:
   - Hardware-accelerated Leaflet map canvas rendering real-time safety heatmaps via PostGIS DBSCAN clustering.
   - Dynamic safety score badge (0–100) calibrated with exponential recency decay ($t_{1/2} = 168\text{ h}$ / 7 days, 0.25 floor) and community confirmation weighting.

2. **Safe Walk Escort**:
   - Background pedestrian monitoring powered by a native Android Kotlin Foreground Service (`SafeWalkService.kt`).
   - 150-meter corridor compliance tracking with real-time ETA and road distance updates displayed in persistent lock-screen system notifications.
   - 60-second departure grace period and 3-minute post-confirmation snooze to eliminate false deviation alerts.

3. **Guardian SOS & Dual-Pipe Audio Capture**:
   - Instant one-tap emergency broadcast streaming GPS coordinates, battery status, and telemetry to trusted guardians and dispatchers.
   - **Pipe 1**: Emits 5-second 16kHz PCM audio slices live over WebSockets for immediate guardian listening.
   - **Pipe 2**: Continuously records an unbroken 30-second local master file for Cloudinary cloud preservation.
   - **Server Watchdog Rescue**: 8-second server-side watchdog auto-assembles received slices into playable WAV evidence if the device is lost or destroyed mid-broadcast.

4. **Covert Decoy Tools**:
   - **Calculator Decoy**: Fully operational 4-function arithmetic calculator that silently triggers an emergency SOS and haptic feedback upon entering duress PIN `9999=`.
   - **Fake Call Simulator**: Configurable bilingual (English/Hindi) incoming call simulator for discreet extraction from uncomfortable situations.

---

## Technical Architecture

| Component | Technology | Rationale |
|---|---|---|
| **Core Framework** | React Native `0.87.1` | Native performance with **Fabric (New Architecture)** and **Hermes** engine. |
| **Language** | TypeScript 5.x | Strict type safety aligned across `@safora/shared-types`. |
| **Native Android Bridge** | Kotlin Foreground Service | Survives Android Doze mode and lock-screen deep sleep for continuous GPS and microphone capture. |
| **Map Rendering** | Leaflet in Hardware-Accelerated WebView | High frame-rate vector rendering, smooth layer switching, and offline tile caching. |
| **Real-Time Transport** | Socket.IO Client | Persistent listener registry surviving network drops and socket reconnects. |
| **State & Cache** | React Hooks + AsyncStorage | Local hazard queue that auto-synchronizes when network connectivity returns. |

---

## Development Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **Android SDK**: API Platform 34 or 35, NDK `27.1.12297006`
- **JDK**: OpenJDK 17
- Physical Android device (recommended) or Android Virtual Device (AVD)

### 1. Start Metro Bundler
From the monorepo root:
```bash
npm start --workspace=mobile -- --reset-cache
```

### 2. Launch Android Debug Build
In a separate terminal:
```bash
npm run android --workspace=mobile
```

### 3. Run Automated Tests
```bash
npm test --workspace=mobile
```
Executes all 5 Jest test suites (**20 / 20 tests passing**):
- `ActiveWalkCockpitHud` & `HoldToConfirmButton`
- `FloatingSearchCapsule`
- `SosGracePeriodOverlay`
- `CalculatorDecoyModal` (Duress PIN verification)
- `FakeCallModal`

---

## Production Release Build

To compile a signed standalone release APK:
```powershell
cd android
.\gradlew.bat clean
.\gradlew.bat assembleRelease
```
The output APK is generated at:
```text
android/app/build/outputs/apk/release/app-release.apk
```
