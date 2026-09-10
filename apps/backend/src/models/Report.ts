import { HazardCategory, HazardStatus } from "@safora/shared-types";

export interface ReportRow {
  id: number;
  user_id?: number | null;
  reporter_name?: string | null;
  category: HazardCategory;
  title: string;
  description?: string | null;
  severity: number;
  latitude: number;
  longitude: number;
  photo_url?: string | null;
  confirmations_count: number;
  status: HazardStatus;
  distance_meters?: number | string | null;
  created_at: Date | string;
}

export interface ReportEntity {
  id: number;
  userId?: number | null;
  reporterName?: string;
  category: HazardCategory;
  title: string;
  description?: string;
  severity: number;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
  confirmationsCount: number;
  status: HazardStatus;
  distanceMeters?: number;
  createdAt: string;
}

export class ReportModel {
  static fromRow(row: ReportRow): ReportEntity {
    return {
      id: row.id,
      userId: row.user_id,
      reporterName: row.reporter_name || undefined,
      category: row.category,
      title: row.title,
      description: row.description || undefined,
      severity: Number(row.severity),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      photoUrl: row.photo_url || null,
      confirmationsCount: Number(row.confirmations_count || 0),
      status: row.status || "active",
      distanceMeters:
        row.distance_meters != null
          ? Math.round(Number(row.distance_meters))
          : undefined,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }
}
