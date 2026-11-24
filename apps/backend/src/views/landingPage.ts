import { Request, Response } from "express";

export function renderLandingPage(req: Request, res: Response) {
  // If client prefers JSON (e.g. mobile app, curl, server-to-server)
  if (req.accepts(["json", "html"]) === "json") {
    return res.status(200).json({
      status: "online",
      service: "SAFORA Safety & Emergency CAD Engine",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      endpoints: {
        documentation: "/api/docs",
        health: "/api/health",
        admin_portal: "https://safora-admin.onrender.com",
        auth: "/api/auth",
        users: "/api/users",
        reports: "/api/reports",
        journeys: "/api/journeys",
        sos: "/api/sos",
        notifications: "/api/notifications",
        diagnostics: "/api/diagnostics",
      },
      spatial_corridor_threshold: "150m",
      watchdog_interval: "30s",
    });
  }

  const uptimeSec = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;
  const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAFORA CAD Gateway & API Engine</title>
  <style>
    :root {
      --bg-primary: #070A11;
      --bg-secondary: #0E1424;
      --bg-tertiary: #172033;
      --border-color: rgba(255, 255, 255, 0.08);
      --border-hover: rgba(255, 255, 255, 0.18);
      --accent-primary: #6366F1;
      --accent-primary-hover: #4F46E5;
      --accent-glow: rgba(99, 102, 241, 0.25);
      --color-danger: #EF4444;
      --color-warning: #F59E0B;
      --color-success: #10B981;
      --color-info: #06B6D4;
      --text-primary: #F9FAFB;
      --text-secondary: #9CA3AF;
      --text-muted: #6B7280;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-primary);
      background-image: 
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent),
        radial-gradient(circle at 100% 100%, rgba(16, 185, 129, 0.05), transparent 40%);
      background-attachment: fixed;
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.5;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }

    /* Top Navbar */
    .navbar {
      height: 64px;
      background: rgba(14, 20, 36, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--text-primary);
    }
    .brand-logo {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(16, 185, 129, 0.2));
      border: 1px solid rgba(99, 102, 241, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
    }
    .brand-title {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.02em;
    }
    .brand-divider {
      color: var(--text-muted);
      font-size: 14px;
      margin: 0 6px;
    }
    .brand-subtitle {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .pill-success {
      background: rgba(16, 185, 129, 0.12);
      color: var(--color-success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .pill-indigo {
      background: rgba(99, 102, 241, 0.12);
      color: var(--accent-primary);
      border: 1px solid rgba(99, 102, 241, 0.3);
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--color-success);
      box-shadow: 0 0 8px var(--color-success);
      animation: pulse 2s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(0.8); }
    }
    .nav-btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .nav-btn-primary {
      background: var(--accent-primary);
      color: #FFFFFF;
      box-shadow: 0 2px 8px var(--accent-glow);
    }
    .nav-btn-primary:hover {
      background: var(--accent-primary-hover);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    .nav-btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }
    .nav-btn-secondary:hover {
      background: #1E293B;
      border-color: var(--border-hover);
    }

    /* Main Container */
    .container {
      max-width: 1280px;
      width: 100%;
      margin: 0 auto;
      padding: 28px 28px 60px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: "";
      width: 4px;
      height: 12px;
      background: var(--accent-primary);
      border-radius: 2px;
    }

    /* Telemetry KPI Cards */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
    }
    .stat-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      transition: border-color 0.15s ease, transform 0.15s ease;
      position: relative;
      overflow: hidden;
    }
    .stat-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-1px);
    }
    .stat-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.4), transparent);
    }
    .stat-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 800;
      color: var(--text-primary);
    }
    .stat-sub {
      font-size: 11px;
      color: var(--text-secondary);
    }

    /* Search & Filter Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .search-box {
      flex: 1;
      min-width: 260px;
      max-width: 420px;
      position: relative;
    }
    .search-input {
      width: 100%;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 14px 8px 34px;
      font-size: 12.5px;
      color: var(--text-primary);
      outline: none;
      transition: border-color 0.15s ease;
    }
    .search-input:focus {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }
    .search-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 13px;
      pointer-events: none;
    }
    .filter-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-btn {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-btn:hover, .filter-btn.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
      color: #FFFFFF;
    }

    /* Table Container */
    .table-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    thead {
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border-color);
    }
    th {
      padding: 12px 18px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-secondary);
    }
    td {
      padding: 12px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-primary);
      vertical-align: middle;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .method {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 800;
      text-align: center;
      min-width: 54px;
    }
    .method-get { background: rgba(6, 182, 212, 0.12); color: var(--color-info); border: 1px solid rgba(6, 182, 212, 0.3); }
    .method-post { background: rgba(16, 185, 129, 0.12); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.3); }
    .method-delete { background: rgba(239, 68, 68, 0.12); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.3); }
    .endpoint {
      color: #E2E8F0;
      font-weight: 600;
    }
    .auth-scope {
      font-size: 11.5px;
      color: var(--text-secondary);
    }
    .scope-public { color: var(--color-info); }
    .scope-citizen { color: var(--color-success); }
    .scope-admin { color: var(--color-warning); }
    .table-link {
      color: var(--accent-primary);
      text-decoration: none;
      font-weight: 600;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 5px;
      border: 1px solid rgba(99, 102, 241, 0.3);
      background: rgba(99, 102, 241, 0.08);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }
    .table-link:hover {
      background: var(--accent-primary);
      color: #FFFFFF;
    }

    /* Terminal Console Box */
    .terminal-box {
      background: #04060A;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 18px 22px;
      position: relative;
    }
    .terminal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }
    .copy-btn {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .copy-btn:hover {
      background: #1E293B;
      color: #FFFFFF;
      border-color: var(--border-hover);
    }
    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12.5px;
      color: #38BDF8;
      overflow-x: auto;
      line-height: 1.6;
    }
    .comment { color: #64748B; }

    /* Footer */
    footer {
      margin-top: auto;
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
      padding: 18px 28px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      gap: 12px;
    }
    .footer-highlight {
      color: #EF4444;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <!-- Top Command Bar -->
  <header class="navbar">
    <a href="/api" class="brand">
      <div class="brand-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div>
        <span class="brand-title">SAFORA</span>
        <span class="brand-divider">/</span>
        <span class="brand-subtitle">CAD &amp; API GATEWAY</span>
      </div>
    </a>
    <div class="nav-actions">
      <div class="pill pill-success">
        <span class="pulse-dot"></span>
        SYSTEM ONLINE
      </div>
      <div class="pill pill-indigo font-mono">150M CORRIDOR</div>
      <a href="/api/docs" class="nav-btn nav-btn-primary">
        <span>Swagger Docs</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
      <a href="https://safora-admin.onrender.com" target="_blank" rel="noopener noreferrer" class="nav-btn nav-btn-secondary">
        <span>Admin Console</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    </div>
  </header>

  <!-- Main Content -->
  <main class="container">
    <!-- Telemetry Cards -->
    <div>
      <div class="section-header">
        <div class="section-title">ENGINE TELEMETRY &amp; SUBSYSTEM STATUS</div>
        <div class="font-mono" style="font-size: 11px; color: var(--text-muted);" id="live-clock">UTC TIME: SYNCHRONIZED</div>
      </div>
      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-label">Gateway Status</span>
          <span class="stat-value font-mono" style="color: var(--color-success);">200 OK</span>
          <span class="stat-sub">Express 5 reverse proxy operational</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Process Uptime</span>
          <span class="stat-value font-mono">${uptimeStr}</span>
          <span class="stat-sub">Environment: ${(process.env.NODE_ENV || "development").toUpperCase()}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Spatial Buffer</span>
          <span class="stat-value font-mono" style="color: var(--accent-primary);">150 meters</span>
          <span class="stat-sub">PostGIS ST_DWithin corridor locking</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">CAD Watchdog</span>
          <span class="stat-value font-mono" style="color: var(--color-warning);">30s Interval</span>
          <span class="stat-sub">Auto deviation check &amp; escalation</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Database Pool</span>
          <span class="stat-value font-mono" style="color: var(--color-info);">PostgreSQL 15</span>
          <span class="stat-sub">Neon serverless connection pool</span>
        </div>
      </div>
    </div>

    <!-- API Routing Matrix with Instant Search -->
    <div>
      <div class="section-header">
        <div class="section-title">REST API ROUTING MATRIX (52 SPECIFIED ENDPOINTS)</div>
      </div>

      <!-- Search & Category Filters -->
      <div class="toolbar">
        <div class="search-box">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="endpointSearch" class="search-input" placeholder="Search route, method, or keyword (e.g. sos, walk, auth)..." oninput="filterRoutes()">
        </div>
        <div class="filter-tags">
          <button class="filter-btn active" onclick="setCategory('all', this)">All Endpoints</button>
          <button class="filter-btn" onclick="setCategory('sos', this)">Emergency SOS</button>
          <button class="filter-btn" onclick="setCategory('walk', this)">Safe Walk</button>
          <button class="filter-btn" onclick="setCategory('hazards', this)">Hazards</button>
          <button class="filter-btn" onclick="setCategory('auth', this)">Auth &amp; User</button>
        </div>
      </div>

      <div class="table-container">
        <table id="routesTable">
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Security Scope</th>
              <th>Core Functionality</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr data-cat="system">
              <td><span class="method method-get font-mono">GET</span></td>
              <td class="endpoint font-mono">/api/docs</td>
              <td class="auth-scope scope-public">Public</td>
              <td>Interactive OpenAPI 3.0 specification &amp; Swagger test harness</td>
              <td><a href="/api/docs" class="table-link">Open UI &rarr;</a></td>
            </tr>
            <tr data-cat="system">
              <td><span class="method method-get font-mono">GET</span></td>
              <td class="endpoint font-mono">/api/health</td>
              <td class="auth-scope scope-public">Public</td>
              <td>Uptime monitor probe, DB connection test &amp; service readiness</td>
              <td><a href="/api/health" class="table-link">Test JSON &rarr;</a></td>
            </tr>
            <tr data-cat="auth">
              <td><span class="method method-post font-mono">POST</span></td>
              <td class="endpoint font-mono">/api/auth/login</td>
              <td class="auth-scope scope-public">Public</td>
              <td>Citizen &amp; Admin login with Argon2id hash &amp; 7-day scoped JWT</td>
              <td><a href="/api/docs#/Auth/post_api_auth_login" class="table-link">Docs &rarr;</a></td>
            </tr>
            <tr data-cat="sos">
              <td><span class="method method-post font-mono">POST</span></td>
              <td class="endpoint font-mono">/api/sos</td>
              <td class="auth-scope scope-citizen">Bearer JWT</td>
              <td>Emergency SOS trigger, guardian SMS fallback &amp; FCM push broadcast</td>
              <td><a href="/api/docs#/Emergency%20SOS/post_api_sos" class="table-link">Docs &rarr;</a></td>
            </tr>
            <tr data-cat="sos">
              <td><span class="method method-post font-mono">POST</span></td>
              <td class="endpoint font-mono">/api/sos/:id/audio-chunk</td>
              <td class="auth-scope scope-citizen">Bearer JWT</td>
              <td>30-second ambient audio recording stream &amp; Cloudinary rescue</td>
              <td><a href="/api/docs#/Emergency%20SOS/post_api_sos__id__audio_chunk" class="table-link">Docs &rarr;</a></td>
            </tr>
            <tr data-cat="walk">
              <td><span class="method method-post font-mono">POST</span></td>
              <td class="endpoint font-mono">/api/journeys</td>
              <td class="auth-scope scope-citizen">Bearer JWT</td>
              <td>Safe Walk creation with 150m PostGIS spatial corridor buffering</td>
              <td><a href="/api/docs#/Safe%20Walk%20Journeys/post_api_journeys" class="table-link">Docs &rarr;</a></td>
            </tr>
            <tr data-cat="walk">
              <td><span class="method method-post font-mono">POST</span></td>
              <td class="endpoint font-mono">/api/journeys/deviation-check</td>
              <td class="auth-scope scope-citizen">Bearer JWT</td>
              <td>Real-time GPS telemetry validation against active corridor</td>
              <td><a href="/api/docs#/Safe%20Walk%20Journeys/post_api_journeys_deviation_check" class="table-link">Docs &rarr;</a></td>
            </tr>
            <tr data-cat="hazards">
              <td><span class="method method-get font-mono">GET</span></td>
              <td class="endpoint font-mono">/api/reports/nearby</td>
              <td class="auth-scope scope-public">Public / Bearer</td>
              <td>PostGIS ST_DWithin hazard query with DBSCAN density clustering</td>
              <td><a href="/api/docs#/Hazard%20Reports/get_api_reports_nearby" class="table-link">Docs &rarr;</a></td>
            </tr>
            <tr data-cat="auth">
              <td><span class="method method-delete font-mono">DELETE</span></td>
              <td class="endpoint font-mono">/api/users/me</td>
              <td class="auth-scope scope-citizen">Bearer JWT</td>
              <td>Self-serve account &amp; personal data purge (anonymizes public reports)</td>
              <td><a href="/api/docs#/User%20Management/delete_api_users_me" class="table-link">Docs &rarr;</a></td>
            </tr>
            <tr data-cat="system">
              <td><span class="method method-get font-mono">GET</span></td>
              <td class="endpoint font-mono">/api/diagnostics</td>
              <td class="auth-scope scope-admin">Admin Role Guard</td>
              <td>Infrastructure diagnostics: PostGIS test, Socket.IO, DB pool status</td>
              <td><a href="/api/diagnostics" class="table-link">Run Probe &rarr;</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Developer Quick Verification Box -->
    <div class="terminal-box">
      <div class="terminal-header font-mono">
        <span>DEVELOPER QUICK CLI VERIFICATION</span>
        <button class="copy-btn" onclick="copyCurl()">
          <span id="copyText">Copy Snippet</span>
        </button>
      </div>
      <pre><code id="curlCode"><span class="comment"># 1. Probe live engine health</span>
curl -s https://safora-backend.onrender.com/api/health

<span class="comment"># 2. Query OpenAPI Specification Directly</span>
curl -s -H "Accept: application/json" https://safora-backend.onrender.com/api/docs

<span class="comment"># 3. Test corridor deviation check with Citizen Token</span>
curl -X POST https://safora-backend.onrender.com/api/journeys/deviation-check \
  -H "Authorization: Bearer &lt;CITIZEN_JWT&gt;" \
  -H "Content-Type: application/json" \
  -d '{"journeyId": 1, "latitude": 28.6139, "longitude": 77.2090}'</code></pre>
    </div>
  </main>

  <!-- Technical Footer -->
  <footer>
    <div>SAFORA Emergency CAD &amp; Geospatial Engine &bull; Version 1.0.0 (Production Release)</div>
    <div class="font-mono">National Emergency Services (India): <span class="footer-highlight">Dial 112</span></div>
  </footer>

  <script>
    // Live Clock
    function updateClock() {
      const now = new Date();
      const utc = now.toUTCString().replace("GMT", "UTC");
      const el = document.getElementById("live-clock");
      if (el) el.textContent = utc;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Route Filter
    let activeCat = "all";
    function setCategory(cat, btn) {
      activeCat = cat;
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterRoutes();
    }

    function filterRoutes() {
      const query = document.getElementById("endpointSearch").value.toLowerCase();
      const rows = document.querySelectorAll("#routesTable tbody tr");
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const cat = row.getAttribute("data-cat");
        const matchesQuery = text.includes(query);
        const matchesCat = activeCat === "all" || cat === activeCat;
        row.style.display = (matchesQuery && matchesCat) ? "" : "none";
      });
    }

    // Copy cURL
    function copyCurl() {
      const text = \`# 1. Probe live engine health
curl -s https://safora-backend.onrender.com/api/health

# 2. Query OpenAPI Specification Directly
curl -s -H "Accept: application/json" https://safora-backend.onrender.com/api/docs

# 3. Test corridor deviation check with Citizen Token
curl -X POST https://safora-backend.onrender.com/api/journeys/deviation-check \\
  -H "Authorization: Bearer <CITIZEN_JWT>" \\
  -H "Content-Type: application/json" \\
  -d '{"journeyId": 1, "latitude": 28.6139, "longitude": 77.2090}'\`;

      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById("copyText");
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy Snippet"; }, 2000);
      });
    }
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}
