import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  areaName: string;
  isLive: boolean;
}

// Default fallback to Dev Bhoomi Uttarakhand University campus coordinates
export const CAMPUS_COORDINATES: LocationCoordinates = {
  latitude: 30.3165,
  longitude: 78.0322,
  accuracy: 12,
  areaName: 'DBUU Campus, Chakrata Rd, Dehradun',
  isLive: false,
};

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
            'SAFORA requires access to your GPS location for emergency SOS broadcasts and Safe Walk navigation.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Grant Access',
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
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 10),
          areaName: 'Dehradun, Uttarakhand',
          isLive: true,
        });
      },
      () => {
        // Fallback gracefully to DBUU Campus coordinates if GPS hardware or permission unavailable
        resolve(CAMPUS_COORDINATES);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
    );
  });
}
