# Safora Documentation

This directory contains the technical documentation of Safora. It is organised by version: **V1** is the completed college release, **V2** is the product roadmap, and **V3** collects research notes on future scope.

## Where to Start

| If you want to … | Read |
|---|---|
| Understand the system in ten minutes | [`v1/architecture.md`](v1/architecture.md) (diagrams) and [`v1/README.md`](v1/README.md) |
| See what the system must do | [`v1/srs.md`](v1/srs.md) and [`v1/use-cases.md`](v1/use-cases.md) |
| Run or build the project | [`setup.md`](setup.md) and [`v1/setup.md`](v1/setup.md) |
| Call the API | [`v1/api.md`](v1/api.md) |
| Understand the scoring and safety logic | [`v1/safety-algorithms.md`](v1/safety-algorithms.md) |
| Check how the project was tested | [`v1/testing-and-submission.md`](v1/testing-and-submission.md), [`v1/performance-testing.md`](v1/performance-testing.md), [`requirements-traceability.md`](requirements-traceability.md) and the [checklist](v1_manual_testing_checklist.md) |
| Review performance and load benchmarks | [`v1/performance-testing.md`](v1/performance-testing.md) |
| Run and operate the deployment | [`v1/operations-runbook.md`](v1/operations-runbook.md) |
| See what comes next | [`v2/roadmap.md`](v2/roadmap.md) and [`v3/README.md`](v3/README.md) |
| Look up a term | [`glossary.md`](glossary.md) |

## Contents

```text
docs/
├── README.md                              this index
├── setup.md                               developer setup guide
├── project-status.md                      scorecard and housekeeping
├── changelog.md                           release notes
├── engineering-standards.md               layering, coding, testing, git and release rules
├── requirements-traceability.md           requirement -> code -> test matrix
├── glossary.md                            terms
├── v1_manual_testing_checklist.md         the 143-case field checklist (all passed)
├── SAFORA_Synopsis_Formatted.pdf          the approved synopsis
├── v1/                                    complete, as built
│   ├── README.md                          summary, index, scope, limitations
│   ├── srs.md · use-cases.md              requirements and use cases
│   ├── architecture.md                    context, data-flow diagrams, flows, deployment
│   ├── sequence-diagrams.md · state-machines.md
│   ├── api.md · database.md · data-dictionary.md
│   ├── safety-algorithms.md               score, clustering, corridor, watchdog
│   ├── dual-pipe-audio-streaming.md       live audio, master archive, rescue
│   ├── mobile-app-features.md · admin-panel.md
│   ├── roles-and-permissions.md · security-and-privacy.md
│   ├── tech-stack.md · setup.md · operations-runbook.md · performance-testing.md
│   ├── testing-and-submission.md · tasks.md
│   └── safora-v1-features-industry-research.md   comparison with existing platforms
├── v2/                                    planned product roadmap
│   ├── README.md · roadmap.md · architecture-decisions.md · migration-plan.md
│   ├── api.md · database.md
│   ├── safety-and-tracking.md · map-routing-search.md · environmental-hazards.md
│   ├── accounts-email-local.md · security-privacy-compliance.md
│   └── testing-and-beta.md · references.md
├── v3/                                    research notes
│   ├── README.md
│   ├── 01-ai-safe-route-recommendation.md · 02-offline-emergency-messaging.md
│   ├── 03-ai-hazard-image-detection.md · 04-research-and-evaluation-framework.md
│   └── 05-references.md · 06-voice-activated-sos.md
```

## Documentation Conventions

- **Diagrams** are written in [Mermaid](https://mermaid.js.org/) and render directly on GitHub. Data flow diagrams use rectangles for external entities, rounded boxes for processes and cylinders for data stores.
- **Work item identifiers** (for example `SYN-1`, `TRK-4`, `MAP-6`) are stable across documents and commit messages.
- **Status tags** in V2 and V3: [VERIFIED] · [DOCS-ONLY] · [NEEDS-TEST] · [PLANNED].
- **Single source of truth.** Formulas and constants in `v1/safety-algorithms.md` are taken from the code. Change them in the same commit as the code.

## Current Constants at a Glance

| Item | Value | Where defined |
|---|---|---|
| Safety score range and bands | 0–100; safe ≥ 80, moderate 50–79, high < 50 | `reportService.ts` |
| Recency decay | Half-life 168 h, floor 0.25 | `reportService.ts` |
| Clustering | DBSCAN ε = 0.003° (about 330 m), minpoints 2 | `reportRepository.ts` |
| Safe Walk corridor | Default 150 m; 20–1000 m configurable | `journeyService.ts` |
| Deviation grace and watchdog | 60 s grace, 30 s tick (escalation at 60–90 s) | `watchdogService.ts` |
| SOS audio | 30 s, 5 s slices, 16 kHz mono PCM; 8 s rescue timeout | `SafeWalkService.kt`, `audioStitcherService.ts` |
| Tests | 104 automated (15 suites); 143 field cases | `docs/v1/testing-and-submission.md` |
