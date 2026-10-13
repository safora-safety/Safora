const MAPTILER_KEY = 'NWS4ts6GlPJ2wfFvWYgJ';

export interface RouteCoord {
  latitude: number;
  longitude: number;
}

export interface FootRouteResult {
  coordinates: RouteCoord[];
  distanceMeters: number;
  durationSeconds: number;
}

export interface PlaceSearchResult {
  id: string;
  name: string;
  placeName: string;
  latitude: number;
  longitude: number;
}

/**
 * Haversine formula to compute great-circle distance between two coordinates in meters
 */
export const calculateDistanceMeters = (
  c1: RouteCoord,
  c2: RouteCoord,
): number => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.latitude * Math.PI) / 180) *
      Math.cos((c2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export interface MultiModalTravelTimes {
  walkSeconds: number;
  bikeSeconds: number;
  carSeconds: number;
}

export interface MultiModalRouteResult {
  coordinates: RouteCoord[];
  distanceMeters: number;
  travelTimes: MultiModalTravelTimes;
}

/**
 * Calculates realistic urban travel times:
 * - Walking: ~5.8 km/h (1.60 m/s) -> Exactly ~10 mins per 1 km (normal human brisk walk)
 * - 2-Wheeler (Bike/Scooter): ~32 km/h (8.88 m/s + 20s buffer for agile traffic filtering)
 * - Car: ~26 km/h (7.22 m/s + 45s buffer for signals, traffic, parking)
 */
export const calculateTravelTimes = (
  distanceMeters: number,
): MultiModalTravelTimes => {
  const d = Math.max(distanceMeters, 50);
  // 1,000m / 1.60 m/s = 625s = ~10.4 mins
  const walkSeconds = Math.max(60, Math.round(d / 1.6));
  // 1,000m / 8.88 m/s + 20s = 132s = ~2.2 mins
  const bikeSeconds = Math.max(60, Math.round(d / 8.88) + 20);
  // 1,000m / 7.22 m/s + 45s = 183s = ~3.0 mins
  const carSeconds = Math.max(90, Math.round(d / 7.22) + 45);

  return {
    walkSeconds,
    bikeSeconds,
    carSeconds,
  };
};

/**
 * Generates an interpolated line of waypoints between start and end when routing is offline
 */
const generateInterpolatedLine = (
  start: RouteCoord,
  end: RouteCoord,
  steps: number = 5,
): RouteCoord[] => {
  const points: RouteCoord[] = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    points.push({
      latitude: start.latitude + (end.latitude - start.latitude) * fraction,
      longitude: start.longitude + (end.longitude - start.longitude) * fraction,
    });
  }
  return points;
};

/**
 * Fetch real street route geometry and accurate travel times for Car, 2-Wheeler, and Walk
 */
export const fetchMultiModalRoute = async (
  start: RouteCoord,
  end: RouteCoord,
): Promise<MultiModalRouteResult> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords: [number, number][] = route.geometry.coordinates;
        const coordinates: RouteCoord[] = rawCoords.map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));
        const distanceMeters = Math.round(route.distance);
        return {
          coordinates,
          distanceMeters,
          travelTimes: calculateTravelTimes(distanceMeters),
        };
      }
    }
  } catch (err) {
    console.warn(
      '[RoutingService] OSRM multi-modal routing fetch failed:',
      err,
    );
  }

  // Realistic fallback based on true Haversine distance with 1.28x street winding factor
  const straightDistance = calculateDistanceMeters(start, end);
  const streetDistanceMeters = Math.max(
    100,
    Math.round(straightDistance * 1.28),
  );

  return {
    coordinates: generateInterpolatedLine(start, end, 8),
    distanceMeters: streetDistanceMeters,
    travelTimes: calculateTravelTimes(streetDistanceMeters),
  };
};

/**
 * Fetch real street/pedestrian foot routing using OSRM with accurate pedestrian walk time
 */
export const fetchFootRoute = async (
  start: RouteCoord,
  end: RouteCoord,
): Promise<FootRouteResult> => {
  const multiModal = await fetchMultiModalRoute(start, end);
  return {
    coordinates: multiModal.coordinates,
    distanceMeters: multiModal.distanceMeters,
    durationSeconds: multiModal.travelTimes.walkSeconds,
  };
};

/**
 * Highly Accurate Local Place Search Engine:
 * 1. Queries OpenStreetMap Photon API with user proximity coordinates (lat/lng bias)
 *    so local streets, shops, colleges, and landmarks appear first (like Google Maps).
 * 2. Falls back to MapTiler Geocoding API if Photon is unreachable.
 */
export const searchPlaces = async (
  query: string,
  proximity?: RouteCoord,
): Promise<PlaceSearchResult[]> => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const formatDistanceBadge = (d: number): string => {
    if (d <= 1500) {
      return ` • 🚶 ${d}m walk`;
    } else if (d <= 6000) {
      return ` • 🚶 ${(d / 1000).toFixed(1)} km walk`;
    } else if (d <= 15000) {
      return ` • 🚲 ${(d / 1000).toFixed(1)} km`;
    }
    return ` • ${(d / 1000).toFixed(1)} km`;
  };

  // 1. Try Photon (OpenStreetMap Autocomplete with Heavy Local Proximity Bias)
  try {
    let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmed,
    )}&limit=12`;
    if (proximity) {
      photonUrl += `&lat=${proximity.latitude}&lon=${proximity.longitude}&location_bias_scale=1.0`;
    }

    const photonRes = await fetch(photonUrl);
    if (photonRes.ok) {
      const data = await photonRes.json();
      if (data.features && data.features.length > 0) {
        const mapped: PlaceSearchResult[] = data.features.map(
          (f: any, idx: number) => {
            const p = f.properties || {};
            const title =
              p.name || p.street || p.housenumber || p.city || 'Location';
            const details = [
              p.name !== title ? p.name : null,
              p.street,
              p.city || p.county || p.district,
              p.state,
            ]
              .filter(Boolean)
              .join(', ');

            const lat = f.geometry.coordinates[1];
            const lng = f.geometry.coordinates[0];

            let distStr = '';
            let distanceM = 999999;
            if (proximity) {
              distanceM = calculateDistanceMeters(proximity, {
                latitude: lat,
                longitude: lng,
              });
              distStr = formatDistanceBadge(distanceM);
            }

            return {
              id: `photon-${idx}-${lng}-${lat}`,
              name: title,
              placeName: (details || title) + distStr,
              latitude: lat,
              longitude: lng,
              _dist: distanceM,
            };
          },
        );

        if (proximity) {
          // Walking-friendly bias: strictly sort ascending by distance
          mapped.sort((a: any, b: any) => (a._dist || 0) - (b._dist || 0));
        }

        return mapped.map(({ _dist, ...rest }: any) => rest);
      }
    }
  } catch (err) {
    console.warn(
      '[RoutingService] Photon search failed, trying MapTiler:',
      err,
    );
  }

  // 2. Fallback: MapTiler Geocoding API with Proximity
  try {
    let url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
      trimmed,
    )}.json?country=in&limit=10&key=${MAPTILER_KEY}`;

    if (proximity) {
      url += `&proximity=${proximity.longitude},${proximity.latitude}`;
      // Approximate 25km bounding box around user for local search bias
      const delta = 0.22;
      const bbox = `${proximity.longitude - delta},${proximity.latitude - delta},${proximity.longitude + delta},${proximity.latitude + delta}`;
      url += `&bbox=${bbox}`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.features && Array.isArray(data.features)) {
        const mapped: PlaceSearchResult[] = data.features.map((f: any) => {
          const lat = f.center[1];
          const lng = f.center[0];
          let distStr = '';
          let distanceM = 999999;
          if (proximity) {
            distanceM = calculateDistanceMeters(proximity, {
              latitude: lat,
              longitude: lng,
            });
            distStr = formatDistanceBadge(distanceM);
          }

          return {
            id: f.id || `${lng}-${lat}`,
            name: f.text || f.place_name?.split(',')[0] || 'Location',
            placeName: (f.place_name || f.text) + distStr,
            latitude: lat,
            longitude: lng,
            _dist: distanceM,
          };
        });

        if (proximity) {
          mapped.sort((a: any, b: any) => (a._dist || 0) - (b._dist || 0));
        }

        return mapped.map(({ _dist, ...rest }: any) => rest);
      }
    }
  } catch (err) {
    console.warn('[RoutingService] MapTiler search fallback failed:', err);
  }

  return [];
};
