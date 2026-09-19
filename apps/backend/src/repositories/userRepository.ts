import { db } from "../config/database";
import { UserRow } from "../models/User";

export class UserRepository {
  static async findByEmail(email: string): Promise<UserRow | null> {
    const result = await db.query(
      "SELECT * FROM users WHERE email = $1 LIMIT 1;",
      [email.toLowerCase().trim()],
    );
    return result.rows[0] || null;
  }

  static async findById(id: string | number): Promise<UserRow | null> {
    const result = await db.query(
      "SELECT id, name, email, phone, blood_group, emergency_notes, role, created_at FROM users WHERE id = $1 LIMIT 1;",
      [id],
    );
    return result.rows[0] || null;
  }

  static async createUser(data: {
    name: string;
    email: string;
    phone?: string | null;
    passwordHash: string;
  }): Promise<UserRow> {
    const result = await db.query(
      `INSERT INTO users (name, email, phone, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, blood_group, emergency_notes, role, created_at;`,
      [
        data.name.trim(),
        data.email.toLowerCase().trim(),
        data.phone || null,
        data.passwordHash,
      ],
    );
    return result.rows[0];
  }

  static async updateUser(
    id: string | number,
    data: {
      name?: string;
      email?: string;
      phone?: string | null;
      blood_group?: string | null;
      emergency_notes?: string | null;
      fcm_token?: string | null;
    },
  ): Promise<UserRow | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name.trim());
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email.toLowerCase().trim());
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(data.phone ? data.phone.trim() : null);
    }
    if (data.blood_group !== undefined) {
      fields.push(`blood_group = $${idx++}`);
      values.push(data.blood_group ? data.blood_group.trim() : null);
    }
    if (data.emergency_notes !== undefined) {
      fields.push(`emergency_notes = $${idx++}`);
      values.push(data.emergency_notes ? data.emergency_notes.trim() : null);
    }
    if (data.fcm_token !== undefined) {
      fields.push(`fcm_token = $${idx++}`);
      values.push(data.fcm_token ? data.fcm_token.trim() : null);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING id, name, email, phone, blood_group, emergency_notes, role, created_at;
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  static async findAll(
    options: {
      search?: string;
      role?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<UserRow[]> {
    const { search, role, limit = 50, offset = 0 } = options;
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (search && search.trim()) {
      conditions.push(
        `(name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`,
      );
      values.push(`%${search.trim()}%`);
      idx++;
    }

    if (role && role !== "all") {
      conditions.push(`role = $${idx}`);
      values.push(role);
      idx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit);
    const limitParam = `$${idx++}`;
    values.push(offset);
    const offsetParam = `$${idx++}`;

    const query = `
      SELECT id, name, email, phone, blood_group, emergency_notes, role, is_active, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam};
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  static async countAll(
    options: { search?: string; role?: string } = {},
  ): Promise<number> {
    const { search, role } = options;
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (search && search.trim()) {
      conditions.push(
        `(name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`,
      );
      values.push(`%${search.trim()}%`);
      idx++;
    }

    if (role && role !== "all") {
      conditions.push(`role = $${idx}`);
      values.push(role);
      idx++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await db.query(
      `SELECT COUNT(*)::int as count FROM users ${whereClause};`,
      values,
    );
    return result.rows[0]?.count || 0;
  }

  static async updateRole(
    id: string | number,
    role: string,
  ): Promise<UserRow | null> {
    const result = await db.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING id, name, email, phone, blood_group, emergency_notes, role, is_active, created_at;`,
      [role, id],
    );
    return result.rows[0] || null;
  }

  static async updateStatus(
    id: string | number,
    isActive: boolean,
  ): Promise<UserRow | null> {
    const result = await db.query(
      `UPDATE users
       SET is_active = $1
       WHERE id = $2
       RETURNING id, name, email, phone, blood_group, emergency_notes, role, is_active, created_at;`,
      [isActive, id],
    );
    return result.rows[0] || null;
  }
}
