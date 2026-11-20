# SAFORA — Backend API & Real-Time Gateway

The **SAFORA Backend Gateway** provides the central REST API, WebSocket event dispatcher, and spatial computation engine powering both the SAFORA Mobile Safety App and the Web Operations Dispatcher Console.

---

## Features

1. **Authentication & Identity**:
   - Stateless JWT authorization with bcrypt (10 rounds) password hashing.
   - Native Google OAuth2 token verification via Google Auth Library.
   - Role-Based Access Control (RBAC): `user`, `guardian`, `dispatcher`, and `admin`.

2. **Spatial Risk & Safety Score Engine**:
   - PostGIS `ST_DWithin` and `geography(Point, 4326)` spatial proximity math with GiST index acceleration.
   - Algorithmic Safety Score (0–100) combining hazard severity, distance falloff, community confirmations, and calibrated recency decay ($t_{1/2} = 168\text{ h}$ / 7 days, 0.25 floor).
   - Dynamic PostGIS `ST_ClusterDBSCAN` grouping ($\varepsilon = 0.003^\circ \approx 330\text{ m}$, `minpoints = 2`).

3. **Safe Walk & Corridor Compliance**:
   - 150-meter corridor monitoring against planned walking geometry.
   - Autonomous background watchdog running a 30-second scan tick; automatically escalates journeys to emergency SOS if off-corridor without safe confirmation for >60 seconds.

4. **Dual-Pipe Audio Streaming & Rescue Watchdog**:
   - Progressive ingestion of sequential 5-second 16kHz PCM audio slices emitted during active SOS alerts.
   - 8-second watchdog rescue timer that automatically stitches received chunks with standard RIFF/WAV headers and uploads fallback evidence to Cloudinary if the mobile device is destroyed or disconnected.

5. **Real-Time WebSockets**:
   - Socket.IO gateway with rooms for live journey tracking, breadcrumb telemetry, and emergency SOS broadcasting.

---

## Tech Stack

- **Runtime**: Node.js `20+` / `22+`
- **Framework**: Express 4 / 5, TypeScript 5
- **Database**: PostgreSQL 15+ with PostGIS spatial extension
- **Real-Time**: Socket.IO
- **Cloud Integrations**: Cloudinary (evidence archival), Firebase Admin SDK (push alerts)

---

## Getting Started

### 1. Environment Configuration
Ensure your `.env` file contains:
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/safora
JWT_SECRET=your-secure-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORRIDOR_THRESHOLD_METERS=150
```

### 2. Run in Development Mode
From the monorepo root:
```bash
npm run dev --workspace=apps/backend
```
Endpoints:
- API Root: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`
- System Diagnostics: `http://localhost:5000/api/diagnostics`

### 3. Run Automated Tests
```bash
npm test --workspace=apps/backend
```
Executes all 8 Jest test suites (**72 / 72 tests passing**):
- `rateLimiter.test.ts`
- `seedGuard.test.ts`
- `authGuards.test.ts`
- `safetyDecay.test.ts`
- `googleAuth.test.ts`
- `audioStitcher.test.ts`
- `sosGuards.test.ts`
- `journeyOwnership.test.ts`

### 4. Seed Administrator Account (Optional)
To create an initial admin account on a new database:
```bash
npm run seed:admin --workspace=apps/backend
```
