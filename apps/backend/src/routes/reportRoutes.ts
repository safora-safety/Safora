import { Router } from "express";
import {
  createReport,
  getReports,
  getNearbyReports,
  getSafetyScore,
  confirmReport,
  moderateReport,
} from "../controllers/reportController";
import { authMiddleware } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  createReportSchema,
  nearbyReportsQuerySchema,
} from "../validation/schemas";
import {
  uploadMiddleware,
  CloudinaryService,
} from "../services/cloudinaryService";
import { AppError } from "../errors/AppError";

const router = Router();

// Public / Authenticated read routes
router.get("/", getReports);
router.get(
  "/nearby",
  validateQuery(nearbyReportsQuerySchema),
  getNearbyReports,
);
router.get("/safety-score", getSafetyScore);

// Mutation routes
router.post(
  "/",
  authMiddleware as any,
  validateBody(createReportSchema),
  createReport,
);
router.post(
  "/upload-photo",
  authMiddleware as any,
  uploadMiddleware.single("photo"),
  async (req: any, res, next) => {
    try {
      if (!req.file) {
        throw new AppError("No photo file provided", 400);
      }
      const result = await CloudinaryService.uploadHazardPhoto(
        req.file.buffer,
        req.file.originalname,
      );
      res.status(200).json({
        success: true,
        photoUrl: result.url,
        publicId: result.publicId,
      });
    } catch (err) {
      next(err);
    }
  },
);
router.patch("/:id/confirm", authMiddleware as any, confirmReport);
router.patch("/:id/moderate", authMiddleware as any, moderateReport);

export default router;
