import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { JourneyService } from "../services/journeyService";
import { JourneyRepository } from "../repositories/journeyRepository";
import { AppError } from "../errors/AppError";

export async function getActiveJourneys(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await JourneyRepository.findActiveJourneys();
    const journeys = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name || `User #${r.user_id}`,
      userPhone: r.user_phone,
      userEmail: r.user_email,
      origin: {
        latitude: Number(r.origin_lat),
        longitude: Number(r.origin_lng),
        name: "Origin Checkpoint",
      },
      destination: {
        latitude: Number(r.dest_lat),
        longitude: Number(r.dest_lng),
        name: "Target Destination",
      },
      currentLocation: {
        latitude: Number(r.origin_lat),
        longitude: Number(r.origin_lng),
      },
      status: r.status,
      startedAt:
        r.started_at instanceof Date
          ? r.started_at.toISOString()
          : String(r.started_at),
      expectedArrivalAt: r.expected_arrival_at,
      expectedDurationMins: 15,
    }));

    res.status(200).json({
      success: true,
      count: journeys.length,
      journeys,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAllJourneys(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || "50"), 10));
    const rows = await JourneyRepository.findAll(limit);
    const journeys = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name || `User #${r.user_id}`,
      userPhone: r.user_phone,
      origin: {
        latitude: Number(r.origin_lat),
        longitude: Number(r.origin_lng),
      },
      destination: {
        latitude: Number(r.dest_lat),
        longitude: Number(r.dest_lng),
      },
      status: r.status,
      startedAt:
        r.started_at instanceof Date
          ? r.started_at.toISOString()
          : String(r.started_at),
    }));

    res.status(200).json({
      success: true,
      count: journeys.length,
      journeys,
    });
  } catch (err) {
    next(err);
  }
}

export async function startJourney(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const journey = await JourneyService.startJourney({
      userId: req.user.id,
      origin: req.body.origin,
      destination: req.body.destination,
      plannedRoute: req.body.planned_route,
      expectedDurationMinutes: req.body.expected_duration_minutes,
      trustedContactIds: req.body.trusted_contact_ids,
    });

    res.status(201).json({
      success: true,
      message: "Safe Walk session started",
      journey,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateLocation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await JourneyService.updateLocation(
      req.params.id as string,
      {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      },
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function completeJourney(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await JourneyService.completeJourney(req.params.id as string);
    res.status(200).json({
      success: true,
      message: "Journey completed safely",
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelJourney(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await JourneyService.cancelJourney(req.params.id as string);
    res.status(200).json({
      success: true,
      message: "Journey cancelled",
    });
  } catch (err) {
    next(err);
  }
}
