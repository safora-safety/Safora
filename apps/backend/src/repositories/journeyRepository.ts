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
}
