import { JourneyStatus, Coordinates } from "@safora/shared-types";

export interface JourneyRow {
  id: number;
  user_id: number;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  planned_route?: any;
  trusted_contact_ids?: number[];
  status: JourneyStatus;
  started_at: Date | string;
  expected_arrival_at?: Date | string | null;
  ended_at?: Date | string | null;
}

export interface JourneyEntity {
  id: number;
  userId: number;
  origin: Coordinates;
  destination: Coordinates;
  plannedRoute?: Coordinates[] | [number, number][];
  trustedContactIds: number[];
  status: JourneyStatus;
  startedAt: string;
  expectedArrivalAt?: string;
  endedAt?: string;
}

export class JourneyModel {
  static fromRow(row: JourneyRow): JourneyEntity {
    return {
      id: row.id,
      userId: row.user_id,
      origin: {
        latitude: Number(row.origin_lat),
        longitude: Number(row.origin_lng),
      },
      destination: {
        latitude: Number(row.dest_lat),
        longitude: Number(row.dest_lng),
      },
      plannedRoute: row.planned_route || undefined,
      trustedContactIds: row.trusted_contact_ids || [],
      status: row.status || "active",
      startedAt:
        row.started_at instanceof Date
          ? row.started_at.toISOString()
          : String(row.started_at),
      expectedArrivalAt: row.expected_arrival_at
        ? row.expected_arrival_at instanceof Date
          ? row.expected_arrival_at.toISOString()
          : String(row.expected_arrival_at)
        : undefined,
      endedAt: row.ended_at
        ? row.ended_at instanceof Date
          ? row.ended_at.toISOString()
          : String(row.ended_at)
        : undefined,
    };
  }
}
