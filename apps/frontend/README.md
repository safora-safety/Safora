# SAFORA — Admin Operations Command Web Panel

The **SAFORA Admin Web Panel** provides university administrators, campus security, and civic dispatchers with a real-time command dashboard to oversee student and women safety operations.

It connects to the **same backend** and database as the SAFORA Mobile App (`https://safora-backend.onrender.com/api` or `http://localhost:5000/api`).

---

## Features

1. **Live Geospatial Radar**: Interactive CartoDB dark-themed Leaflet map showing active Safe Walks, hazard pins, and pulsing emergency SOS beacons.
2. **Emergency SOS Response Queue**: Real-time incoming SOS telemetry (victim name, contact, GPS coordinates, battery level) with **30-second Cloudinary ambient audio evidence playback**.
3. **Crowdsourced Hazard Moderation**: Review, verify, resolve, or flag fake community hazards with photo evidence modal inspector.
4. **Safe Walk Live Escort**: Monitor walking journeys and receive immediate alerts if a user deviates > 150m from their designated corridor.
5. **Safety Intelligence Analytics**: Incident distribution by category, peak risk hours, and dispatch resolution SLAs powered by Recharts.
6. **System Observability & Diagnostics**: Real-time ping and status checks for PostgreSQL/PostGIS, Cloudinary Vault, and Node process health.

---

## Tech Stack

- **Framework**: React 18 + Vite + TypeScript 5
- **Styling**: Tailwind CSS v3 + CSS Variables (`index.css`) for high-contrast command center dark theme
- **Geospatial Maps**: Leaflet + React-Leaflet (CartoDB Dark Matter / OSM)
- **Real-Time WebSockets**: Socket.IO Client
- **Charts**: Recharts
- **HTTP Client**: Axios with JWT authentication interceptors
- **Icons**: Lucide React

---

## Quick Start & Local Development

### 1. Install Dependencies
From the monorepo root or frontend directory:
```bash
# From workspace root:
npm install --workspace=apps/frontend

# Or directly in frontend folder:
cd apps/frontend
npm install
```

### 2. Configure Backend Connection
Check `apps/frontend/.env`:
```env
# Production backend (matches mobile app default):
VITE_API_URL=https://safora-backend.onrender.com/api
VITE_SOCKET_URL=https://safora-backend.onrender.com

# For local development against a locally running backend:
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000
```

### 3. Start the Development Server
```bash
npm run dev --workspace=apps/frontend
```
Open your browser at [http://localhost:5173](http://localhost:5173).

### 4. Admin Provisioning
The admin panel is strictly restricted to authorized administrators (public registration is disabled).
To seed or update an administrator account in the database:
```bash
npm run seed:admin --workspace=backend
```

---

## Production Build
```bash
npm run build --workspace=apps/frontend
```
The compiled static assets will be in `apps/frontend/dist/`, ready for deployment on Vercel, Netlify, Render Static Sites, or AWS S3.
