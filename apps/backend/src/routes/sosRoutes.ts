import { Router } from "express";
import {
  triggerSOS,
  attachAudio,
  getContacts,
  addContact,
  deleteContact,
  checkGuardian,
  testGuardian,
} from "../controllers/sosController";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { sosRateLimiter } from "../middleware/rateLimiter";
import {
  sosAlertSchema,
  trustedContactSchema,
  attachAudioSchema,
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

// Attach audio evidence to SOS alert
router.patch("/:id/audio", validateBody(attachAudioSchema), attachAudio);

// Upload real SOS audio evidence
router.post(
  "/upload-audio",
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

// Guardian verification and test alert
router.get("/check-guardian", checkGuardian);
router.post("/test-guardian", testGuardian);

// Trusted Contacts
router.get("/contacts", getContacts);
router.post("/contacts", validateBody(trustedContactSchema), addContact);
router.delete("/contacts/:id", deleteContact);

export default router;
