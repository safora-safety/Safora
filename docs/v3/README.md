# Safora Docs — V3 (Future Scope) — Index

> V3 covers the three items your synopsis names explicitly as future scope, expanded into proper research notes rather than a single summary. Nothing here is scheduled work — each file is a starting point for a future scoping pass, written so a faculty reviewer can see you've thought past the current build, and so a future you (or an agent) has somewhere real to start instead of a blank page.

## Files in this folder

| File | Contents |
|---|---|
| `01-ai-safe-route-recommendation.md` | Rule-based groundwork already in V2, what real ML would add, data requirements, candidate approaches, feasibility |
| `02-offline-emergency-messaging.md` | Bluetooth/Wi-Fi Direct mesh SOS: prior art, Android platform constraints, security/abuse risks, why it's hard |
| `03-ai-hazard-image-detection.md` | Auto-classifying hazard photos: on-device vs hosted, dataset needs, a realistic narrow-first path |
| `04-research-and-evaluation-framework.md` | How to decide whether/when to actually build any of these — a scoring framework, not a commitment |
| `05-references.md` | Sources for the claims made in files 01–03 |

## How V3 relates to V1 and V2
- V1 (college submission) and V2 (product) do not depend on any V3 item.
- V2's `MAP-6` (rule-based safest route) is deliberately the "V3 phase 0" for item 1 — it exists so a future ML model has a baseline to beat and, eventually, real usage data to train on.
- V1's photo picker (`SYN-3`) and Cloudinary storage are the prerequisite for item 3 — no classification happens without photos existing first.
- Item 2 (mesh messaging) has no dependency in V1/V2 and is the least connected to the current architecture.

## How to present this in your report
Frame V3 as: "the synopsis's future-scope items remain future scope — V1 and V2 build the data and infrastructure (photo storage, hazard reports, rule-based route scoring) that any of these three would eventually need, without committing to unproven ML or mesh-networking work inside the current project timeline." Each file below gives you enough substance to answer a faculty question like "how would you actually do that?" without having built it.
