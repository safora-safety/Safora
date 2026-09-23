# V3 References

> Sources for claims made in `01`–`03`. Gathered 22 September 2026 via web search; open each before citing it in a report, the same caution as `docs/v2/references.md`.

| ID | Source | Where | Used for |
|---|---|---|---|
| V3-R1 | SafetiPin, ACM paper critique (already cited as [R35] in `docs/v2/references.md`) | https://dl.acm.org/doi/10.1145/3572334.3572392 | Crowdsourced safety-perception data reflects who reports, not objective risk |
| V3-R2 | Reporting on Bridgefy's 2019–2020 use during protests | Search "Bridgefy Hong Kong protests mesh messaging" | Bluetooth mesh messaging used at city-block range during connectivity shutdowns |
| V3-R3 | Security research on Bridgefy's vulnerabilities (2020) | Search "Bridgefy security flaws researchers 2020 no encryption" | No real encryption, spoofable sender identity — cautionary example |
| V3-R4 | FireChat / Open Garden history | Search "FireChat mesh app history discontinued" | Early mesh-chat app, largely defunct — poor survival record for this app category |
| V3-R5 | Briar messenger architecture documentation | https://briarproject.org/how-it-works/ | Reference architecture for secure peer-to-peer mesh messaging on Android |
| V3-R6 | Meshtastic / goTenna, LoRa mesh hardware | Search "Meshtastic goTenna LoRa mesh hardware range" | Reliable long-range mesh typically needs dedicated radio hardware, not just phone Bluetooth/Wi-Fi |
| V3-R7 | Android Nearby Connections API documentation | https://developers.google.com/nearby/connections/overview | Peer-to-peer discovery/transfer API; no built-in multi-hop relay |
| V3-R8 | Android background location/BLE scanning restrictions | https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start (also cited as [R11] in `docs/v2/references.md`) | Background scanning limits fight against continuous mesh discovery |
| V3-R9 | TensorFlow Lite documentation, on-device model size/performance guidance | https://www.tensorflow.org/lite/performance/best_practices | On-device model size and latency trade-offs |
| V3-R10 | Transfer learning practice for small image datasets (general ML literature) | Search "transfer learning small dataset image classification MobileNet" | Standard approach for a narrow task with limited labelled data |

## Still to verify (🔬)
| # | Claim | Where | Who |
|---|---|---|---|
| V3-V1 | Current APK size impact of bundling even a small TFLite model | `03-ai-hazard-image-detection.md` §2a | Mobile dev, once attempted |
| V3-V2 | Whether Android's Wi-Fi Aware API (as opposed to Nearby Connections) offers any built-in relay capability worth reconsidering | `02-offline-emergency-messaging.md` §3 | Whoever scopes this later |
| V3-V3 | Real Bluetooth LE range achieved outdoors in Dehradun/Uttarakhand terrain specifically | `02-offline-emergency-messaging.md` §3 | Field test, if ever pursued |
