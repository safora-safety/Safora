import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { JourneyService } from "../services/journeyService";
import { AppError } from "../errors/AppError";

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
