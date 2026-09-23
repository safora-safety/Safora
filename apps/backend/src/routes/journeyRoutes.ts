import { Router } from "express";
import {
  startJourney,
  updateLocation,
  completeJourney,
  cancelJourney,
  confirmSafe,
  getActiveJourneys,
  getAllJourneys,
} from "../controllers/journeyController";
import { authMiddleware, requireStaff } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  startJourneySchema,
  updateLocationSchema,
} from "../validation/schemas";

const router = Router();

router.use(authMiddleware as any);

router.get("/active", requireStaff as any, getActiveJourneys);
router.get("/", requireStaff as any, getAllJourneys);
router.post("/start", validateBody(startJourneySchema), startJourney);
router.patch(
  "/:id/location",
  validateBody(updateLocationSchema),
  updateLocation,
);
router.post("/:id/confirm-safe", confirmSafe);
router.patch("/:id/complete", completeJourney);
router.patch("/:id/cancel", cancelJourney);

export default router;
