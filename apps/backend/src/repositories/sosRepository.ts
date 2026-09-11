import { db } from "../config/database";
import { SosAlertRow } from "../models/SosAlert";
import { TrustedContactRow } from "../models/TrustedContact";
import { NotificationRow } from "../models/Notification";

export interface CreateAlertData {
  userId: string | number;
  journeyId?: string | number | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  batteryPercentage?: number | null;
  audioUrl?: string | null;
}

export class SosRepository {
  static async createAlert(data: CreateAlertData): Promise<SosAlertRow> {
    const result = await db.query(
      `INSERT INTO sos_alerts (
         user_id, journey_id, latitude, longitude,
         location, accuracy, battery_percentage, audio_url, status
       )
       VALUES (
         $1, $2, $3, $4,
         ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
         $5, $6, $7, 'dispatched'
       )
       RETURNING *;`,
      [
        data.userId,
        data.journeyId || null,
        data.latitude,
        data.longitude,
        data.accuracy || null,
        data.batteryPercentage || null,
        data.audioUrl || null,
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
    data: {
      name: string;
      phone: string;
      email?: string;
      relationship?: string;
    },
  ): Promise<TrustedContactRow> {
    const result = await db.query(
      `INSERT INTO trusted_contacts (user_id, name, phone, email, relationship)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [
        userId,
        data.name.trim(),
        data.phone.trim(),
        data.email?.trim().toLowerCase() || null,
        data.relationship || null,
      ],
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

  static async findUserByEmail(email: string): Promise<any | null> {
    const result = await db.query(
      `SELECT id, name, email, phone, fcm_token FROM users WHERE LOWER(email) = LOWER($1);`,
      [email.trim()],
    );
    return result.rows[0] || null;
  }

  static async createNotification(data: {
    userId: string | number;
    senderId?: string | number | null;
    senderName: string;
    senderPhone?: string | null;
    type?: string;
    title: string;
    body: string;
    latitude?: number | null;
    longitude?: number | null;
    batteryPercentage?: number | null;
    audioUrl?: string | null;
    isTest?: boolean;
  }): Promise<NotificationRow> {
    const result = await db.query(
      `INSERT INTO notifications (
         user_id, sender_id, sender_name, sender_phone,
         type, title, body, latitude, longitude,
         battery_percentage, audio_url, is_test, is_read
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE)
       RETURNING *;`,
      [
        data.userId,
        data.senderId || null,
        data.senderName,
        data.senderPhone || null,
        data.type || "sos_alert",
        data.title,
        data.body,
        data.latitude || null,
        data.longitude || null,
        data.batteryPercentage || null,
        data.audioUrl || null,
        Boolean(data.isTest),
      ],
    );
    return result.rows[0];
  }

  static async findNotificationsByUserId(
    userId: string | number,
  ): Promise<NotificationRow[]> {
    const result = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50;`,
      [userId],
    );
    return result.rows;
  }

  static async markNotificationAsRead(
    userId: string | number,
    notificationId: string | number,
  ): Promise<boolean> {
    const result = await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id;`,
      [notificationId, userId],
    );
    return result.rows.length > 0;
  }

  static async markAllNotificationsAsRead(
    userId: string | number,
  ): Promise<number> {
    const result = await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE RETURNING id;`,
      [userId],
    );
    return result.rowCount || 0;
  }
}
