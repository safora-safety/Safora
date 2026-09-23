# V3.4 — Research and Evaluation Framework

> A way to decide *if and when* to pursue any V3 item, rather than a plan to build all three. Use this if you (or a future team) revisit V3 after V2 ships.

## 1. Gate questions before starting any V3 item
Ask these in order — a "no" at any step means "not yet," not "never":

1. **Is V2 actually stable and in real use?** None of the three V3 items make sense to attempt while the core product (accounts, tracking, triggers) is still being hardened — they'd be built on a moving foundation, and none of them are needed for Safora to be useful.
2. **Does the prerequisite data exist yet?** Item 1 needs real hazard/audit history; item 3 needs a real photo corpus; item 2 needs none (it's independent), which is part of why it's the easiest to *scope* even though it's the hardest to *build*.
3. **Is there a dedicated time budget separate from product maintenance?** All three are research-shaped work (uncertain timeline, need for evaluation against a baseline) — mixing them into ordinary feature sprints is how they either never finish or quietly degrade product quality.
4. **Does it still match a real need?** Re-check against actual user feedback from V2's usage, not just the original synopsis wording — if usage data shows people don't struggle with route choice, item 1 may not be worth it regardless of feasibility.

## 2. Scoring framework (use this to prioritise if pursuing more than one)
Score each item 1 (low) – 5 (high) on:

| Criterion | What it means |
|---|---|
| **Data readiness** | Does the labelled/training data already exist or is it realistic to gather soon? |
| **Technical risk** | How likely is a competent attempt to actually work within a reasonable timeframe? |
| **Free-tech compatibility** | Can it run without ongoing cost, matching your stated constraint? |
| **User value if it works** | How much would it actually improve safety/usefulness, versus the rule-based/manual alternative already in V2? |
| **Downside if it fails or is misused** | Cost of getting it wrong — a bad AI safe-route suggestion is embarrassing; a bad mesh-messaging security flaw or a false hazard auto-classification could actively mislead someone in danger |

A reasonable rule: don't start anything scoring below 3 on **Data readiness** or below 3 on **Free-tech compatibility** — those two are hard blockers for a solo/small-team, no-budget project, regardless of how good an idea looks otherwise.

## 3. Suggested comparative scores (my assessment, re-score once you have real usage data)
| Item | Data readiness | Technical risk (lower risk = higher score) | Free-tech compatibility | User value if it works | Downside if it fails |
|---|:---:|:---:|:---:|:---:|:---:|
| 1. AI safe-route (audit-weighted, §3a of `01-ai-safe-route-recommendation.md`) | 2 (needs audit data) | 4 | 5 | 4 | 2 (worst case: a bad suggestion, not a crisis) |
| 2. Offline mesh messaging | 5 (no data needed) | 1 (genuinely hard) | 4 | 3 (narrow real-world benefit, per §5 of that file) | 4 (security/reliability failure could mislead someone in a real emergency) |
| 3. AI hazard image detection (narrow/binary task) | 1 (no photo corpus yet) | 3 | 4 (on-device only) | 2 (nice-to-have, not core) | 2 (wrong auto-suggestion, user still confirms) |

Read this as: **item 1's audit-weighted version is the most realistic starting point once there's some audit data**, item 3's narrow version is a reasonable "someday, once there's a photo corpus" project, and **item 2 is the one to explicitly defer indefinitely** unless someone wants to make mesh networking itself the focus of a future project, separate from Safora's core product goals.

## 4. What "success" would look like for each, if attempted
- **Item 1:** a route ranking that measurably differs from the pure-hazard-density baseline and that a sample of real users rate as more trustworthy, evaluated with a held-out comparison, not just "it runs."
- **Item 2:** a working one-hop (not full mesh) SOS relay, security-reviewed, tested in a real no-signal location, with an honest write-up of its actual range and reliability limits.
- **Item 3:** a binary classifier with a documented precision/recall on a held-out test set, always shown as a suggestion, with a clear plan for what happens when it's wrong.

## 5. What not to do
Don't let any V3 item become a way to avoid finishing V2. If faculty or reviewers ask "what about the AI/mesh features," the honest answer — "future scope, gated on data and time that V1/V2 don't have yet, here's the research and here's what would need to be true first" — is a stronger answer than a half-built version of any of them.
