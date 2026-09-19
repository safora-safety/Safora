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
  source?: string | null;
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
         photo_url, source, confirmations_count, status
       )
       VALUES (
         $1, $2, $3, $4,
         $5, $6, $7, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
         $8, COALESCE($9, 'community_crowdsource'), 0, 'active'
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
        data.source || null,
      ],
    );
    return result.rows[0];
  }

  static async findById(id: string | number): Promise<ReportRow | null> {
    const result = await db.query(
      `SELECT r.*, u.name as reporter_name
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = $1;`,
      [id],
    );
    return result.rows[0] || null;
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
    resolutionNotes?: string,
  ): Promise<boolean> {
    if (resolutionNotes !== undefined) {
      const result = await db.query(
        `UPDATE reports SET status = $1, resolution_notes = $2 WHERE id = $3 RETURNING id;`,
        [status, resolutionNotes, id],
      );
      return result.rows.length > 0;
    }
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

  /**
   * PostGIS density-based spatial clustering of active hazards
   * @param epsDistanceDegrees Epsilon neighborhood (~0.003 is ~330 meters)
   * @param minPoints Minimum points to form a cluster core
   */
  static async findDbscanClusters(
    epsDistanceDegrees = 0.003,
    minPoints = 2,
  ): Promise<
    Array<{
      clusterId: number;
      pointCount: number;
      avgSeverity: number;
      centerLatitude: number;
      centerLongitude: number;
      reportIds: number[];
    }>
  > {
    const result = await db.query(
      `SELECT
         cid as cluster_id,
         COUNT(*)::int as point_count,
         ROUND(AVG(severity)::numeric, 1)::float as avg_severity,
         ST_Y(ST_Centroid(ST_Collect(location::geometry))) as center_lat,
         ST_X(ST_Centroid(ST_Collect(location::geometry))) as center_lng,
         ARRAY_AGG(id) as report_ids
       FROM (
         SELECT
           id,
           severity,
           location,
           ST_ClusterDBSCAN(location::geometry, eps := $1, minpoints := $2) OVER () as cid
         FROM reports
         WHERE status = 'active'
       ) sub
       WHERE cid IS NOT NULL
       GROUP BY cid
       HAVING COUNT(*) >= $2
       ORDER BY point_count DESC;`,
      [epsDistanceDegrees, minPoints],
    );

    return result.rows.map((r: any) => ({
      clusterId: Number(r.cluster_id),
      pointCount: Number(r.point_count),
      avgSeverity: Number(r.avg_severity),
      centerLatitude: Number(r.center_lat),
      centerLongitude: Number(r.center_lng),
      reportIds: r.report_ids || [],
    }));
  }

  static async getCategoryCounts(): Promise<
    Array<{ category: string; count: number }>
  > {
    const result = await db.query(`
      SELECT category, COUNT(*)::int as count
      FROM reports
      GROUP BY category
      ORDER BY count DESC;
    `);
    return result.rows;
  }

  static async getSeverityCounts(): Promise<
    Array<{ severity: number; count: number }>
  > {
    const result = await db.query(`
      SELECT severity, COUNT(*)::int as count
      FROM reports
      GROUP BY severity
      ORDER BY severity ASC;
    `);
    return result.rows;
  }

  static async getHourlyDistribution(): Promise<
    Array<{ hour: number; count: number }>
  > {
    const result = await db.query(`
      SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*)::int as count
      FROM reports
      GROUP BY hour
      ORDER BY hour ASC;
    `);
    return result.rows;
  }

  static async getAnalyticsSummary(): Promise<{
    totalReports: number;
    activeReports: number;
    resolvedReports: number;
    totalSos: number;
    activeJourneys: number;
    totalUsers: number;
  }> {
    const [reportsRes, sosRes, journeyRes, usersRes] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int as resolved
        FROM reports;
      `),
      db.query(`SELECT COUNT(*)::int as total FROM sos_alerts;`),
      db.query(
        `SELECT COUNT(*)::int as active FROM journeys WHERE status = 'active' OR status = 'deviated';`,
      ),
      db.query(`SELECT COUNT(*)::int as total FROM users;`),
    ]);

    return {
      totalReports: reportsRes.rows[0]?.total || 0,
      activeReports: reportsRes.rows[0]?.active || 0,
      resolvedReports: reportsRes.rows[0]?.resolved || 0,
      totalSos: sosRes.rows[0]?.total || 0,
      activeJourneys: journeyRes.rows[0]?.active || 0,
      totalUsers: usersRes.rows[0]?.total || 0,
    };
  }
}
