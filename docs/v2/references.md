# References and Verification List

| | |
|---|---|
| **Version** | V2 |
| **Gathered** | 20–21 September 2026, extended 22 September and 23 October 2026 |
| **Use** | Open each source and confirm that it still says what is claimed before quoting it in a report |
| **Note** | A few pages could not be opened by the research tools (the ACM paper blocked automated access, and the live backend disallows crawlers). Claims that rest on search-result summaries are marked *summary* |

## 1. Sources

### 1.1 Real-world products and government programmes

| ID | Source | Where | Used for |
|---|---|---|---|
| R1 | TechCrunch, "India to require panic buttons on all phones" (2016) | Search the title | The mandate that phones support a panic button |
| R2 | Emergency Response Support System (ERSS), 112 India | https://112.gov.in/ | Single emergency number; the 112 programme |
| R3 | Google, Personal Safety app (Android) | Search "Google Personal Safety app Emergency SOS five presses" | Five-press power-button SOS; Safety Check |
| R4 | Google help page, "Safety Check" | Search "Safety Check Google Personal Safety help" | A timer that starts emergency sharing if the user does not respond; stays active if the phone goes off the grid |
| R5 | Android Central, how to use Personal Safety | Search the title | "Add extra time" to a Safety Check (2025 update); text with a tracking link |
| R6 | Himmat Plus, Delhi Police | Search "Himmat Plus Delhi Police app" | SOS to the control room, shake trigger, video clip |
| R7 | SLAP, tutorial on Himmat Plus | Search "Himmat Plus step by step tutorial call back 10 seconds" | Call-back within about 10 seconds, then automatic recording *(summary)* |
| R8 | Uttarakhand Police App | Google Play, developer "SV Infotech" | Merges Gaura Shakti, Public Eye, Traffic Eye and other services |
| R9 | The Tribune, Haryana "Safe Journey" | Search "Safe Journey initiative women Gurugram police" | Police-monitored trips with periodic check-ins |
| R10 | 112 India app | App Store or Google Play listing | SHOUT volunteer alerts; TrackMe |

### 1.2 Android platform and store policy

| ID | Source | Where | Used for |
|---|---|---|---|
| R11 | Android developers, *Restrictions on starting foreground services from the background* | https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start | Location and microphone foreground services generally cannot start from the background; "while-in-use" permissions |
| R12 | Android developers, *Foreground service types* | https://developer.android.com/develop/background-work/services/fgs/service-types | Declaring types; microphone and location restrictions |
| R13 | Google Play policy, *Use of the AccessibilityService API* | Search the title on support.google.com | Prominent disclosure; use narrower APIs where possible |
| R14 | Google Play policy, *Use of SMS or Call Log permission groups* | https://support.google.com/googleplay/android-developer/answer/10208820 | `SEND_SMS` limited to default handlers with narrow exceptions; the emergency-alert exception is reported as case by case *(forum reports)* |
| R15 | Nugon SOS (open-source Android app) | Search "Nugon SOS Android volume button" | Volume-button trigger workarounds (MediaSession, accessibility, foreground service, battery exemptions) |
| R16 | Developer article on detecting volume keys with an AccessibilityService | Search "AccessibilityService onKeyEvent volume button" | How key-event filtering works |
| R17 | Don't Kill My App, Xiaomi and other brands | https://dontkillmyapp.com/xiaomi | Vendor background killers; auto-start; settings reset after updates |
| R38 | Google Play policy on stalkerware and tracking apps | Search "Google Play stalkerware policy persistent notification" | Persistent notification and disclosure for tracking apps |
| R42 | Google Play policy on permissions and APIs that access sensitive information (foreground-service location use) | Search the title on support.google.com | Location foreground-service use must continue a user-initiated action |

### 1.3 Maps, search and routing

| ID | Source | Where | Used for |
|---|---|---|---|
| R18 | OpenStreetMap Foundation, *Tile Usage Policy* | https://operations.osmfoundation.org/policies/tiles/ | Offline and prefetch prohibited; attribution required |
| R19 | `protomaps-leaflet` | https://www.npmjs.com/package/protomaps-leaflet | Vector tiles and PMTiles in Leaflet; Indic script support |
| R20 | Valhalla API reference | https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/ | Costing models (`auto`, `pedestrian`, `motor_scooter`, `bicycle`), narratives, `exclude_polygons` |
| R21 | Stadia Maps, routing guide | https://docs.stadiamaps.com/guides/getting-the-best-routes-with-valhalla-turn-by-turn-directions-apis/ | Hosted Valhalla profiles; localised instructions (25+ languages); `exclude_polygons` cost |
| R22 | Stadia Maps, limits | https://docs.stadiamaps.com/limits/ | Free tier for development, evaluation and non-commercial (including academic) use; HTTP 429 when exhausted *(confirm terms)* |
| R23 | OpenRouteService, restrictions | https://openrouteservice.org/restrictions/ | At most 3 alternative routes; avoid-area size limits |
| R24 | OSRM demo server behaviour | https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server and a search-result summary | The demo server returns car routes regardless of profile unless the FOSSGIS `routed-foot`, `routed-bike` and `routed-car` prefixes are used *(summary; test it)* |
| R25 | Photon API documentation | https://github.com/komoot/photon (see `docs/api-v1.md`) | `bbox`, `lang`, `lat` and `lon`, `zoom`, `location_bias_scale` |
| R26 | R package `photon` manual (CRAN) | Search "photon CRAN komoot public API fair use" | The public server is best-effort and throttled *(summary)* |
| R27 | Valhalla pull request #3957 | https://github.com/valhalla/valhalla/pull/3957 | `use_lit` for pedestrian costing |
| R45 | `maplibre-react-native` issue about PMTiles | Search "maplibre-react-native pmtiles" | PMTiles support in the React Native binding was requested; not confirmed |
| R46 | OpenRouteService free-tier numbers | https://account.heigit.org/info/plans and a third-party README quoting 2,000 per day and 40 per minute | Free quota *(confirm on the official page)* |

### 1.4 India: regulation and alerting

| ID | Source | Where | Used for |
|---|---|---|---|
| R28 | PIB explainer on the Digital Personal Data Protection Rules, 2025 | Search "PIB DPDP Rules 2025 explainer" | Notice, consent, security safeguards, children's data, breach communication |
| R29 | DPDP Rules 2025 timeline (secondary) | Search "DPDP Rules 2025 timeline 13 May 2027" | Phased dates; one summary says penalties are enforceable from 13 Nov 2026 *(confirm in the Rules)* |
| R30 | WebEngage, *TRAI SMS DLT regulations (India)* | Search the title | Entity and template registration for application-to-person SMS |
| R31 | NDMA Sachet (CAP alerts) | https://sachet.ndma.gov.in/ (feeds page) | National alert platform with public RSS and CAP feeds *(find the Uttarakhand feed)* |
| R47 | Gulf News report on India's 112 launch | Search "India 112 emergency number power button three times" | Triple power-button press dials 112 |

### 1.5 Infrastructure and services

| ID | Source | Where | Used for |
|---|---|---|---|
| R32 | Brevo: transactional e-mail, free-plan FAQ, technical guide | https://www.brevo.com/products/transactional-email/ · https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan · https://www.captaindns.com/en/blog/brevo-transactional-email-technical-guide | 300 e-mails per day free; REST API `/v3/smtp/email`; a separate SMTP key; branding on the free plan; DKIM and sender behaviour; the 1,000-message retry queue |
| R33 | Render free-tier directory entry (freetier.co) | Search "Render free tier SMTP ports blocked" | Free web services block outbound SMTP on ports 25, 465 and 587 *(summary; a direct test showed that SMTP works, see ADR-006)* |
| R34 | Telegram Bots FAQ | https://core.telegram.org/bots/faq | *Not used in V2; Telegram was dropped (decision Y3). Kept for history* |
| R39 | Cloudflare Workers platform limits and R2 pricing | https://developers.cloudflare.com/workers/platform/limits/ · https://developers.cloudflare.com/r2/pricing/ | Cron triggers on the free plan; the R2 free allowance (check the payment-method requirement) |
| R40 | Neon plans and free-plan limits | https://neon.com/docs/introduction/plans | 0.5 GB, compute-hour allowance, scale to zero after 5 minutes, PostGIS supported |
| R41 | Render, free web services | https://render.com/docs/free | Spins down after 15 minutes idle; about one minute to wake; monthly free hours; no free cron or background workers |
| R43 | GitHub Student Developer Pack | https://education.github.com/pack | Free domain and cloud credits (sources disagree about DigitalOcean after August 2026) |

### 1.6 Research and design guidance

| ID | Source | Where | Used for |
|---|---|---|---|
| R35 | *Rethinking Safe Mobility: The Case of Safetipin in India* (ACM) | https://dl.acm.org/doi/10.1145/3572334.3572392 | The nine-factor safety audit; critique of surveillance-style safety technology *(summary; the page blocked the tool)* |
| R36 | ABC News, eSafety Commissioner research on location-sharing apps and coercive control (May 2025) | Search "eSafety location sharing apps coercive control" | A higher risk of coercive control with location sharing |
| R37 | Tech Safety Canada, *Choosing and using safety apps* | https://techsafety.ca/resources/toolkits/choosing-and-using-safety-apps-designed-for-women-experiencing-violence | User control over sharing; apps that failed to send a location when tested |

### 1.7 Added in V2 (21 Sep 2026)

| ID | Source | Where | Used for |
|---|---|---|---|
| R48 | OpenFreeMap repository | https://github.com/hyperknot/openfreemap | Free vector-tile hosting; no limits on views or requests; no registration or keys; MIT-licensed project; donation-funded |
| R49 | OpenFreeMap quick start and attribution requirement | https://openfreemap.org/quick_start and the repository README | The attribution text "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"; MapLibre adds it automatically |
| R50 | MapTiler Cloud Terms and Conditions | https://www.maptiler.com/terms/cloud/ | The free plan is limited to non-commercial use and R&D; server-side caching of map content is prohibited; search results may be used outside the service |
| R51 | MapTiler pricing and free-plan limits | https://www.maptiler.com/cloud/pricing/ · https://freetier.co/directory/products/maptiler | 100,000 requests, 5,000 map sessions and 1,000 search sessions per month; the service pauses when used up; the Flex plan from about USD 25–30 per month *(summary; confirm on the pricing page)* |
| R52 | OpenFreeMap styles (liberty, positron, bright) | https://leafmap.org/maplibre/openfreemap/ | Style URLs under `tiles.openfreemap.org/styles/` |
| R53 | DPDP Rules 2025, Rule 12 and Rule 10 (children; Fourth Schedule), explanatory pages | https://www.dpdpa.com/dpdparules/rule12.html · https://www.dpdpa.com/dpdparules/rule10.html | The parental-consent duty and the tracking prohibition; exemptions by entity type and purpose, not blanket *(secondary; read the Rules text)* |
| R54 | ELP Law, *Processing of children's personal data under the DPDP Act*; Bar & Bench, *Child's personal data and privacy: analysing the draft DPDP Rules* | https://elplaw.in/leadership/processing-of-childrens-personal-data-under-the-dpdp-act-what-does-it-means-for-businesses-3/ · https://www.barandbench.com/law-firms/view-point/childs-personal-data-and-privacy-analysing-the-draft-dpdp-rules-2025 | Which organisations are exempt (clinical establishments, educational institutions, crèches, school transport) and for what |
| R55 | KS&K Partners, *Children's data protection under India's DPDP Rules* | https://ksandk.com/data-protection-and-data-privacy/childrens-data-protection-under-indias-dpdp-rules/ | Exemptions are narrow and purpose-bound; high penalties *(confirm the amounts in the Act)* |
| R56 | Seclore, *DPDP Rules 2025 compliance guide* | https://www.seclore.com/fundamentals/dpdp-rules-2025-compliance-guide/ | Approved parental-verification methods, including DigiLocker-based identity checks *(secondary)* |

### 1.8 Added 22 Sep 2026

| ID | Source | Where | Used for |
|---|---|---|---|
| R57 | Open-Meteo documentation | https://open-meteo.com/en/docs | Free weather API, no key, 10,000 calls per day for non-commercial use, CC BY 4.0 attribution |
| R58 | USGS Earthquake Hazards Program, real-time feeds | https://earthquake.usgs.gov/earthquakes/feed/ | A free, public-domain, real-time GeoJSON earthquake feed |
| R59 | Bureau of Indian Standards (BIS) seismic zoning map | Search "India seismic zone map BIS IS 1893 Uttarakhand zone IV V" | Uttarakhand's Seismic Zone IV and V classification *(confirm the district boundaries before hard-coding; zones can be revised)* |
| R60 | "Ask for Angela" scheme, UK | Search "Ask for Angela scheme how it works bar venue" | The code-word-to-venue-staff pattern used as the design reference for `safe_stops` (MAP-7b) and the chat duress code word (CHT-4) |
| R61 | Waze traffic-report trust and reputation mechanics | Search "Waze user reputation trust score traffic reports" | Reference pattern for the reporter trust score (MAP-9c) |

### 1.9 Added 23 Oct 2026 (platform comparison used in the project paper)

| ID | Source | Where | Used for |
|---|---|---|---|
| R62 | Apple, *Use Check In on iPhone* | https://support.apple.com/guide/personal-safety/ips56b5bc469/web | Check In: prompts when a trip is delayed or off course; a 15-minute response window; contact notified on no response, including when the phone is lost; iOS 17 or later on both sides |
| R63 | Google, *Latest Pixel feature drops on safety* | https://store.google.com/magazine/new-pixel-safety-features/ | Safety Check on Pixel: a 60-second alarm before Emergency Sharing starts |
| R64 | Google, *Keep yourself safe with these 5 Pixel features* | https://blog.google/products-and-platforms/devices/pixel/google-pixel-phone-watch-safety-features/ | Safety Check timer duration; Emergency SOS options |
| R65 | Noonlight Help Center, *How does Noonlight work?* and *How much does Noonlight cost?* | https://help.noonlight.com/en/articles/2060965-how-does-noonlight-work · https://help.noonlight.com/en/articles/3270559-how-much-does-noonlight-cost | Dispatch by certified operators; a free basic app with paid extras |
| R66 | SafeWise, *Noonlight review*; CBS Philadelphia test report | https://www.safewise.com/personal-safety/noonlight/ · https://www.cbsnews.com/philadelphia/news/testing-popular-safety-app-noonlights-response-time-compared-to-911 | Availability in the United States only; the cancel-PIN countdown |
| R67 | bSafe, App Store listing; AppleVis entry | https://apps.apple.com/us/app/bsafe/id459709106 · https://applevis.com/apps/ios/lifestyle/bsafe-never-walk-alone | Voice SOS, live audio and video streaming, recording, fake call, Follow Me, timer alarm |
| R68 | Safetipin, *My Safetipin app* | https://safetipin.com/my-safetipin-app/ | Nine-parameter audits, safety score, safest route, tracking with notifications |
| R69 | Red Dot Foundation, Safecity | https://end-violence.org/members/red-dot-foundation | Crowdsourced anonymous harassment stories shown as hot spots; launched 26 December 2012 |
| R70 | MHA 112 content on Vikaspedia | https://en.vikaspedia.in/social-welfare/women-and-child-development/emergency-response-support-system | The 112 India app; SHOUT; rollout in all 36 states and union territories |
| R71 | Uttarakhand Police App, Gaura Shakti module (Public Services Map) | https://www.publicservicesmap.in/schemes/gaura-shakti-yojana--gsy | Complaints, SOS and the mapped women police officer |
| R72 | The Better India (Bengaluru Suraksha); Deccan Herald (Andhra Pradesh Shakti) | https://www.thebetterindia.com/95346/bengaluru-city-police-app-safety-women · https://www.deccanherald.com/india/andhra-pradesh/andhra-sees-over-15-crore-downloads-of-shakti-app-launched-for-womens-safety-3549319 | State police SOS apps: a 10-second video; download and SOS-call figures |

## 2. Everything Still to Verify (🔬)

| # | Claim or decision that needs a test or check | Where it appears | Owner |
|---|---|---|---|
| V1 | Stadia's free-tier terms cover this project; the monthly credit limit | ADR-004, `map-routing-search.md` §4 | Backend developer |
| V2 | The Android 13+ "restricted settings" step for sideloaded accessibility services and the exact taps | `safety-and-tracking.md` §9, ADR-001 | Android developer |
| V3 | `protomaps-leaflet` performance in the Android WebView; the English-label option in the pinned version | `map-routing-search.md` §1 | Mobile developer |
| V4 | Region-pack file sizes and the free hosting choice | `map-routing-search.md` §2 | Mobile developer |
| V5 | The Uttarakhand Sachet feed URL and terms | `accounts-email-local.md` §6.2 | Backend developer |
| V6 | FCM topic-subscription limits and delivery delay | `map-routing-search.md` §8 | Backend developer |
| V7 | DPDP dates and the breach-reporting timeline in the Rules text | `security-privacy-compliance.md` §4 | Supervisor or legal cell |
| V8 | Locked-screen audio approach A, B or C per device | `safety-and-tracking.md` §9 (TRG-6) | Android developer |
| V9 | Quick Settings tile behaviour on the lock screen per brand | `safety-and-tracking.md` §9 | Android developer |
| V10 | Share of lit ways tagged in OSM around Dehradun | `map-routing-search.md` §6 | Anyone |
| V11 | Hindi text-to-speech voice availability and quality | `map-routing-search.md` §5, `accounts-email-local.md` §5 | Mobile developer |
| V12 | Brevo sender and DKIM setup; inbox placement for Gmail, Outlook and college mail | `accounts-email-local.md` §1 | Backend developer |
| V13 | How the map renders disputed borders and whether this matters for the beta | `map-routing-search.md` §1 | Supervisor |
| V14 | `android:allowBackup=false` and cleartext traffic disabled in the release build | `security-privacy-compliance.md` §7 | Android developer |
| V15 | The OSRM demo server returning car routes for the foot profile (quick test: request the same pair with `foot` and `driving`) | `map-routing-search.md` §0 | Backend developer |
| V16 | OSM coverage of police stations, hospitals and 24-hour shops near the university | `map-routing-search.md` §7 | Anyone |
| V17 | Provider walking times against a real 1 km walk | `map-routing-search.md` §4 | Anyone |
| V18 | Whether audio-recording notes and consent need a legal read for the beta | `security-privacy-compliance.md` §4 | Supervisor |
| V19 | The exact district-level boundaries of Uttarakhand's Seismic Zones IV and V per the current BIS map, before hard-coding a lookup | `environmental-hazards.md` §4 (WX-3) | Backend developer |
| V20 | Whether Open-Meteo's precipitation-intensity codes map cleanly onto a waterlogging-boost threshold or need a custom mapping | `environmental-hazards.md` §2 (WX-1) | Backend developer |
| V21 | Which name fields OpenFreeMap's tiles carry, and that the English-first label expression works | `map-routing-search.md` §1 | Mobile developer |
| V22 | Performance of the Leaflet–MapLibre bridge in the Android WebView | `map-routing-search.md` §1 | Mobile developer |
| V23 | Whether the DPDP children's-data rules and exemptions apply to Safora, and what a teen mode would need | `security-privacy-compliance.md` §4 | Supervisor or lawyer |
| V24 | Whether chat and media make Safora an "intermediary" under Indian IT rules, and what takedown and grievance duties follow | `safety-and-tracking.md` §10, `security-privacy-compliance.md` §10 | Supervisor or lawyer |
| V25 | Which SMTP provider and port worked on Render's free plan | `accounts-email-local.md` §1 | Developer |
