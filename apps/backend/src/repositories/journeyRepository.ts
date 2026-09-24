import { db } from "../config/database";
import { JourneyRow } from "../models/Journey";

export interface CreateJourneyData {
  userId: string | number;
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  plannedRoute?: [number, number][];
  expectedDurationMinutes: number;
  trustedContactIds: (string | number)[];
}

export class JourneyRepository {
  static async create(data: CreateJourneyData): Promise<JourneyRow> {
    const result = await db.query(
      `INSERT INTO journeys (
         user_id, origin_lat, origin_lng, dest_lat, dest_lng,
         origin, destination, planned_route, trusted_contact_ids,
         status, started_at, expected_arrival_at
       )
       VALUES (
         $1, $2, $3, $4, $5,
         ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
         ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography,
         $6, $7, 'active', CURRENT_TIMESTAMP,
         CURRENT_TIMESTAMP + ($8 || ' minutes')::interval
       )
       RETURNING *;`,
      [
        data.userId,
        data.origin.latitude,
        data.origin.longitude,
        data.destination.latitude,
        data.destination.longitude,
        JSON.stringify(data.plannedRoute || []),
        data.trustedContactIds,
        data.expectedDurationMinutes,
      ],
    );
    return result.rows[0];
  }

  static async findByIdAndUser(
    journeyId: string | number,
    userId: string | number,
  ): Promise<JourneyRow | null> {
    const result = await db.query(
      `SELECT * FROM journeys WHERE id = $1 AND user_id = $2 LIMIT 1;`,
      [journeyId, userId],
    );
    return result.rows[0] || null;
  }

  static async findById(
    journeyId: string | number,
  ): Promise<JourneyRow | null> {
    const result = await db.query(
      `SELECT * FROM journeys WHERE id = $1 LIMIT 1;`,
      [journeyId],
    );
    return result.rows[0] || null;
  }

  static async updateStatus(
    journeyId: string | number,
    userId: string | number,
    status: string,
    isEnd = false,
  ): Promise<JourneyRow | null> {
    const query = isEnd
      ? `UPDATE journeys
         SET status = $1, ended_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3
         RETURNING *;`
      : `UPDATE journeys
         SET status = $1
         WHERE id = $2 AND user_id = $3
         RETURNING *;`;

    const result = await db.query(query, [status, journeyId, userId]);
    return result.rows[0] || null;
  }

  static async setStatus(
    journeyId: string | number,
    status: string,
  ): Promise<JourneyRow | null> {
    const result = await db.query(
      `UPDATE journeys SET status = $1 WHERE id = $2 RETURNING *;`,
      [status, journeyId],
    );
    return result.rows[0] || null;
  }

  // --- V1: Breadcrumb persistence (TRK-1) ---

  static async insertBreadcrumb(
    journeyId: number,
    lat: number,
    lng: number,
    speed?: number | null,
    battery?: number | null,
  ): Promise<void> {
    await db.query(
      `INSERT INTO journey_breadcrumbs (journey_id, location, speed, battery)
       VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $4, $5);`,
      [journeyId, lat, lng, speed ?? null, battery ?? null],
    );
  }

  static async updateLastLocation(
    journeyId: number,
    lat: number,
    lng: number,
  ): Promise<void> {
    await db.query(
      `UPDATE journeys
       SET last_location = ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
           last_seen_at = now()
       WHERE id = $1;`,
      [journeyId, lat, lng],
    );
  }

  // --- V1: Watchdog state (SYN-5) ---

  static async setDeviatedAt(journeyId: number, date: Date): Promise<void> {
    await db.query(`UPDATE journeys SET deviated_at = $2 WHERE id = $1;`, [
      journeyId,
      date,
    ]);
  }

  static async clearDeviatedAt(journeyId: number): Promise<void> {
    await db.query(`UPDATE journeys SET deviated_at = NULL WHERE id = $1;`, [
      journeyId,
    ]);
  }

  static async setEscalatedAt(journeyId: number, date: Date): Promise<void> {
    await db.query(`UPDATE journeys SET escalated_at = $2 WHERE id = $1;`, [
      journeyId,
      date,
    ]);
  }

  /**
   * Lightweight query for watchdog boot — only returns id + deviated_at
   * for active journeys, no joins needed.
   */
  static async findActiveForWatchdog(): Promise<
    Array<{ id: number; deviated_at: Date | null }>
  > {
    const result = await db.query(
      `SELECT id, deviated_at FROM journeys WHERE status IN ('active', 'deviated') AND escalated_at IS NULL;`,
    );
    return result.rows;
  }

  // --- V1: Updated active journeys for admin radar (returns real last_location) ---

  static async findActiveJourneys(): Promise<
    Array<
      JourneyRow & {
        user_name?: string;
        user_phone?: string;
        user_email?: string;
        last_lat?: number;
        last_lng?: number;
        last_seen_at?: Date | string | null;
        deviated_at?: Date | string | null;
      }
    >
  > {
    const result = await db.query(
      `SELECT j.*,
              u.name as user_name, u.phone as user_phone, u.email as user_email,
              ST_Y(j.last_location::geometry) as last_lat,
              ST_X(j.last_location::geometry) as last_lng
       FROM journeys j
       LEFT JOIN users u ON j.user_id = u.id
       WHERE j.status IN ('active', 'deviated')
       ORDER BY j.started_at DESC;`,
    );
    return result.rows;
  }

  static async findAll(
    limit = 50,
  ): Promise<Array<JourneyRow & { user_name?: string; user_phone?: string }>> {
    const result = await db.query(
      `SELECT j.*, u.name as user_name, u.phone as user_phone, u.email as user_email
       FROM journeys j
       LEFT JOIN users u ON j.user_id = u.id
       ORDER BY j.started_at DESC
       LIMIT $1;`,
      [limit],
    );
    return result.rows;
  }
}
