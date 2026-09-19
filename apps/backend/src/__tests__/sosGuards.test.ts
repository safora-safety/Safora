import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { triggerSOS } from "../controllers/sosController";
import { SosService } from "../services/sosService";
import { SosRepository } from "../repositories/sosRepository";
import { AppError } from "../errors/AppError";
import { sosAlertSchema } from "../validation/schemas";

describe("SOS Guards & Authorization Security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("is_test Staff-Only Enforcement", () => {
    it("should force isTest to false when a standard citizen user sends is_test: true", async () => {
      const triggerSpy = jest
        .spyOn(SosService, "triggerSOS")
        .mockResolvedValueOnce({
          alert: { id: 1, userId: 42, isTest: false } as any,
          contactsNotified: 3,
        });

      const req: any = {
        user: { id: 42, role: "user" },
        body: {
          latitude: 30.3165,
          longitude: 78.0322,
          is_test: true,
        },
      };

      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await triggerSOS(req, res, next);

      expect(triggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 42,
          isTest: false, // Forced to false for non-staff
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should preserve isTest: true when an admin user triggers a drill", async () => {
      const triggerSpy = jest
        .spyOn(SosService, "triggerSOS")
        .mockResolvedValueOnce({
          alert: { id: 2, userId: 1, isTest: true } as any,
          contactsNotified: 0,
        });

      const req: any = {
        user: { id: 1, role: "admin" },
        body: {
          latitude: 30.3165,
          longitude: 78.0322,
          is_test: true,
        },
      };

      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await triggerSOS(req, res, next);

      expect(triggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          isTest: true, // Preserved for staff
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should preserve isTest: true when a moderator user triggers a drill", async () => {
      const triggerSpy = jest
        .spyOn(SosService, "triggerSOS")
        .mockResolvedValueOnce({
          alert: { id: 3, userId: 2, isTest: true } as any,
          contactsNotified: 0,
        });

      const req: any = {
        user: { id: 2, role: "moderator" },
        body: {
          latitude: 30.3165,
          longitude: 78.0322,
          is_test: true,
        },
      };

      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await triggerSOS(req, res, next);

      expect(triggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 2,
          isTest: true,
        }),
      );
    });
  });

  describe("attachAudio Ownership Protection", () => {
    it("should reject audio attachment if user does not own the alert", async () => {
      // SosRepository returns null when alertId does not match userId
      jest.spyOn(SosRepository, "updateAudioUrl").mockResolvedValueOnce(null);

      await expect(
        SosService.attachAudio(
          999, // alertId
          50, // attacker userId
          "https://res.cloudinary.com/safora/video/authenticated/sample.m4a",
        ),
      ).rejects.toThrow(AppError);
    });

    it("should successfully attach audio when user is the verified alert owner", async () => {
      jest.spyOn(SosRepository, "updateAudioUrl").mockResolvedValueOnce({
        id: 100,
        user_id: 42,
        latitude: 30.3165,
        longitude: 78.0322,
        status: "active",
        audio_url:
          "https://res.cloudinary.com/safora/video/authenticated/sample.m4a",
        is_test: false,
        created_at: new Date(),
      } as any);

      const alert = await SosService.attachAudio(
        100,
        42,
        "https://res.cloudinary.com/safora/video/authenticated/sample.m4a",
      );

      expect(alert.id).toBe(100);
      expect(alert.audioUrl).toBe(
        "https://res.cloudinary.com/safora/video/authenticated/sample.m4a",
      );
    });
  });

  describe("Cloudinary URL Validation Schema", () => {
    it("should accept authenticated Cloudinary video URLs matching configured cloud", () => {
      const cloud = process.env.CLOUDINARY_CLOUD_NAME || "safora";
      const valid = sosAlertSchema.safeParse({
        latitude: 30.3165,
        longitude: 78.0322,
        audio_url: `https://res.cloudinary.com/${cloud}/video/authenticated/s--xyz--/safora/sos_audio/test.m4a`,
      });
      expect(valid.success).toBe(true);
    });

    it("should reject audio URLs from other unauthorized Cloudinary accounts", () => {
      const invalid = sosAlertSchema.safeParse({
        latitude: 30.3165,
        longitude: 78.0322,
        audio_url:
          "https://res.cloudinary.com/unauthorized_attacker_cloud/video/authenticated/test.m4a",
      });
      expect(invalid.success).toBe(false);
    });

    it("should reject external audio URLs not from Cloudinary", () => {
      const invalid = sosAlertSchema.safeParse({
        latitude: 30.3165,
        longitude: 78.0322,
        audio_url: "https://malicious-site.com/audio.m4a",
      });
      expect(invalid.success).toBe(false);
    });
  });
});
