import { AppError } from "../errors/AppError";
import { Journey } from "@safora/shared-types";
import { JourneyRepository } from "../repositories/journeyRepository";
import { JourneyModel } from "../models/Journey";
import { UserRepository } from "../repositories/userRepository";
import { SosRepository } from "../repositories/sosRepository";
import { WatchdogService } from "./watchdogService";
import { FirebaseService } from "./firebaseService";
import { db } from "../config/database";
import {
  broadcastJourneyLocation,
  broadcastJourneyStarted,
  broadcastJourneyEnded,
} from "../sockets/journeySocket";

// Default corridor deviation sensitivity is 100m (configurable dynamically via Admin Panel)
let dynamicCorridorThresholdMeters =
  Number(process.env.CORRIDOR_THRESHOLD_METERS) || 100;

/**
 * Compute metric distance from point P to line segment AB using Equirectangular projection
 */
export function distanceToSegmentMeters(
  lat: number,
  lng: number,
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
): number {
  const avgLat = ((latA + latB + lat) / 3) * (Math.PI / 180);
  const kx = Math.cos(avgLat) * 111320;
  const ky = 110540;

  const px = lng * kx;
  const py = lat * ky;
  const ax = lngA * kx;
  const ay = latA * ky;
  const bx = lngB * kx;
  const by = latB * ky;

  const dx = bx - ax;
  const dy = by - ay;
  const segLenSq = dx * dx + dy * dy;

  if (segLenSq === 0) {
    const ddx = px - ax;
    const ddy = py - ay;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }

  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / segLenSq),
  );
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  const ddx = px - projX;
  const ddy = py - projY;
  return Math.sqrt(ddx * ddx + ddy * ddy);
}

export class JourneyService {
  static async startJourney(data: {
    userId: string | number;
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    plannedRoute?: [number, number][];
    expectedDurationMinutes?: number;
    trustedContactIds?: (string | number)[];
  }): Promise<Journey> {
    let guardianUserIds = data.trustedContactIds || [];
    if (guardianUserIds.length === 0) {
      try {
        const contacts = await SosRepository.findContactsByUserId(data.userId);
        const linked = contacts
          .filter(
            (c: any) =>
              (c.status === "accepted" || !c.status) && c.guardian_user_id,
          )
          .map((c: any) => Number(c.guardian_user_id));
        guardianUserIds = linked;
      } catch (err) {
        console.warn(
          "[JourneyService] Error resolving guardian contacts:",
          err,
        );
      }
    }

    const row = await JourneyRepository.create({
      userId: data.userId,
      origin: data.origin,
      destination: data.destination,
      plannedRoute: data.plannedRoute,
      expectedDurationMinutes: data.expectedDurationMinutes || 30,
      trustedContactIds: guardianUserIds,
    });

    WatchdogService.registerJourney(Number(row.id));

    const walker = await UserRepository.findById(data.userId);
    broadcastJourneyStarted({
      journeyId: Number(row.id),
      userId: data.userId,
      walkerName: walker?.name || "Companion Walker",
      origin: data.origin,
      destination: data.destination,
      plannedRoute: data.plannedRoute,
      guardianUserIds,
    });

    // Dispatch background FCM push to all guardian devices (Device B wake-up)
    if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
      JourneyService.resolveGuardianFcmTokens(data.userId, guardianUserIds)
        .then((tokens) => {
          if (tokens.length > 0) {
            FirebaseService.sendSafeWalkStartedAlert(tokens, {
              journeyId: Number(row.id),
              userName: walker?.name || "Companion Walker",
              destinationName: undefined,
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    return JourneyModel.fromRow(row);
  }

  static getCorridorThreshold(): number {
    return dynamicCorridorThresholdMeters;
  }

  static setCorridorThreshold(meters: number): number {
    if (meters >= 20 && meters <= 1000) {
      dynamicCorridorThresholdMeters = meters;
    }
    return dynamicCorridorThresholdMeters;
  }

  static async resolveGuardianFcmTokens(
    userId: string | number,
    guardianUserIds?: (string | number)[],
  ): Promise<string[]> {
    if (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID) {
      return [];
    }
    const tokens: string[] = [];
    try {
      if (guardianUserIds && guardianUserIds.length > 0) {
        const { rows } = await db.query(
          `SELECT id, fcm_token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL;`,
          [guardianUserIds.map((id) => Number(id))],
        );
        for (const r of rows) {
          if (r.fcm_token && !tokens.includes(r.fcm_token)) {
            tokens.push(r.fcm_token);
          }
        }
      }

      const contacts = await SosRepository.findContactsByUserId(userId);
      const normalizedPhones = contacts
        .map((c: any) =>
          c.phone ? c.phone.replace(/[^0-9]/g, "").slice(-10) : "",
        )
        .filter((p: string) => p.length === 10);

      if (normalizedPhones.length > 0) {
        const { rows } = await db.query(
          `SELECT id, fcm_token FROM users WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = ANY($1) AND fcm_token IS NOT NULL;`,
          [normalizedPhones],
        );
        for (const r of rows) {
          if (r.fcm_token && !tokens.includes(r.fcm_token)) {
            tokens.push(r.fcm_token);
          }
        }
      }
    } catch (err) {
      console.warn(
        "[JourneyService] Error resolving guardian FCM tokens:",
        err,
      );
    }
    return tokens;
  }

  static async updateLocation(
    journeyId: string | number,
    coords: { latitude: number; longitude: number },
    options?: {
      speed?: number | null;
      battery?: number | null;
      userId?: string | number;
      userRole?: string;
    },
  ): Promise<{
    status: "active" | "deviated";
    isDeviated: boolean;
    onRoute: boolean;
    deviationMeters: number;
    distanceToDestinationMeters: number;
  }> {
    const row = await JourneyRepository.findById(journeyId);
    if (!row || (row.status !== "active" && row.status !== "deviated")) {
      throw new AppError("Active journey not found", 404);
    }

    const userId = options?.userId;
    const userRole = options?.userRole;

    if (
      userId !== undefined &&
      String(row.user_id) !== String(userId) &&
      userRole !== "admin" &&
      userRole !== "moderator"
    ) {
      throw new AppError("Forbidden: You do not own this journey", 403);
    }

    const jId = Number(journeyId);

    // TRK-1: Persist live breadcrumb record with optional telemetry
    // TODO(V2): order by recorded_at, not arrival order
    await JourneyRepository.insertBreadcrumb(
      jId,
      coords.latitude,
      coords.longitude,
      options?.speed,
      options?.battery,
    );

    // Update last known location & timestamp
    await JourneyRepository.updateLastLocation(
      jId,
      coords.latitude,
      coords.longitude,
    );
    WatchdogService.updateLocation(jId, coords.latitude, coords.longitude);

    // Haversine distance to destination
    const R = 6371e3;
    const phi1 = (coords.latitude * Math.PI) / 180;
    const phi2 = (row.dest_lat * Math.PI) / 180;
    const deltaPhi = ((row.dest_lat - coords.latitude) * Math.PI) / 180;
    const deltaLambda = ((row.dest_lng - coords.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distToDest = Math.round(R * c);

    // Compute minimum perpendicular distance to the safe corridor
    const CORRIDOR_THRESHOLD_METERS = dynamicCorridorThresholdMeters;
    let minDistanceToCorridor = Infinity;

    const routePoints: Array<[number, number]> = [];
    if (row.planned_route && Array.isArray(row.planned_route)) {
      for (const pt of row.planned_route) {
        if (Array.isArray(pt) && pt.length >= 2) {
          const lat = Number(pt[0]);
          const lng = Number(pt[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            routePoints.push([lat, lng]);
          }
        } else if (pt && typeof pt === "object") {
          const lat = Number(pt.latitude ?? pt.lat);
          const lng = Number(pt.longitude ?? pt.lng);
          if (!isNaN(lat) && !isNaN(lng)) {
            routePoints.push([lat, lng]);
          }
        }
      }
    }

    if (routePoints.length >= 2) {
      for (let i = 0; i < routePoints.length - 1; i++) {
        const d = distanceToSegmentMeters(
          coords.latitude,
          coords.longitude,
          routePoints[i][0],
          routePoints[i][1],
          routePoints[i + 1][0],
          routePoints[i + 1][1],
        );
        if (d < minDistanceToCorridor) {
          minDistanceToCorridor = d;
        }
      }
    } else if (row.dest_lat && row.dest_lng) {
      // Direct origin-to-destination corridor line
      minDistanceToCorridor = distanceToSegmentMeters(
        coords.latitude,
        coords.longitude,
        Number(row.origin_lat),
        Number(row.origin_lng),
        Number(row.dest_lat),
        Number(row.dest_lng),
      );
    } else {
      // Edge case: No planned route or destination set — treat as on-route (architecture.md §7)
      minDistanceToCorridor = 0;
    }

    const deviationMeters = Math.round(minDistanceToCorridor);
    const isDeviated = deviationMeters > CORRIDOR_THRESHOLD_METERS;
    const status: "active" | "deviated" = isDeviated ? "deviated" : "active";

    // Fetch walker name for guardian live view (SYN-4)
    const walker = await UserRepository.findById(row.user_id);

    // Synchronize status and watchdog deviation state
    if (isDeviated) {
      if (row.status === "active") {
        await JourneyRepository.setStatus(jId, "deviated");
      }
      if (!row.deviated_at) {
        const now = new Date();
        await JourneyRepository.setDeviatedAt(jId, now);
        WatchdogService.setDeviated(jId, now);

        // Dispatch background FCM push to all guardian devices (Deviation Warning)
        if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
          JourneyService.resolveGuardianFcmTokens(
            row.user_id,
            row.trusted_contact_ids,
          )
            .then((tokens) => {
              if (tokens.length > 0) {
                FirebaseService.sendSafeWalkDeviationAlert(tokens, {
                  journeyId: jId,
                  userName: walker?.name || "Companion Walker",
                  deviationMeters,
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                }).catch(() => {});
              }
            })
            .catch(() => {});
        }
      }
    } else {
      if (row.status === "deviated") {
        await JourneyRepository.setStatus(jId, "active");
      }
      if (row.deviated_at) {
        await JourneyRepository.clearDeviatedAt(jId);
        WatchdogService.clearDeviated(jId);
      }
    }

    // Emit realtime socket event (TRK-2 / SYN-4)
    broadcastJourneyLocation({
      journeyId: jId,
      userId: row.user_id,
      walkerName: walker?.name || "Companion Walker",
      latitude: coords.latitude,
      longitude: coords.longitude,
      speed: options?.speed,
      battery: options?.battery,
      deviated: isDeviated,
      guardianUserIds: row.trusted_contact_ids,
    });

    return {
      status,
      isDeviated,
      onRoute: !isDeviated,
      deviationMeters,
      distanceToDestinationMeters: distToDest,
    };
  }

  static async completeJourney(
    journeyId: string | number,
    userId?: string | number,
    userRole?: string,
  ): Promise<void> {
    const row = await JourneyRepository.findById(journeyId);
    if (!row) {
      throw new AppError("Journey not found", 404);
    }

    if (
      userId !== undefined &&
      String(row.user_id) !== String(userId) &&
      userRole !== "admin" &&
      userRole !== "moderator"
    ) {
      throw new AppError("Forbidden: You do not own this journey", 403);
    }

    await JourneyRepository.updateStatus(
      journeyId,
      row.user_id,
      "completed",
      true,
    );

    WatchdogService.unregisterJourney(Number(journeyId));

    broadcastJourneyEnded({
      journeyId,
      userId: row.user_id,
      status: "completed",
      guardianUserIds: row.trusted_contact_ids,
    });

    // Dispatch background FCM push to all guardian devices (Safe Arrival Confirmed)
    if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
      UserRepository.findById(row.user_id)
        .then((walker) => {
          JourneyService.resolveGuardianFcmTokens(
            row.user_id,
            row.trusted_contact_ids,
          )
            .then((tokens) => {
              if (tokens.length > 0) {
                FirebaseService.sendSafeWalkArrivalAlert(tokens, {
                  journeyId,
                  userName: walker?.name || "Companion Walker",
                }).catch(() => {});
              }
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  }

  static async cancelJourney(
    journeyId: string | number,
    userId?: string | number,
    userRole?: string,
  ): Promise<void> {
    const row = await JourneyRepository.findById(journeyId);
    if (!row) {
      throw new AppError("Journey not found", 404);
    }

    if (
      userId !== undefined &&
      String(row.user_id) !== String(userId) &&
      userRole !== "admin" &&
      userRole !== "moderator"
    ) {
      throw new AppError("Forbidden: You do not own this journey", 403);
    }

    await JourneyRepository.updateStatus(
      journeyId,
      row.user_id,
      "cancelled",
      true,
    );

    WatchdogService.unregisterJourney(Number(journeyId));

    broadcastJourneyEnded({
      journeyId,
      userId: row.user_id,
      status: "cancelled",
      guardianUserIds: row.trusted_contact_ids,
    });

    // Dispatch background FCM push to all guardian devices (Safe Walk Ended)
    if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
      UserRepository.findById(row.user_id)
        .then((walker) => {
          JourneyService.resolveGuardianFcmTokens(
            row.user_id,
            row.trusted_contact_ids,
          )
            .then((tokens) => {
              if (tokens.length > 0) {
                FirebaseService.sendSafeWalkCancelledAlert(tokens, {
                  journeyId,
                  userName: walker?.name || "Companion Walker",
                }).catch(() => {});
              }
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  }

  static async confirmSafe(
    journeyId: string | number,
    userId?: string | number,
    userRole?: string,
  ): Promise<{ confirmed: boolean; deviatedAt: null }> {
    const row = await JourneyRepository.findById(journeyId);
    if (!row) {
      throw new AppError("Journey not found", 404);
    }

    if (
      userId !== undefined &&
      String(row.user_id) !== String(userId) &&
      userRole !== "admin" &&
      userRole !== "moderator"
    ) {
      throw new AppError("Forbidden: You do not own this journey", 403);
    }

    const jId = Number(journeyId);
    await JourneyRepository.clearDeviatedAt(jId);
    if (row.status === "deviated") {
      await JourneyRepository.setStatus(jId, "active");
    }
    WatchdogService.clearDeviated(jId);

    return {
      confirmed: true,
      deviatedAt: null,
    };
  }

  static async getActiveEscortForGuardian(
    guardianUserId: string | number,
  ): Promise<any | null> {
    const row =
      await JourneyRepository.findActiveEscortForGuardian(guardianUserId);
    if (!row) return null;

    const realLat =
      row.last_lat != null ? Number(row.last_lat) : Number(row.origin_lat);
    const realLng =
      row.last_lng != null ? Number(row.last_lng) : Number(row.origin_lng);

    return {
      id: row.id,
      userId: row.user_id,
      walkerName: row.walker_name || `User #${row.user_id}`,
      walkerPhone: row.walker_phone,
      origin: {
        latitude: Number(row.origin_lat),
        longitude: Number(row.origin_lng),
      },
      destination: {
        latitude: Number(row.dest_lat),
        longitude: Number(row.dest_lng),
      },
      currentLocation: {
        latitude: realLat,
        longitude: realLng,
      },
      lastLocation: {
        latitude: realLat,
        longitude: realLng,
      },
      status: row.status,
      plannedRoute: row.planned_route || null,
      startedAt:
        row.started_at instanceof Date
          ? row.started_at.toISOString()
          : String(row.started_at),
      lastSeenAt: row.last_seen_at || row.started_at,
      deviatedAt: row.deviated_at || null,
      expectedArrivalAt: row.expected_arrival_at,
    };
  }

  static async deleteJourney(
    journeyId: string | number,
    userId: string | number,
    userRole?: string,
  ): Promise<void> {
    const row = await JourneyRepository.findById(journeyId);
    if (!row) {
      throw new AppError("Journey not found", 404);
    }

    if (
      String(row.user_id) !== String(userId) &&
      userRole !== "admin" &&
      userRole !== "moderator"
    ) {
      throw new AppError("Forbidden: You do not own this journey", 403);
    }

    await JourneyRepository.delete(journeyId, row.user_id);
    WatchdogService.unregisterJourney(Number(journeyId));

    broadcastJourneyEnded({
      journeyId,
      userId: row.user_id,
      status: "deleted",
      guardianUserIds: row.trusted_contact_ids,
    });
  }
}
