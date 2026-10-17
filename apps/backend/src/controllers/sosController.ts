import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { SosService } from "../services/sosService";
import { processSosAudioChunk } from "../services/sosAudioService";
import { AppError } from "../errors/AppError";

export async function triggerSOS(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const requestedIsTest = Boolean(req.body.is_test ?? req.body.isTest);
    const isStaff = req.user.role === "admin" || req.user.role === "moderator";
    const isTest = isStaff ? requestedIsTest : false;

    const result = await SosService.triggerSOS({
      userId: req.user.id,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      accuracy: req.body.accuracy,
      batteryPercentage: req.body.battery_percentage,
      journeyId: req.body.journey_id,
      audioUrl: req.body.audio_url || req.body.audioUrl,
      isTest,
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

export async function updateContact(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const contact = await SosService.updateContact(
      req.user.id,
      req.params.id as string,
      req.body,
    );
    res.status(200).json({
      success: true,
      message: "Trusted contact updated",
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

export async function checkGuardian(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      (req.query.email as string) || (req.query.query as string) || "";
    const result = await SosService.checkGuardianAccount(query);
    res.status(200).json({
      success: true,
      exists: result.exists,
      name: result.name,
    });
  } catch (err) {
    next(err);
  }
}

export async function testGuardian(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const result = await SosService.testGuardianAlert(req.user.id, {
      contactId: req.body.contactId,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getNotifications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const limit = Math.min(100, parseInt(String(req.query.limit || "50"), 10));
    const page = parseInt(String(req.query.page || "1"), 10);
    const offset = Math.max(0, (page - 1) * limit);

    const { notifications, totalCount } =
      await SosService.getNotificationsPaginated(req.user.id, limit, offset);

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    await SosService.markNotificationRead(req.user.id, req.params.id as string);
    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const count = await SosService.markAllNotificationsRead(req.user.id);
    res.status(200).json({
      success: true,
      message: `${count} notifications marked as read`,
    });
  } catch (err) {
    next(err);
  }
}

export async function attachAudio(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const audioUrl = req.body.audio_url || req.body.audioUrl;
    if (!audioUrl) {
      throw new AppError("Audio URL is required", 400);
    }

    const alert = await SosService.attachAudio(
      req.params.id as string,
      req.user.id,
      audioUrl,
    );

    res.status(200).json({
      success: true,
      message: "Audio evidence attached to SOS alert",
      alert,
    });
  } catch (err) {
    next(err);
  }
}

export async function streamAudioChunk(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const alertId = req.params.id || req.body.alertId || req.body.alert_id;
    if (!alertId) {
      throw new AppError("Alert ID is required", 400);
    }

    const result = await processSosAudioChunk({
      alertId,
      userId: req.user.id,
      userRole: req.user.role,
      seq: Number(req.body.seq),
      totalChunksExpected: req.body.totalChunksExpected
        ? Number(req.body.totalChunksExpected)
        : undefined,
      durationSec: req.body.durationSec
        ? Number(req.body.durationSec)
        : undefined,
      sampleRate: req.body.sampleRate ? Number(req.body.sampleRate) : undefined,
      mimeType: req.body.mimeType,
      data: req.body.data,
      isLast: Boolean(req.body.isLast),
    });

    res.status(200).json({
      message: "Audio chunk processed",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAlerts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = Math.min(200, parseInt(String(req.query.limit || "100"), 10));
    const page = parseInt(String(req.query.page || "1"), 10);
    const offset = Math.max(0, (page - 1) * limit);
    const status = req.query.status as string | undefined;

    const { alerts, totalCount } = await SosService.getAllAlertsPaginated(
      limit,
      offset,
      status,
    );
    res.status(200).json({
      success: true,
      count: alerts.length,
      alerts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await SosService.updateStatus(
      req.params.id as string,
      req.body.status,
    );
    res.status(200).json({
      success: true,
      message: `SOS alert status updated to ${req.body.status}`,
      alert: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPendingGuardianRequests(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const requests = await SosService.getPendingGuardianRequests(req.user.id);
    res.status(200).json({
      success: true,
      requests,
    });
  } catch (err) {
    next(err);
  }
}

export async function getWardsForGuardian(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const wards = await SosService.getWardsForGuardian(req.user.id);
    res.status(200).json({
      success: true,
      wards,
    });
  } catch (err) {
    next(err);
  }
}

export async function respondToGuardianRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const action = req.body.action;
    if (action !== "accept" && action !== "decline") {
      throw new AppError("Action must be 'accept' or 'decline'", 400);
    }
    const updated = await SosService.respondToGuardianRequest(
      req.params.id as string,
      req.user.id,
      action,
    );
    res.status(200).json({
      success: true,
      message: `Guardian request ${action}ed successfully`,
      contact: updated,
    });
  } catch (err) {
    next(err);
  }
}
