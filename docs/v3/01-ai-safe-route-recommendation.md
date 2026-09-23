# V3.1 — AI Safe-Route Recommendation

> Synopsis framing: score and recommend routes using lighting, crowd-density and similar signals, beyond a fixed rule-based formula.

## 1. What already exists (the non-AI baseline)
V2's `MAP-6` (`docs/v2/map-routing-search.md` §6) ranks up to three route alternatives by summing `severity × recency × confirmation` for hazards within 40 m of each sampled point, and — where the routing provider supports it — prefers routes flagged `use_lit` for pedestrian mode. This is deliberately **rule-based, not learned**: no training data, no model, fully explainable, cheap to run. Treat it as "V3 phase 0": the thing a real model would need to beat, and the thing that generates the usage data a model would eventually train on.

## 2. Why this isn't buildable yet
| Requirement | Status |
|---|---|
| Labelled ground truth ("this street segment is/isn't safe, at this time of day") | **Does not exist.** Safora's own hazard reports are sparse, self-selected, and biased toward wherever your existing users walk — not a representative safety map of Dehradun |
| A notion of "ground truth" at all | Contested even in the literature — see §5. "Safe" is subjective, time-of-day-dependent, and different for different people (a well-lit street with a large group of men at night may read as unsafe to some users and neutral to others) |
| Feature data (streetlight positions, footfall/crowd density) | Not systematically available for Dehradun in OpenStreetMap; would need manual survey (this is literally what SafetiPin does, at NGO scale, over years) |
| Compute/hosting for inference | Conflicts with the free-tech constraint unless the model runs on-device |
| Enough usage volume to make a model outperform the rule-based baseline | Needs real users over real time — not available during a college project timeline |

## 3. Candidate approaches, roughly in order of realism

### 3a. Crowdsourced audit score → weighted routing (lowest risk, most realistic first step)
Extend V2's `place_audits` (`docs/v2/accounts-email-local.md` §6.3, modelled on SafetiPin's nine-factor audit) so every route segment gets a community-rated score, then feed that score into the existing rule-based ranking as one more weighted term. This is **not machine learning** — it's a richer input to the same deterministic formula — but it's the natural next step before any model, and it's the one most likely to actually ship.

### 3b. Supervised model on engineered features
Once (a) audit-score coverage is decent and (b) there's a real incident/report history, a gradient-boosted model (e.g. LightGBM) over engineered per-segment features (audit score, streetlight density, time of day, report recency/severity, footfall proxy) could predict a risk score per segment, replacing the hand-tuned weights in the rule-based formula. This is a modest step up in complexity from 3a and the most realistic "actual ML" version — it doesn't need deep learning or GPU inference, and a trained model this size can run cheaply.

### 3c. Graph-based routing with learned edge weights
Treat the street network as a graph (which Valhalla/OSRM already build internally) and learn edge weights instead of relying on a fixed formula, using something like a graph neural network. This is the "proper" version of the idea but is a research-level undertaking on its own — appropriate for a thesis, not a feature sprint.

### 3d. Real-time crowd-density input
The most literal reading of the synopsis ("crowd data") would need either (a) live footfall sensors (not available, expensive) or (b) opportunistic crowd-density inference from how many Safora users are actively walking a given segment right now. Option (b) is interesting and cheap once Safora has real concurrent usage — but with a handful of users, "3 people walked this street tonight" is not a meaningful signal, and worse, could itself be a privacy problem (inferring how many people are on a street from app data). Flag this explicitly if it comes up: it needs a minimum user base before it means anything, and needs the aggregation done carefully (§4).

## 4. Privacy note
Any of 3b–3d risks turning per-user location data into a shared "here's where people are/aren't" signal. If you pursue this later, aggregate and anonymise before it ever reaches a model or an API response — never expose "how many people are on this street right now" in a way that could deanonymise an individual walker. This is the same anti-coercion principle already documented in `docs/v2/security-privacy-compliance.md` §5, applied to a new feature.

## 5. What the research literature actually says
Independent academic and journalistic sources are **skeptical of purely algorithmic "safe route" scoring**, for reasons worth citing directly if a faculty member pushes on this:
- Crowdsourced safety-perception data (the SafetiPin model this idea descends from) reflects *who reports*, not objective risk — routing away from areas flagged unsafe by a self-selected group can reinforce existing avoidance patterns (e.g. underreported areas look artificially "safe") rather than correct them. See `docs/v2/references.md` [R35] for the SafetiPin critique already cited there.
- "Safety" is not a stable, universal label — perceived safety varies by identity, time, and local knowledge in ways a single score per street segment flattens out.
- This doesn't mean the idea is worthless — it means the honest framing is **"a decision-support layer using community input," not "an AI that knows which streets are safe."** Keep that framing in any report or demo.

## 6. Realistic next step (if you ever pick this up)
1. Ship and get real usage on 3a (audit-score-weighted rule-based routing) — this alone would be a legitimate, demonstrable improvement over V2's current hazard-only weighting.
2. Once there's a meaningful volume of audits + real hazard history (think months, not weeks), scope 3b as its own project phase with a proper train/validation split and an honest baseline comparison against 3a.
3. Do not attempt 3c/3d without a dedicated research timeline separate from the product roadmap.
