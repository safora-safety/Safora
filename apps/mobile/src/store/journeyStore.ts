import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteCoord } from '../services/routingService';

const JOURNEY_SESSION_KEY = '@safora_active_journey_session';

export interface JourneySessionState {
  isActive: boolean;
  journeyId: string | number | null;
  destination: {
    latitude: number;
    longitude: number;
    name: string;
  } | null;
  routeCoords: RouteCoord[];
  routeDistanceMeters: number;
  routeDurationSeconds: number;
  secondsRemaining: number;
  isDeviated: boolean;
  deviationCountdown: number | null;
  guardianAlertDispatched: boolean;
  selectedGuardianIds: (string | number)[];

  // Actions
  startSession: (data: {
    journeyId: string | number;
    destination: { latitude: number; longitude: number; name: string };
    routeCoords: RouteCoord[];
    distanceMeters: number;
    durationSeconds: number;
    selectedGuardianIds: (string | number)[];
  }) => void;
  updateSecondsRemaining: (
    updater: number | ((prev: number) => number),
  ) => void;
  setDeviation: (isDeviated: boolean, countdown?: number | null) => void;
  setGuardianAlertDispatched: (dispatched: boolean) => void;
  stopSession: () => void;
  hydrateSession: () => Promise<void>;
}

export const useJourneyStore = create<JourneySessionState>((set, get) => ({
  isActive: false,
  journeyId: null,
  destination: null,
  routeCoords: [],
  routeDistanceMeters: 850,
  routeDurationSeconds: 600,
  secondsRemaining: 600,
  isDeviated: false,
  deviationCountdown: null,
  guardianAlertDispatched: false,
  selectedGuardianIds: [],

  startSession: data => {
    const nextState = {
      isActive: true,
      journeyId: data.journeyId,
      destination: data.destination,
      routeCoords: data.routeCoords,
      routeDistanceMeters: data.distanceMeters,
      routeDurationSeconds: data.durationSeconds,
      secondsRemaining: data.durationSeconds,
      isDeviated: false,
      deviationCountdown: null,
      guardianAlertDispatched: false,
      selectedGuardianIds: data.selectedGuardianIds,
    };
    set(nextState);
    AsyncStorage.setItem(
      JOURNEY_SESSION_KEY,
      JSON.stringify({
        ...nextState,
        startedAt: Date.now(),
      }),
    ).catch(() => {});
  },

  updateSecondsRemaining: updater => {
    const current = get().secondsRemaining;
    const next = typeof updater === 'function' ? updater(current) : updater;
    set({ secondsRemaining: Math.max(0, next) });
  },

  setDeviation: (isDeviated, countdown = null) => {
    set({ isDeviated, deviationCountdown: countdown });
  },

  setGuardianAlertDispatched: guardianAlertDispatched => {
    set({ guardianAlertDispatched });
  },

  stopSession: () => {
    set({
      isActive: false,
      journeyId: null,
      destination: null,
      routeCoords: [],
      secondsRemaining: 600,
      isDeviated: false,
      deviationCountdown: null,
      guardianAlertDispatched: false,
      selectedGuardianIds: [],
    });
    AsyncStorage.removeItem(JOURNEY_SESSION_KEY).catch(() => {});
  },

  hydrateSession: async () => {
    try {
      const raw = await AsyncStorage.getItem(JOURNEY_SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isActive && parsed.journeyId) {
        const elapsedSeconds = parsed.startedAt
          ? Math.floor((Date.now() - parsed.startedAt) / 1000)
          : 0;
        const remaining = Math.max(
          0,
          (parsed.routeDurationSeconds || 600) - elapsedSeconds,
        );

        set({
          isActive: true,
          journeyId: parsed.journeyId,
          destination: parsed.destination || null,
          routeCoords: parsed.routeCoords || [],
          routeDistanceMeters: parsed.routeDistanceMeters || 850,
          routeDurationSeconds: parsed.routeDurationSeconds || 600,
          secondsRemaining: remaining,
          isDeviated: Boolean(parsed.isDeviated),
          deviationCountdown: parsed.deviationCountdown ?? null,
          guardianAlertDispatched: Boolean(parsed.guardianAlertDispatched),
          selectedGuardianIds: parsed.selectedGuardianIds || [],
        });
      }
    } catch {
      // Ignore parse errors
    }
  },
}));
