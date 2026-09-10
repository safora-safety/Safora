import { db } from "../config/database";
import { ReportRow } from "../models/Report";

export interface CreateReportData {
  userId?: string | number | null;
  category: string;
  title: string;
  description?: string | null;
  severity: number;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
}

export class ReportRepository {
  static async findAll(limit = 100): Promise<ReportRow[]> {
    const result = await db.query(
      `SELECT r.*, u.name as reporter_name
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC
       LIMIT $1;`,
      [limit],
    );
    return result.rows;
  }

  static async findNearby(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit = 50,
  ): Promise<ReportRow[]> {
    const result = await db.query(
      `SELECT
         r.*,
         u.name as reporter_name,
         ST_Distance(r.location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) as distance_meters
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE ST_DWithin(r.location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
         AND r.status = 'active'
       ORDER BY distance_meters ASC
       LIMIT $4;`,
      [lat, lng, radiusMeters, limit],
    );
    return result.rows;
  }

  static async create(data: CreateReportData): Promise<ReportRow> {
    const result = await db.query(
      `INSERT INTO reports (
         user_id, category, title, description,
         severity, latitude, longitude, location,
         photo_url, confirmations_count, status
       )
       VALUES (
         $1, $2, $3, $4,
         $5, $6, $7, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
         $8, 0, 'active'
       )
       RETURNING *;`,
      [
        data.userId || null,
        data.category,
        data.title,
        data.description || null,
        data.severity,
        data.latitude,
        data.longitude,
        data.photoUrl || null,
      ],
    );
    return result.rows[0];
  }

  static async incrementConfirmations(
    id: string | number,
  ): Promise<number | null> {
    const result = await db.query(
      `UPDATE reports
       SET confirmations_count = COALESCE(confirmations_count, 0) + 1
       WHERE id = $1
       RETURNING confirmations_count;`,
      [id],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].confirmations_count;
  }

  static async updateStatus(
    id: string | number,
    status: string,
  ): Promise<boolean> {
    const result = await db.query(
      `UPDATE reports SET status = $1 WHERE id = $2 RETURNING id;`,
      [status, id],
    );
    return result.rows.length > 0;
  }

  static async findClusterCandidates(
    lat: number,
    lng: number,
    radiusMeters: number,
  ): Promise<
    Array<{ id: number; latitude: number; longitude: number; severity: number }>
  > {
    const result = await db.query(
      `SELECT id, latitude, longitude, severity
       FROM reports
       WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
         AND status = 'active';`,
      [lat, lng, radiusMeters],
    );
    return result.rows.map((r: any) => ({
      id: r.id,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      severity: Number(r.severity),
    }));
  }
}
