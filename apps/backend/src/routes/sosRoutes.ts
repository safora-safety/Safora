import { Router } from "express";
import {
  triggerSOS,
  attachAudio,
  getAlerts,
  updateStatus,
  getContacts,
  addContact,
  updateContact,
  deleteContact,
  checkGuardian,
  testGuardian,
} from "../controllers/sosController";
import { authMiddleware, requireStaff } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  sosRateLimiter,
  checkGuardianRateLimiter,
  uploadAudioRateLimiter,
  testGuardianRateLimiter,
} from "../middleware/rateLimiter";
import {
  sosAlertSchema,
  trustedContactSchema,
  attachAudioSchema,
  updateSosStatusSchema,
  testGuardianSchema,
} from "../validation/schemas";
import {
  audioUploadMiddleware,
  CloudinaryService,
} from "../services/cloudinaryService";
import { AppError } from "../errors/AppError";

const router = Router();

router.use(authMiddleware as any);

// SOS
router.post("/", sosRateLimiter, validateBody(sosAlertSchema), triggerSOS);

// Real Admin Emergency Alert Queue & Status Updates (Staff Only)
router.get("/alerts", requireStaff, getAlerts);
router.patch(
  "/:id/status",
  requireStaff,
  validateBody(updateSosStatusSchema),
  updateStatus,
);

// Attach audio evidence to SOS alert
router.patch("/:id/audio", validateBody(attachAudioSchema), attachAudio);

// Upload real SOS audio evidence (Rate-limited to 5 per 15 min)
router.post(
  "/upload-audio",
  uploadAudioRateLimiter,
  audioUploadMiddleware.single("audio"),
  async (req: any, res, next) => {
    try {
      if (!req.file) {
        throw new AppError("No audio file provided", 400);
      }
      const result = await CloudinaryService.uploadAudioEvidence(
        req.file.buffer,
        `sos-user-${req.user?.id || "alert"}`,
      );
      res.status(200).json({
        success: true,
        audioUrl: result.url,
        publicId: result.publicId,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Guardian verification and test alert (Rate-limited and ownership validated)
router.get("/check-guardian", checkGuardianRateLimiter, checkGuardian);
router.post(
  "/test-guardian",
  testGuardianRateLimiter,
  validateBody(testGuardianSchema),
  testGuardian,
);

// Trusted Contacts
router.get("/contacts", getContacts);
router.post("/contacts", validateBody(trustedContactSchema), addContact);
router.put("/contacts/:id", validateBody(trustedContactSchema), updateContact);
router.delete("/contacts/:id", deleteContact);

export default router;
