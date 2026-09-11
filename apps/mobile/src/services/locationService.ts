import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  areaName: string;
  isLive: boolean;
}

const MAPTILER_KEY = 'NWS4ts6GlPJ2wfFvWYgJ';

// Default universal fallback
export const DEFAULT_COORDINATES: LocationCoordinates = {
  latitude: 30.3165,
  longitude: 78.0322,
  accuracy: 10,
  areaName: 'Dehradun, Uttarakhand',
  isLive: false,
};

// Backwards compatibility alias
export const CAMPUS_COORDINATES = DEFAULT_COORDINATES;

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${MAPTILER_KEY}`,
    );
    if (!res.ok) return 'Live GPS Location';
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const primary = data.features[0];
      const placeName = primary.place_name || primary.text;
      const parts = placeName.split(',');
      if (parts.length > 2) {
        return `${parts[0].trim()}, ${parts[1].trim()}`;
      }
      return placeName;
    }
    return 'Live GPS Location';
  } catch {
    return 'Live GPS Location';
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    Geolocation.requestAuthorization();
    return true;
  }

  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'SAFORA GPS Permission',
          message:
            'SAFORA requires your live GPS location for Safe Walk navigation, instant SOS dispatches, and nearby hazard alerts.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow GPS',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Robust live hardware GPS fetcher:
 * 1. Explicitly ensures Android location permission is prompted.
 * 2. Tries High Accuracy GPS satellite lock first.
 * 3. Falls back immediately to Network/Wi-Fi location if indoors.
 */
export async function getCurrentCoordinates(): Promise<LocationCoordinates> {
  await requestLocationPermission();

  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy || 8);
        const resolvedName = await reverseGeocode(lat, lng);

        resolve({
          latitude: lat,
          longitude: lng,
          accuracy,
          areaName: resolvedName,
          isLive: true,
        });
      },
      () => {
        // High accuracy failed or timed out (e.g. indoors); fallback to network provider
        Geolocation.getCurrentPosition(
          async netPos => {
            const lat = netPos.coords.latitude;
            const lng = netPos.coords.longitude;
            const accuracy = Math.round(netPos.coords.accuracy || 20);
            const resolvedName = await reverseGeocode(lat, lng);

            resolve({
              latitude: lat,
              longitude: lng,
              accuracy,
              areaName: resolvedName,
              isLive: true,
            });
          },
          () => {
            // Absolute fallback if no GPS hardware enabled
            resolve(DEFAULT_COORDINATES);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
    );
  });
}

/**
 * Watch live position changes for active Safe Walk navigation
 */
export function watchUserLocation(
  onUpdate: (coords: LocationCoordinates) => void,
): () => void {
  const watchId = Geolocation.watchPosition(
    async position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = Math.round(position.coords.accuracy || 8);
      onUpdate({
        latitude: lat,
        longitude: lng,
        accuracy,
        areaName: 'Tracking live...',
        isLive: true,
      });
    },
    () => {},
    { enableHighAccuracy: true, distanceFilter: 5, interval: 3000 },
  );

  return () => {
    Geolocation.clearWatch(watchId);
  };
}
