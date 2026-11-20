# V3 References

> Sources for the claims in notes 01 to 03 and 06. Gathered 22 September 2026 via web search. Open each source before citing it in a report, as with [`../v2/references.md`](../v2/references.md).

| ID | Source | Where | Used for |
|---|---|---|---|
| V3-R1 | SafetiPin, ACM paper critique (also `R35` in the V2 references) | https://dl.acm.org/doi/10.1145/3572334.3572392 | Crowdsourced safety-perception data reflects who reports, not objective risk |
| V3-R2 | Reporting on Bridgefy's 2019–2020 use during protests | Search "Bridgefy Hong Kong protests mesh messaging" | Bluetooth mesh messaging used at city-block range during connectivity shutdowns |
| V3-R3 | Security research on Bridgefy's vulnerabilities (2020) | Search "Bridgefy security flaws researchers 2020 no encryption" | No real encryption and spoofable sender identity: a cautionary example |
| V3-R4 | FireChat and Open Garden history | Search "FireChat mesh app history discontinued" | An early mesh-chat app, largely defunct: a poor survival record for this category |
| V3-R5 | Briar messenger architecture documentation | https://briarproject.org/how-it-works/ | A reference architecture for secure peer-to-peer mesh messaging on Android |
| V3-R6 | Meshtastic and goTenna, LoRa mesh hardware | Search "Meshtastic goTenna LoRa mesh hardware range" | Reliable long-range mesh typically needs dedicated radio hardware |
| V3-R7 | Android Nearby Connections API documentation | https://developers.google.com/nearby/connections/overview | Peer-to-peer discovery and transfer; no built-in multi-hop relay |
| V3-R8 | Android background-start restrictions for foreground services (also `R11`) | https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start | Background scanning limits conflict with continuous mesh discovery |
| V3-R9 | TensorFlow Lite documentation, performance best practices | https://www.tensorflow.org/lite/performance/best_practices | On-device model size and latency trade-offs |
| V3-R10 | Transfer learning for small image datasets (general ML literature) | Search "transfer learning small dataset image classification MobileNet" | The standard approach for a narrow task with limited labelled data |
| V3-R11 | Islam, Hashem and Shahriyar, *A crowd-enabled solution for privacy-preserving and personalized safe route planning* | https://arxiv.org/abs/2112.13760 | Recent crowd-based safe-route research with decaying personalised scores |
| V3-R12 | Warden, *Speech Commands: a dataset for limited-vocabulary speech recognition*; TensorFlow Lite keyword-spotting examples | Search "Speech Commands dataset Warden 2018" and "TensorFlow Lite keyword spotting example" | Background for small on-device keyword spotters (note 06) |

## Still to Verify (🔬)

| # | Claim | Where | Owner |
|---|---|---|---|
| V3-V1 | The current APK size impact of bundling even a small TFLite model | `03-ai-hazard-image-detection.md` §2a | Mobile developer, once attempted |
| V3-V2 | Whether Android's Wi-Fi Aware API (as opposed to Nearby Connections) offers any built-in relay capability worth reconsidering | `02-offline-emergency-messaging.md` §3 | Whoever scopes this later |
| V3-V3 | The real outdoor Bluetooth LE range in Dehradun and Uttarakhand terrain | `02-offline-emergency-messaging.md` §3 | Field test, if ever pursued |
| V3-V4 | Battery cost and false-alarm rate of a continuous keyword spotter on the project's test phones | `06-voice-activated-sos.md` §3 | Android developer, once attempted |
