import { AppError } from "../errors/AppError";
import { Journey } from "@safora/shared-types";
import { JourneyRepository } from "../repositories/journeyRepository";
import { JourneyModel } from "../models/Journey";

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
    const row = await JourneyRepository.create({
      userId: data.userId,
      origin: data.origin,
      destination: data.destination,
      plannedRoute: data.plannedRoute,
      expectedDurationMinutes: data.expectedDurationMinutes || 30,
      trustedContactIds: data.trustedContactIds || [],
    });

    return JourneyModel.fromRow(row);
  }

  static async updateLocation(
    journeyId: string | number,
    coords: { latitude: number; longitude: number },
    userId?: string | number,
    userRole?: string,
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

    if (
      userId !== undefined &&
      String(row.user_id) !== String(userId) &&
      userRole !== "admin" &&
      userRole !== "moderator"
    ) {
      throw new AppError("Forbidden: You do not own this journey", 403);
    }

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
    const CORRIDOR_THRESHOLD_METERS = 150;
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
    } else {
      // Direct origin-to-destination corridor line
      minDistanceToCorridor = distanceToSegmentMeters(
        coords.latitude,
        coords.longitude,
        Number(row.origin_lat),
        Number(row.origin_lng),
        Number(row.dest_lat),
        Number(row.dest_lng),
      );
    }

    const deviationMeters = Math.round(minDistanceToCorridor);
    const isDeviated = deviationMeters > CORRIDOR_THRESHOLD_METERS;
    const status: "active" | "deviated" = isDeviated ? "deviated" : "active";

    // Synchronize status in database if altered
    if (isDeviated && row.status === "active") {
      await JourneyRepository.setStatus(journeyId, "deviated");
    } else if (!isDeviated && row.status === "deviated") {
      await JourneyRepository.setStatus(journeyId, "active");
    }

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
  }
}
