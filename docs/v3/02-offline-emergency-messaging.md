# V3.2 — Offline Emergency Messaging (Bluetooth / Wi-Fi Direct Mesh)

> Synopsis framing: let an SOS reach someone nearby even with no internet or cell signal, phone-to-phone.

## 1. Why this is the hardest of the three V3 items
Everything else in Safora — including every V1/V2 feature — assumes a working path to your backend. This idea removes that assumption entirely: no server, no central authority, messages hop between nearby phones until one of them has connectivity or the intended recipient is in range. That's a genuinely different kind of system, not a feature bolted onto the current one. Your own project's existing `/docs` already flagged this as out of scope for the current architecture, and nothing built in V1 or V2 moves toward it — this file exists to give you real substance if a faculty member asks "why not?"

## 2. Prior art (so you're not starting from zero if you ever attempt this)
| Project | Approach | Relevant lesson |
|---|---|---|
| **Bridgefy** | Bluetooth mesh messaging app, gained attention during protests where internet was cut (Hong Kong 2019, Iran, Belarus) | Proved the concept works for short text at city-block range; also had serious, publicly documented security flaws (no real encryption, message spoofing) found by researchers in 2020 — a cautionary tale about *how* to build this, not just *whether* |
| **FireChat / Open Garden** | Early Bluetooth/Wi-Fi mesh chat app (2014), also used during protests | Showed the UX pattern (messages "hop" through nearby devices) but the company and app are effectively defunct — mesh chat apps have a poor survival record |
| **Briar** | Peer-to-peer messaging over Bluetooth/Wi-Fi/Tor, open source, still maintained | The most credible current reference implementation for secure mesh messaging on Android — worth reading its architecture docs if this is ever pursued seriously |
| **goTenna / Meshtastic** | Dedicated LoRa hardware mesh (not phone-only) | Shows that reliable long-range mesh messaging in the real world usually needs *dedicated radio hardware*, not just a phone's Bluetooth/Wi-Fi radios — a relevant data point against "just use the phone's Bluetooth" |
| **Android's own Nearby Connections API / Wi-Fi Aware** | Google's supported APIs for peer-to-peer discovery and data transfer | The right starting point technically, but see §3 for why even this doesn't get you to "mesh relay" for free |

## 3. Technical constraints that make this hard on Android specifically
- **No true multi-hop mesh out of the box.** Android's Nearby Connections API and Wi-Fi Direct support direct or star-topology connections between nearby devices, not automatic multi-hop relaying — building actual "hops through several strangers' phones" routing is your own protocol to design and implement (this is most of what makes Bridgefy/Briar hard projects).
- **Background scanning restrictions.** Android increasingly limits how long an app can scan for Bluetooth/Wi-Fi peers in the background (similar to the foreground-service restrictions already documented in `docs/v2/safety-and-tracking.md` §9 for SOS triggers) — a mesh network needs *continuous* discovery to work, which fights directly against battery-saving OS policy.
- **Battery cost.** Continuous BLE scanning/advertising is one of the most battery-hungry things an app can do; a safety app that drains the battery defeats its own purpose.
- **No delivery guarantee.** Unlike your server-backed SOS/watchdog design (`docs/v2/safety-and-tracking.md` §2, §4), there's no way to know a message actually reached anyone — the whole reliability model V2 is built around (delivery tracking, retries, escalation) doesn't translate to a mesh with no central point.
- **Range is short.** Bluetooth LE realistically reaches tens of metres indoors, maybe 100+ outdoors with clear line of sight — "someone nearby" in a genuine emergency (an isolated trail, per your own hazard categories) is exactly the scenario where there's *nobody* in Bluetooth range to relay to.

## 4. Security and abuse risks (the part that's easy to underestimate)
- **No central moderation.** A mesh network has no server to rate-limit, ban, or filter through — Bridgefy's well-documented flaws (spoofable sender identity, no real encryption) are the direct result of trying to do this quickly.
- **Anyone in range can potentially see or interfere with relayed messages** unless proper end-to-end encryption is designed in from the start — which is a serious cryptography undertaking, not an afterthought.
- **False SOS relay could be used maliciously** (flooding a mesh with fake distress signals) with no central authority to catch it, unlike V2's rate limiting and staff moderation.

## 5. Battery/UX trade-off, stated plainly
A phone that's always scanning for mesh peers "just in case" is a phone with worse battery life doing everything else V1/V2 already ask of it (foreground location during Safe Walk, background triggers in V2). Realistically this would need to be an **explicitly user-activated mode** ("I'm going somewhere with no signal, turn on mesh standby") rather than always-on — which limits its usefulness for the "you didn't expect to need it" emergencies a safety app exists for.

## 6. Forward reference — the escalation ladder's natural extension point (added 22 Sep 2026)
V2's guardian escalation ladder (`docs/v2/safety-and-tracking.md` §2, TRK-11) delivers an SOS to a walker's contacts in priority tiers and, if nobody acknowledges, **stays with the primary tier rather than falling back further** — a deliberate, simpler V2 design. The one condition under which that "stay with primary" behaviour genuinely isn't enough is exactly this file's scenario: **primary is unreachable through every normal channel (no push delivery, no SMS delivery confirmation) *and* the phone has no cell/data signal at all.** If Phase 1 mesh messaging (§6 above, one-hop via Nearby Connections) is ever built, it slots in here as a **last-resort tier**: not a replacement for the app-based guardian model, just an additional attempt — "try reaching anyone in Bluetooth/Wi-Fi Direct range" — for the specific case where the normal escalation ladder has genuinely run out of options. This is noted so the two systems are designed to fit together later rather than needing retrofitting; **nothing here is built or scheduled.**

## 7. If this is ever attempted, a realistic phased approach
1. **Phase 0 — don't build mesh at all; build the fallback that already covers most of the same need.** V2's on-device SMS (`docs/v2/safety-and-tracking.md` §8) already sends an SOS over the cellular network with zero internet, which covers "no data connection" — the actual gap mesh would close is "no cellular signal at all," a much narrower and rarer case.
2. **Phase 1 (if pursued) — one-hop only.** Direct phone-to-phone via Nearby Connections API, no relay, "send my SOS to any Safora app within Bluetooth range" — genuinely buildable, and useful in a crowd (e.g. a festival) even if not in true isolation.
3. **Phase 2 — real multi-hop relay**, only after Phase 1 proves useful in practice, and only with a proper security design (study Briar's architecture first) rather than a fast Bridgefy-style implementation.
4. **Never attempt this as a side feature.** Budget it as its own project, with its own security review, separate from the Safora product roadmap in `docs/v2/`.
