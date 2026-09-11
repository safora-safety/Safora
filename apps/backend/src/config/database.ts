// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");
import { execSync } from "child_process";
import dotenv from "dotenv";
dotenv.config();

const connectionString =
  process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || "";

function parseConnectionString(connStr: string) {
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

function resolveHost(host: string): string {
  if (
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  ) {
    return host;
  }

  // Attempt resolving via public DNS (Google 8.8.8.8) to bypass ISP DNS restrictions
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
        console.log(
          `[INFO] Resolved ${host} -> ${resolved[0]} via Google DNS fallback`,
        );
        return resolved[0];
      }
    }
  } catch {
    // If nslookup is restricted or fails, fall through to known regional fallbacks
  }

  // Known fallback IPs for Neon AWS us-east-2 region
  if (host.includes("c-5.us-east-2.aws.neon.tech")) {
    console.log(
      `[INFO] Using regional fallback IP for ${host} (18.226.144.228)`,
    );
    return "18.226.144.228";
  }

  return host;
}

function createDatabasePool(): InstanceType<typeof Pool> {
  const parsed = parseConnectionString(connectionString);

  if (parsed && parsed.host) {
    const originalHost = parsed.host;
    const targetHost = resolveHost(originalHost);

    return new Pool({
      host: targetHost,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
      ssl: {
        rejectUnauthorized: false,
        servername: originalHost,
      },
      connectionTimeoutMillis: 25000,
      idleTimeoutMillis: 30000,
    });
  }

  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 25000,
    idleTimeoutMillis: 30000,
  });
}

export const db = createDatabasePool();

export async function initDatabase(): Promise<void> {
  let client;
  try {
    client = await db.connect();
  } catch (connErr: unknown) {
    const errMsg = connErr instanceof Error ? connErr.message : String(connErr);
    console.warn(`[WARN] Database initial connection deferred: ${errMsg}`);
    return;
  }

  try {
    // 1. PostGIS Extension
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
      console.log("[INFO] PostGIS spatial extension enabled");
    } catch {
      console.log(
        "[WARN] Non-superuser environment; continuing with database initialization",
      );
    }

    // 2. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_notes TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
    `);

    // 3. Hazard Reports Table (with PostGIS location column & GiST spatial index)
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        photo_url TEXT,
        confirmations_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure location column & confirmations_count exist on reports
    try {
      await client.query(`
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326);
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS confirmations_count INTEGER DEFAULT 0;
      `);

      // Backfill location geography points from lat/lng
      await client.query(`
        UPDATE reports
        SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
        WHERE location IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;
      `);

      // Create GiST spatial index for O(log N) radius and corridor lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS reports_location_gist_idx ON reports USING GIST (location);
        CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status);
      `);
      console.log(
        "[INFO] PostGIS geography column and GiST index verified on reports table",
      );
    } catch (spatialErr) {
      console.log("[WARN] PostGIS spatial column setup warning:", spatialErr);
    }

    // 4. Trusted Contacts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS trusted_contacts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        relationship VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE trusted_contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user_id ON trusted_contacts(user_id);
    `);

    // 5. Safe Walk Journeys Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS journeys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        origin_lat DOUBLE PRECISION NOT NULL,
        origin_lng DOUBLE PRECISION NOT NULL,
        dest_lat DOUBLE PRECISION NOT NULL,
        dest_lng DOUBLE PRECISION NOT NULL,
        origin GEOGRAPHY(Point, 4326),
        destination GEOGRAPHY(Point, 4326),
        planned_route JSONB,
        trusted_contact_ids INTEGER[] DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'active',
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expected_arrival_at TIMESTAMP WITH TIME ZONE,
        ended_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_journeys_user_status ON journeys(user_id, status);
    `);

    // 6. SOS Alerts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sos_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        journey_id INTEGER REFERENCES journeys(id) ON DELETE SET NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        location GEOGRAPHY(Point, 4326),
        accuracy DOUBLE PRECISION,
        battery_percentage INTEGER,
        status VARCHAR(50) DEFAULT 'dispatched',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS audio_url TEXT;
    `);

    // 7. Safety Notifications Table (for Guardians & First Responders)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        sender_name VARCHAR(150) NOT NULL,
        sender_phone VARCHAR(50),
        type VARCHAR(50) DEFAULT 'sos_alert',
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        battery_percentage INTEGER,
        audio_url TEXT,
        is_test BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
    `);

    // Check if we need to seed initial campus hazards
    const countCheck = await client.query("SELECT COUNT(*) FROM reports;");
    const count = parseInt(countCheck.rows[0].count, 10);

    if (count === 0) {
      console.log(
        "[INFO] Seeding initial hazard reports around DBUU / Dehradun...",
      );
      await client.query(`
        INSERT INTO reports (category, title, description, severity, latitude, longitude, location, status)
        VALUES
          ('lighting', 'Poor Street Lighting', 'Street lamps non-functional along campus connecting road after 8 PM', 3, 30.3165, 78.0322, ST_SetSRID(ST_MakePoint(78.0322, 30.3165), 4326)::geography, 'active'),
          ('road_hazard', 'Open Construction Trench', 'Unmarked trench near Manduwala main entrance gate', 5, 30.3182, 78.0354, ST_SetSRID(ST_MakePoint(78.0354, 30.3182), 4326)::geography, 'active'),
          ('waterlogging', 'Waterlogged Underpass', 'Water accumulation causing slippery walking conditions', 2, 30.3140, 78.0290, ST_SetSRID(ST_MakePoint(78.0290, 30.3140), 4326)::geography, 'active'),
          ('isolated_area', 'Dark Isolated Trail', 'Narrow dimly lit walking path between hostel and bus stand', 4, 30.3200, 78.0380, ST_SetSRID(ST_MakePoint(78.0380, 30.3200), 4326)::geography, 'active'),
          ('traffic', 'High Speed Blind Curve', 'Sharp blind turn on Chakrata highway with heavy vehicle traffic', 4, 30.3125, 78.0250, ST_SetSRID(ST_MakePoint(78.0250, 30.3125), 4326)::geography, 'active');
      `);
      console.log(
        "[INFO] Seeded 5 hazard points with active PostGIS geography points",
      );
    }

    console.log("[INFO] PostgreSQL + PostGIS schema and GiST indexes ready");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ERROR] Database initialization failed: ${errorMsg}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}
