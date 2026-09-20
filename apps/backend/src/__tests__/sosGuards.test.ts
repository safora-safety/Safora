import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { triggerSOS } from "../controllers/sosController";
import { SosService } from "../services/sosService";
import { SosRepository } from "../repositories/sosRepository";
import { UserRepository } from "../repositories/userRepository";
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

    it("should reject Cloudinary URLs not stored in the safora/sos_audio folder", () => {
      const cloud = process.env.CLOUDINARY_CLOUD_NAME || "safora";
      const invalid = sosAlertSchema.safeParse({
        latitude: 30.3165,
        longitude: 78.0322,
        audio_url: `https://res.cloudinary.com/${cloud}/video/authenticated/s--xyz--/unauthorized_folder/test.m4a`,
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("Staff-Only SOS Admin Endpoints Guards", () => {
    it("should block a normal citizen user from accessing GET /api/sos/alerts with 403", () => {
      const req: any = {
        user: { id: 42, role: "user" },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const { requireStaff } = require("../middleware/auth");
      requireStaff(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Staff privileges required/),
        }),
      );
    });

    it("should allow staff (admin / moderator) to access GET /api/sos/alerts", () => {
      const reqAdmin: any = { user: { id: 1, role: "admin" } };
      const reqMod: any = { user: { id: 2, role: "moderator" } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const { requireStaff } = require("../middleware/auth");
      requireStaff(reqAdmin, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      requireStaff(reqMod, res, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should block a normal citizen user from PATCH /api/sos/:id/status with 403", () => {
      const req: any = {
        user: { id: 42, role: "user" },
        params: { id: "100" },
        body: { status: "resolved" },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const { requireStaff } = require("../middleware/auth");
      requireStaff(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("checkGuardian Privacy Protection", () => {
    it("should return only { exists: true } and never leak name or phone", async () => {
      const { checkGuardian } = require("../controllers/sosController");
      jest.spyOn(SosService, "checkGuardianAccount").mockResolvedValueOnce({
        exists: true,
      } as any);

      const req: any = {
        user: { id: 42, role: "user" },
        query: { email: "target@example.com" },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await checkGuardian(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        exists: true,
      });
      // Explicitly ensure private fields are not present
      const responsePayload = res.json.mock.calls[0][0];
      expect(responsePayload.name).toBeUndefined();
      expect(responsePayload.phone).toBeUndefined();
      expect(responsePayload.email).toBeUndefined();
    });

    it("should return { exists: false } when guardian is not registered", async () => {
      const { checkGuardian } = require("../controllers/sosController");
      jest.spyOn(SosService, "checkGuardianAccount").mockResolvedValueOnce({
        exists: false,
      } as any);

      const req: any = {
        user: { id: 42, role: "user" },
        query: { email: "unregistered@example.com" },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await checkGuardian(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        exists: false,
      });
    });
  });

  describe("testGuardian Abuse Prevention & Ownership", () => {
    it("should reject test drill if contactId does not belong to caller contacts", async () => {
      jest.spyOn(UserRepository, "findById").mockResolvedValueOnce({
        id: 42,
        name: "Test Caller",
      } as any);
      // User 42 has no contact with id 999
      jest
        .spyOn(SosRepository, "findContactsByUserId")
        .mockResolvedValueOnce([]);

      await expect(
        SosService.testGuardianAlert(42, { contactId: "999" }),
      ).rejects.toThrow(AppError);
    });

    it("should dispatch test drill when contactId belongs to caller contacts", async () => {
      jest.spyOn(UserRepository, "findById").mockResolvedValueOnce({
        id: 42,
        name: "Test Caller",
      } as any);
      jest.spyOn(SosRepository, "findContactsByUserId").mockResolvedValueOnce([
        {
          id: 55,
          user_id: 42,
          name: "Trusted Sister",
          phone: "9876543210",
          email: "sister@safora.safety",
          relationship: "Sister",
          created_at: new Date(),
        } as any,
      ]);

      jest.spyOn(SosRepository, "findUserByEmail").mockResolvedValueOnce({
        id: 77,
        name: "Sister Account",
        email: "sister@safora.safety",
        fcm_token: "mock-token",
      } as any);

      jest
        .spyOn(SosRepository, "createNotification")
        .mockResolvedValueOnce({ id: 1 } as any);

      const result = await SosService.testGuardianAlert(42, {
        contactId: 55,
      });

      expect(result.success).toBe(true);
      expect(result.deliveredToApp).toBe(true);
      expect(result.message).toMatch(/Test alert successfully delivered/);
    });

    it("should reject missing contactId via testGuardianSchema", () => {
      const { testGuardianSchema } = require("../validation/schemas");
      const invalid = testGuardianSchema.safeParse({});
      expect(invalid.success).toBe(false);

      const valid = testGuardianSchema.safeParse({ contactId: 55 });
      expect(valid.success).toBe(true);
    });
  });

  describe("Upload Audio and Test Guardian Rate Limiters", () => {
    it("should enforce uploadAudioRateLimiter max 5 requests", () => {
      const { uploadAudioRateLimiter } = require("../middleware/rateLimiter");
      const req: any = { ip: "192.168.1.10" };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      for (let i = 0; i < 5; i++) {
        uploadAudioRateLimiter(req, res, next);
      }
      expect(next).toHaveBeenCalledTimes(5);

      // 6th request is rejected
      uploadAudioRateLimiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Too many audio evidence uploads/),
        }),
      );
    });

    it("should enforce testGuardianRateLimiter max 5 requests", () => {
      const { testGuardianRateLimiter } = require("../middleware/rateLimiter");
      const req: any = { ip: "192.168.1.20" };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      for (let i = 0; i < 5; i++) {
        testGuardianRateLimiter(req, res, next);
      }
      expect(next).toHaveBeenCalledTimes(5);

      // 6th request is rejected
      testGuardianRateLimiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Too many test safety drills/),
        }),
      );
    });
  });
});
