# SAFORA — Developer Setup & Run Guide

Step-by-step instructions for getting the SAFORA monorepo running locally on Windows, macOS, or Linux.

## 1. Prerequisites

Ensure you have the following installed on your host workstation:
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x+`
- **PostgreSQL**: `15+` with the **PostGIS** extension
- **Java Development Kit (JDK)**: OpenJDK 17 (e.g. Eclipse Adoptium `jdk-17`)
- **Android Studio**:
  - Android SDK Platform 34 or 35
  - Android SDK Build-Tools `35.0.0` or `37.0.0`
  - Android NDK `27.1.12297006`
  - CMake `3.22.1`

---

## 2. Environment Configuration

### 2.1 Backend Environment (`apps/backend/.env`)

Create or update `apps/backend/.env` with your database credentials:

```env
PORT=5000
NODE_ENV=development

# PostgreSQL Connection String (Neon / Supabase / Local PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-sample-pooler.region.neon.tech/safora?sslmode=require
DATABASE_URL_DIRECT=postgresql://user:password@ep-sample.region.neon.tech/safora?sslmode=require

# Security & JWT (use a long random phrase in production)
JWT_SECRET=your_secure_random_jwt_secret_phrase

# Push Notifications (Optional for local dev)
FCM_SERVER_KEY=sample_fcm_key

# Media Storage (Optional for photo attachments)
CLOUDINARY_URL=cloudinary://sample:secret@safora
```

### 2.2 Mobile Environment (`apps/mobile/.env`)

Configure the backend API URL for the mobile application:

```env
# For Android Emulator: Use 10.0.2.2 to access host PC
API_BASE_URL=http://10.0.2.2:5000/api

# For Physical Device: Use your PC's local Wi-Fi IP address
# API_BASE_URL=http://192.168.1.15:5000/api
```

---

## 3. Installation & Dependency Bootstrapping

From the repository root (`D:\Safora`):

```bash
# Install all root, mobile, backend, and shared dependencies
npm install
```

---

## 4. Running the Backend Server

From the root directory:

```bash
cd apps/backend
npm run dev
```

The server will automatically:
1. Initialize the PostgreSQL connection pool.
2. Create the `postgis` extension if not already present.
3. Automatically execute DDL migrations for `users` and `reports`.
4. Seed 5 demo campus hazard locations if the reports table is empty.
5. Launch the REST API & Socket.IO server on `http://localhost:5000`.

### Verifying Backend Health & Diagnostics
Open your browser or run:
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Live Diagnostics**: [http://localhost:5000/api/diagnostics](http://localhost:5000/api/diagnostics)

---

## 5. Running the Web Admin Command Center

SAFORA includes a real-time web command center for dispatchers and incident moderators:

```bash
cd apps/frontend
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173). The dashboard connects live to the backend on `http://localhost:5000` via Socket.IO and REST APIs, featuring the Dark Matrix Geospatial Command Map, incident dispatch feed, and system telemetry.

---

## 6. Running & Building the Mobile App

### 6.1 Direct USB Running on a Physical Android Phone
1. Enable **Developer Options** (tap *Build Number* 7 times in *About Phone*) and toggle **USB Debugging** (plus *Install via USB* on Xiaomi/Realme/Oppo).
2. Connect your phone via USB cable (select *File Transfer/MTP* mode) and accept the debugging prompt.
3. Forward workstation backend and Metro ports over USB:
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:5000 tcp:5000
   ```
4. Start Metro bundler:
   ```bash
   cd apps/mobile
   npm start
   ```
5. Deploy and run directly onto the connected phone:
   ```bash
   cd apps/mobile
   npm run android
   ```

### 6.2 Compiling Standalone Production Release APK
To compile a standalone APK ready for distribution or installation without PC tethering:
```powershell
cd apps/mobile/android
.\gradlew assembleRelease
```
The compiled APK will be created at:
```
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

To install directly to a connected phone via ADB:
```powershell
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 7. Troubleshooting Common Issues

### Issue 1: "Cannot find module react-native" or Invariant Violation with ViewConfigs
- **Cause**: Duplicate hoisted versions of `react-native` inside monorepo workspaces.
- **Solution**: Ensure `disableHierarchicalLookup: true` and `extraNodeModules` are present in `apps/mobile/metro.config.js`. Clean Metro cache via `npm start -- --reset-cache`.

### Issue 2: "Android Gradle Plugin requires Java 17"
- **Solution**: Set `JAVA_HOME` environment variable to JDK 17 (e.g. `C:\Program Files\Eclipse Adoptium\jdk-17.0.12.7-hotspot`).

### Issue 3: "Network request failed" inside the mobile app
- **Cause**: Mobile phone cannot reach host `localhost`.
- **Solution**:
  - Over USB: Run `adb reverse tcp:5000 tcp:5000` so phone `localhost:5000` forwards to workstation port 5000.
  - Over Wi-Fi: Replace `localhost` with your workstation's Wi-Fi IPv4 address (e.g. `http://192.168.1.100:5000/api`) in `apps/mobile/.env`. Ensure your PC firewall permits inbound traffic on port 5000.
