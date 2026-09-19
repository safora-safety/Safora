import { describe, it, expect } from "@jest/globals";
import { shouldSeedDatabase } from "../config/database";

describe("Database Seeding Guard & Non-Destructive Invariants", () => {
  it("should permit seeding only when existing report count is strictly 0", () => {
    expect(shouldSeedDatabase(0)).toBe(true);
  });

  it("should block seeding when the database already contains reports", () => {
    expect(shouldSeedDatabase(1)).toBe(false);
    expect(shouldSeedDatabase(50)).toBe(false);
    expect(shouldSeedDatabase(1000)).toBe(false);
  });
});
