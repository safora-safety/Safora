# Voice-Activated Hands-Free SOS ("Safe Word" Keyword Spotter) — V3 Research Note

> **Classification:** Future Scope / Architectural Feasibility Study  
> **Target Version:** V3  
> **Prior Art Benchmark:** UrSafe, bSafe, Google SoundTrigger API, Apple Siri Emergency Triggers

---

## 1. Problem Statement & Motivation

In acute crisis situations—such as physical assault, domestic confinement, abduction, or being held at weapon-point—a victim often **cannot physically touch their smartphone**. 
- Taking a phone out of a pocket or handbag alerts an aggressor.
- Attempting to unlock a screen or even press physical hardware volume buttons can provoke immediate violence.

While SAFORA V1 solved locked-screen audio streaming and corridor deviation watchdogs, hands-free invocation remains a frontier capability. Providing an **on-device acoustic keyword spotter** (e.g. whispering a custom "Safe Word" such as *"Safora Red"* or *"Code Seven"*) allows victims to trigger full emergency dispatch and dual-pipe audio streaming completely hands-free.

---

## 2. Benchmark Analysis: How Others Do It

| Platform | Ingestion Method | Model Location | False Positive Mitigation | Battery Drain |
| :--- | :--- | :--- | :--- | :--- |
| **UrSafe** | Continuous background microphone listening | On-device lightweight neural network | User-trained customized safe-word | Moderate (3–5% / hr) |
| **bSafe** | Voice activation ("Help") | On-device keyword classifier | Fixed keyword matching | High if unoptimized |
| **Google Assistant / Siri** | Hardware low-power DSP core (`Always-On Processor`) | Dedicated hardware DSP chip | Multi-stage verification | Ultra-low (<0.5% / hr) |

---

## 3. Recommended Architectural Design for SAFORA V3

```
  Microphone Input (16 kHz Mono)
              │
              ▼
  Circular Audio Ring Buffer (1.2-second sliding window)
              │
              ▼
  MFCC Feature Extraction (Mel-Frequency Cepstral Coefficients)
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│  On-Device Keyword Spotting Engine (TFLite Micro / ONNX) │
│  - Tiny Depthwise Separable Convolution (DS-CNN)         │
│  - Footprint: <250 KB model binary                       │
│  - Inference Time: <15ms per frame                       │
└─────────────────────────────┬────────────────────────────┘
                              │
                    Confidence Score > 0.88?
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
            [YES]                            [NO]
              │                               │
    Haptic Confirmation             Continue Circular
    (Discreet Micro-Pulse)          Buffer Sampling
              │
    Fire Native SOS Trigger
    (POST /api/sos + Dual-Pipe Streaming)
```

### 3.1 Neural Network Topology
- **Architecture:** Depthwise Separable Convolutional Neural Network (DS-CNN) or Temporal Convolutional Network (TCN).
- **Inference Runtime:** TensorFlow Lite Mobile runtime integrated directly into Android native Kotlin (`SafeWalkService.kt`).
- **Input Features:** 40 Mel-filterbank energy features computed every 20ms over a 30ms window (49 frames total over 1 second).

### 3.2 Privacy & Battery Safeguards
1. **100% On-Device Processing:** Zero acoustic data leaves the user's phone during the keyword listening state. The circular buffer continuously overwrites itself in volatile RAM. Audio is transmitted *only* after a verified keyword match activates the dual-pipe streaming engine.
2. **Android SoundTrigger / Voice Wake-up API:** Where supported by Qualcomm/MediaTek hardware, offload listening to the device's low-power Audio DSP core, reducing battery consumption to $<1.2\%$ per hour.
3. **Multi-Turn Affirmation Option:** Require repeating the phrase twice within 3 seconds (e.g. *"Safora Red ... Safora Red"*) to eliminate false triggers caused by television or background speech.

---

## 4. Prerequisite Foundation Already Laid in V1 & V2

- **V1 Foundation:** `SafeWalkService.kt` already operates as an authorized Android typed Foreground Service (`FOREGROUND_SERVICE_TYPE_MICROPHONE`) holding a partial `WAKE_LOCK`. The native audio ingestion pipeline is already built and proven.
- **V2 Prerequisite:** In V2, the hardware trigger architecture (`TRG-1` / `TRG-2`) decouples native event dispatch from React Native, providing the native event sink that this keyword spotter will hook into.
