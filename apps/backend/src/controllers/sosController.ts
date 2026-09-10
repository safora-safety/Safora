import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { SosService } from "../services/sosService";
import { AppError } from "../errors/AppError";

export async function triggerSOS(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const result = await SosService.triggerSOS({
      userId: req.user.id,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      accuracy: req.body.accuracy,
      batteryPercentage: req.body.battery_percentage,
      journeyId: req.body.journey_id,
    });

    res.status(201).json({
      success: true,
      message: "Emergency SOS dispatched",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getContacts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const contacts = await SosService.getContacts(req.user.id);
    res.status(200).json({
      success: true,
      count: contacts.length,
      contacts,
    });
  } catch (err) {
    next(err);
  }
}

export async function addContact(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const contact = await SosService.addContact(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: "Trusted contact added",
      contact,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteContact(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    await SosService.deleteContact(req.user.id, req.params.id as string);
    res.status(200).json({
      success: true,
      message: "Contact deleted",
    });
  } catch (err) {
    next(err);
  }
}
