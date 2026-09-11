# SAFORA — REST API Specification

This document details the HTTP REST API and real-time Socket.IO interfaces for the SAFORA backend.

## 1. General Conventions

- **Base URL (Local)**: `http://localhost:5000/api`
- **Base URL (Mobile testing over LAN)**: `http://<YOUR_LAN_IP>:5000/api`
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token in `Authorization` header (`Authorization: Bearer <JWT_TOKEN>`)

### Standard Error Response Format

```json
{
  "error": "Error title or message",
  "details": "Optional additional debugging information",
  "timestamp": "2026-09-10T12:00:00.000Z"
}
```

---

## 2. Authentication Endpoints

### 2.1 Register User
`POST /auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+919876543210",
  "password": "SecurePassword123!"
}
```

**Success Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+919876543210",
    "role": "user",
    "created_at": "2026-09-10T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2.2 Login User
`POST /auth/login`

Authenticates an existing user and returns a signed JWT.

**Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2.3 Current User Profile
`GET /auth/me` *(Requires Auth)*

Returns the authenticated user's profile.

**Headers:**
`Authorization: Bearer <token>`

**Success Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+919876543210",
    "role": "user",
    "created_at": "2026-09-10T12:00:00.000Z"
  }
}
```

---

## 3. Hazard Reports Endpoints

### 3.1 Get Reports (Spatial Query)
`GET /reports?lat=30.3165&lng=78.0322&radius=5000`

Fetches active reports within a given circular radius (meters) using PostGIS spatial indexing.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `lat` | float | Yes | Latitude of center point |
| `lng` | float | Yes | Longitude of center point |
| `radius` | integer | No | Radius in meters (default: 5000) |
| `category` | string | No | Filter by category (`lighting`, `road_hazard`, `waterlogging`, etc.) |

**Success Response (200 OK):**
```json
{
  "count": 2,
  "reports": [
    {
      "id": 1,
      "category": "lighting",
      "title": "Poor Street Lighting",
      "description": "Street lamps non-functional along campus road",
      "severity": 3,
      "latitude": 30.3165,
      "longitude": 78.0322,
      "photo_url": null,
      "status": "active",
      "distance_meters": 120.4,
      "created_at": "2026-09-10T11:45:00.000Z"
    }
  ]
}
```

---

### 3.2 Submit Hazard Report
`POST /reports` *(Requires Auth)*

Submits a new safety or infrastructure hazard report.

**Request Body:**
```json
{
  "category": "road_hazard",
  "title": "Unmarked Construction Trench",
  "description": "Deep ditch without warning cones near main gate",
  "severity": 4,
  "latitude": 30.3182,
  "longitude": 78.0354,
  "photo_url": "https://res.cloudinary.com/.../hazard.jpg"
}
```

**Success Response (201 Created):**
```json
{
  "message": "Hazard report created successfully",
  "report": {
    "id": 6,
    "user_id": 1,
    "category": "road_hazard",
    "title": "Unmarked Construction Trench",
    "severity": 4,
    "latitude": 30.3182,
    "longitude": 78.0354,
    "status": "active",
    "created_at": "2026-09-10T12:05:00.000Z"
  }
}
```

---

### 3.3 Confirm Report
`PATCH /reports/:id/confirm` *(Requires Auth)*

Upvotes/confirms the existence of an existing hazard.

**Success Response (200 OK):**
```json
{
  "message": "Report confirmed",
  "confirmations_count": 4
}
```

---

### 3.4 Moderate Report (Admin Only)
`PATCH /reports/:id/moderate` *(Requires Admin Auth)*

Allows admins or moderators to flag, resolve, or mark a report as duplicate or fake.

**Request Body:**
```json
{
  "status": "resolved"
}
```
*(Allowed values: `active`, `resolved`, `duplicate`, `fake`)*

---

## 4. Safety Score & Clustering

### 4.1 Get Safety Score for Location
`GET /safety-score?lat=30.3165&lng=78.0322`

Calculates a normalized safety score (0 to 100, where 100 is safest) based on severity, recency decay, and density of nearby hazard reports.

**Success Response (200 OK):**
```json
{
  "latitude": 30.3165,
  "longitude": 78.0322,
  "safety_score": 78.5,
  "risk_level": "moderate",
  "factors": {
    "total_hazards_nearby": 3,
    "high_severity_count": 1,
    "last_reported_hours_ago": 2.4
  }
}
```

---

## 5. Safe Walk Journeys

### 5.1 Start Safe Walk Journey
`POST /journeys/start` *(Requires Auth)*

Initiates an active tracking session.

**Request Body:**
```json
{
  "origin": { "lat": 30.3165, "lng": 78.0322 },
  "destination": { "lat": 30.3200, "lng": 78.0380 },
  "planned_route": [
    [78.0322, 30.3165],
    [78.0350, 30.3175],
    [78.0380, 30.3200]
  ],
  "expected_duration_minutes": 25,
  "trusted_contact_ids": [1, 3]
}
```

**Success Response (201 Created):**
```json
{
  "journey_id": "j_98234",
  "status": "active",
  "tracking_token": "trk_abc123xyz",
  "started_at": "2026-09-10T12:10:00.000Z",
  "expected_arrival_at": "2026-09-10T12:35:00.000Z"
}
```

---

### 5.2 Update Journey Location
`PATCH /journeys/:id/location` *(Requires Auth)*

Streams walker position. Returns whether the user is on-corridor or in deviation.

**Request Body:**
```json
{
  "latitude": 30.3170,
  "longitude": 78.0330,
  "speed": 1.2,
  "heading": 45.0
}
```

**Success Response (200 OK):**
```json
{
  "status": "active",
  "on_route": true,
  "distance_to_destination_meters": 450
}
```

---

### 5.3 Complete Journey
`PATCH /journeys/:id/complete` *(Requires Auth)*

Marks a journey completed safely; notifies trusted contacts that the walker has arrived.

---

### 5.4 Cancel Journey
`PATCH /journeys/:id/cancel` *(Requires Auth)*

Cancels a journey and deactivates the tracking session.

---

## 6. Emergency SOS & Two-Way Guardian Alerts

### 6.1 Trigger SOS Alert
`POST /sos` *(Requires Auth)*

Creates an emergency incident, stores the live GPS position and 30-second audio evidence, looks up registered guardian accounts by email/phone, inserts in-app notification inbox records, and dispatches high-priority Firebase push notifications.

**Request Body:**
```json
{
  "latitude": 30.3165,
  "longitude": 78.0322,
  "accuracy": 4.5,
  "battery_percentage": 68,
  "journey_id": "j_98234",
  "audio_url": "https://safora-safety.s3.amazonaws.com/evidence/sos-audio.mp3"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Emergency SOS dispatched",
  "alert": {
    "id": 12,
    "userId": 1,
    "latitude": 30.3165,
    "longitude": 78.0322,
    "batteryPercentage": 68,
    "audioUrl": "https://safora-safety.s3.amazonaws.com/evidence/sos-audio.mp3",
    "status": "dispatched",
    "createdAt": "2026-09-12T12:20:00.000Z"
  },
  "contactsNotified": 2
}
```

---

### 6.2 Check Guardian Account
`GET /sos/check-guardian?email=guardian@example.com` *(Requires Auth)*

Performs real-time verification to determine whether an email belongs to an existing registered Safora user (enabling in-app push alerts and 30s audio evidence).

**Success Response (200 OK):**
```json
{
  "success": true,
  "exists": true,
  "name": "David Smith"
}
```

---

### 6.3 Test Guardian Alert (Safety Drill)
`POST /sos/test-guardian` *(Requires Auth)*

Dispatches a harmless safety test drill notification to the guardian's Safora account (or indicates cellular SMS readiness if unregistered).

**Request Body:**
```json
{
  "contactId": 5,
  "email": "guardian@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "deliveredToApp": true,
  "message": "Test alert successfully delivered to David Smith's Safora app!"
}
```

---

## 7. Trusted Contacts Endpoints

### 7.1 List Contacts
`GET /sos/contacts` *(Requires Auth)*

Returns all emergency contacts registered for the authenticated user, automatically tagged with `hasSaforaAccount: true/false`.

### 7.2 Add Contact
`POST /sos/contacts` *(Requires Auth)*

**Request Body:**
```json
{
  "name": "David Smith",
  "phone": "+919876543211",
  "email": "guardian@example.com",
  "relationship": "Father"
}
```

### 7.3 Delete Contact
`DELETE /sos/contacts/:id` *(Requires Auth)*

Deletes the emergency contact by ID from the database.

---

## 8. Safety Notifications Center Endpoints

### 8.1 List Safety Notifications
`GET /notifications` *(Requires Auth)*

Fetches incoming emergency SOS alerts and test drills received by the authenticated user as a guardian.

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "notifications": [
    {
      "id": 1,
      "userId": 2,
      "senderId": 1,
      "senderName": "Aditi Sharma",
      "senderPhone": "+919876543210",
      "type": "sos_alert",
      "title": "🚨 EMERGENCY SOS from Aditi Sharma",
      "body": "Immediate distress signal at 30.3165°N, 78.0322°E. Battery: 88%.",
      "latitude": 30.3165,
      "longitude": 78.0322,
      "batteryPercentage": 88,
      "audioUrl": "https://safora-safety.s3.amazonaws.com/evidence/sos-audio.mp3",
      "isTest": false,
      "isRead": false,
      "createdAt": "2026-09-12T12:20:00.000Z"
    }
  ]
}
```

### 8.2 Mark Single Notification Read
`PATCH /notifications/:id/read` *(Requires Auth)*

### 8.3 Mark All Notifications Read
`PATCH /notifications/read-all` *(Requires Auth)*

---

## 9. System & Diagnostics

### 8.1 Health Check
`GET /health`

**Success Response (200 OK):**
```json
{
  "status": "online",
  "project": "SAFORA - Community Safety & Safe Walk App",
  "timestamp": "2026-09-10T12:00:00.000Z"
}
```

### 8.2 Diagnostics
`GET /diagnostics`

Runs comprehensive live health checks against PostgreSQL, PostGIS spatial extensions, database latency, and system memory.

---

## 9. Real-Time Socket.IO Events

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `journey:join` | Client -> Server | `{ journeyId, token }` | Subscribes contact to live journey stream |
| `journey:location` | Server -> Client | `{ lat, lng, timestamp }` | Pushes current coordinates to watching contacts |
| `journey:deviation` | Server -> Client | `{ journeyId, warning }` | Alerts walker of route deviation |
| `report:created` | Server -> Client | `{ report }` | Broadcasts newly filed hazards within user's view |
| `sos:alert` | Server -> Client | `{ alertId, user, location }` | High-priority SOS broadcast |
