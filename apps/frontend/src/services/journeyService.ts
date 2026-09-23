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
  status: 'active' | 'completed' | 'cancelled' | 'deviated';
  startedAt: string;
  expectedArrivalAt?: string;
  expectedDurationMins?: number;
  isSimulated?: boolean;
}

export const journeyService = {
  // Live fetch from backend API (SEC-9: Real data only, no mock fallback)
  async getActiveJourneys(): Promise<ActiveJourney[]> {
    const res = await apiClient.get<{ success: boolean; journeys: ActiveJourney[] }>(
      '/journeys/active'
    );
    return res.data?.journeys || [];
  },
};
