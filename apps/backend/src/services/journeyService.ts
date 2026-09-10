import { AppError } from "../errors/AppError";
import { Journey } from "@safora/shared-types";
import { JourneyRepository } from "../repositories/journeyRepository";
import { JourneyModel } from "../models/Journey";

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
  ): Promise<{ onRoute: boolean; distanceToDestinationMeters: number }> {
    const row = await JourneyRepository.findById(journeyId);
    if (!row || row.status !== "active") {
      throw new AppError("Active journey not found", 404);
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

    return {
      onRoute: true,
      distanceToDestinationMeters: distToDest,
    };
  }

  static async completeJourney(journeyId: string | number): Promise<void> {
    const updated = await JourneyRepository.setStatus(journeyId, "completed");
    if (!updated) {
      throw new AppError("Journey not found", 404);
    }
  }

  static async cancelJourney(journeyId: string | number): Promise<void> {
    const updated = await JourneyRepository.setStatus(journeyId, "cancelled");
    if (!updated) {
      throw new AppError("Journey not found", 404);
    }
  }
}
