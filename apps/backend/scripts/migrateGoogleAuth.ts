import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import { db } from "../src/config/database";

async function runMigration() {
  console.log("[INFO] Running Google Auth database migration...");
  await db.query(`
    ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  `);
  console.log("[SUCCESS] Google Auth migration executed successfully!");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("[ERROR] Migration failed:", err);
  process.exit(1);
});
