import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  areaName: string;
  isLive: boolean;
}

const MAPTILER_KEY = 'NWS4ts6GlPJ2wfFvWYgJ';
const LAST_KNOWN_LOCATION_KEY = '@safora_last_known_location';

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

const saveLastKnown = async (loc: LocationCoordinates) => {
  try {
    await AsyncStorage.setItem(LAST_KNOWN_LOCATION_KEY, JSON.stringify(loc));
  } catch {}
};

/**
 * Fast coarse IP geolocation fallback for brand-new app installs
 * when GPS satellite lock has not yet resolved and AsyncStorage is empty.
 */
async function fetchCoarseIpCoordinates(): Promise<LocationCoordinates | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (
      data &&
      typeof data.latitude === 'number' &&
      typeof data.longitude === 'number'
    ) {
      const area = data.city
        ? `${data.city}, ${data.region || data.country_name}`
        : 'Current Region';
      const loc: LocationCoordinates = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 3000,
        areaName: area,
        isLive: false,
      };
      saveLastKnown(loc);
      return loc;
    }
  } catch {
    // Silently fall through
  }
  return null;
}

const getFallbackCoordinates = async (): Promise<LocationCoordinates> => {
  try {
    const cached = await AsyncStorage.getItem(LAST_KNOWN_LOCATION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.latitude === 'number') {
        return { ...parsed, isLive: false };
      }
    }
  } catch {}

  // On brand-new install with empty cache, resolve local IP coordinates before defaulting to Dehradun
  const ipLoc = await fetchCoarseIpCoordinates();
  if (ipLoc) {
    return ipLoc;
  }

  return DEFAULT_COORDINATES;
};

/**
 * Robust live hardware GPS fetcher:
 * 1. Explicitly ensures Android location permission is prompted.
 * 2. Checks Android system-level last known location with high maximumAge (instantaneous).
 * 3. Tries High Accuracy GPS satellite lock.
 * 4. Falls back to Network/Wi-Fi location if indoors.
 * 5. Falls back to persistent cache or IP geolocation before default coordinates.
 */
export async function getCurrentCoordinates(): Promise<LocationCoordinates> {
  await requestLocationPermission();

  return new Promise(async resolve => {
    const handleSuccess = async (lat: number, lng: number, acc: number) => {
      const resolvedName = await reverseGeocode(lat, lng);
      const loc: LocationCoordinates = {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        areaName: resolvedName,
        isLive: true,
      };
      saveLastKnown(loc);
      resolve(loc);
    };

    // 1. Fast check: retrieve system's cached position (maximumAge: 1 hr) so first install doesn't lag
    Geolocation.getCurrentPosition(
      cachedPos => {
        const lat = cachedPos.coords.latitude;
        const lng = cachedPos.coords.longitude;
        const accuracy = Math.round(cachedPos.coords.accuracy || 15);
        handleSuccess(lat, lng, accuracy);
      },
      () => {
        // 2. High accuracy active satellite acquisition
        Geolocation.getCurrentPosition(
          position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = Math.round(position.coords.accuracy || 8);
            handleSuccess(lat, lng, accuracy);
          },
          () => {
            // 3. Indoors / cellular network provider fallback
            Geolocation.getCurrentPosition(
              netPos => {
                const lat = netPos.coords.latitude;
                const lng = netPos.coords.longitude;
                const accuracy = Math.round(netPos.coords.accuracy || 20);
                handleSuccess(lat, lng, accuracy);
              },
              () => {
                // 4. Watch position warmup fallback
                let hasResolved = false;
                let watchId: number | null = null;
                const cleanup = () => {
                  if (watchId !== null) {
                    Geolocation.clearWatch(watchId);
                    watchId = null;
                  }
                };

                const timer = setTimeout(async () => {
                  if (!hasResolved) {
                    hasResolved = true;
                    cleanup();
                    const fallback = await getFallbackCoordinates();
                    resolve(fallback);
                  }
                }, 6000);

                try {
                  watchId = Geolocation.watchPosition(
                    warmPos => {
                      if (hasResolved) return;
                      hasResolved = true;
                      clearTimeout(timer);
                      cleanup();
                      const lat = warmPos.coords.latitude;
                      const lng = warmPos.coords.longitude;
                      const accuracy = Math.round(
                        warmPos.coords.accuracy || 12,
                      );
                      handleSuccess(lat, lng, accuracy);
                    },
                    async () => {
                      if (!hasResolved) {
                        hasResolved = true;
                        clearTimeout(timer);
                        cleanup();
                        const fallback = await getFallbackCoordinates();
                        resolve(fallback);
                      }
                    },
                    {
                      enableHighAccuracy: true,
                      distanceFilter: 1,
                      interval: 1500,
                    },
                  );
                } catch {
                  clearTimeout(timer);
                  getFallbackCoordinates().then(resolve);
                }
              },
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
            );
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
        );
      },
      { enableHighAccuracy: false, timeout: 2000, maximumAge: 3600000 },
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
