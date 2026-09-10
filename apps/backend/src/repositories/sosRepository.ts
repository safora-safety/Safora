import { db } from "../config/database";
import { SosAlertRow } from "../models/SosAlert";
import { TrustedContactRow } from "../models/TrustedContact";

export interface CreateAlertData {
  userId: string | number;
  journeyId?: string | number | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  batteryPercentage?: number | null;
}

export class SosRepository {
  static async createAlert(data: CreateAlertData): Promise<SosAlertRow> {
    const result = await db.query(
      `INSERT INTO sos_alerts (
         user_id, journey_id, latitude, longitude,
         location, accuracy, battery_percentage, status
       )
       VALUES (
         $1, $2, $3, $4,
         ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
         $5, $6, 'dispatched'
       )
       RETURNING *;`,
      [
        data.userId,
        data.journeyId || null,
        data.latitude,
        data.longitude,
        data.accuracy || null,
        data.batteryPercentage || null,
      ],
    );
    return result.rows[0];
  }

  static async findContactsByUserId(
    userId: string | number,
  ): Promise<TrustedContactRow[]> {
    const result = await db.query(
      `SELECT * FROM trusted_contacts WHERE user_id = $1 ORDER BY created_at DESC;`,
      [userId],
    );
    return result.rows;
  }

  static async addContact(
    userId: string | number,
    data: { name: string; phone: string; relationship?: string },
  ): Promise<TrustedContactRow> {
    const result = await db.query(
      `INSERT INTO trusted_contacts (user_id, name, phone, relationship)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [userId, data.name.trim(), data.phone.trim(), data.relationship || null],
    );
    return result.rows[0];
  }

  static async deleteContact(
    userId: string | number,
    contactId: string | number,
  ): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM trusted_contacts WHERE id = $1 AND user_id = $2 RETURNING id;`,
      [contactId, userId],
    );
    return result.rows.length > 0;
  }
}
