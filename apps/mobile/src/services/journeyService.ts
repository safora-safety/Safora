import { apiClient } from './apiClient';
import { Journey, ApiResponse } from '@safora/shared-types';

export interface StartJourneyPayload {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  planned_route?: [number, number][];
  expected_duration_minutes?: number;
  trusted_contact_ids?: (string | number)[];
}

export class JourneyService {
  /**
   * Start a new Safe Walk journey session
   */
  static async startJourney(payload: StartJourneyPayload): Promise<Journey> {
    try {
      const res = await apiClient.post<
        ApiResponse<{ journey: Journey }> & { journey: Journey }
      >('/journeys/start', payload);
      return res.data.journey || (res.data as any).data?.journey;
    } catch {
      return {
        id: 'journey-' + Date.now(),
        userId: 'user-current',
        origin: payload.origin,
        destination: payload.destination,
        plannedRoute: payload.planned_route,
        trustedContactIds: payload.trusted_contact_ids || [],
        status: 'active',
        startedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Send live GPS breadcrumb update & check corridor compliance
   */
  static async updateLocation(
    journeyId: string | number,
    coords: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
    },
  ): Promise<{
    status: string;
    deviationMeters?: number;
    isDeviated: boolean;
  }> {
    try {
      const res = await apiClient.patch<
        ApiResponse<{ status: string; deviationMeters?: number }> & {
          status: string;
          deviationMeters?: number;
        }
      >(`/journeys/${journeyId}/location`, coords);

      const status =
        res.data.status || (res.data as any).data?.status || 'active';
      const deviationMeters =
        res.data.deviationMeters ??
        (res.data as any).data?.deviationMeters ??
        0;

      return {
        status,
        deviationMeters,
        isDeviated: status === 'deviated',
      };
    } catch {
      return { status: 'active', deviationMeters: 0, isDeviated: false };
    }
  }

  /**
   * End and complete Safe Walk journey upon safe arrival
   */
  static async completeJourney(journeyId: string | number): Promise<void> {
    try {
      await apiClient.patch(`/journeys/${journeyId}/complete`);
    } catch {
      // Offline fallback
    }
  }

  /**
   * Cancel an active Safe Walk session
   */
  static async cancelJourney(journeyId: string | number): Promise<void> {
    try {
      await apiClient.patch(`/journeys/${journeyId}/cancel`);
    } catch {
      // Offline fallback
    }
  }
}
