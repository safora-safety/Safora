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
    const limit = Math.min(200, parseInt(String(req.query.limit || "100"), 10));
    const status = req.query.status as string | undefined;
    const rows = await JourneyRepository.findAll(limit, status);
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
        plannedRoute: r.planned_route || null,
        status: r.status,
        startedAt:
          r.started_at instanceof Date
            ? r.started_at.toISOString()
            : String(r.started_at),
        endedAt:
          r.ended_at instanceof Date
            ? r.ended_at.toISOString()
            : r.ended_at
              ? String(r.ended_at)
              : null,
        deviatedAt: r.deviated_at || null,
        battery: (r as any).battery || null,
        speed: (r as any).speed || null,
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

export async function updateJourneyStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    if (
      !status ||
      !["active", "deviated", "completed", "cancelled"].includes(status)
    ) {
      throw new AppError(
        "Invalid status. Allowed values: 'active', 'deviated', 'completed', 'cancelled'",
        400,
      );
    }

    const updated = await JourneyRepository.updateStatusByStaff(id, status);
    if (!updated) {
      throw new AppError("Journey not found", 404);
    }

    res.status(200).json({
      success: true,
      message: `Journey #${id} status updated to '${status}'`,
      journey: updated,
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

export async function getCorridorConfig(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const thresholdMeters = JourneyService.getCorridorThreshold();
    res.status(200).json({
      success: true,
      deviationThresholdMeters: thresholdMeters,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateCorridorConfig(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const meters = Number(
      req.body.deviationThresholdMeters || req.body.thresholdMeters,
    );
    if (isNaN(meters) || meters < 20 || meters > 1000) {
      throw new AppError(
        "deviationThresholdMeters must be a number between 20 and 1000 meters",
        400,
      );
    }
    const updated = JourneyService.setCorridorThreshold(meters);
    res.status(200).json({
      success: true,
      deviationThresholdMeters: updated,
      message: `Corridor deviation threshold updated to ${updated}m`,
    });
  } catch (err) {
    next(err);
  }
}
