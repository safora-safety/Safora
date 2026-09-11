import { SosAlertStatus } from "@safora/shared-types";

export interface SosAlertRow {
  id: number;
  user_id: number;
  journey_id?: number | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  battery_percentage?: number | null;
  audio_url?: string | null;
  status: SosAlertStatus;
  created_at: Date | string;
}

export interface SosAlertEntity {
  id: number;
  userId: number;
  journeyId?: number | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  batteryPercentage?: number;
  audioUrl?: string;
  status: SosAlertStatus;
  createdAt: string;
}

export class SosAlertModel {
  static fromRow(row: SosAlertRow): SosAlertEntity {
    return {
      id: row.id,
      userId: row.user_id,
      journeyId: row.journey_id,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      accuracy: row.accuracy != null ? Number(row.accuracy) : undefined,
      batteryPercentage:
        row.battery_percentage != null
          ? Number(row.battery_percentage)
          : undefined,
      audioUrl: row.audio_url || undefined,
      status: row.status || "dispatched",
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }
}
