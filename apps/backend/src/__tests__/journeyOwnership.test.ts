import { describe, it, expect, jest } from "@jest/globals";
import {
  JourneyService,
  distanceToSegmentMeters,
} from "../services/journeyService";
import { JourneyRepository } from "../repositories/journeyRepository";
import { UserRepository } from "../repositories/userRepository";
import { AppError } from "../errors/AppError";

describe("Journey Corridor Deviation & Ownership Authorization", () => {
  describe("distanceToSegmentMeters (Spatial Algorithm)", () => {
    // Route from point A (30.3000, 78.0000) to point B (30.3100, 78.0000)
    const latA = 30.3;
    const lngA = 78.0;
    const latB = 30.31;
    const lngB = 78.0;

    it("should calculate ~0m distance for points exactly along the route corridor", () => {
      const dist = distanceToSegmentMeters(
        30.305,
        78.0,
        latA,
        lngA,
        latB,
        lngB,
      );
      expect(dist).toBeLessThan(5);
    });

    it("should calculate accurate lateral distance within the 150m corridor threshold", () => {
      // 0.0005 deg lon shift at lat 30 deg is approx 48 meters
      const dist = distanceToSegmentMeters(
        30.305,
        78.0005,
        latA,
        lngA,
        latB,
        lngB,
      );
      expect(dist).toBeGreaterThan(40);
      expect(dist).toBeLessThan(60);
      expect(dist).toBeLessThanOrEqual(150);
    });

    it("should calculate accurate distance outside the 150m corridor threshold", () => {
      // 0.003 deg lon shift at lat 30 deg is approx 290 meters
      const dist = distanceToSegmentMeters(
        30.305,
        78.003,
        latA,
        lngA,
        latB,
        lngB,
      );
      expect(dist).toBeGreaterThan(150);
      expect(dist).toBeGreaterThan(250);
    });

    it("should calculate minimum distance across a multi-segment planned route corridor", () => {
      // Multi-segment planned route: A -> B -> C
      const route = [
        { latitude: 30.3, longitude: 78.0 },
        { latitude: 30.31, longitude: 78.0 },
        { latitude: 30.31, longitude: 78.01 },
      ];

      // Point slightly north of segment B-C (30.3102, 78.0050) ~ 22m offset
      let minDist = Infinity;
      const testLat = 30.3102;
      const testLng = 78.005;

      for (let i = 0; i < route.length - 1; i++) {
        const d = distanceToSegmentMeters(
          testLat,
          testLng,
          route[i].latitude,
          route[i].longitude,
          route[i + 1].latitude,
          route[i + 1].longitude,
        );
        if (d < minDist) minDist = d;
      }

      expect(minDist).toBeGreaterThan(15);
      expect(minDist).toBeLessThan(35);
      expect(minDist).toBeLessThanOrEqual(150); // Well within safe corridor threshold
    });
  });

  describe("Journey Ownership Guards", () => {
    it("should reject completion attempt when user does not own the journey", async () => {
      jest.spyOn(JourneyRepository, "findById").mockResolvedValueOnce({
        id: 101,
        user_id: 10,
        origin_lat: 30.3,
        origin_lng: 78.0,
        dest_lat: 30.31,
        dest_lng: 78.0,
        status: "active",
        started_at: new Date(),
      } as any);

      await expect(
        JourneyService.completeJourney(101, 999, "user"),
      ).rejects.toThrow(AppError);
    });

    it("should allow journey completion if user is the verified owner", async () => {
      jest.spyOn(JourneyRepository, "findById").mockResolvedValueOnce({
        id: 101,
        user_id: 10,
        origin_lat: 30.3,
        origin_lng: 78.0,
        dest_lat: 30.31,
        dest_lng: 78.0,
        status: "active",
        started_at: new Date(),
      } as any);

      const updateSpy = jest
        .spyOn(JourneyRepository, "updateStatus")
        .mockResolvedValueOnce({} as any);

      await expect(
        JourneyService.completeJourney(101, 10, "user"),
      ).resolves.not.toThrow();
      expect(updateSpy).toHaveBeenCalledWith(101, 10, "completed", true);
    });

    it("should allow staff (admin or moderator) to complete any active journey", async () => {
      jest.spyOn(JourneyRepository, "findById").mockResolvedValueOnce({
        id: 101,
        user_id: 10,
        origin_lat: 30.3,
        origin_lng: 78.0,
        dest_lat: 30.31,
        dest_lng: 78.0,
        status: "active",
        started_at: new Date(),
      } as any);

      const updateSpy = jest
        .spyOn(JourneyRepository, "updateStatus")
        .mockResolvedValueOnce({} as any);

      await expect(
        JourneyService.completeJourney(101, 999, "admin"),
      ).resolves.not.toThrow();
      expect(updateSpy).toHaveBeenCalledWith(101, 10, "completed", true);
    });

    it("should flag journey status as deviated when user coordinates stray > 150m", async () => {
      jest.spyOn(JourneyRepository, "findById").mockResolvedValueOnce({
        id: 101,
        user_id: 10,
        origin_lat: 30.3,
        origin_lng: 78.0,
        dest_lat: 30.31,
        dest_lng: 78.0,
        status: "active",
        started_at: new Date(),
      } as any);

      jest
        .spyOn(JourneyRepository, "setStatus")
        .mockResolvedValueOnce({} as any);
      jest.spyOn(JourneyRepository, "insertBreadcrumb").mockResolvedValueOnce();
      jest
        .spyOn(JourneyRepository, "updateLastLocation")
        .mockResolvedValueOnce();
      jest.spyOn(JourneyRepository, "setDeviatedAt").mockResolvedValueOnce();
      jest
        .spyOn(UserRepository, "findById")
        .mockResolvedValueOnce({ id: 10, name: "Test Walker" } as any);

      const result = await JourneyService.updateLocation(
        101,
        { latitude: 30.305, longitude: 78.003 }, // ~290m away
        { userId: 10, userRole: "user" },
      );

      expect(result.isDeviated).toBe(true);
      expect(result.status).toBe("deviated");
      expect(result.onRoute).toBe(false);
      expect(result.deviationMeters).toBeGreaterThan(150);
    });
  });
});
