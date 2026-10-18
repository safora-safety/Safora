# 🛡️ Safora V1 — Master Quality Assurance & Manual Testing Field Checklist

> **Scope:** Full Safora V1 Release Architecture (Mobile Citizen App + Mobile Guardian Mode + Web Admin Operations Portal + Cloud Backend / Neon PostGIS)  
> **Target Devices:** Physical Android Devices (Device A: Walker, Device B: Guardian) + Desktop Browser (`http://localhost:3000` or production Web Admin)  
> **Backend Service:** Render Live API (`https://safora-backend.onrender.com`) + Neon PostgreSQL (PostGIS enabled)  
> **How to Use:**  
> - Tick `[x]` as you test and confirm each granular feature or UI component.  
> - Enter your real-time observations, device quirks, or feedback under `> ✎ **Test Notes / Comment:**`.  
> - Items marked **`🔄 READY FOR RE-TEST`** contain fixes ready for physical validation.

---

## 📊 Comprehensive Testing Progress Dashboard

```
========================================================================================
SECTION                                      PROGRESS       PASSED / TOTAL   STATUS
========================================================================================
0.  Infrastructure, Cron & DB Deployment     [██████████]   5 / 5   (100.0%)  ✅ ALL PASS
1.  App Launch, Onboarding & Consent Flows   [██████████]   10 / 10 (100.0%)  ✅ ALL PASS
2.  Authentication, Guest Mode & Sessions    [██████████]   7 / 7   (100.0%)  ✅ ALL PASS
3.  Profile & Settings Consolidation         [██████████]   7 / 7   (100.0%)  ✅ ALL PASS
4.  Home Radar, Safety Score & Quick Tools   [██████████]   10 / 10 (100.0%)  ✅ ALL PASS
5.  Hazard Reporting, Camera & Geocoding     [██████████]   10 / 10 (100.0%)  ✅ ALL PASS
6.  Community Map, Heatmaps & Moderation     [██████████]   9 / 9   (100.0%)  ✅ ALL PASS
7.  Safe Walk (Walker Experience - Dev A)    [██████████]   9 / 9   (100.0%)  ✅ ALL PASS
8.  Guardian Live Escort (Watcher - Dev B)   [██████████]   9 / 9   (100.0%)  ✅ ALL PASS
9.  Deviation Watchdog & Server Escalation   [░░░░░░░░░░]   0 / 6   (0.0%)    ⏳ PENDING
10. SOS Emergency Dispatch & Ambient Audio   [██████████]   10 / 10 (100.0%)  ✅ ALL PASS
11. Decoy Suite & Tactical Safety Tools      [██████████]   5 / 5   (100.0%)  ✅ ALL PASS
12. Web Admin: Portal Auth & Operations      [██████████]   6 / 6   (100.0%)  ✅ ALL PASS
13. Web Admin: Live Radar & Moderation       [██████████]   12 / 12 (100.0%)  ✅ ALL PASS
14. Web Admin: SOS Incident Queue & Users    [██████████]   8 / 8   (100.0%)  ✅ ALL PASS
15. Cold GPS, Network Drops & Battery Life   [░░░░░░░░░░]   0 / 5   (0.0%)    ⏳ PENDING
16. V1 Production Upgrades Verification      [███████░░░]   5 / 7   (71.4%)   🔄 IN PROGRESS
17. Google Sign-In & OAuth Authentication    [██████████]   8 / 8   (100.0%)  ✅ ALL PASS
========================================================================================
OVERALL V1 TESTING COMPLETION                [█████████░]   130 / 143 (90.9%) IN PROGRESS
========================================================================================
```

---

## 0. Infrastructure, Cron & DB Deployment (5 / 5) ✅

- [x] **0.1 `INTERNAL_TICK_SECRET` Configured on Cloud Environment**  
  *Verification Steps:* Query Render environment variables; verify secret key is non-empty.  
  *Expected Result:* Backend tick endpoint blocks unauthorized requests with 401/403.  
  > ✎ **Test Notes / Comment:** Perfectly set and backend never sleeps now.

- [x] **0.2 Neon Database Migration & PostGIS Spatial Extension**  
  *Verification Steps:* Run database migration script; verify spatial functions (`ST_DWithin`, `ST_DistanceSphere`) execute.  
  *Expected Result:* Tables `users`, `hazards`, `journeys`, `sos_alerts`, `trusted_contacts` created with `status` and `guardian_user_id` columns.  
  > ✎ **Test Notes / Comment:** Ran initial migration, PostGIS extension, and added `status` + `guardian_user_id` columns to `trusted_contacts`.

- [x] **0.3 External Cron-Job Heartbeat Pinging `/api/internal/tick`**  
  *Verification Steps:* Check cron-job.org execution log every 60 seconds.  
  *Expected Result:* HTTP 200 OK returned (`{"scanned": ..., "escalated": ...}`) with sub-second latency.  
  > ✎ **Test Notes / Comment:** Verified 200 OK (`{"scanned": 4, "escalated": 0}`) with ~806ms latency.

- [x] **0.4 Public Health & Diagnostics Endpoints**  
  *Verification Steps:* GET `https://safora-backend.onrender.com/api/health` and `/api/diagnostics`.  
  *Expected Result:* Both endpoints return healthy status JSON; database connection pool active.  
  > ✎ **Test Notes / Comment:** Both endpoints healthy; live latency checkable directly on admin panel.

- [x] **0.5 Physical Android Production Build Verification**  
  *Verification Steps:* Compile `./gradlew assembleRelease` and install APK on physical test hardware.  
  *Expected Result:* Release APK launches smoothly without debug bundle dependencies or redbox errors.  
  > ✎ **Test Notes / Comment:** Tested on physical Android devices.

---

## 1. App Launch, Onboarding & Consent Flows (10 / 10) ✅

- [x] **1.1 Welcome Screen Carousel Presentation**  
  *Verification Steps:* Fresh install launch → swipe through feature introduction slides.  
  *Expected Result:* Carousel cards render crisp artwork, typography, and responsive indicators.  
  > ✎ **Test Notes / Comment:** PASS: Feature slides swipe smoothly with vibrant illustrations and clear onboarding copy.

- [x] **1.2 Skipping Onboarding Still Prompts for Microphone Consent**  
  *Verification Steps:* Fresh install → Tap "Skip" on the very first slide.  
  *Expected Result:* Does NOT bypass permissions; immediately opens `MicrophoneConsentModal` explaining 30s ambient evidence capture.   
  > ✎ **Test Notes / Comment:** PASS: Skipping onboarding directly presents MicrophoneConsentModal before allowing app access.

- [x] **1.3 Terms & Age Consent Gate on Account Creation**  
  *Verification Steps:* Register a new account or complete account selection.  
  *Expected Result:* Terms & Age Consent screen displays automatically before reaching Home.  
  > ✎ **Test Notes / Comment:** PASS: Checkbox consent for Terms and Privacy Policy required before account creation completes.

- [x] **1.4 Hardware Back Button Blocked on Terms Screen** *(Security Guard)*  
  *Verification Steps:* Press hardware Android back gesture/button while on the mandatory Terms screen.  
  *Expected Result:* Back press is intercepted; user cannot bypass terms or exit to home.  
  > ✎ **Test Notes / Comment:** PASS: Back navigation and gesture swipe are intercepted; user remains pinned to Terms screen until age and policy requirements are accepted.

- [x] **1.5 App Force-Close Resistance on Terms Screen**  
  *Verification Steps:* Force close the app while on Terms screen → Reopen app.  
  *Expected Result:* App immediately resumes on the Terms screen; bypass is impossible.  
  > ✎ **Test Notes / Comment:** PASS: Force-closing and relaunching the app cold-boots directly back to the mandatory Terms gate; unverified state persists.

- [x] **1.6 No 'Skip' or 'Cancel' Action on Terms Screen**  
  *Verification Steps:* Inspect Terms UI layout.  
  *Expected Result:* No skip buttons exist; user must actively accept or exit app.  
  > ✎ **Test Notes / Comment:** PASS: UI provides no skip, dismiss, or cancel options; completion of age selection and legal consent is mandatory.

- [x] **1.7 Mandatory Age + Checkbox Submission**  
  *Verification Steps:* Fill age (18+), tick all required policy checkboxes, tap Continue.  
  *Expected Result:* Consent recorded locally and in database; navigates seamlessly to Home.  
  > ✎ **Test Notes / Comment:** PASS: Age validation (18+) and agreement checkboxes enforce input; successful submission stores consent flag and opens Home dashboard.

- [x] **1.8 Post-Consent Persistence Across Multiple Reopens**  
  *Verification Steps:* Force close and reopen app 3 to 4 times after agreeing to Terms.  
  *Expected Result:* Terms screen never reappears; app opens directly to Home.  
  > ✎ **Test Notes / Comment:** PASS: Terms consent is persisted locally in AsyncStorage; subsequent reboots launch directly to MainTabs without prompt.

- [x] **1.9 Logout & Re-login: No Terms Reappearance & No Session Alert Loop**   
  *Verification Steps:* Log out of account → Log back in with valid credentials.  
  *Expected Result:* Navigates directly to Home; no repetitive "Session expired" alerts spam the screen.  
  > ✎ **Test Notes / Comment:** PASS: Logging out and logging back in transitions directly to Home with no session alert loops.

- [x] **1.10 Read-Only Terms Access from Settings**  
  *Verification Steps:* Go to Settings → Tap "Terms & Privacy Policy".  
  *Expected Result:* Terms load in viewer mode; back arrow allows returning to Settings.  
  > ✎ **Test Notes / Comment:** PASS: Full Terms of Service text accessible for read-only review from Settings menu.

---

## 2. Authentication, Guest Mode & Sessions (7 / 7) ✅

- [x] **2.1 Citizen Account Registration**  
  *Verification Steps:* Register with name, email, phone number, and password.  
  *Expected Result:* Proper email/phone regex validations; account saved; JWT token stored.  
  > ✎ **Test Notes / Comment:** PASS: New citizen registration creates user account with hashed password and returns active JWT.

- [x] **2.2 Citizen Account Login & Switch Accounts**  
  *Verification Steps:* Log in with existing citizen credentials; switch between accounts.  
  *Expected Result:* Authentication succeeds; user profile and preferences load cleanly.  
  > ✎ **Test Notes / Comment:** PASS: Citizen login validates credentials, issues JWT token, sets persistent session, and allows seamless account switching.

- [x] **2.3 Guest Mode Entry & Feature Safeguards**  
  *Verification Steps:* Tap "Explore as Guest" on account selection screen.  
  *Expected Result:* Enters Home radar immediately with guest badge; read-only access to map & tools. Protected features (reporting hazards, managing emergency contacts, changing password, safe walk escort) are now strictly barred with prompt to sign in.  
  > ✎ **Test Notes / Comment:** PASS: Guest mode provides read-only radar access; reporting, contacts, and escorting are strictly barred with sign-in prompts.

- [x] **2.4 Logout Memory & Cache Sanitization & Guest Mode Sign-In CTA**  
  *Verification Steps:* Log in with user having saved emergency contacts → Log out → Enter Guest mode → view Profile screen.  
  *Expected Result:* Previous user's contacts and guardian lists are completely cleared from storage; in Guest mode, Profile displays a prominent "🚀 Sign In / Switch Account" button instead of generic "Sign Out".  
  > ✎ **Test Notes / Comment:** PASS: Logout purges user state and cached contacts; Profile presents clean "Sign In / Switch Account" button.

- [x] **2.5 Guest Mode Block on Hazard Submission**  
  *Verification Steps:* In Guest mode, tap "Report Hazard" from Home screen or Map screen.  
  *Expected Result:* Displays immediate warning alert before user begins filling the form ("Citizen Account Required: Please sign in or create an account to report community hazards"). Modal also displays a prominent banner if opened.  
  > ✎ **Test Notes / Comment:** PASS: Early interceptor alert warns guest users before opening the hazard report form.

- [x] **2.6 Guest Mode Block on Safe Walk Escort**  
  *Verification Steps:* In Guest mode, tap "Start Safe Walk".  
  *Expected Result:* Prompts user to sign in or register to enable real-time guardian tracking.  
  > ✎ **Test Notes / Comment:** PASS: Tapping Start Safe Walk in guest mode immediately displays sign-in barrier dialog.

- [x] **2.7 Auto-Refresh Expired Token & Navigation Reset**  
  *Verification Steps:* Simulate expired JWT access token or session revocation.  
  *Expected Result:* Resets navigation cleanly to `AccountSelect` screen, avoiding trapping the user in guest mode or inside MainTabs.  
  > ✎ **Test Notes / Comment:** PASS: Expired authentication token cleanly resets navigation stack to AccountSelect screen.

---

## 3. Profile & Settings Consolidation (7 / 7) ✅

- [x] **3.1 Profile Credentials Update**  
  *Verification Steps:* Profile tab → Edit Profile → change Name, Phone, Blood Group, Medical Notes.  
  *Expected Result:* Changes persist in database and reflect immediately on profile card.  
  > ✎ **Test Notes / Comment:** PASS: Name, phone, blood group, and medical notes update and persist successfully.

- [x] **3.2 Change Password Exclusively in Settings & Guest Lock**  
  *Verification Steps:*  
  1. Open Profile tab → verify NO password change card exists.  
  2. Open Settings tab as Guest → verify "Change Account Password" shows `🔒 Locked (Guest)` and alerts user to sign in if tapped.  
  > ✎ **Test Notes / Comment:** PASS: Password change isolated in Settings; shows locked state with sign-in prompt for guest users.

- [x] **3.3 Microphone Evidence Setting Exclusively in Settings (Removed from Profile)**
  *Verification Steps:*  
  1. Open Profile tab → verify NO microphone card exists.  
  2. Open Settings tab → verify "🎙️ Microphone Evidence Permission" card is present with live status (`✓ Allowed` or `Enable ›`).  
  > ✎ **Test Notes / Comment:** PASS: Microphone permission status and deep-link to system settings isolated cleanly in Settings tab.

- [x] **3.4 Dark / Light / Auto System Theme Toggle**  
  *Verification Steps:* In Settings, toggle between Dark, Light, and System themes.  
  *Expected Result:* Theme applies instantly across all screens, cards, modals, and map styles without app restart.  
  > ✎ **Test Notes / Comment:** PASS: Dark, Light, and System themes toggle instantly across all views and navigation bars.

- [x] **3.5 Emergency Contacts Management in Profile & Guest Guard**  
  *Verification Steps:* In Profile tab as Guest, attempt to tap "Add Trusted Contact" or edit contacts.  
  *Expected Result:* Action blocked with alert: "Citizen Account Required: Please sign in or register to add and sync trusted emergency contacts."  
  > ✎ **Test Notes / Comment:** PASS: Adding and editing trusted emergency contacts restricted to registered citizen accounts.

- [x] **3.6 Clear Map & Route Cache Button in Settings**  
  *Verification Steps:* Settings → Tap "Clear Local Map & Route Cache".  
  *Expected Result:* Clears cached OSRM route lines and tiles; shows confirmation toast.  
  > ✎ **Test Notes / Comment:** PASS: Clear cache button wipes cached OSRM polylines and map tiles with toast confirmation.

- [x] **3.7 Notification Preferences Toggles**  
  *Verification Steps:* Toggle Hazard Alert notifications and Escort updates.  
  *Expected Result:* Preference saved to AsyncStorage; respected by background push handler.  
  > ✎ **Test Notes / Comment:** PASS: Hazard alert and escort status notification toggles persist to local storage.

---

## 4. Home Radar, Safety Score & Quick Tools (10 / 10) ✅

- [x] **4.1 Dynamic Circular Safety Score Dial**  
  *Verification Steps:* Open Home screen with active GPS.  
  *Expected Result:* Animated circular gauge displays safety score (0–100) with color gradient (Green > Amber > Red).  
  > ✎ **Test Notes / Comment:** PASS: Circular safety dial dynamically renders color-coded score from 0 to 100 based on local telemetry.

- [x] **4.2 Offline Safety Score Handling (No Invented Score)**  
  *Verification Steps:* Enable Airplane mode → launch app → view Home score dial.  
  *Expected Result:* Displays "Offline / Tap to Retry" card; NEVER renders an invented or fake safety number.  
  > ✎ **Test Notes / Comment:** PASS: Offline state renders "Offline / Tap to Retry" card without displaying synthetic or inaccurate numbers.

- [x] **4.3 Online Retry Recovers Dynamic Score**  
  *Verification Steps:* Turn connectivity back on → tap Retry button on safety card.  
  *Expected Result:* Score refreshes with real calculation based on active nearby hazards.  
  > ✎ **Test Notes / Comment:** PASS: Real score loads and drops when near active hazards.

- [x] **4.4 Safety Score Decay Calibration (Older Hazards Weight Less)**  
  *Verification Steps:* Verify score calculation near a 14-day old unresolved hazard.  
  *Expected Result:* Hazard decay algorithm applies 7-day half-life (min 0.25 floor); score does not permanently crash.  
  > ✎ **Test Notes / Comment:** PASS: 7-day half-life decay prevents stale hazards from permanently suppressing local safety scores.

- [x] **4.5 Emergency Helpline One-Tap Buttons (112, 108, 1090)**  
  *Verification Steps:* Tap "112 National Emergency" or "1090 Women Helpline" cards on Home.  
  *Expected Result:* Opens device phone dialer with emergency number prefilled.  
  > ✎ **Test Notes / Comment:** PASS: One-tap emergency cards immediately launch system dialer prefilled with 112, 108, or 1090.

- [x] **4.6 SOS Panic Button Visual Hierarchy & Zero-Contact Protocol in Terms** 
  *Verification Steps:* Inspect SOS button styling on Home screen and Terms screen.  
  *Expected Result:* Large, high-contrast red pulsing button prominently accessible. Terms screen clearly specifies the Emergency SOS & Guardian Protocol (if 0 contacts configured, SOS routes directly to National Emergency 112 & Central Web Dispatch).  
  > ✎ **Test Notes / Comment:** PASS: Large pulsing SOS button prominently placed; Terms screen details zero-contact routing protocol.

- [x] **4.7 Quick Action Shortcuts (Safe Walk, Report Hazard, Fake Call)**  
  *Verification Steps:* Tap each action chip beneath the safety dial.  
  *Expected Result:* Directly opens corresponding screen or modal without navigation delay.  
  > ✎ **Test Notes / Comment:** PASS: Quick action chips trigger Safe Walk, Report Hazard, and Fake Call tools without delay.

- [x] **4.8 Active Escort Banner Appearance on Home (Guardian Mode)**  
  *Verification Steps:* Walker starts walk on Device A → observe Device B Home screen.  
  *Expected Result:* Pulsing indigo banner appears: "🚶 Live Escort in Progress" with walker name and "Watch Live" button.  
  > ✎ **Test Notes / Comment:** PASS: Active escort banner pulses on guardian Home screen when ward initiates walk.

- [x] **4.9 Auto-Fetch Escort Session Without Manual Pull-to-Refresh** 
  *Verification Steps:* Device B stays idle on Home screen → Device A starts walk.  
  *Expected Result:* Within 8 seconds, Device B automatically discovers the walk and triggers alert modal without manual refresh.  
  > ✎ **Test Notes / Comment:** PASS: 8-second background polling automatically discovers active escort sessions without manual pull-to-refresh.

- [x] **4.10 Device B Audio/Haptic Alert on Walk Start** 
  *Verification Steps:* Device A starts safe walk while Device B is on Home screen.  
  *Expected Result:* Device B vibrates immediately with haptic burst `[0, 400, 200, 400]` and presents incoming walk alert modal whether detected via WebSocket event OR active polling.
  > ✎ **Test Notes / Comment:** PASS: Device B vibrates with tactile burst and presents incoming walk modal upon session start.

---

## 5. Hazard Reporting, Camera & Geocoding (10 / 10) ✅

- [x] **5.1 Interactive Mini-Map Pin Drop & Reverse Geocoding**  
  *Verification Steps:* Open "Report Hazard" modal → tap anywhere on the embedded mini-map or tap "📍 Reset to Live GPS".  
  *Expected Result:* Embedded interactive map allows dropping pin by tapping directly on the map; address automatically reverse-geocodes in real-time. Manual text coordinate inputs replaced.  
  > ✎ **Test Notes / Comment:** PASS: Embedded interactive mini-map supports pin-dropping with real-time reverse-geocoded address resolution.

- [x] **5.2 Camera Capture with Instant Local Preview** 
  *Verification Steps:* In Report Hazard modal, tap "📷 Take Photo" → grant camera permission → snap picture.  
  *Expected Result:* Camera opens smoothly; captured image immediately displays as a thumbnail preview in modal.  
  > ✎ **Test Notes / Comment:** PASS: Camera capture previews thumbnail immediately with deferred Cloudinary upload.

- [x] **5.3 Multiple Photo Upload (Up to 3 Photos)** 
  *Verification Steps:* Tap "📷 Take Photo" or "🖼️ Choose from Gallery" multiple times in Report Hazard modal.  
  *Expected Result:* Allows uploading up to 3 photo proofs; renders photo grid with remove buttons for each image.  
  > ✎ **Test Notes / Comment:** PASS: Photo grid supports up to 3 evidence attachments with individual deletion.

- [x] **5.4 Hazard Category Selection & Custom 'Other' Type Input** 
  *Verification Steps:* Select category "⚠️ Other Hazard" in Report Hazard modal.  
  *Expected Result:* Category chip highlights, and an optional "Specify Hazard Name / Type" text input smoothly appears.  
  > ✎ **Test Notes / Comment:** PASS: Selecting "Other Hazard" displays optional custom hazard specification text input.

- [x] **5.5 Severity Rating Slider / Chips (Level 1 to 5)**  
  *Verification Steps:* Select severity 1 (Low) through 5 (Critical Emergency).  
  *Expected Result:* Severity level updates; rating description adjusts dynamically.  
  > ✎ **Test Notes / Comment:** PASS: Severity chips 1 through 5 adjust risk weight and visual color indicator.

- [x] **5.6 Anonymous Reporting Toggle on Form** 
  *Verification Steps:* In Report Hazard modal, scroll to bottom before "Submit Report" button.  
  *Expected Result:* Prominent "🕵️ Report Anonymously" toggle card is present with helper text explaining identity masking.  
  > ✎ **Test Notes / Comment:** PASS: Anonymous reporting toggle successfully masks reporter identity on public and community feeds.

- [x] **5.7 Duplicate Submission Prevention (Double-Tap Guard)**  
  *Verification Steps:* Rapidly double-tap the "Submit Hazard" button.  
  *Expected Result:* Button disables immediately on first tap; only ONE hazard report is created in database.  
  > ✎ **Test Notes / Comment:** PASS: Rapid tapping disabled during submission, preventing duplicate database records.

- [x] **5.8 Community Hazard Confirmation (Upvote Count)** 
  *Verification Steps:* User B views User A's hazard on map → taps "Confirm Hazard". Inspect Web Admin Hazards table.  
  *Expected Result:* Confirmation count increments; Web Admin allows staff to click "Audit Community Confirmations" to view reporter details, confirmation count, coordinates, and resolution audit trail.  
  > ✎ **Test Notes / Comment:** PASS: Upvoting increments confirmation count; Web Admin audit modal reveals verification trail.

- [x] **5.9 Self-Confirmation Block**  
  *Verification Steps:* User A taps "Confirm" on their own hazard report.  
  *Expected Result:* Action blocked with toast: "You cannot confirm your own report".  
  > ✎ **Test Notes / Comment:** PASS: Self-confirmation blocked with toast warning.

- [x] **5.10 Offline Hazard Queuing & Auto-Sync**  
  *Verification Steps:* Disconnect internet → submit hazard report → reconnect internet.  
  *Expected Result:* Report stored in local offline queue and automatically synced to server upon reconnection.  
  > ✎ **Test Notes / Comment:** PASS: Reports submitted while offline save to local AsyncStorage queue and automatically sync to backend when connectivity is restored. 

---

## 6. Community Map, Heatmaps & Moderation (9 / 9) ✅

- [x] **6.1 OpenStreetMap Vector Rendering & Compact Layer Selector** 
  *Verification Steps:* Open Community Map tab → tap map layer button (layers icon) in top right.  
  *Expected Result:* Layer selector renders as a vertical dropdown menu that stays strictly within screen bounds with a header and close button.  
  > ✎ **Test Notes / Comment:** PASS: Map layer selector renders as a vertical dropdown contained entirely within viewport bounds.

- [x] **6.2 Dark Mode Map Theme Switching**  
  *Verification Steps:* Switch app theme to Dark mode → view map.  
  *Expected Result:* Map tiles switch to dark inverted scheme (CartoDB Dark Matter / Stadia Dark).  
  > ✎ **Test Notes / Comment:** PASS: Dark Matrix tile filter engages seamlessly when dark mode is activated.

- [x] **6.3 Category Filter Chips on Map**  
  *Verification Steps:* Open Map screen → observe horizontal filter bar below search input → tap category chips (e.g. "💡 Lighting", "🚧 Roads", "🌊 Waterlogging", "🚷 Isolated", "🚗 Traffic").  
  *Expected Result:* Map pins instantly filter in real-time to only show hazards matching the active category; tapping "All" restores all hazards.  
  > ✎ **Test Notes / Comment:** PASS: Category chips dynamically filter hazard pins on the map in real-time.

- [x] **6.4 Hazard Pin Clustering & High-Risk Heatmap Circles**  
  *Verification Steps:* Create 3–4 hazards within a 300m radius.  
  *Expected Result:* Map clusters nearby pins and renders semi-transparent amber/red danger density circles.  
  > ✎ **Test Notes / Comment:** PASS: Nearby hazard pins cluster into risk circles with severity-weighted color halos.

- [x] **6.5 Tap Hazard Pin: Detail Bottom Sheet**  
  *Verification Steps:* Tap any hazard marker on the map.  
  *Expected Result:* Smoothly slides up detail sheet showing category, severity, address, photo, time, and confirmation count.  
  > ✎ **Test Notes / Comment:** PASS: Tapping map pin opens bottom sheet displaying category, severity, address, confirmation count, and report age.

- [x] **6.6 Center on My Location Button**  
  *Verification Steps:* Pan map away from current position → tap GPS crosshair button.  
  *Expected Result:* Map smoothly animates and centers back on user's live blue dot.  
  > ✎ **Test Notes / Comment:** PASS: Floating GPS crosshair button smoothly recenters camera on user current coordinates and updates live accuracy circle.

- [x] **6.7 Map Search Bar: Local Proximity Ranking & Scrollable Suggestions** 
  *Verification Steps:* In Map screen search bar, type a local query → observe suggestion dropdown.  
  *Expected Result:* Dropdown results are sorted by distance from user's current GPS location with distance badge (`450m`, `1.2 km`), and the list is smoothly scrollable within a contained height.  
  > ✎ **Test Notes / Comment:** PASS: Location search prioritizes nearby places with distance badges in a scrollable dropdown.

- [x] **6.8 Mark as Resolved / False Report Community Flagging**  
  *Verification Steps:* Tap "Flag / Report Issue" on a hazard card.  
  *Expected Result:* Allows citizens to flag duplicate or non-existent hazards for admin moderation.  
  > ✎ **Test Notes / Comment:** PASS: Resolved status and false report flags submit and update status.

- [x] **6.9 Full City-Wide Hazard Pin Visibility (No 10-15k Range Cutoff)**   
  *Verification Steps:* Open Safety Radar (Map Tab) → zoom out across the entire city or region.  
  *Expected Result:* Displays ALL active hazard pins created in the database across any distance (10km, 25km, 50km+), with zero artificial radius truncation.  
  > ✎ **Test Notes / Comment:** PASS: All active city-wide reports render without artificial 10-15km distance cutoff.

---

## 7. Safe Walk — Walker Experience (Device A) (9 / 9) ✅

- [x] **7.1 Cold GPS Acquisition on Launch (No App Restart Needed)** 
  *Verification Steps:* Fresh launch app outdoors with cold GPS cache (or fresh install) → tap Safe Walk.  
  *Expected Result:* Checks Android system cached location (`maximumAge: 1 hr`) and resolves coarse IP geolocation immediately on fresh install so default Dehradun coordinates are NEVER flashed, then locks onto high-accuracy GPS satellites.  
  > ✎ **Test Notes / Comment:** PASS: Android system-cached GPS and coarse IP fallback eliminate cold-start coordinate flashing.

- [x] **7.2 Destination Search Autocomplete (Proximity Weighted & Scrollable)** 
  *Verification Steps:* In Safe Walk screen, type destination in search bar.  
  *Expected Result:* Autocomplete suggestions heavily prioritize local walking destinations (< 5–15km) relative to walker's current GPS position, showing pedestrian distance badges (`🚶 450m walk`, `🚶 1.8 km walk`), and the list is smoothly scrollable.  
  > ✎ **Test Notes / Comment:** PASS: Destination search ranks pedestrian routes with walking distance badges in scrollable list.

- [x] **7.3 Pre-Walk Guardian Selection Modal**  
  *Verification Steps:* Tap "Select Guardians & Start Walk".  
  *Expected Result:* Modal opens displaying accepted guardians with checkboxes; allows selecting who receives live tracking.  
  > ✎ **Test Notes / Comment:** PASS: Pre-walk modal displays available emergency contacts for guardian escort selection.

- [x] **7.4 Prominent "🛑 Cancel Walk" Button on Active Walk Screen**  
  *Verification Steps:* Start Safe Walk → inspect active journey bottom sheet.  
  *Expected Result:* Red "Cancel Walk" button clearly accessible; tapping asks for confirmation then ends session.  
  > ✎ **Test Notes / Comment:** PASS: Cancel walk button terminates session, cleans up socket rooms, and resets UI.

- [x] **7.5 Persistent Foreground Service Notification**  
  *Verification Steps:* Start walk → pull down Android notification shade.  
  *Expected Result:* Ongoing notification shows walker status, remaining distance, ETA, and direct action buttons (SOS & Exit).  
  > ✎ **Test Notes / Comment:** PASS: Foreground notification displays real route distance, walking ETA, and quick actions.

- [x] **7.6 Smooth Pin Movement Without Map Jerks or Reloads**  
  *Verification Steps:* Walk 50–100 meters along route while observing map.  
  *Expected Result:* Walker marker glides smoothly between coordinates; map does NOT blink, flash, or recalculate route.  
  > ✎ **Test Notes / Comment:** PASS: Walker pin glides smoothly without map reloads or visual flashing.

- [x] **7.7 State Persistence Across Tab Navigation & App Minimization**  
  *Verification Steps:* Start walk → switch to Profile tab → switch to Map tab → minimize app → resume.  
  *Expected Result:* Active walk state, timer, remaining distance, and corridor remain intact without resetting.  
  > ✎ **Test Notes / Comment:** PASS: Journey state persists across tab switches, minimization, and device orientation changes.

- [x] **7.8 "✅ I Reached Safely" Arrival Completion Dialog**  
  *Verification Steps:* Walk to destination (or tap "I Reached Safely").  
  *Expected Result:* Journey status sets to `completed`; shows arrival celebratory dialog with options to share arrival via WhatsApp/SMS.  
  > ✎ **Test Notes / Comment:** PASS: Arrival celebration dialog triggers at destination with WhatsApp and SMS share options.

- [x] **7.9 Auto-Stop Foreground Service on Journey End**  
  *Verification Steps:* End walk via arrival or cancel.  
  *Expected Result:* Android foreground notification dismisses immediately; background GPS tracking stops cleanly.  
  > ✎ **Test Notes / Comment:** PASS: SafeWalk foreground service unregisters location listeners and stops notification on completion.

---

## 8. Safe Walk — Guardian Live Escort (Device B) (9 / 9) ✅

- [x] **8.1 Device A Invites Device B as Trusted Contact**  
  *Verification Steps:* Device A adds Device B's phone/email in Profile → Send Invite.  
  *Expected Result:* Handshake invitation stored in database with `pending` status.  
  > ✎ **Test Notes / Comment:** PASS: Trusted contact invite sends push/notification and registers pending handshake.

- [x] **8.2 Device B Accepts Handshake in "People I Escort"**  
  *Verification Steps:* Device B opens Notifications / People I Escort → taps Accept.  
  *Expected Result:* Contact status updates to `accepted`; `guardian_user_id` linked in database.  
  > ✎ **Test Notes / Comment:** PASS: Accepting invitation establishes guardian-ward link in database.

- [x] **8.3 Auto-Detection of New Walk on Device B Home Screen**  
  *Verification Steps:* Keep Device B on Home screen → start walk on Device A.  
  *Expected Result:* Device B automatically vibrates, prompts incoming walk dialog, and displays active escort banner without manual refresh.  
  > ✎ **Test Notes / Comment:** PASS: Device B automatically detects new walk within 8s and presents incoming session prompt.

- [x] **8.4 Active Escort Banner Opens Guardian Live Map**  
  *Verification Steps:* Tap "Watch Live" on Device B's escort banner.  
  *Expected Result:* Navigates directly to `GuardianLiveScreen` showing Device A's live position.  
  > ✎ **Test Notes / Comment:** PASS: Tapping Watch Live launches guardian tracking map with real-time telemetry.

- [x] **8.5 Planned Route Polyline + Start/Dest Markers on Guardian Map**  
  *Verification Steps:* Inspect map on Device B during live escort.  
  *Expected Result:* Renders Device A's planned road path polyline, green start marker (🟢), red checkered destination marker (🏁), and moving walker pin.  
  > ✎ **Test Notes / Comment:** PASS: Guardian map renders road polyline, start marker, destination flag, and live walker pin.

- [x] **8.6 Sub-3-Second Live Movement Tracking Cadence**  
  *Verification Steps:* Move Device A 20 meters → observe Device B screen.  
  *Expected Result:* Device B updates walker marker position within 2–3 seconds via WebSocket.  
  > ✎ **Test Notes / Comment:** PASS: Walker position updates stream over WebSocket with sub-3-second latency.

- [x] **8.7 Device B Alert when Walk Cancelled by Device A** 
  *Verification Steps:* Device A taps "🛑 Cancel Walk".  
  *Expected Result:* Device B displays alert: *"🛑 Safe Walk Cancelled: Walker has cancelled their Safe Walk session"* and prompts to exit live view.  
  > ✎ **Test Notes / Comment:** PASS: Cancellation alert appears on guardian device when walker cancels journey.

- [x] **8.8 Device B Alert when Walker Reaches Safely**  
  *Verification Steps:* Device A taps "✅ I Reached Safely".  
  *Expected Result:* Device B displays alert: *"🎉 Safe Arrival: Walker has reached their destination safely!"* and clears active banner.  
  > ✎ **Test Notes / Comment:** PASS: Safe arrival modal appears on guardian device when walker reaches destination.

- [x] **8.9 Guardian Quick Action Call Walker / Emergency Dispatch**  
  *Verification Steps:* Tap "Call Walker" or "Call 112" on Guardian Live screen.  
  *Expected Result:* Opens phone dialer directly to walker's phone number or emergency dispatcher.  
  > ✎ **Test Notes / Comment:** PASS: Quick action buttons initiate phone call to walker or direct emergency dispatch.

---

## 9. Deviation Escalation & Watchdog System (0 / 6) ⏳

- [ ] **9.1 Off-Corridor Deviation Detection (50m+ Threshold)**  
  *Verification Steps:* Device A walks 50+ meters away from the planned route polyline.  
  *Expected Result:* Walker map path turns red; bottom sheet flags "Route Deviation Detected".  
  > ✎ **Test Notes / Comment:** 

- [ ] **9.2 60-Second "Are You OK?" Countdown Dialog**  
  *Verification Steps:* Trigger deviation on Device A.  
  *Expected Result:* 60-second animated timer appears with haptic pulses: "Route Deviation: Are you safe?".  
  > ✎ **Test Notes / Comment:** 

- [ ] **9.3 Tap "I AM SAFE" Aborts Escalation**  
  *Verification Steps:* Tap "I AM SAFE" within the 60-second window.  
  *Expected Result:* Deviation alert cancels; walk continues without triggering emergency alarms.  
  > ✎ **Test Notes / Comment:** 

- [ ] **9.4 Expired 60s Countdown Auto-Escalates to SOS**  
  *Verification Steps:* Let 60-second deviation timer expire without touching phone.  
  *Expected Result:* Automatically triggers emergency SOS; dispatches high-priority alert to all guardians.  
  > ✎ **Test Notes / Comment:** 

- [ ] **9.5 Dead Phone / App Kill Watchdog (Server Cron Pinger)** *(Key)*  
  *Verification Steps:* Start walk → deviate off route → immediately kill the app or power down phone.  
  *Expected Result:* Server tick `/api/internal/tick` detects silent, unacknowledged deviation and auto-escalates to SOS within 60–90 seconds.  
  > ✎ **Test Notes / Comment:** 

- [ ] **9.6 Guardian & Admin Tagging of Watchdog Incidents**  
  *Verification Steps:* Check SOS incident created by watchdog on Guardian phone and Admin portal.  
  *Expected Result:* Incident clearly tagged: `[WATCHDOG AUTO-ESCALATION: UNACKNOWLEDGED DEVIATION]`.  
  > ✎ **Test Notes / Comment:** 

---

## 10. SOS Emergency Dispatch & Ambient Audio (10 / 10) ✅

- [x] **10.1 SOS 5-Second Countdown Abort Window**  
  *Verification Steps:* Tap SOS button on Home screen.  
  *Expected Result:* Full-screen red countdown begins from 5 with pulsing vibrations and a large "TAP TO CANCEL" button.  
  > ✎ **Test Notes / Comment:** PASS: SOS triggers 5-second abort countdown with continuous haptic pulse.

- [x] **10.2 Abort SOS Within 5 Seconds**  
  *Verification Steps:* Tap "TAP TO CANCEL" before countdown hits zero.  
  *Expected Result:* Countdown aborts safely; no distress signals, SMS, or audio evidence dispatched.  
  > ✎ **Test Notes / Comment:** PASS: Tapping Cancel aborts distress signal before countdown expires.

- [x] **10.3 SOS Dispatched: High-Priority Push to Guardians**  
  *Verification Steps:* Let SOS countdown reach zero.  
  *Expected Result:* Guardian devices receive emergency alert with high-priority vibration and direct link to live GPS pin.  
  > ✎ **Test Notes / Comment:** PASS: Dispatched SOS broadcasts high-priority alerts to registered guardians.

- [x] **10.4 Continuous 30-Second Stealth Ambient Audio Recording with Background Flush Safeguard**  
  *Verification Steps:* Trigger SOS → minimize app or power off device within 10–15 seconds → check incident on Web Admin.  
  *Expected Result:* Audio records continuously for a full 30 seconds (no premature 4s cutoffs); if interrupted by power off or app switch, partial evidence is immediately flushed and preserved in Cloudinary and the database.  
  > ✎ **Test Notes / Comment:** PASS: Continuous 30s audio records stealthily in background with auto-flush on interrupt.

- [x] **10.5 Audio Evidence Upload & Cloudinary Attachment**  
  *Verification Steps:* Let 30s audio recording finish while online.  
  *Expected Result:* Audio uploads to Cloudinary; secure audio URL attaches to the incident in database.  
  > ✎ **Test Notes / Comment:** PASS: Master WAV audio evidence uploads to Cloudinary and links to alert record.

- [x] **10.6 Offline SOS Fallback: Native SMS & Dialer**  
  *Verification Steps:* Put phone in Airplane mode → Trigger SOS.  
  *Expected Result:* Automatically opens native SMS app with emergency distress message and exact GPS coordinates prefilled to all trusted contacts.  
  > ✎ **Test Notes / Comment:** PASS: Offline SOS opens prefilled native SMS and emergency dialer fallback.

- [x] **10.7 Active SOS Incident Banner on Web Admin**  
  *Verification Steps:* Trigger SOS on mobile → check Web Admin Dashboard.  
  *Expected Result:* Flashing red high-priority incident banner appears on the Operations dashboard.  
  > ✎ **Test Notes / Comment:** PASS: Emergency banner and high-priority siren activate on Web Admin CAD console.

- [x] **10.8 Dual-Pipe 5s Progressive Live Audio Streaming (Pipe 1)**  
  *Verification Steps:* Trigger SOS on mobile → keep Web Admin portal open (`SosAlertsPage.tsx`).  
  *Expected Result:* Web Admin receives `sos:live_audio_chunk` every ~5 seconds. An ordered Web Audio API queue plays each chunk sequentially with zero gaps. Real-time badge displays `LIVE STREAMING CHUNK #N/6`.  
  > ✎ **Test Notes / Comment:** PASS: Progressive 5-second audio chunks stream live to CAD console and guardian modal.

- [x] **10.9 Continuous Local Master WAV Recording (Pipe 2)**  
  *Verification Steps:* Allow SOS 30s session to complete without interruption.  
  *Expected Result:* Native `SafeWalkService.kt` captures unbroken 16kHz 16-bit mono PCM to disk (`sos_${alertId}_master.wav`). Upon 30s completion, it writes a 44-byte WAV header and uploads directly to Cloudinary via `AudioRecorderService.uploadAndAttachMaster()`.  
  > ✎ **Test Notes / Comment:** PASS: Full 30-second local master recording preserved cleanly without audio clipping.

- [x] **10.10 Fail-Safe Server Watchdog Concatenator (Broken Phone Simulation)**  
  *Verification Steps:* Trigger SOS on mobile → force-kill the app or disconnect Wi-Fi at second 12 (after Chunks 1 & 2 have been sent).  
  *Expected Result:* Backend `AudioStitcherService` watchdog timer fires after 8 seconds of silence. It concatenates the 2 received chunks with a valid 44-byte WAV header, uploads `interrupted_stitched.wav` to Cloudinary, updates `sos_alerts.audio_url`, and broadcasts `broadcastSosAudio`.  
  
  > ✎ **Test Notes / Comment:** PASS: Server watchdog concatenates partial chunks into valid WAV if device drops offline.

---

## 11. Decoy Suite & Tactical Safety Tools (5 / 5) ✅

- [x] **11.1 High-Decibel Audible Panic Siren**  
  *Verification Steps:* Tap "Siren" tool on Home or drawer.  
  *Expected Result:* Emits loud, disorienting emergency siren at maximum volume; toggles off cleanly.  
  > ✎ **Test Notes / Comment:** PASS: High-decibel audible panic siren sounds through device loudspeaker.

- [x] **11.2 Calculator Decoy Mode**  
  *Verification Steps:* Tap "Calculator Decoy" in tools.  
  *Expected Result:* App disguises itself as a fully functional standard arithmetic calculator; top exit button has ample status bar clearance (`StatusBar.currentHeight + 14`) and large touch target.  
  > ✎ **Test Notes / Comment:** PASS: Calculator decoy presents working arithmetic calculator with generous status bar clearance.

- [x] **11.3 Secret PIN Calculator Unlock & Distress Code**  
  *Verification Steps:*  
  1. Type secret PIN followed by `=` → returns to normal Safora interface.  
  2. Type distress PIN followed by `=` → secretly dispatches SOS while remaining disguised as calculator.  
  > ✎ **Test Notes / Comment:** PASS: Secret PIN code silently unlocks app or dispatches stealth emergency SOS.

- [x] **11.4 Fake Incoming Escape Call (Instant & Scheduled)**  
  *Verification Steps:* Set fake call timer for 15 seconds → lock phone or stay on screen.  
  *Expected Result:* Phone rings with realistic full-screen incoming call UI (Caller: "Mom" or custom name) with answer/decline actions.  
  > ✎ **Test Notes / Comment:** PASS: Scheduled fake call fires on timer, ringing and displaying incoming call screen.

- [x] **11.5 Fake Call Audio Talking Voice (Android Native TextToSpeech Engine: English / Hindi)**  
  *Verification Steps:* Tap "Answer" on the fake incoming call.  
  *Expected Result:* Natural human talking voice speaks realistic conversational phrases ("Hello? Can you hear me? Where are you right now?", etc.) through the phone earpiece (`STREAM_VOICE_CALL`) or speakerphone with natural 3.5s conversational pauses.  
  > ✎ **Test Notes / Comment:** PASS: Native TextToSpeech engine speaks realistic dialogue in English/Hindi through earpiece or speaker.

---

## 12. Web Admin: Portal Auth & Operations (`LoginPage` & `DashboardPage`) (6 / 6) ✅

- [x] **12.1 Staff Login with Admin / Moderator Role**  
  *Verification Steps:* Open Web Admin (`http://localhost:3000` or deployed URL) → log in with staff credentials.  
  *Expected Result:* Authenticates successfully; stores staff JWT token; redirects to Dashboard.  
  > ✎ **Test Notes / Comment:** PASS: Admin and moderator credentials authenticate successfully with JWT.

- [x] **12.2 Role-Based Access Control (Citizen Login Blocked)** 
  *Verification Steps:* Attempt logging into Web Admin using a regular citizen user account.  
  *Expected Result:* Login rejected with HTTP 403 Forbidden: "Access denied: Staff privileges required".  
  > ✎ **Test Notes / Comment:** PASS: Citizen user accounts blocked from Web Admin with 403 Forbidden.

- [x] **12.3 7-Day Session Expiration & Auto-Redirect**  
  *Verification Steps:* Inspect staff JWT expiration payload.  
  *Expected Result:* JWT configured for 7-day lifetime; expired sessions cleanly redirect to `/login` without console errors.  
  > ✎ **Test Notes / Comment:** PASS: 7-day token expiration cleanly redirects unauthenticated sessions to /login.

- [x] **12.4 Real-Time Metric Counters on Operations Dashboard**  
  *Verification Steps:* View top summary cards on `DashboardPage.tsx`.  
  *Expected Result:* Accurately displays Active Walks, Active Hazards, Open SOS Incidents, and Registered Users.  
  > ✎ **Test Notes / Comment:** PASS: Operations dashboard displays real-time counters for active walks, hazards, and alerts.

- [x] **12.5 Live System Health Widget (DB Latency & Uptime)**  
  *Verification Steps:* Inspect health indicators on Dashboard.  
  *Expected Result:* Green status badges for API Server, Neon PostGIS DB, and Server Time.  
  > ✎ **Test Notes / Comment:** PASS: Live health indicators display active green status badges for API Server, Neon DB latency, and server clock.

- [x] **12.6 Quick Dispatch Shortcuts to Radar, Hazards & Diagnostics**  
  *Verification Steps:* Click action buttons in Dashboard quick actions panel.  
  *Expected Result:* Navigates directly to target operations views with matching filters pre-applied.  
  > ✎ **Test Notes / Comment:** PASS: Header navigation shortcuts instantly route to Live Radar, Hazard Management, and Diagnostics without page reload.

---

## 13. Web Admin: Live Radar & Moderation (`SafeWalksPage` & `HazardsPage`) (12 / 12) ✅

- [x] **13.1 Live Operations Radar: Real-Time Active Walks Map**  
  *Verification Steps:* Open `SafeWalksPage.tsx` with walkers active on mobile.  
  *Expected Result:* Live map renders active walker pins moving in real time with direction vectors.  
  > ✎ **Test Notes / Comment:** PASS: Live operations radar renders active walker markers with real-time movement updates.

- [x] **13.2 Visual Alert on Route Deviation** 
  *Verification Steps:* Walker deviates off corridor on mobile.  
  *Expected Result:* On Admin radar, marker immediately pulses red with alert badge: "DEVIATED (60s countdown)".  
  > ✎ **Test Notes / Comment:** PASS: Route deviation triggers pulsing red marker and 60-second countdown badge on Admin radar.

- [x] **13.3 Search Walking Journeys by Walker Name, Phone, Email, or Destination** 
  *Verification Steps:* Type walker name, phone, or destination in the search box on Safe Walks Radar.  
  *Expected Result:* Journey grid filters instantly in real time with count updates.  
  > ✎ **Test Notes / Comment:** PASS: Search input filters active and archived journeys instantly by name, phone, or destination.

- [x] **13.4 Journey Status Filter Pills (All / Active / Deviated / Completed / Cancelled)**
  *Verification Steps:* Click filter tabs (All, Active, Deviated, Completed, Cancelled) on Safe Walks page.  
  *Expected Result:* Accurately filters journeys by status; displays real counts on KPI StatCards and tabs.  
  > ✎ **Test Notes / Comment:** PASS: Filter tabs accurately segregate All, Active, Deviated, Completed, and Cancelled walks.

- [x] **13.5 Corridor Telemetry Modal & External Map Dispatch**  
  *Verification Steps:* Click "View Corridor & Details" on any journey card.  
  *Expected Result:* Modal displays walker profile, contact phone with dialer link, origin/destination checkpoints, last live GPS coordinates, elapsed duration, and external Google Maps/OpenStreetMap links.  
  > ✎ **Test Notes / Comment:** PASS: Telemetry modal displays walker contact info, GPS checkpoints, and Google Maps links.

- [x] **13.6 Staff Journey Status Intervention (Change Walk Status)**  
  *Verification Steps:* On journey card or inside detail modal, select "Change Status" dropdown (Active, Deviated, Completed, Cancelled) or tap intervention buttons.  
  *Expected Result:* Dispatches `PATCH /api/journeys/:id/status`; immediately updates status badge, ended time, and moves walk to corresponding filter tab with toast confirmation.  
  > ✎ **Test Notes / Comment:** PASS: Dispatchers can intervene and update journey status via dropdown with real-time persistence.

- [x] **13.7 Community Hazard Moderation Table**  
  *Verification Steps:* Open `HazardsPage.tsx`.  
  *Expected Result:* Displays all community reports with category, severity, address, report date, and author identity.  
  > ✎ **Test Notes / Comment:** PASS: Community hazard moderation table lists reports with category, severity, and photo thumbnails.

- [x] **13.8 Staff View of Reporter Identity**  
  *Verification Steps:* Inspect reporter column on Hazards table.  
  *Expected Result:* Staff can view reporter's full registered name, email, and phone number for audit verification.  
  > ✎ **Test Notes / Comment:** PASS: Staff accounts can view reporter contact details (name, email, phone) on hazard rows for verification and auditing.

- [x] **13.9 Hazard Moderation Actions (Resolved / Duplicate / Fake Report)**  
  *Verification Steps:* Click action dropdown on a hazard row → select "Mark Resolved" or "Mark as Fake".  
  *Expected Result:* Status updates in database; resolved/fake pins immediately update or hide on citizen mobile app.  
  > ✎ **Test Notes / Comment:** PASS: Hazard moderation status updates (Resolved/Fake) persist to backend and reflect immediately across web and mobile maps.

- [x] **13.10 High-Resolution Photo Zoom Modal**  
  *Verification Steps:* Click hazard thumbnail photo in table.  
  *Expected Result:* Modal opens high-resolution Cloudinary image evidence with zoom and rotate controls.  
  > ✎ **Test Notes / Comment:** PASS: Thumbnail click opens high-resolution Cloudinary photo in zoom/rotate modal.

- [x] **13.11 Manual Admin Hazard Pin Dispatch ("+ Add Hazard Pin")**  
  *Verification Steps:* Click "+ Add Hazard Pin" in Hazards Page header → fill title, category, severity, coordinates → Save Hazard Pin.  
  *Expected Result:* Modal opens, validates inputs, allows setting coordinates via presets or typing, and dispatches to backend; newly added pin appears immediately in table and on citizen mobile map.  
  > ✎ **Test Notes / Comment:** PASS: Staff can dispatch new hazard pins directly to the map via "+ Add Hazard Pin" modal.

- [x] **13.12 Server-Side Pagination & Domain Modularization (`HazardsPage.tsx`)**  
  *Verification Steps:* View Hazards page table with >20 items → change page size / jump pages / filter by category or status.  
  *Expected Result:* Backend executes `countAll` and paginated `findAll`, responding with full pagination metadata. `<Pagination />` controls reflect current page range smoothly with zero page reload.  
  > ✎ **Test Notes / Comment:** PASS: Server-side pagination loads large report datasets with smooth page navigation.

---

## 14. Web Admin: SOS Incident Queue, Users & Analytics (`SosAlertsPage`, `UsersPage`, `AnalyticsPage`) (8 / 8) ✅

- [x] **14.1 Real-Time SOS Incident Queue**  
  *Verification Steps:* Trigger SOS on mobile → view `SosAlertsPage.tsx`.  
  *Expected Result:* Active incident appears at top of queue with pulsing red beacon, emergency timestamp, and walker profile.  
  > ✎ **Test Notes / Comment:** PASS: SOS incident queue lists distress signals in chronological order with live duration timers.

- [x] **14.2 30-Second Ambient Audio Playback in Admin Queue**  
  *Verification Steps:* Click audio player on an SOS alert card with recorded evidence.  
  *Expected Result:* Audio player streams 30-second ambient recording captured during the incident with playback scrub bar.  
  > ✎ **Test Notes / Comment:** PASS: Embedded audio player streams 30-second Cloudinary ambient recording with scrub bar, duration display, and volume control.

- [x] **14.3 One-Click Coordinates Link to External Google Maps**  
  *Verification Steps:* Click "Open Coordinates in Google Maps" button on SOS card.  
  *Expected Result:* Opens Google Maps in a new tab pinpointing exact incident latitude and longitude.  
  > ✎ **Test Notes / Comment:** PASS: External map button opens Google Maps in a new browser tab with exact incident latitude, longitude, and satellite overlay.

- [x] **14.4 Acknowledge & Resolve SOS Incident with Dispatch Notes**  
  *Verification Steps:* Click "Resolve Incident" → enter dispatcher resolution notes → Confirm.  
  *Expected Result:* Incident marked resolved; timestamp and staff username recorded in audit log.  
  > ✎ **Test Notes / Comment:** PASS: Incident can be acknowledged and resolved with custom dispatcher resolution notes; audit trail updates in real-time.

- [x] **14.5 Citizen User Directory & Search (`UsersPage.tsx`)**  
  *Verification Steps:* Search citizens by name, email, or phone number.  
  *Expected Result:* Displays citizen profile, registration date, blood group, medical notes, and account status.  
  > ✎ **Test Notes / Comment:** PASS: User management table lists registered citizens with responsive search by name, email, phone, and role filters.

- [x] **14.6 Staff Role Elevation & Account Suspension**  
  *Verification Steps:*  
  1. Toggle user role: Citizen ↔ Moderator ↔ Admin.  
  2. Toggle "Suspend Account" on an abusive user.  
  *Expected Result:* Suspended user is instantly prevented from logging in or making API requests.  
  > ✎ **Test Notes / Comment:** PASS: Role change (Citizen/Moderator/Admin) and account suspension take effect immediately; suspended users are locked out.

- [x] **14.7 Danger Density Heatmap & Category Trends (`AnalyticsPage.tsx`)**  
  *Verification Steps:* Open Analytics tab.  
  *Expected Result:* Features interactive Leaflet danger density & spatial clusters map (`LiveCommandMap`), Donut chart displaying hazard category proportions with percentages, hourly night frequency trend, and Top Risk Corridors table with time filters (24h, 7d, 30d, All Time).  
  > ✎ **Test Notes / Comment:** PASS: Analytics page displays interactive hazard density map, category donut chart, and risk corridors table.

- [x] **14.8 Infrastructure & PostGIS Diagnostics (`DiagnosticsPage.tsx`)**  
  *Verification Steps:* Open Diagnostics page → tap "Run Live Diagnostic Test".  
  *Expected Result:* Executes spatial query benchmark, tests Neon connection latency, and verifies cron tick health.  
  > ✎ **Test Notes / Comment:** PASS: Live diagnostic suite runs database, PostGIS spatial queries, and API latency checks.

---

## 15. Cold GPS, Network Drops & Battery Life (0 / 5) ⏳

- [ ] **15.1 Lock Screen Tracking During 20-Minute Active Walk** *(Key)*  
  *Verification Steps:* Start walk on physical device → lock screen → walk for 15–20 minutes.  
  *Expected Result:* Foreground service keeps tracking; lock screen does not pause GPS updates.  
  > ✎ **Test Notes / Comment:** 

- [ ] **15.2 Breadcrumbs Continuity on Screen Unlock**  
  *Verification Steps:* Unlock phone after 15 minutes of walking.  
  *Expected Result:* Route polyline and breadcrumb points show seamless, unbroken path without missing segments.  
  > ✎ **Test Notes / Comment:** 

- [ ] **15.3 Battery Consumption Under 5% for 20-Minute Walk**  
  *Verification Steps:* Measure battery percentage before and after a 20-minute active Safe Walk.  
  *Expected Result:* Total battery drain is less than 5% on modern Android hardware.  
  > ✎ **Test Notes / Comment:** 

- [ ] **15.4 Aggressive Battery Saver Brand Test (Xiaomi / Realme / Oppo)** *(Key)*  
  *Verification Steps:* Run Safe Walk on a device with aggressive OEM background task killer (MIUI, ColorOS).  
  *Expected Result:* Android foreground notification prevents OS from killing the background tracking service.  
  > ✎ **Test Notes / Comment:** 

- [ ] **15.5 Sudden Tunnel / Offline Network Recovery**  
  *Verification Steps:* Enter an elevator or underground area with zero cell signal for 2 minutes → exit to open air.  
  *Expected Result:* Socket reconnects automatically; buffered GPS locations sync to server without crashing.  
  > ✎ **Test Notes / Comment:** 

---

## 16. V1 Production Upgrades Verification (5 / 7) 🔄

> **Overview:** Covers the 7 critical V1 production hardening items implemented to complete the V1 scope prior to store build compilation.

- [x] **16.1 Device B Background FCM Push Notifications** *(Critical)*  
  *Pre-conditions:* Device B has SAFORA installed, registered with account, and listed as an accepted emergency contact for Device A. Device B app is locked/swiped away to background.  
  *Verification Steps:*  
  1. Device A initiates and taps "Start Safe Walk" to any destination.  
  2. Verify Device B system tray: Notification appears `"🛡️ Safe Walk Started: [Name] has started a Safe Walk"`.  
  3. Device A moves >100m away from planned corridor route.  
  4. Verify Device B system tray: Notification appears `"⚠️ Safe Walk Deviation Warning: [Name] has deviated from their route"`.  
  5. Device A taps "I Reached Safely" or ends session.  
  6. Verify Device B system tray: Notification appears `"✅ Safe Arrival Confirmed: [Name] has arrived safely"`.  
  *Expected Result:* Guardian receives prompt notification banner at each milestone even if their phone screen is off/locked.  
  > ✎ **Test Notes / Comment:** PASS: Device B receives background FCM push notifications for walk start, deviation, and safe arrival while phone is locked.

- [x] **16.2 Android Battery Optimization Whitelist Prompt** *(Reliability)*  
  *Pre-conditions:* Clean install of SAFORA or clear app storage on Device A.  
  *Verification Steps:*  
  1. Open Safe Walk tab → search destination → tap "Select Guardians & Start Walk".  
  2. Verify modal alert: `"🔋 Ensure Reliable Background GPS"`.  
  3. Tap "Open Battery Settings" → verify Android system settings opens directly to Battery Optimization / Unrestricted background usage page.  
  4. Return to app and verify walk proceeds smoothly; verify subsequent walk starts do not repeat the prompt.  
  *Expected Result:* One-tap flow cleanly navigates to OEM battery settings without app freeze.  
  > ✎ **Test Notes / Comment:** PASS: Battery optimization whitelist prompt opens Android system settings directly without freezing app.

- [ ] **16.3 Corridor Deviation 100m Default Threshold & 3-Pulse Haptic Vibration** *(Safety)*  
  *Pre-conditions:* Safe Walk active on Device A with destination set.  
  *Verification Steps:*  
  1. Walk away from the planned route corridor by at least 100m.  
  2. Put phone in pocket or purse.  
  3. Verify phone triggers a strong 3-pulse urgent vibration sequence (`[0, 600, 200, 600, 200, 600]`).  
  4. Look at screen: Verify 60s red countdown modal appears with "I AM SAFE" and "DISPATCH SOS" buttons.  
  5. Verify backend marks status as `deviated` once threshold exceeds 100m.  
  *Expected Result:* Distinct tactile alert alerts user immediately before the 60s auto-SOS countdown expires.  
  > ✎ **Test Notes / Comment:** 

- [x] **16.4 WhatsApp & SMS 1-Tap "I Reached Safely" Intent Confirmation** *(Redundancy)*  
  *Pre-conditions:* Complete a Safe Walk on Device A.  
  *Verification Steps:*  
  1. Tap "I Reached Safely" on the walk bottom sheet.  
  2. On the celebration dialog, tap `"💬 Share I Reached Safely (WhatsApp/SMS)"`.  
  3. Verify WhatsApp opens with pre-filled message: `"✅ Hey! I have reached [Destination] safely. My SAFORA Safe Walk companion escort session is completed."`  
  4. Select contact and send.  
  *Expected Result:* Pre-formatted confirmation message sends seamlessly without requiring manual typing.  
  > ✎ **Test Notes / Comment:** PASS: Tapping Share on arrival celebration opens WhatsApp with pre-filled destination confirmation message.

- [ ] **16.5 Offline Hazard Sync Banner & Manual Sync Action** *(Connectivity)*  
  *Pre-conditions:* Put Device A into Airplane mode or turn off Wi-Fi & Mobile Data.  
  *Verification Steps:*  
  1. Open Map tab → tap `+` to report a hazard (e.g. Unlit Street) → submit report.  
  2. Observe report is saved locally in AsyncStorage.  
  3. Turn Airplane mode OFF (reconnect to internet).  
  4. Observe floating amber banner appears below search bar: `"⚠️ 1 hazard report queued offline • [Sync Now]"`.  
  5. Tap "Sync Now".  
  6. Verify loading spinner spins, report is uploaded to backend, and banner disappears with success alert.  
  *Expected Result:* Zero report loss during network dropouts; clear visual feedback for pending items.  
  > ✎ **Test Notes / Comment:** 

- [x] **16.6 Admin Operations: Inline Ambient Audio Player with Speed Controls** *(Web Admin)*  
  *Pre-conditions:* Log into Web Admin Portal → Navigate to Emergency SOS Alerts.  
  *Verification Steps:*  
  1. Select an alert incident that has audio evidence attached.  
  2. Verify inline audio player widget appears under incident details.  
  3. Press Play: Audio streams smoothly.  
  4. Tap the speed button: Cycles `1x` → `1.25x` → `1.5x` → `2x`.  
  5. Verify scrubber input allows seeking forward and backward across the 30-second recording.  
  *Expected Result:* Audio plays inline with clear controls without needing to open external Cloudinary browser tabs.  
  > ✎ **Test Notes / Comment:** PASS: Inline audio player widget plays 30s ambient evidence with speed controls (1x–2x) and scrubber.

- [x] **16.7 Admin Operations: Safe Walk Radar Real-Time Audio Ping & Auto-Refresh Toggle** *(Web Admin)*  
  *Pre-conditions:* Open Safe Walk Radar in Web Admin portal (`/radar` or `Safe Walks`). Sound alerts enabled in Settings.  
  *Verification Steps:*  
  1. Verify the `"Auto 15s"` green toggle button is visible in the radar header.  
  2. Tapping it switches to `"Auto Paused"`; tapping again re-enables 15-second background polling.  
  3. While viewing the radar, trigger a deviation on Device A or via test script.  
  4. Verify the radar plays an audible two-tone alert chime (`G5 -> D5`) through the browser speaker.  
  5. Verify the walk card badge updates to `"CORRIDOR BREACH"` with red ring highlight in real-time.  
  *Expected Result:* Dispatchers receive immediate audio and visual situational awareness upon corridor breaches.  
  > ✎ **Test Notes / Comment:** PASS: Radar plays two-tone chime upon corridor breach and auto-refresh toggle cycles every 15s.

---

## 17. Google Sign-In & OAuth Authentication Flow (8 / 8) ✅

> **Overview:** Covers end-to-end Google OAuth verification on mobile (`@react-native-google-signin/google-signin`), session normalization, backend token verification (`POST /api/auth/google`), account linking, and error resilience.

- [x] **17.1 Google Sign-In Button Presentation Across Auth Screens**  
  *Pre-conditions:* Fresh app launch or navigate to Auth screens.  
  *Verification Steps:*  
  1. Inspect `AuthScreen.tsx` (Combined Auth view): Verify the "Continue with Google" button renders the authentic 4-color branded Google logo.  
  2. Inspect `LoginScreen.tsx` (Dedicated Login): Verify official 4-color Google logo is displayed.  
  3. Inspect `RegisterScreen.tsx` (Dedicated Register): Verify official 4-color Google logo is displayed.  
  *Expected Result:* Google branded buttons render authentic 4-color Google logo component (`GoogleLogo.tsx`) without text-based letter 'G' approximations.  
  > ✎ **Test Notes / Comment:** PASS: Official 4-color Google logo renders cleanly on AuthScreen, LoginScreen, and RegisterScreen.

- [x] **17.2 Native Google Account Picker Sheet Interaction**  
  *Pre-conditions:* Device has Google Play Services active and at least one Google account logged in.  
  *Verification Steps:*  
  1. On any auth screen, tap "Continue with Google".  
  2. Verify native Android bottom modal sheet slides up showing Google account(s) on the device.  
  *Expected Result:* Native Google Play Services dialog opens swiftly without freezing the UI; loading indicator activates.  
  > ✎ **Test Notes / Comment:** PASS: Tapping Continue with Google opens native Google Play Services account picker sheet.

- [x] **17.3 New User Sign-Up via Google (Option B Direct Home Flow)**  
  *Pre-conditions:* Select a Google account that has NEVER been registered on Safora before.  
  *Verification Steps:*  
  1. Select the new Google account from the native picker sheet.  
  2. Observe backend response and app navigation.  
  *Expected Result:* Mobile receives verified `idToken` → Dispatches to `POST /api/auth/google` → Backend creates user in DB (`auth_provider = 'google'`, `google_id`, `avatar_url`, phone is optional) → Returns JWT token → App saves session to AsyncStorage → User is routed to Terms Consent screen (or directly to MainTabs if previously accepted) with zero roadblock.  
  > ✎ **Test Notes / Comment:** PASS: New Google user authenticates via native sheet, backend creates profile with Google ID & avatar, and navigates seamlessly to main app.

- [x] **17.4 Seamless Account Linking with Existing Email**  
  *Pre-conditions:* An existing Citizen account was already registered using standard email/password (e.g., `user@gmail.com`).  
  *Verification Steps:*  
  1. Tap "Continue with Google" and pick the same Google account (`user@gmail.com`).  
  2. Observe authentication process.  
  *Expected Result:* Backend identifies existing email, links the `google_id` and avatar to the existing row without conflict (HTTP 200 OK), preserves existing user data and emergency contacts, and logs user into their existing account.  
  > ✎ **Test Notes / Comment:** PASS: Existing email/password accounts link automatically with Google ID on first Google sign-in without duplicate account conflicts.

- [x] **17.5 User Dismissal / Cancelled Sign-In Sheet Handling**  
  *Pre-conditions:* Open the native Google account picker sheet.  
  *Verification Steps:*  
  1. Press the Android hardware/gesture Back button or tap outside the Google sheet to cancel sign-in.  
  *Expected Result:* Sheet closes smoothly; loading spinner stops; app does NOT crash, throw uncaught promise exceptions, or show false error popups; user stays on Auth screen ready to try again.  
  > ✎ **Test Notes / Comment:** PASS: Cancelling or back-pressing the native Google sheet dismisses dialog cleanly without app crash, unhandled errors, or hung spinners.

- [x] **17.6 Network Dropout & Token Verification Fallback Resilience**  
  *Pre-conditions:* Simulate poor network or disconnect internet right as Google sheet is invoked.  
  *Verification Steps:*  
  1. Tap Google Sign-In while offline or during unstable network.  
  *Expected Result:* Gracefully caught in try/catch block; displays clean error banner or toast ("Google authentication failed. Please try again.") without white-screening. Backend also verifies tokens via dual-layer verification (OAuth2Client + Google tokeninfo endpoint fallback).  
  > ✎ **Test Notes / Comment:** PASS: Network failures during Google sign-in are handled gracefully with user toast notification; backend token verification fallback works.

- [x] **17.7 Session Hydration, Avatar & Profile State Persistence**  
  *Pre-conditions:* Log in via Google successfully.  
  *Verification Steps:*  
  1. Navigate to the Profile tab. Verify user name, email, and Google avatar render correctly.  
  2. Force close the app completely and reopen.  
  *Expected Result:* User remains authenticated; session restores from AsyncStorage; Profile card retains Google account details without requiring re-login.  
  > ✎ **Test Notes / Comment:** PASS: Google session persists across app restarts; profile renders Google user display name, email, and Cloudinary/Google avatar.

- [x] **17.8 Google Sign-Out & Account Switch Synchronization on App Logout**  
  *Pre-conditions:* Logged in via Google.  
  *Verification Steps:*  
  1. Go to Profile or Settings → tap "Log Out" → confirm logout.  
  2. Return to Auth screen → tap "Continue with Google".  
  *Expected Result:* `GoogleSignin.signOut()` executes during app logout; when tapping Google again, user is prompted with the account chooser dialog rather than being silently re-logged into the previous account.  
  > ✎ **Test Notes / Comment:** PASS: App logout triggers GoogleSignin.signOut(); subsequent Google login prompts account chooser instead of auto-logging into prior session.

---

### 📝 Physical Device Bug Log & Feedback Area

*(Use this space to jot down unlisted field observations, device models tested, or edge case ideas during testing)*

```
Device A Model: 
Device B Model: 
Android OS Version(s): 
Testing Location(s): 

Field Notes:
--------------------------------------------------------------------------------
1. 
2. 
3. 
--------------------------------------------------------------------------------
```
