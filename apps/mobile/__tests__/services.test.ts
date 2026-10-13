import {
  calculateDistanceMeters,
  calculateTravelTimes,
} from '../src/services/routingService';

describe('Routing & Safety Algorithm Unit Tests', () => {
  it('should accurately compute distance in meters between two coordinates', () => {
    // Delhi to Noida sample coordinates (~10km)
    const c1 = { latitude: 28.6139, longitude: 77.209 };
    const c2 = { latitude: 28.5355, longitude: 77.391 };
    const dist = calculateDistanceMeters(c1, c2);
    expect(dist).toBeGreaterThan(15000);
    expect(dist).toBeLessThan(25000);
  });

  it('should compute zero distance for identical coordinates', () => {
    const c1 = { latitude: 30.3165, longitude: 78.0322 };
    const dist = calculateDistanceMeters(c1, c1);
    expect(dist).toBe(0);
  });

  it('should compute walking, bike, and car travel times realistically', () => {
    const times = calculateTravelTimes(1000); // 1 km
    // Walk: ~10 minutes (600-650s)
    expect(times.walkSeconds).toBeGreaterThanOrEqual(600);
    expect(times.walkSeconds).toBeLessThanOrEqual(700);

    // Bike: faster than walk
    expect(times.bikeSeconds).toBeLessThan(times.walkSeconds);

    // Car: realistic urban speed
    expect(times.carSeconds).toBeLessThan(times.walkSeconds);
  });
});
