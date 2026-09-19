import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

// Ensure environment variables are loaded
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { db, initDatabase } from "../config/database";

async function seedAdmin(): Promise<void> {
  const adminEmail = (process.env.ADMIN_EMAIL || "amansinghkunwar07@gmail.com")
    .toLowerCase()
    .trim();
  const rawPassword = process.env.ADMIN_PASSWORD || "AmanKunwar@007";
  const adminName =
    process.env.ADMIN_NAME || "Aman Singh Kunwar (System Administrator)";

  console.log("====================================================");
  console.log(" SAFORA Security — One-Time Administrator Provisioning");
  console.log("====================================================");
  console.log(`[1/3] Connecting to database...`);

  await initDatabase();

  console.log(`[2/3] Hashing password with bcrypt (10 rounds)...`);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(rawPassword, salt);

  console.log(
    `[3/3] Checking if administrator account exists for: ${adminEmail}`,
  );

  const existingRes = await db.query(
    `SELECT id, name, email, role FROM users WHERE LOWER(email) = $1 LIMIT 1;`,
    [adminEmail],
  );

  if (existingRes.rows.length > 0) {
    const user = existingRes.rows[0];
    await db.query(
      `UPDATE users 
       SET password = $1, role = 'admin', name = $2 
       WHERE id = $3;`,
      [hashedPassword, adminName, user.id],
    );
    console.log(
      `[SUCCESS] Existing user (ID: ${user.id}) upgraded to 'admin' and password updated!`,
    );
  } else {
    const insertRes = await db.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, name, email, role;`,
      [adminName, adminEmail, hashedPassword],
    );
    const newUser = insertRes.rows[0];
    console.log(
      `[SUCCESS] New Administrator provisioned successfully (ID: ${newUser.id})!`,
    );
  }

  console.log("----------------------------------------------------");
  console.log(`Admin Email:    ${adminEmail}`);
  console.log(`Role Assigned:  admin`);
  console.log("Status:         READY TO LOGIN ON ADMIN WEB PANEL");
  console.log("====================================================");

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("[ERROR] Failed to seed administrator account:", err);
  process.exit(1);
});
