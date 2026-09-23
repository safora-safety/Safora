import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { db } from "../config/database";

async function check() {
  const users = await db.query(
    "SELECT id, name, email, role, created_at FROM users ORDER BY id;",
  );
  const reports = await db.query(
    "SELECT id, category, title, severity, latitude, longitude, status FROM reports ORDER BY id;",
  );
  const journeys = await db.query(
    "SELECT id, user_id, origin_lat, origin_lng, status FROM journeys ORDER BY id;",
  );
  const sos = await db.query(
    "SELECT id, user_id, latitude, longitude, status FROM sos_alerts ORDER BY id;",
  );
  const notifs = await db.query(
    "SELECT id, sender_name, title, type FROM notifications ORDER BY id;",
  );

  console.log("=== USERS ===");
  console.log(users.rows);
  console.log("=== REPORTS ===");
  console.log(reports.rows);
  console.log("=== JOURNEYS ===");
  console.log(journeys.rows);
  console.log("=== SOS ALERTS ===");
  console.log(sos.rows);
  console.log("=== NOTIFICATIONS ===");
  console.log(notifs.rows);

  process.exit(0);
}

check().catch((e) => {
  console.error(e);
  process.exit(1);
});
