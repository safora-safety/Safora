import { SosNotification } from "@safora/shared-types";

export interface NotificationRow {
  id: number;
  user_id: number;
  sender_id?: number | null;
  sender_name: string;
  sender_phone?: string | null;
  type: string;
  title: string;
  body: string;
  latitude?: number | null;
  longitude?: number | null;
  battery_percentage?: number | null;
  audio_url?: string | null;
  is_test: boolean;
  is_read: boolean;
  created_at: Date | string;
}

export class NotificationModel {
  static fromRow(row: NotificationRow): SosNotification {
    return {
      id: row.id,
      userId: row.user_id,
      senderId: row.sender_id || undefined,
      senderName: row.sender_name,
      senderPhone: row.sender_phone || undefined,
      type: (row.type as any) || "sos_alert",
      title: row.title,
      body: row.body,
      latitude: Number(row.latitude) || 0,
      longitude: Number(row.longitude) || 0,
      batteryPercentage:
        row.battery_percentage !== null && row.battery_percentage !== undefined
          ? Number(row.battery_percentage)
          : undefined,
      audioUrl: row.audio_url || undefined,
      isTest: Boolean(row.is_test),
      isRead: Boolean(row.is_read),
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }
}
