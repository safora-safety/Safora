# V3.3 — AI Image Detection for Hazard Classification

> Synopsis framing: automatically classify a hazard's category/severity from an uploaded photo, instead of relying only on the user's manual selection.

## 1. Prerequisite already being built
V1's `SYN-3` (photo picker, `docs/v1/tasks.md` #12) and the existing Cloudinary storage are the prerequisite for this — **no classification is possible without photos existing first**, and V1/V2 don't collect enough of them to train anything yet. Treat this file as "what to do once there's a real photo corpus," not something to attempt now.

## 2. Two fundamentally different implementation paths

### 2a. On-device (TensorFlow Lite / a small quantized model bundled in the APK)
| Pro | Con |
|---|---|
| Free to run (matches your free-tech constraint) | Increases APK size (a real classification model, even a small MobileNet-class one, adds several MB — noticeable against your current ~35–59 MB APK, `docs/v1/tech-stack.md`) |
| Works offline, fast, no server round-trip | Limited to whatever model fits and runs acceptably on a low-end Android phone — accuracy ceiling is lower than a hosted model |
| No data leaves the device for inference | Model updates require an app update (no easy "improve the model without shipping a new APK" path) unless you build a model-download mechanism |

### 2b. Hosted inference API (a cloud model you call from the backend)
| Pro | Con |
|---|---|
| Can use a much larger, more accurate model | **Recurring cost** — conflicts directly with your free-tech rule until there's revenue or a grant; free tiers of hosted vision APIs are typically far too limited for real usage volume |
| Easy to improve without shipping app updates | Every classification is a network call — adds latency and a new failure mode (report submission now depends on a third service being up) |
| Centralises data — easier to audit/retrain | Sends user photos to a third party — a new privacy surface to disclose in your privacy policy (`docs/v2/security-privacy-compliance.md` §10, PUB-1) |

**Recommendation if this is ever built:** start on-device (2a) with a deliberately narrow task (§4) — it's the only path that doesn't break the free-tech constraint, and a narrow task doesn't need a large model.

## 3. Dataset reality check
| Requirement | Status |
|---|---|
| Labelled photos per hazard category (poor lighting, road hazard, waterlogging, isolated area, harassment/suspicious activity, plus V2's Uttarakhand-specific categories — landslide, wildlife, damaged bridge) | **Does not exist.** V1 introduces the photo picker; it will take real usage over real time to accumulate even a few hundred photos per category, and hazard photos are inherently messy (variable lighting, angle, partial occlusion) |
| Severity (1–5) labelling from a photo alone | Even harder — severity in the current app is a *user judgement call* (see `docs/v1/safety-algorithms.md` §1), not something reliably visible in a single photo. A waterlogged road could be severity 2 or severity 5 depending on depth, which a 2D photo often can't convey |
| Negative examples (photos that are *not* hazards, to avoid false positives) | Also need deliberate collection — otherwise a model trained only on submitted hazard photos has no idea what "normal" looks like |
| Diversity (day/night, monsoon/dry season, urban Dehradun vs rural Uttarakhand roads) | A model trained only on daytime dry-season photos from one small area will not generalise — and Safora's early user base will be small and geographically narrow, which is exactly the wrong training distribution for a general classifier |

## 4. A realistic narrow-first task (instead of general classification)
Don't attempt "classify any hazard photo into 5 categories × 5 severities" as a first model — that needs far more data and complexity than a college project can gather. Instead:
1. **Binary task first:** "does this photo show standing/flowing water on a road, yes/no" (waterlogging detection) — a single, visually distinctive category with clear positive/negative examples, useful on its own (could auto-suggest the category rather than fully classify), and realistic to gather a few hundred labelled examples for even with a small user base.
2. **Transfer learning, not training from scratch.** Fine-tune a small pretrained image model (e.g. MobileNetV3) on your narrow labelled set rather than training a network from zero — this is standard practice for small datasets and is realistic to do with free tools (Google Colab's free tier, TensorFlow).
3. **Auto-suggest, never auto-decide.** Even a working model should *pre-fill* the category for the user to confirm or correct, not silently override what they select — this also gives you an ongoing, low-effort way to collect corrected labels for future retraining.
4. **Only after the binary task works reliably**, consider expanding to more categories — each new category effectively restarts the "do we have enough labelled data" question.

## 5. Honest framing for your report
"AI hazard classification" as a general capability is a multi-month, data-dependent undertaking that V1/V2 cannot support yet — but a **narrow, single-category, auto-suggest model** (waterlogging detection) is a realistic V3-phase-1 project once there's a real photo corpus, using transfer learning rather than training from scratch, and always as a suggestion the user confirms rather than an autonomous decision.
