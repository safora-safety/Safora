import { describe, it, expect } from "@jest/globals";

describe("Safety Score Mathematical Formulations", () => {
  const HALF_LIFE_HOURS = 24;
  const DECAY_LAMBDA = Math.log(2) / HALF_LIFE_HOURS;

  describe("Temporal Exponential Decay T(t)", () => {
    function computeRecencyDecay(ageHours: number): number {
      return Math.exp(-DECAY_LAMBDA * Math.max(0, ageHours));
    }

    it("should evaluate to 1.0 at immediate creation (t = 0)", () => {
      const decay = computeRecencyDecay(0);
      expect(decay).toBeCloseTo(1.0, 5);
    });

    it("should evaluate to exactly 0.5 at half-life (t = 24h)", () => {
      const decay = computeRecencyDecay(24);
      expect(decay).toBeCloseTo(0.5, 4);
    });

    it("should evaluate to 0.25 after two half-lives (t = 48h)", () => {
      const decay = computeRecencyDecay(48);
      expect(decay).toBeCloseTo(0.25, 4);
    });

    it("should handle negative age safely by clamping to 0", () => {
      const decay = computeRecencyDecay(-5);
      expect(decay).toBeCloseTo(1.0, 5);
    });
  });

  describe("Spatial Distance Falloff D(d)", () => {
    function computeDistanceFalloff(
      distMeters: number,
      radiusMeters: number,
    ): number {
      return Math.max(0, 1 - distMeters / radiusMeters);
    }

    it("should return maximum 1.0 when observer is right at hazard point (d = 0)", () => {
      expect(computeDistanceFalloff(0, 1000)).toBe(1.0);
    });

    it("should return 0.5 at halfway point (d = 500m of 1000m radius)", () => {
      expect(computeDistanceFalloff(500, 1000)).toBe(0.5);
    });

    it("should clamp to 0.0 when distance equals or exceeds radius", () => {
      expect(computeDistanceFalloff(1000, 1000)).toBe(0);
      expect(computeDistanceFalloff(1500, 1000)).toBe(0);
    });
  });

  describe("Community Confirmation Multiplier C(c)", () => {
    function computeConfirmMultiplier(confirms: number): number {
      return 1.0 + 0.15 * Math.min(Math.max(0, confirms), 5);
    }

    it("should equal baseline 1.0 for unconfirmed reports (c = 0)", () => {
      expect(computeConfirmMultiplier(0)).toBe(1.0);
    });

    it("should scale up linearly with confirmations up to 5", () => {
      expect(computeConfirmMultiplier(1)).toBeCloseTo(1.15, 3);
      expect(computeConfirmMultiplier(2)).toBeCloseTo(1.3, 3);
      expect(computeConfirmMultiplier(3)).toBeCloseTo(1.45, 3);
    });

    it("should cap at 1.75 multiplier at c >= 5 to prevent gaming", () => {
      expect(computeConfirmMultiplier(5)).toBeCloseTo(1.75, 3);
      expect(computeConfirmMultiplier(10)).toBeCloseTo(1.75, 3);
      expect(computeConfirmMultiplier(100)).toBeCloseTo(1.75, 3);
    });
  });

  describe("Safety Score Aggregation & Risk Levels", () => {
    function calculateScore(totalPenalty: number): {
      score: number;
      riskLevel: "safe" | "moderate" | "high";
    } {
      const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));
      const riskLevel =
        score >= 80 ? "safe" : score >= 50 ? "moderate" : "high";
      return { score, riskLevel };
    }

    it("should return 100 and safe when there are zero penalties", () => {
      const result = calculateScore(0);
      expect(result.score).toBe(100);
      expect(result.riskLevel).toBe("safe");
    });

    it("should evaluate to moderate risk for medium severity penalties", () => {
      const result = calculateScore(35);
      expect(result.score).toBe(65);
      expect(result.riskLevel).toBe("moderate");
    });

    it("should evaluate to high risk for severe cluster penalties", () => {
      const result = calculateScore(60);
      expect(result.score).toBe(40);
      expect(result.riskLevel).toBe("high");
    });

    it("should never drop below zero even with extreme penalty overload", () => {
      const result = calculateScore(250);
      expect(result.score).toBe(0);
      expect(result.riskLevel).toBe("high");
    });
  });
});
