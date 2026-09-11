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
      // Pick best readable place name (e.g. "Rajpur Road, Dehradun")
      const primary = data.features[0];
      const placeName = primary.place_name || primary.text;
      // Truncate if overly long
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
          title: 'SAFORA Location Permission',
          message:
            'SAFORA requires access to your GPS location for emergency SOS broadcasts, Safe Walk navigation, and nearby hazard alerts.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Grant GPS Access',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  return false;
}

export function getCurrentCoordinates(): Promise<LocationCoordinates> {
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
        // Fallback gracefully if GPS hardware or permission unavailable
        resolve(DEFAULT_COORDINATES);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    );
  });
}
