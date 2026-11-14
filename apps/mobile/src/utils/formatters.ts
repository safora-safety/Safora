/**
 * Common formatting helpers for distance, time duration, and safety ratings.
 */

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

export function getSafetyScoreColor(
  score: number,
  fallbackColors?: { success?: string; warning?: string; danger?: string },
): string {
  const success = fallbackColors?.success || '#10B981';
  const warning = fallbackColors?.warning || '#F59E0B';
  const danger = fallbackColors?.danger || '#EF4444';

  if (score >= 80) return success;
  if (score >= 50) return warning;
  return danger;
}

export function formatCoordinates(
  lat: number,
  lng: number,
  precision = 4,
): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(precision)}°${latDir}, ${Math.abs(lng).toFixed(precision)}°${lngDir}`;
}
