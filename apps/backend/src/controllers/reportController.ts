import { Request, Response, NextFunction } from "express";
import { ReportService } from "../services/reportService";
import { AuthenticatedRequest } from "../middleware/auth";

export async function createReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const report = await ReportService.createReport({
      userId: req.user?.id || null,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
      severity: req.body.severity,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      photo_url: req.body.photo_url,
    });

    res.status(201).json({
      success: true,
      message: "Hazard report published",
      report,
    });
  } catch (err) {
    next(err);
  }
}

export async function getReports(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const reports = await ReportService.getReports(limit);

    res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (err) {
    next(err);
  }
}

export async function getNearbyReports(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const lat = parseFloat(req.query.lat as string) || 30.3165;
    const lng = parseFloat(req.query.lng as string) || 78.0322;
    const radiusMeters = parseFloat(req.query.radius as string) || 5000;

    const { reports, source } = await ReportService.getNearbyReports(
      lat,
      lng,
      radiusMeters,
    );

    res.status(200).json({
      success: true,
      source,
      center: { lat, lng },
      radiusMeters,
      count: reports.length,
      reports,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSafetyScore(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const lat = parseFloat(req.query.lat as string) || 30.3165;
    const lng = parseFloat(req.query.lng as string) || 78.0322;
    const radiusMeters = parseFloat(req.query.radius as string) || 1000;

    const scoreData = await ReportService.calculateSafetyScore(
      lat,
      lng,
      radiusMeters,
    );

    res.status(200).json({
      success: true,
      ...scoreData,
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const count = await ReportService.confirmReport(req.params.id as string);
    res.status(200).json({
      success: true,
      message: "Report confirmed",
      confirmations_count: count,
    });
  } catch (err) {
    next(err);
  }
}

export async function moderateReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await ReportService.moderateReport(
      req.params.id as string,
      req.body.status,
    );
    res.status(200).json({
      success: true,
      message: `Report marked as ${req.body.status}`,
    });
  } catch (err) {
    next(err);
  }
}
