import { Request, Response, NextFunction } from "express";
import { ReportService } from "../services/reportService";
import { ReportRepository } from "../repositories/reportRepository";
import { AuthenticatedRequest } from "../middleware/auth";
import { ReportModel } from "../models/Report";

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
      source:
        req.body.source ||
        (req.user?.role === "admin"
          ? "admin_dispatch"
          : "community_crowdsource"),
    });

    const isStaff =
      req.user && (req.user.role === "admin" || req.user.role === "moderator");
    const formatted = isStaff
      ? ReportModel.toStaff(report)
      : ReportModel.toPublic(report);

    res.status(201).json({
      success: true,
      message: "Hazard report published",
      report: formatted,
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

    const authReq = req as AuthenticatedRequest;
    const isStaff =
      authReq.user &&
      (authReq.user.role === "admin" || authReq.user.role === "moderator");
    const formatted = isStaff
      ? reports.map(ReportModel.toStaff)
      : reports.map(ReportModel.toPublic);

    res.status(200).json({
      success: true,
      count: formatted.length,
      reports: formatted,
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

    const authReq = req as AuthenticatedRequest;
    const isStaff =
      authReq.user &&
      (authReq.user.role === "admin" || authReq.user.role === "moderator");
    const formatted = isStaff
      ? reports.map(ReportModel.toStaff)
      : reports.map(ReportModel.toPublic);

    res.status(200).json({
      success: true,
      source,
      center: { lat, lng },
      radiusMeters,
      count: formatted.length,
      reports: formatted,
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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await ReportService.moderateReport(
      id,
      req.body.status,
      req.body.resolutionNotes || req.body.resolution_notes,
    );
    res.status(200).json({
      success: true,
      message: `Report marked as ${req.body.status}`,
    });
  } catch (err) {
    next(err);
  }
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  lighting: { label: "Poor Lighting", color: "#F59E0B" },
  road_hazard: { label: "Road Hazard", color: "#EF4444" },
  waterlogging: { label: "Waterlogging", color: "#06B6D4" },
  isolated_area: { label: "Isolated Area", color: "#8B5CF6" },
  traffic: { label: "Heavy Traffic", color: "#EC4899" },
  other: { label: "Other Hazard", color: "#64748B" },
};

export async function getAnalyticsSummary(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [rawCategories, rawSeverities, rawHourly, summaryStats] =
      await Promise.all([
        ReportRepository.getCategoryCounts(),
        ReportRepository.getSeverityCounts(),
        ReportRepository.getHourlyDistribution(),
        ReportRepository.getAnalyticsSummary(),
      ]);

    // Format categories
    const categoryData = rawCategories.map(
      (item: { category: string; count: number }) => {
        const meta = CATEGORY_META[item.category] || {
          label: item.category
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase()),
          color: "#6366F1",
        };
        return {
          category: item.category,
          name: meta.label,
          count: item.count,
          fill: meta.color,
        };
      },
    );

    // Format severities (ensure 1 through 5 are represented)
    const severityLabels: Record<number, string> = {
      1: "Severity 1 (Minor)",
      2: "Severity 2 (Moderate)",
      3: "Severity 3 (Substantial)",
      4: "Severity 4 (Severe)",
      5: "Severity 5 (Critical)",
    };
    const severityMap = new Map(
      rawSeverities.map((s: { severity: number; count: number }) => [
        s.severity,
        s.count,
      ]),
    );
    const severityData = [1, 2, 3, 4, 5].map((level) => ({
      level: severityLabels[level] || `Level ${level}`,
      severity: level,
      reports: severityMap.get(level) || 0,
    }));

    // Format hourly trend (fill 24 hours or peak corridor hours 18:00 - 02:00)
    const hourlyMap = new Map(
      rawHourly.map((h: { hour: number; count: number }) => [h.hour, h.count]),
    );
    const timeSlots = [18, 19, 20, 21, 22, 23, 0, 1, 2];
    const hourlyTrend = timeSlots.map((hour) => ({
      time: `${String(hour).padStart(2, "0")}:00`,
      incidents: hourlyMap.get(hour) || 0,
    }));

    // Compute campus safety score (base 100 minus weighted active hazards)
    const safetyIndex = Math.max(
      20,
      Math.min(
        100,
        100 - summaryStats.activeReports * 3 - summaryStats.totalSos * 5,
      ),
    );

    res.status(200).json({
      success: true,
      data: {
        categoryData,
        severityData,
        hourlyTrend,
        kpis: {
          safetyIndex: `${safetyIndex} / 100`,
          totalReports: summaryStats.totalReports,
          activeReports: summaryStats.activeReports,
          resolvedReports: summaryStats.resolvedReports,
          totalSos: summaryStats.totalSos,
          activeJourneys: summaryStats.activeJourneys,
          totalUsers: summaryStats.totalUsers,
          peakRiskHours: "21:00 - 23:00",
          averageDispatchSla: "2.4 mins",
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getDbscanClusters(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const eps = parseFloat(String(req.query.eps || "0.003")) || 0.003;
    const minPoints = parseInt(String(req.query.min_points || "2"), 10) || 2;
    const clusters = await ReportService.getDbscanClusters(eps, minPoints);
    res.status(200).json({
      success: true,
      count: clusters.length,
      clusters,
    });
  } catch (err) {
    next(err);
  }
}
