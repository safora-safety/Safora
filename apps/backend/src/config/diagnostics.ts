import dotenv from "dotenv";
dotenv.config();

import dns from "dns";
try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Ignore if not supported
}

import https from "https";
import { v2 as cloudinary } from "cloudinary";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";

import { execSync } from "child_process";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");

export interface ServiceStatus {
  database: {
    connected: boolean;
    postgis: boolean;
    message: string;
    version?: string;
  };
  cloudinary: { connected: boolean; message: string; cloudName?: string };
  firebase: { initialized: boolean; message: string; projectId?: string };
  mapTiler: { valid: boolean; message: string };
  nominatim: { reachable: boolean; message: string };
}

// Helper: HTTPS GET as Promise
function httpsGet(
  url: string,
  customHeaders: Record<string, string> = {},
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        "User-Agent":
          "Safora-Safety-App/1.0 (contact: safora.safety@gmail.com)",
        ...customHeaders,
      },
    };
    https
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () =>
          resolve({ statusCode: res.statusCode || 0, body: data }),
        );
      })
      .on("error", reject);
  });
}

type DbTestResult =
  | { success: true; postgisVersion: string | null }
  | { success: false; error: string };

function parseConnStr(connStr: string) {
  try {
    const url = new URL(connStr);
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname ? url.pathname.replace(/^\//, "") : undefined,
    };
  } catch {
    return null;
  }
}

function resolveHostForDiag(host: string): string {
  if (
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  ) {
    return host;
  }

  try {
    const output = execSync(`nslookup ${host} 8.8.8.8`, {
      timeout: 3000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const matches = output.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
    if (matches && matches.length > 0) {
      const resolved = matches.filter((ip) => ip !== "8.8.8.8");
      if (resolved.length > 0) {
        return resolved[0];
      }
    }
  } catch {
    // Ignore lookup error
  }

  if (host.includes("c-5.us-east-2.aws.neon.tech")) {
    return "18.226.144.228";
  }

  return host;
}

// Helper: Test PostgreSQL connection
async function testDbConnection(
  connectionString: string,
): Promise<DbTestResult> {
  const parsed = parseConnStr(connectionString);
  const originalHost = parsed?.host || "database";
  const targetHost = resolveHostForDiag(originalHost);

  // Neon compute instances suspend after 5m of inactivity. Allow up to 25s for cold starts.
  const attemptConnect = async (
    timeoutMs: number,
  ): Promise<{ success: true; postgisVersion: string | null }> => {
    const pool = parsed
      ? new Pool({
          host: targetHost,
          port: parsed.port,
          user: parsed.user,
          password: parsed.password,
          database: parsed.database,
          ssl: {
            rejectUnauthorized: false,
            servername: originalHost,
          },
          connectionTimeoutMillis: timeoutMs,
        })
      : new Pool({
          connectionString,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: timeoutMs,
        });

    try {
      const client = await pool.connect();
      try {
        await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
      } catch {
        // Non-superuser safe fallback
      }

      const postgisCheck = await client.query(
        "SELECT extversion FROM pg_extension WHERE extname = 'postgis';",
      );

      client.release();
      await pool.end();

      const postgisVersion =
        postgisCheck.rows.length > 0 ? postgisCheck.rows[0].extversion : null;
      return { success: true, postgisVersion };
    } catch (err: unknown) {
      await pool.end().catch(() => {});
      throw err;
    }
  };

  try {
    return await attemptConnect(25000);
  } catch {
    // Retry once in case Neon was waking up from idle
    try {
      await new Promise((res) => setTimeout(res, 2000));
      return await attemptConnect(20000);
    } catch (retryErr: unknown) {
      const errorMsg =
        retryErr instanceof Error ? retryErr.message : String(retryErr);
      return { success: false, error: errorMsg };
    }
  }
}

// Diagnostic Runner
export async function runSystemDiagnostics(): Promise<ServiceStatus> {
  const status: ServiceStatus = {
    database: { connected: false, postgis: false, message: "Not checked" },
    cloudinary: { connected: false, message: "Not checked" },
    firebase: { initialized: false, message: "Not checked" },
    mapTiler: { valid: false, message: "Not checked" },
    nominatim: { reachable: false, message: "Not checked" },
  };

  console.log("[INFO] Running service diagnostics...");

  // ── 1. PostgreSQL + PostGIS ──
  const candidateUrls = [
    process.env.DATABASE_URL,
    process.env.DATABASE_URL_DIRECT,
  ].filter((u): u is string => Boolean(u));

  if (candidateUrls.length === 0) {
    status.database.message = "DATABASE_URL not configured in .env";
  } else {
    const errors: string[] = [];
    for (const url of candidateUrls) {
      const maskedHost = url.split("@")[1]?.split("/")[0] || "unknown";
      const result = await testDbConnection(url);
      if (result.success) {
        status.database.connected = true;
        if (result.postgisVersion) {
          status.database.postgis = true;
          status.database.version = result.postgisVersion;
          status.database.message = `Connected via ${maskedHost} (PostGIS v${result.postgisVersion})`;
        } else {
          status.database.message = `Connected via ${maskedHost}, but PostGIS extension not active`;
        }
        break;
      } else {
        errors.push(`[${maskedHost}]: ${result.error}`);
      }
    }
    if (!status.database.connected) {
      status.database.message = errors.join(" | ");
    }
  }

  // ── 2. Cloudinary ──
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    status.cloudinary.message = "Missing Cloudinary credentials in .env";
  } else {
    try {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      const pingResult = await cloudinary.api.ping();
      if (pingResult && pingResult.status === "ok") {
        status.cloudinary.connected = true;
        status.cloudinary.cloudName = cloudName;
        status.cloudinary.message = `Connected to cloud '${cloudName}'`;
      } else {
        status.cloudinary.message = "Ping returned unexpected response";
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      status.cloudinary.message = `Authentication failed: ${errorMsg}`;
    }
  }

  // ── 3. Firebase Admin ──
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
    status.firebase.message =
      "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in .env";
  } else {
    try {
      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId: firebaseProjectId,
            clientEmail: firebaseClientEmail,
            privateKey: firebasePrivateKey.replace(/\\n/g, "\n"),
          }),
          projectId: firebaseProjectId,
        });
      }
      status.firebase.initialized = true;
      const defaultApp = getApp();
      status.firebase.projectId = defaultApp.options.projectId;
      status.firebase.message = `Initialized for project '${status.firebase.projectId}'`;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      status.firebase.message = `Initialization failed: ${errorMsg}`;
    }
  }

  // ── 4. MapTiler (Tiles & Styles) ──
  const mapTilerKey = (process.env.MAPTILER_API_KEY || "").trim();
  if (!mapTilerKey) {
    status.mapTiler.message = "MAPTILER_API_KEY not configured in .env";
  } else {
    try {
      const tileUrl = `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`;
      const res = await httpsGet(tileUrl);
      if (res.statusCode === 200) {
        status.mapTiler.valid = true;
        status.mapTiler.message = `Key valid (streets-v2 style accessible)`;
      } else if (res.statusCode === 403) {
        status.mapTiler.message = "API key rejected (403 Forbidden)";
      } else {
        status.mapTiler.message = `Unexpected status ${res.statusCode}`;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      status.mapTiler.message = `Connection failed: ${errorMsg}`;
    }
  }

  // ── 5. Nominatim (Geocoding) ──
  try {
    const nominatimUrl =
      "https://nominatim.openstreetmap.org/reverse?lat=30.3165&lon=78.0322&format=json";
    const res = await httpsGet(nominatimUrl);
    if (res.statusCode === 200) {
      const data = JSON.parse(res.body) as { display_name?: string };
      status.nominatim.reachable = true;
      const place = data.display_name
        ? data.display_name.substring(0, 50) + "..."
        : "OK";
      status.nominatim.message = `Reachable (test: ${place})`;
    } else {
      status.nominatim.message = `HTTP ${res.statusCode}`;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    status.nominatim.message = `Unreachable: ${errorMsg}`;
  }

  // ── Print Terminal Summary ──
  console.log("[INFO] Services status:");
  console.log(
    `[INFO]  Database:    ${status.database.connected && status.database.postgis ? "OK" : "WARN"} - ${status.database.message}`,
  );
  console.log(
    `[INFO]  Cloudinary:  ${status.cloudinary.connected ? "OK" : "FAIL"} - ${status.cloudinary.message}`,
  );
  console.log(
    `[INFO]  Firebase:    ${status.firebase.initialized ? "OK" : "FAIL"} - ${status.firebase.message}`,
  );
  console.log(
    `[INFO]  MapTiler:    ${status.mapTiler.valid ? "OK" : "FAIL"} - ${status.mapTiler.message}`,
  );
  console.log(
    `[INFO]  Nominatim:   ${status.nominatim.reachable ? "OK" : "FAIL"} - ${status.nominatim.message}`,
  );

  return status;
}
