# 09 — References and Verification List

> Sources gathered on **20–21 September 2026** while preparing this document set. Where I am confident of a stable URL it is given; otherwise the row says how to find the page. **Open each source and confirm it still says what is claimed before you quote it in your report.** A few pages could not be opened by my tools (the ACM paper blocked automated access, and the live backend disallows crawlers), so some claims rest on search-result summaries — those are marked *summary*.

## 1. Sources

### Real-world products and government programmes
| ID | Source | Where | Used for |
|---|---|---|---|
| R1 | TechCrunch, "India to require panic buttons on all phones" (2016) | Search the title | Mandate that phones support a panic button |
| R2 | Emergency Response Support System (ERSS), 112 India | https://112.gov.in/ | Single emergency number; 112 programme |
| R3 | Google, Personal Safety app (Android) | Search "Google Personal Safety app Emergency SOS five presses" | Five-press power-button SOS; Safety Check |
| R4 | Google help page, "Safety Check" | Search "Safety Check Google Personal Safety help" | Timer that starts emergency sharing if you do not respond; stays active if the phone goes off the grid |
| R5 | Android Central, how to use Personal Safety | Search title | "Add extra time" to a Safety Check (2025 update); text with a tracking link |
| R6 | Himmat Plus, Delhi Police | Search "Himmat Plus Delhi Police app" | SOS to control room, shake trigger, video clip |
| R7 | SLAP, tutorial on Himmat Plus | Search "Himmat Plus step by step tutorial call back 10 seconds" | Call-back within ~10 s then auto-recording *(summary)* |
| R8 | Uttarakhand Police App | Google Play, developer "SV Infotech" | Merges Gaura Shakti, Public Eye, Traffic Eye etc. |
| R9 | The Tribune, Haryana "Safe Journey" | Search "Safe Journey initiative women Gurugram police" | Police-monitored trips with periodic check-ins |
| R10 | 112 India app | App Store / Google Play listing | SHOUT volunteer alerts; TrackMe |

### Android platform and store policy
| ID | Source | Where | Used for |
|---|---|---|---|
| R11 | Android developers, *Restrictions on starting foreground services from the background* | https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start | Location/microphone foreground services generally cannot start from the background; "while-in-use" permissions |
| R12 | Android developers, *Foreground service types* | https://developer.android.com/develop/background-work/services/fgs/service-types | Declaring types; microphone/location restrictions |
| R13 | Google Play policy, *Use of the AccessibilityService API* | Search the title on support.google.com | Prominent disclosure; use narrower APIs where possible |
| R14 | Google Play policy, *Use of SMS or Call Log permission groups* | https://support.google.com/googleplay/android-developer/answer/10208820 | `SEND_SMS` limited to default handlers with narrow exceptions; emergency-alert exception reported as case-by-case *(forum reports)* |
| R15 | Nugon SOS (open-source Android app) | Search "Nugon SOS Android volume button" | Volume-button trigger workarounds (MediaSession, accessibility, foreground service, battery exemptions) |
| R16 | Developer article on detecting volume keys with an AccessibilityService | Search "AccessibilityService onKeyEvent volume button" | How key-event filtering works |
| R17 | Don't Kill My App, Xiaomi (and other brands) | https://dontkillmyapp.com/xiaomi | OEM background killers; autostart; settings reset after updates |
| R38 | Google Play policy on stalkerware / tracking apps | Search "Google Play stalkerware policy persistent notification" | Persistent notification and disclosure for tracking apps |
| R42 | Google Play policy on permissions and APIs that access sensitive information (foreground-service location use) | Search the title on support.google.com | Location foreground-service use must continue a user-initiated action |

### Maps, search, routing
| ID | Source | Where | Used for |
|---|---|---|---|
| R18 | OpenStreetMap Foundation, *Tile Usage Policy* | https://operations.osmfoundation.org/policies/tiles/ | Offline/prefetch prohibited; attribution required |
| R19 | `protomaps-leaflet` | https://www.npmjs.com/package/protomaps-leaflet | Vector tiles/PMTiles in Leaflet; Indic script support |
| R20 | Valhalla API reference | https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/ | Costing models (`auto`, `pedestrian`, `motor_scooter`, `bicycle`), narratives, `exclude_polygons` |
| R21 | Stadia Maps, routing guide | https://docs.stadiamaps.com/guides/getting-the-best-routes-with-valhalla-turn-by-turn-directions-apis/ | Hosted Valhalla profiles; localised instructions (25+ languages); `exclude_polygons` cost |
| R22 | Stadia Maps, limits | https://docs.stadiamaps.com/limits/ | Free tier for development/evaluation/non-commercial (incl. academic); HTTP 429 when exhausted *(confirm terms)* |
| R23 | OpenRouteService, restrictions | https://openrouteservice.org/restrictions/ | Alternative routes ≤ 3; avoid-area size limits |
| R24 | OSRM demo server behaviour | https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server and a search-result summary (glama.ai OSM MCP page) | Demo server returns car routes regardless of profile unless FOSSGIS `routed-foot/bike/car` prefixes are used *(summary — test it yourself)* |
| R25 | Photon API documentation | https://github.com/komoot/photon (see `docs/api-v1.md`) | `bbox`, `lang`, `lat`/`lon`, `zoom`, `location_bias_scale` |
| R26 | R package `photon` manual (CRAN) | Search "photon CRAN komoot public API fair use" | Public server is best-effort/throttled *(summary)* |
| R27 | Valhalla pull request #3957 | https://github.com/valhalla/valhalla/pull/3957 | `use_lit` for pedestrian costing |
| R45 | `maplibre-react-native` issue about PMTiles | Search "maplibre-react-native pmtiles" | PMTiles support in the React Native binding was requested; not confirmed |
| R46 | OpenRouteService free-tier numbers | https://account.heigit.org/info/plans and a third-party README quoting 2,000/day, 40/min | Free quota *(confirm on the official page)* |

### India regulation and alerting
| ID | Source | Where | Used for |
|---|---|---|---|
| R28 | PIB explainer on the Digital Personal Data Protection Rules, 2025 | Search "PIB DPDP Rules 2025 explainer" | Notice, consent, security safeguards, children's data, breach communication |
| R29 | DPDP Rules 2025 timeline (secondary) | Search "DPDP Rules 2025 timeline 13 May 2027" | Phased dates; one summary says penalties enforceable from 13 Nov 2026 *(confirm in the Rules)* |
| R30 | WebEngage, *TRAI SMS DLT regulations (India)* | Search the title | Entity/template registration for application-to-person SMS |
| R31 | NDMA Sachet (CAP alerts) | https://sachet.ndma.gov.in/ (feeds page) | National alert platform with public RSS/CAP feeds *(find the Uttarakhand feed)* |
| R47 | Gulf News report on India's 112 launch | Search "India 112 emergency number power button three times" | Triple power-button press dials 112 |

### Infrastructure and services
| ID | Source | Where | Used for |
|---|---|---|---|
| R32 | Brevo: transactional email, free-plan FAQ, technical guide | https://www.brevo.com/products/transactional-email/ · https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan · https://www.captaindns.com/en/blog/brevo-transactional-email-technical-guide | 300 emails/day free; REST API `/v3/smtp/email`; separate SMTP key; branding on free plan; DKIM/sender behaviour; 1,000-message retry queue |
| R33 | Render free-tier directory entry (freetier.co) | Search "Render free tier SMTP ports blocked" | Free web services block outbound SMTP 25/465/587 *(summary; confirm in Render docs)* |
| R34 | Telegram Bots FAQ | https://core.telegram.org/bots/faq | *Not used in v2 — Telegram was dropped (decision Y3). Kept for history.* |
| R39 | Cloudflare Workers platform limits and R2 pricing | https://developers.cloudflare.com/workers/platform/limits/ · https://developers.cloudflare.com/r2/pricing/ | Cron triggers on the free plan; R2 free allowance (check payment-method requirement) |
| R40 | Neon plans and free-plan limits | https://neon.com/docs/introduction/plans | 0.5 GB, compute-hour allowance, scale-to-zero after 5 minutes, PostGIS supported |
| R41 | Render, free web services | https://render.com/docs/free | Spins down after 15 min idle; ~1 min wake; monthly free hours; no free cron/background workers |
| R43 | GitHub Student Developer Pack | https://education.github.com/pack | Free domain, cloud credits (Azure for Students ~$100 without a credit card; sources disagree on DigitalOcean after Aug 2026) |

### Research and design guidance
| ID | Source | Where | Used for |
|---|---|---|---|
| R35 | *Rethinking Safe Mobility: The Case of Safetipin in India* (ACM) | https://dl.acm.org/doi/10.1145/3572334.3572392 | Nine-factor safety audit; critique of surveillance-style safety tech *(summary — the page blocked my tool)* |
| R36 | ABC News, eSafety Commissioner research on location-sharing apps and coercive control (May 2025) | Search "eSafety location sharing apps coercive control" | Higher risk of coercive control with location sharing |
| R37 | Tech Safety Canada, *Choosing and using safety apps* | https://techsafety.ca/resources/toolkits/choosing-and-using-safety-apps-designed-for-women-experiencing-violence | User control over sharing; apps that failed to send location when tested |

### Added in v2 (21 Sep 2026)
| ID | Source | Where | Used for |
|---|---|---|---|
| R48 | OpenFreeMap repository | https://github.com/hyperknot/openfreemap | Free vector-tile hosting; no limits on views/requests; no registration or keys; MIT-licensed project; donation-funded |
| R49 | OpenFreeMap quick start and attribution requirement | https://openfreemap.org/quick_start and the repository README | Attribution text "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"; MapLibre adds it automatically |
| R50 | MapTiler Cloud Terms and Conditions | https://www.maptiler.com/terms/cloud/ | Free plan limited to non-commercial use and R&D; server-side caching of map content prohibited; search results may be used outside the service |
| R51 | MapTiler pricing and free-plan limits | https://www.maptiler.com/cloud/pricing/ · https://freetier.co/directory/products/maptiler | 100k requests, 5k map sessions, 1k search sessions/month; service pauses when used up; Flex plan from about $25–30/month *(summary — confirm on the pricing page)* |
| R52 | OpenFreeMap styles (liberty, positron, bright) | https://leafmap.org/maplibre/openfreemap/ | Style URLs under `tiles.openfreemap.org/styles/` |
| R53 | DPDP Rules 2025, Rule 12 and Rule 10 (children; Fourth Schedule) — explanatory pages | https://www.dpdpa.com/dpdparules/rule12.html · https://www.dpdpa.com/dpdparules/rule10.html | Parental-consent duty and tracking prohibition; exemptions by entity type and purpose, not blanket *(secondary — read the Rules text)* |
| R54 | ELP Law, *Processing of children's personal data under the DPDP Act* · Bar & Bench, *Child's personal data and privacy: analysing the draft DPDP Rules* | https://elplaw.in/leadership/processing-of-childrens-personal-data-under-the-dpdp-act-what-does-it-means-for-businesses-3/ · https://www.barandbench.com/law-firms/view-point/childs-personal-data-and-privacy-analysing-the-draft-dpdp-rules-2025 | Which organisations are exempt (clinical establishments, educational institutions, crèches, school transport) and for what |
| R55 | KS&K Partners, *Children's data protection under India's DPDP Rules* | https://ksandk.com/data-protection-and-data-privacy/childrens-data-protection-under-indias-dpdp-rules/ | Exemptions are narrow and purpose-bound; high penalties *(confirm amounts in the Act)* |
| R56 | Seclore, *DPDP Rules 2025 compliance guide* | https://www.seclore.com/fundamentals/dpdp-rules-2025-compliance-guide/ | Approved parental-verification methods, including DigiLocker-based identity checks *(secondary)* |

### Added 22 Sep 2026
| ID | Source | Where | Used for |
|---|---|---|---|
| R57 | Open-Meteo documentation | https://open-meteo.com/en/docs | Free weather API, no key, 10k calls/day non-commercial limit, CC BY 4.0 attribution |
| R58 | USGS Earthquake Hazards Program, real-time feeds | https://earthquake.usgs.gov/earthquakes/feed/ | Free, public-domain, real-time GeoJSON earthquake feed |
| R59 | Bureau of Indian Standards (BIS) seismic zoning map | Search "India seismic zone map BIS IS 1893 Uttarakhand zone IV V" | Uttarakhand's Seismic Zone IV/V classification *(confirm exact district boundaries before hardcoding — zones can be revised)* |
| R60 | "Ask for Angela" scheme, UK | Search "Ask for Angela scheme how it works bar venue" | Codeword-to-venue-staff pattern used as the design reference for both `safe_stops` (MAP-7b) and the chat duress codeword (CHT-4) |
| R61 | Waze traffic-report trust/reputation mechanics | Search "Waze user reputation trust score traffic reports" | Reference pattern for the reporter trust score (MAP-9c) |

---

## 2. Everything still to verify (🔬 list)

| # | Claim / decision that needs a test or a check | Where it appears | Who |
|---|---|---|---|
| V1 | Stadia's free-tier terms cover this project; monthly credit limit | ADR-004, `04` §4 | Backend dev |
| V2 | Android 13+ "restricted settings" step for sideloaded accessibility services and the exact taps | `03` §9, ADR-001 | Android dev |
| V3 | `protomaps-leaflet` performance in the Android WebView; English-label option in the pinned version | `04` §1 | Mobile dev |
| V4 | Region-pack file sizes and the free hosting choice (Q9) | `04` §2 | Mobile dev |
| V5 | Uttarakhand Sachet feed URL and terms | `05` §6.2 | Backend dev |
| V6 | FCM topic-subscription limits and delivery delay | `04` §8 | Backend dev |
| V7 | DPDP dates and the breach-reporting timeline in the Rules text | `06` §4 | Supervisor / legal cell |
| V8 | Locked-screen audio approach A/B/C per device | `03` §9 (TRG-6) | Android dev |
| V9 | Quick Settings tile behaviour on the lock screen per brand | `03` §9 | Android dev |
| V10 | Share of lit ways tagged in OSM around Dehradun | `04` §6 | Anyone |
| V11 | Hindi text-to-speech voice availability and quality | `04` §5, `05` §5 | Mobile dev |
| V12 | Brevo sender/DKIM setup and inbox placement for Gmail, Outlook and college mail | `05` §1 | Backend dev |
| V13 | How the map renders disputed borders; whether that matters for the pilot | `04` §1 | Supervisor |
| V14 | `android:allowBackup=false` and cleartext traffic disabled in the release build | `06` §7 | Android dev |
| V15 | OSRM demo server returning car routes for foot profile (quick test: request the same pair with `foot` and `driving`) | `04` §0 | Backend dev |
| V16 | OSM coverage of police stations, hospitals and 24-hour shops near DBUU | `04` §7 | Anyone |
| V17 | Provider walking times vs a real 1 km walk | `04` §4 | Anyone |
| V18 | Whether audio recording notes/consent need a legal read for the pilot | `06` §4 | Supervisor |
| V19 | Exact district-level boundaries of Uttarakhand's Seismic Zone IV vs V per the current BIS map, before hardcoding a lookup table | `environmental-hazards.md` §4 (WX-3) | Backend dev |
| V20 | Whether Open-Meteo's precipitation-intensity codes map cleanly onto a "boost waterlogging weight" threshold, or need a custom mapping | `environmental-hazards.md` §2 (WX-1) | Backend dev |
| V19 | Which name fields OpenFreeMap's tiles carry, and that the English-first label expression works | `04` §1 | Mobile dev |
| V20 | Performance of the Leaflet–MapLibre bridge in the Android WebView | `04` §1 | Mobile dev |
| V21 | Whether the DPDP children's-data rules and exemptions apply to Safora, and what a teen mode would need | `06` §4 | Supervisor / lawyer |
| V22 | Whether chat/media makes Safora an "intermediary" under Indian IT rules, and what takedown/grievance duties follow | `03` §10, `06` §10 | Supervisor / lawyer |
| V23 | Which SMTP provider/port worked on Render's free plan (your test) | `05` §1 | You |

