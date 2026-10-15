import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { AuthService } from "../services/authService";
import { UserRepository } from "../repositories/userRepository";
import { AppError } from "../errors/AppError";
import { OAuth2Client } from "google-auth-library";

const SAFORA_CLIENT_ID =
  "586932371847-8kr8epdn0u64jdma6e6s8is1hdodv5pt.apps.googleusercontent.com";
const ATTACKER_CLIENT_ID =
  "999999999999-otherappissuedtoken.apps.googleusercontent.com";

describe("Google OAuth Security & Audience Validation (/api/auth/google)", () => {
  let verifyIdTokenSpy: any;
  let originalFetch: any;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = (global as any).fetch;
    verifyIdTokenSpy = jest.spyOn(OAuth2Client.prototype, "verifyIdToken");
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    verifyIdTokenSpy.mockRestore();
  });

  describe("Audience Mismatch Protection (Cross-App Token Bypass)", () => {
    it("should reject token issued for a different application when fallback tokeninfo is invoked", async () => {
      // Simulate verifyIdToken failing on audience mismatch
      verifyIdTokenSpy.mockRejectedValue(
        new Error(`Token used with wrong audience: ${ATTACKER_CLIENT_ID}`),
      );

      // Simulate Google's tokeninfo endpoint returning valid Google token but for the wrong application
      (global as any).fetch = jest.fn<any>().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: "google-victim-id-123",
          email: "victim@example.com",
          email_verified: "true",
          name: "Victim User",
          aud: ATTACKER_CLIENT_ID, // Malicious / Foreign OAuth client
        }),
      });

      await expect(
        AuthService.loginWithGoogle("foreign-app-id-token"),
      ).rejects.toThrow(AppError);

      try {
        await AuthService.loginWithGoogle("foreign-app-id-token");
      } catch (err: any) {
        expect(err.statusCode).toBe(401);
        expect(err.message).toMatch(
          /Token was not issued for this application/,
        );
      }
    });

    it("should reject token when audience field is completely missing in tokeninfo response", async () => {
      verifyIdTokenSpy.mockRejectedValue(new Error("verifyIdToken failed"));

      (global as any).fetch = jest.fn<any>().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: "google-id-123",
          email: "victim@example.com",
          email_verified: "true",
          name: "Victim User",
          // aud is omitted
        }),
      });

      await expect(
        AuthService.loginWithGoogle("missing-aud-token"),
      ).rejects.toThrow(AppError);

      try {
        await AuthService.loginWithGoogle("missing-aud-token");
      } catch (err: any) {
        expect(err.statusCode).toBe(401);
        expect(err.message).toMatch(
          /Token was not issued for this application/,
        );
      }
    });
  });

  describe("Email Verification Enforcement (Anti-Account Takeover)", () => {
    it("should reject token when email_verified is false via primary verifyIdToken", async () => {
      verifyIdTokenSpy.mockResolvedValue({
        getPayload: () => ({
          sub: "google-unverified-123",
          email: "unverified@example.com",
          aud: SAFORA_CLIENT_ID,
          email_verified: false,
          name: "Unverified User",
        }),
      } as any);

      await expect(
        AuthService.loginWithGoogle("unverified-id-token"),
      ).rejects.toThrow(AppError);

      try {
        await AuthService.loginWithGoogle("unverified-id-token");
      } catch (err: any) {
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe("Google account email is not verified");
      }
    });

    it("should reject token when email_verified is false via fallback tokeninfo", async () => {
      verifyIdTokenSpy.mockRejectedValue(
        new Error("verifyIdToken cert fetch error"),
      );

      (global as any).fetch = jest.fn<any>().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: "google-unverified-456",
          email: "unverified@example.com",
          aud: SAFORA_CLIENT_ID,
          email_verified: "false",
          name: "Unverified User",
        }),
      });

      await expect(
        AuthService.loginWithGoogle("unverified-fallback-token"),
      ).rejects.toThrow(AppError);

      try {
        await AuthService.loginWithGoogle("unverified-fallback-token");
      } catch (err: any) {
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe("Google account email is not verified");
      }
    });
  });

  describe("Legitimate Safora Token Verification (Regression Check)", () => {
    it("should successfully authenticate legitimate Safora token via verifyIdToken", async () => {
      verifyIdTokenSpy.mockResolvedValue({
        getPayload: () => ({
          sub: "google-legit-789",
          email: "citizen@safora.app",
          aud: SAFORA_CLIENT_ID,
          email_verified: true,
          name: "Citizen Walker",
          picture: "https://lh3.googleusercontent.com/avatar.jpg",
        }),
      } as any);

      (jest.spyOn(UserRepository, "findByEmail") as any).mockResolvedValue(
        null,
      );
      (jest.spyOn(UserRepository, "createGoogleUser") as any).mockResolvedValue(
        {
          id: "101",
          name: "Citizen Walker",
          email: "citizen@safora.app",
          phone: null,
          role: "user",
          auth_provider: "google",
          google_id: "google-legit-789",
          avatar_url: "https://lh3.googleusercontent.com/avatar.jpg",
          created_at: new Date().toISOString(),
        },
      );

      const result = await AuthService.loginWithGoogle("valid-safora-token");
      expect(result).toBeDefined();
      expect(result.user.email).toBe("citizen@safora.app");
      expect(result.token).toBeDefined();
    });

    it("should successfully authenticate legitimate Safora token via fallback tokeninfo when verifyIdToken fails transiently", async () => {
      verifyIdTokenSpy.mockRejectedValue(
        new Error("Transient connection error"),
      );

      (global as any).fetch = jest.fn<any>().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: "google-legit-789",
          email: "citizen@safora.app",
          aud: SAFORA_CLIENT_ID,
          email_verified: "true",
          name: "Citizen Walker",
          picture: "https://lh3.googleusercontent.com/avatar.jpg",
        }),
      });

      (jest.spyOn(UserRepository, "findByEmail") as any).mockResolvedValue(
        null,
      );
      (jest.spyOn(UserRepository, "createGoogleUser") as any).mockResolvedValue(
        {
          id: "101",
          name: "Citizen Walker",
          email: "citizen@safora.app",
          phone: null,
          role: "user",
          auth_provider: "google",
          google_id: "google-legit-789",
          avatar_url: "https://lh3.googleusercontent.com/avatar.jpg",
          created_at: new Date().toISOString(),
        },
      );

      const result = await AuthService.loginWithGoogle("valid-fallback-token");
      expect(result).toBeDefined();
      expect(result.user.email).toBe("citizen@safora.app");
      expect(result.token).toBeDefined();
    });
  });
});
