import { apiClient } from './api';
import { HazardReport, HazardStatus } from '@safora/shared-types';

export interface PaginationMetadata {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ReportsResponse {
  success: boolean;
  count: number;
  reports: HazardReport[];
  pagination?: PaginationMetadata;
}

export interface SafetyScoreResponse {
  success: boolean;
  score: number;
  hazardCount: number;
  breakdown: Record<string, number>;
}

export interface CreateReportInput {
  category: string;
  title: string;
  description?: string;
  severity: number;
  latitude: number;
  longitude: number;
  photo_url?: string | null;
}

export const reportService = {
  async createReport(data: CreateReportInput): Promise<HazardReport> {
    const response = await apiClient.post<{ success: boolean; report: HazardReport }>('/reports', data);
    return response.data.report || (response.data as any).data?.report || (response.data as any);
  },

  async getReports(limit: number = 100): Promise<HazardReport[]> {
    const response = await apiClient.get<ReportsResponse>(`/reports?limit=${limit}`);
    return response.data.reports || [];
  },

  async getReportsPaginated(
    page: number = 1,
    limit: number = 25,
    status?: string,
    category?: string
  ): Promise<{ reports: HazardReport[]; pagination?: PaginationMetadata }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status && status !== 'all') params.append('status', status);
    if (category && category !== 'all') params.append('category', category);
    const response = await apiClient.get<ReportsResponse>(`/reports?${params.toString()}`);
    return {
      reports: response.data.reports || [],
      pagination: response.data.pagination,
    };
  },

  async getNearbyReports(lat: number, lng: number, radiusMeters: number = 5000): Promise<HazardReport[]> {
    const response = await apiClient.get<{ success: boolean; reports: HazardReport[] }>(
      `/reports/nearby?lat=${lat}&lng=${lng}&radius=${radiusMeters}`
    );
    return response.data.reports || [];
  },

  async getSafetyScore(lat: number, lng: number, radiusMeters: number = 1000): Promise<SafetyScoreResponse> {
    const response = await apiClient.get<SafetyScoreResponse>(
      `/reports/safety-score?lat=${lat}&lng=${lng}&radius=${radiusMeters}`
    );
    return response.data;
  },

  async moderateReport(id: string | number, status: HazardStatus, resolutionNotes?: string): Promise<void> {
    await apiClient.patch(`/reports/${id}/moderate`, { status, resolutionNotes });
  },

  async confirmReport(id: string | number): Promise<number> {
    const response = await apiClient.patch<{ success: boolean; confirmations_count: number }>(
      `/reports/${id}/confirm`
    );
    return response.data.confirmations_count;
  },

  async getAnalyticsSummary(): Promise<AnalyticsData> {
    const response = await apiClient.get<{ success: boolean; data: AnalyticsData }>(
      '/reports/analytics/summary'
    );
    return response.data.data;
  },
};

export interface AnalyticsData {
  categoryData: Array<{ category: string; name: string; count: number; fill: string }>;
  severityData: Array<{ level: string; severity: number; reports: number }>;
  hourlyTrend: Array<{ time: string; incidents: number }>;
  kpis: {
    safetyIndex: string;
    totalReports: number;
    activeReports: number;
    resolvedReports: number;
    totalSos: number;
    activeJourneys: number;
    totalUsers: number;
    peakRiskHours: string;
    averageDispatchSla: string;
  };
}

