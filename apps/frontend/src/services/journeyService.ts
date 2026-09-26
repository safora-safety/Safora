import { apiClient } from './api';

export interface ActiveJourney {
  id: string | number;
  userId: string | number;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  origin: { latitude: number; longitude: number; name?: string };
  destination: { latitude: number; longitude: number; name?: string };
  currentLocation?: { latitude: number; longitude: number };
  lastLocation?: { latitude: number; longitude: number };
  plannedRoute?: Array<{ latitude: number; longitude: number } | [number, number]> | null;
  status: 'active' | 'completed' | 'cancelled' | 'deviated';
  startedAt: string;
  endedAt?: string | null;
  expectedArrivalAt?: string;
  expectedDurationMins?: number;
  deviatedAt?: string | null;
  battery?: number | null;
  speed?: number | null;
  isSimulated?: boolean;
}

export const journeyService = {
  // Live fetch active journeys (status IN active, deviated)
  async getActiveJourneys(): Promise<ActiveJourney[]> {
    const res = await apiClient.get<{ success: boolean; journeys: ActiveJourney[] }>(
      '/journeys/active'
    );
    return res.data?.journeys || [];
  },

  // Live fetch all walks with optional status filtering (completed, cancelled, active, deviated)
  async getAllJourneys(status?: string): Promise<ActiveJourney[]> {
    const query = status && status !== 'all' ? `?status=${status}&limit=100` : '?limit=100';
    const res = await apiClient.get<{ success: boolean; journeys: ActiveJourney[] }>(
      `/journeys${query}`
    );
    return res.data?.journeys || [];
  },

  // Staff action: update walk status (completed, cancelled, deviated, active)
  async updateStatus(
    journeyId: string | number,
    status: 'active' | 'deviated' | 'completed' | 'cancelled'
  ): Promise<ActiveJourney> {
    const res = await apiClient.patch<{ success: boolean; journey: ActiveJourney }>(
      `/journeys/${journeyId}/status`,
      { status }
    );
    return res.data?.journey;
  },

  // Fetch current backend corridor deviation sensitivity threshold
  async getCorridorConfig(): Promise<number> {
    try {
      const res = await apiClient.get<{ success: boolean; deviationThresholdMeters: number }>(
        '/journeys/config/corridor'
      );
      return res.data?.deviationThresholdMeters || 100;
    } catch {
      return 100;
    }
  },

  // Admin action: configure live corridor deviation sensitivity threshold
  async updateCorridorConfig(deviationThresholdMeters: number): Promise<number> {
    const res = await apiClient.patch<{ success: boolean; deviationThresholdMeters: number }>(
      '/journeys/config/corridor',
      { deviationThresholdMeters }
    );
    return res.data?.deviationThresholdMeters || deviationThresholdMeters;
  },
};
