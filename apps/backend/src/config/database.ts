// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");
import dotenv from "dotenv";
dotenv.config();

const connectionString =
  process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || "";

export const db = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 25000,
  idleTimeoutMillis: 30000,
});

export async function initDatabase(): Promise<void> {
  const client = await db.connect();
  try {
    // 1. PostGIS Extension
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
      console.log("[INFO] PostGIS extension initialized");
    } catch {
      console.log(
        "[WARN] Non-superuser environment; proceeding with standard schema",
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
    `);

    // 3. Hazard Reports Table (with PostGIS geometry/lat-lng)
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
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if we need to seed initial campus hazards
    const countCheck = await client.query("SELECT COUNT(*) FROM reports;");
    const count = parseInt(countCheck.rows[0].count, 10);

    if (count === 0) {
      console.log(
        "[INFO] Seeding initial hazard reports around DBUU / Dehradun...",
      );
      await client.query(`
        INSERT INTO reports (category, title, description, severity, latitude, longitude, status)
        VALUES
          ('lighting', 'Poor Street Lighting', 'Street lamps non-functional along campus connecting road after 8 PM', 3, 30.3165, 78.0322, 'active'),
          ('road_hazard', 'Open Construction Trench', 'Unmarked trench near Manduwala main entrance gate', 5, 30.3182, 78.0354, 'active'),
          ('waterlogging', 'Waterlogged Underpass', 'Water accumulation causing slippery walking conditions', 2, 30.3140, 78.0290, 'active'),
          ('isolated_area', 'Dark Isolated Trail', 'Narrow dimly lit walking path between hostel and bus stand', 4, 30.3200, 78.0380, 'active'),
          ('traffic', 'High Speed Blind Curve', 'Sharp blind turn on Chakrata highway with heavy vehicle traffic', 4, 30.3125, 78.0250, 'active');
      `);
      console.log("[INFO] Seeded 5 hazard points for live demonstration");
    }

    console.log("[INFO] PostgreSQL + PostGIS schema ready");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ERROR] Database initialization failed: ${errorMsg}`);
  } finally {
    client.release();
  }
}
