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
 * Fetch real street/pedestrian foot routing using OSRM Foot API
 */
export const fetchFootRoute = async (
  start: RouteCoord,
  end: RouteCoord,
): Promise<FootRouteResult> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OSRM HTTP status ${res.status}`);
    }
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const rawCoords: [number, number][] = route.geometry.coordinates;
      const coordinates: RouteCoord[] = rawCoords.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));

      return {
        coordinates,
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
      };
    }
  } catch (err) {
    console.warn(
      '[RoutingService] OSRM fetch failed, using direct line fallback:',
      err,
    );
  }

  // Direct line fallback if OSRM unavailable
  return {
    coordinates: [start, end],
    distanceMeters: 1000,
    durationSeconds: 720,
  };
};

/**
 * Search places using MapTiler Geocoding API
 */
export const searchPlaces = async (
  query: string,
  proximity?: RouteCoord,
): Promise<PlaceSearchResult[]> => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    let url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
      trimmed,
    )}.json?country=in&limit=5&key=${MAPTILER_KEY}`;

    if (proximity) {
      url += `&proximity=${proximity.longitude},${proximity.latitude}`;
    }

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    if (data.features && Array.isArray(data.features)) {
      return data.features.map((f: any) => ({
        id: f.id || `${f.center?.[0]}-${f.center?.[1]}`,
        name: f.text || f.place_name?.split(',')[0] || 'Location',
        placeName: f.place_name || f.text,
        latitude: f.center[1],
        longitude: f.center[0],
      }));
    }
  } catch (err) {
    console.warn('[RoutingService] Place search failed:', err);
  }

  return [];
};
