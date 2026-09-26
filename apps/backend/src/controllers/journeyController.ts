import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { JourneyService } from "../services/journeyService";
import { JourneyRepository } from "../repositories/journeyRepository";
import { WatchdogService } from "../services/watchdogService";
import { AppError } from "../errors/AppError";

export async function getActiveJourneys(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await JourneyRepository.findActiveJourneys();
    const journeys = rows.map((r) => {
      const realLat =
        r.last_lat != null ? Number(r.last_lat) : Number(r.origin_lat);
      const realLng =
        r.last_lng != null ? Number(r.last_lng) : Number(r.origin_lng);

      return {
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
          latitude: realLat,
          longitude: realLng,
        },
        lastLocation: {
          latitude: realLat,
          longitude: realLng,
        },
        lastSeenAt: r.last_seen_at || r.started_at,
        deviatedAt: r.deviated_at || null,
        status: r.status,
        startedAt:
          r.started_at instanceof Date
            ? r.started_at.toISOString()
            : String(r.started_at),
        expectedArrivalAt: r.expected_arrival_at,
        expectedDurationMins: 15,
      };
    });

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
      {
        speed: req.body.speed,
        battery: req.body.battery,
        userId: req.user?.id,
        userRole: req.user?.role,
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

export async function confirmSafe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await JourneyService.confirmSafe(
      req.params.id as string,
      req.user?.id,
      req.user?.role,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function internalTick(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const secret = req.header("X-Internal-Secret");
  const expectedSecret = process.env.INTERNAL_TICK_SECRET;
  if (!expectedSecret || !secret || secret !== expectedSecret) {
    res.status(401).end();
    return;
  }

  try {
    const result = await WatchdogService.scan();
    res.status(200).json(result);
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
    await JourneyService.completeJourney(
      req.params.id as string,
      req.user?.id,
      req.user?.role,
    );
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
    await JourneyService.cancelJourney(
      req.params.id as string,
      req.user?.id,
      req.user?.role,
    );
    res.status(200).json({
      success: true,
      message: "Journey cancelled",
    });
  } catch (err) {
    next(err);
  }
}

export async function getActiveEscort(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const escort = await JourneyService.getActiveEscortForGuardian(req.user.id);
    res.status(200).json({
      success: true,
      escort,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteJourney(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    await JourneyService.deleteJourney(
      req.params.id as string,
      req.user.id,
      req.user.role,
    );
    res.status(200).json({
      success: true,
      message: "Journey deleted",
    });
  } catch (err) {
    next(err);
  }
}
