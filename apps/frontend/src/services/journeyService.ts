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
  // Live fetch from backend API with sample fallback if zero active walkers currently
  async getActiveJourneys(): Promise<{ journeys: ActiveJourney[]; isLive: boolean }> {
    try {
      const res = await apiClient.get<{ success: boolean; journeys: ActiveJourney[] }>(
        '/journeys/active'
      );
      if (res.data?.journeys && res.data.journeys.length > 0) {
        return { journeys: res.data.journeys, isLive: true };
      }
    } catch (err) {
      console.warn('Backend active journeys query failed, loading radar fallback:', err);
    }

    // Return sample radar escorts if no current active database journeys
    return {
      journeys: this.getMockActiveJourneys().map((j) => ({ ...j, isSimulated: true })),
      isLive: false,
    };
  },

  // Mock/sample journeys for the live radar
  getMockActiveJourneys(): ActiveJourney[] {
    return [
      {
        id: 'journey-ddn-01',
        userId: 'admin-01',
        userName: 'Aman Singh Kunwar (SAFORA Escort)',
        userPhone: '+91 94120 00007',
        origin: { latitude: 30.390102, longitude: 77.942654, name: 'DBUU Central Library' },
        destination: { latitude: 30.388654, longitude: 77.941287, name: 'Manduwala Girls Hostel Block C' },
        currentLocation: { latitude: 30.389456, longitude: 77.942012 },
        status: 'completed',
        startedAt: new Date(Date.now() - 35 * 60000).toISOString(),
        expectedDurationMins: 18,
      },
      {
        id: 'journey-ddn-02',
        userId: 'admin-01',
        userName: 'SAFORA Field Patrol Escort',
        userPhone: '+91 94120 00007',
        origin: { latitude: 30.275203, longitude: 78.028956, name: 'Graphic Era Gate 1, Clement Town' },
        destination: { latitude: 30.305488, longitude: 78.023714, name: 'Subhash Nagar PG Cluster' },
        currentLocation: { latitude: 30.292541, longitude: 78.024503 },
        status: 'deviated',
        startedAt: new Date(Date.now() - 18 * 60000).toISOString(),
        expectedDurationMins: 22,
      },
      {
        id: 'journey-ddn-03',
        userId: 'admin-01',
        userName: 'SAFORA Central City Escort',
        userPhone: '+91 94120 00007',
        origin: { latitude: 30.325497, longitude: 78.042213, name: 'Ghanta Ghar (Clock Tower)' },
        destination: { latitude: 30.320687, longitude: 78.038945, name: 'DAV PG College Lane, Karanpur' },
        currentLocation: { latitude: 30.322654, longitude: 78.040102 },
        status: 'completed',
        startedAt: new Date(Date.now() - 60 * 60000).toISOString(),
        expectedDurationMins: 15,
      },
      {
        id: 'journey-ddn-04',
        userId: 'admin-01',
        userName: 'SAFORA Bidholi Hill Escort',
        userPhone: '+91 94120 00007',
        origin: { latitude: 30.390655, longitude: 77.969268, name: 'UPES Bidholi Energy Acres' },
        destination: { latitude: 30.387912, longitude: 77.965843, name: 'UPES Campus Bus Stop' },
        currentLocation: { latitude: 30.388954, longitude: 77.967012 },
        status: 'active',
        startedAt: new Date(Date.now() - 6 * 60000).toISOString(),
        expectedDurationMins: 12,
      },
      {
        id: 'journey-ddn-05',
        userId: 'admin-01',
        userName: 'SAFORA Transit Night Patrol',
        userPhone: '+91 94120 00007',
        origin: { latitude: 30.279187, longitude: 78.019654, name: 'ISBT Dehradun Terminal' },
        destination: { latitude: 30.339487, longitude: 78.028911, name: 'Ballupur Chowk Residential Lane' },
        currentLocation: { latitude: 30.312876, longitude: 78.023987 },
        status: 'active',
        startedAt: new Date(Date.now() - 12 * 60000).toISOString(),
        expectedDurationMins: 25,
      },
    ];
  },
};
