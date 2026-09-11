import { AppError } from "../errors/AppError";
import { HazardReport, SafetyScoreResponse } from "@safora/shared-types";
import { ReportRepository } from "../repositories/reportRepository";
import { ReportModel } from "../models/Report";
import { MemoryCache } from "../utils/cache";

export class ReportService {
  static async createReport(data: {
    userId?: string | number | null;
    category: string;
    title: string;
    description?: string;
    severity: number;
    latitude: number;
    longitude: number;
    photo_url?: string | null;
  }): Promise<HazardReport> {
    const parsedSeverity = Math.min(5, Math.max(1, data.severity || 3));

    const row = await ReportRepository.create({
      userId: data.userId,
      category: data.category,
      title: data.title.trim(),
      description: data.description || "",
      severity: parsedSeverity,
      latitude: data.latitude,
      longitude: data.longitude,
      photoUrl: data.photo_url || null,
    });

    // Invalidate cached reports across spatial grids
    MemoryCache.invalidatePattern("reports_");

    return ReportModel.fromRow(row);
  }

  static async getReports(limit = 50): Promise<HazardReport[]> {
    const boundedLimit = Math.min(100, Math.max(1, limit));
    const cacheKey = `reports_list_${boundedLimit}`;
    const cached = MemoryCache.get<HazardReport[]>(cacheKey);
    if (cached) return cached;

    const rows = await ReportRepository.findAll(boundedLimit);
    const reports = rows.map((r) => ReportModel.fromRow(r));
    MemoryCache.set(cacheKey, reports, 20);
    return reports;
  }

  static async getNearbyReports(
    lat: number,
    lng: number,
    radiusMeters = 5000,
  ): Promise<{ reports: HazardReport[]; source: string }> {
    const cacheKey = `reports_nearby_${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusMeters}`;
    const cached = MemoryCache.get<{ reports: HazardReport[]; source: string }>(
      cacheKey,
    );
    if (cached) return cached;

    const rows = await ReportRepository.findNearby(lat, lng, radiusMeters, 100);
    const reports = rows.map((r) => ReportModel.fromRow(r));
    const result = { reports, source: "postgis_gist" };
    MemoryCache.set(cacheKey, result, 20);
    return result;
  }

  static async calculateSafetyScore(
    lat: number,
    lng: number,
    radiusMeters = 1000,
  ): Promise<SafetyScoreResponse> {
    const { reports } = await this.getNearbyReports(lat, lng, radiusMeters);

    let totalPenalty = 0;
    let highSeverityCount = 0;
    let nearestMeters = Infinity;

    const HALF_LIFE_HOURS = 24;
    const DECAY_LAMBDA = Math.log(2) / HALF_LIFE_HOURS;

    for (const report of reports) {
      if (report.severity >= 4) highSeverityCount++;
      if (
        report.distanceMeters !== undefined &&
        report.distanceMeters < nearestMeters
      ) {
        nearestMeters = report.distanceMeters;
      }

      // Severity Weight S (1.0 to 6.0)
      const severityWeights: Record<number, number> = {
        1: 1.0,
        2: 1.5,
        3: 2.5,
        4: 4.0,
        5: 6.0,
      };
      const S = severityWeights[report.severity] || 2.0;

      // Distance Falloff D(d)
      const dist = report.distanceMeters || 0;
      const D = Math.max(0, 1 - dist / radiusMeters);

      // Recency Decay T(t)
      const ageHours = report.createdAt
        ? (Date.now() - new Date(report.createdAt).getTime()) / (1000 * 60 * 60)
        : 1;
      const T = Math.exp(-DECAY_LAMBDA * Math.max(0, ageHours));

      // Community Confirmation Multiplier C(c)
      const confirms = report.confirmationsCount || 0;
      const C = 1.0 + 0.15 * Math.min(confirms, 5);

      totalPenalty += S * D * T * C * 5; // Scale penalty
    }

    const safetyScore = Math.max(
      0,
      Math.min(100, Math.round(100 - totalPenalty)),
    );
    const riskLevel: "safe" | "moderate" | "high" =
      safetyScore >= 80 ? "safe" : safetyScore >= 50 ? "moderate" : "high";

    return {
      latitude: lat,
      longitude: lng,
      safetyScore,
      riskLevel,
      factors: {
        totalHazardsNearby: reports.length,
        highSeverityCount,
        nearestHazardMeters:
          nearestMeters === Infinity ? undefined : nearestMeters,
      },
    };
  }

  static async confirmReport(reportId: string | number): Promise<number> {
    const newCount = await ReportRepository.incrementConfirmations(reportId);
    if (newCount === null) {
      throw new AppError("Hazard report not found", 404);
    }
    MemoryCache.invalidatePattern("reports_");
    return newCount;
  }

  static async moderateReport(
    reportId: string | number,
    status: string,
  ): Promise<void> {
    const allowed = ["active", "resolved", "duplicate", "fake"];
    if (!allowed.includes(status)) {
      throw new AppError("Invalid moderation status", 400);
    }

    const updated = await ReportRepository.updateStatus(reportId, status);
    if (!updated) {
      throw new AppError("Hazard report not found", 404);
    }
    MemoryCache.invalidatePattern("reports_");
  }
}
