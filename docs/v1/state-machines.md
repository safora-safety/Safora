# State Machines

| | |
|---|---|
| **Version** | V1 (as built) |
| **Purpose** | The life cycle of the main objects and of the interface during emergencies |

## 1. Hazard Report

```mermaid
stateDiagram-v2
    [*] --> active: report created
    active --> resolved: staff marks as repaired
    active --> duplicate: staff marks as duplicate
    active --> fake: staff marks as false
    resolved --> active: staff reopens
    duplicate --> active: staff reopens
    fake --> active: staff reopens
    note right of active
        Only active reports count in the score
        and in the clusters
    end note
```

Confirmations increase `confirmations_count` while the report is active (capped at five in the score).

## 2. Journey (Safe Walk)

```mermaid
stateDiagram-v2
    [*] --> active: POST /journeys/start
    active --> completed: user holds End walk for 1.5 s
    active --> cancelled: user cancels
    completed --> [*]
    cancelled --> [*]
```

The deviation state is stored as the timestamps `deviated_at` and `escalated_at` on an active journey (see section 3).

## 3. Deviation and Escalation (per active journey)

```mermaid
stateDiagram-v2
    [*] --> OnRoute
    OnRoute --> Deviated: distance > corridor, deviated_at = now
    Deviated --> OnRoute: back inside corridor
    Deviated --> OnRoute: confirm-safe
    Deviated --> Escalated: watchdog tick, deviated_at older than 60 s
    Escalated --> [*]: SOS created, escalated_at set, removed from watch list
    OnRoute --> [*]: complete or cancel
    Deviated --> [*]: complete or cancel
```

## 4. Walker Screen During a Walk

```mermaid
stateDiagram-v2
    [*] --> Planning
    Planning --> Walking: start walk, service starts
    Walking --> PromptShown: deviation detected
    PromptShown --> Walking: "I am safe"
    PromptShown --> Alerted: 60 s without a response (server escalates)
    Walking --> SosCountdown: SOS button in cockpit
    SosCountdown --> Walking: cancelled
    SosCountdown --> SosActive: countdown ends
    Walking --> Arrived: hold End walk
    Arrived --> [*]
    Alerted --> SosActive: user raises SOS
    SosActive --> [*]
```

## 5. SOS on the Phone

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Countdown: SOS tapped or duress PIN
    Countdown --> Idle: cancelled within 5 s
    Countdown --> Dispatching: countdown ends
    Dispatching --> Streaming: alert created, audio started
    Dispatching --> SmsFallback: no internet
    Streaming --> Completed: 30 s master file uploaded
    Streaming --> Interrupted: phone stops transmitting
    Interrupted --> [*]: server stitches received slices after 8 s
    Completed --> [*]
    SmsFallback --> [*]: user confirms the SMS
```

## 6. SOS Audio on the Server (per alert)

```mermaid
stateDiagram-v2
    [*] --> Waiting: alert created
    Waiting --> Receiving: first slice
    Receiving --> Receiving: next slice, 8 s timer reset
    Receiving --> Archived: master file uploaded, staging purged
    Receiving --> Rescued: 8 s without a slice, stitched and stored
    Waiting --> Archived: master file uploaded without slices
    Archived --> [*]
    Rescued --> [*]
```

## 7. Session

```mermaid
stateDiagram-v2
    [*] --> Rehydrating: app start
    Rehydrating --> Authenticated: valid token found
    Rehydrating --> Unauthenticated: none or expired
    Unauthenticated --> Guest: browse as guest
    Unauthenticated --> Authenticated: login, register or Google
    Guest --> Authenticated: login
    Authenticated --> Unauthenticated: logout or 7-day expiry
```

## 8. Trusted Contact (V1)

```mermaid
stateDiagram-v2
    [*] --> SmsOnly: contact added, no matching account
    [*] --> Member: contact added, matching account found
    SmsOnly --> Member: the contact registers later (found by e-mail or phone at alert time)
    Member --> [*]: contact deleted
    SmsOnly --> [*]: contact deleted
```

V1 has no acceptance step. The verified handshake (`pending`, `verified`, `revoked`) is a V2 item described in [`../v2/safety-and-tracking.md`](../v2/safety-and-tracking.md) §1.
