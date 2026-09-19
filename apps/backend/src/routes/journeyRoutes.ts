import { Router } from "express";
import {
  startJourney,
  updateLocation,
  completeJourney,
  cancelJourney,
  getActiveJourneys,
  getAllJourneys,
} from "../controllers/journeyController";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  startJourneySchema,
  updateLocationSchema,
} from "../validation/schemas";

const router = Router();

router.use(authMiddleware as any);

router.get("/active", getActiveJourneys);
router.get("/", getAllJourneys);
router.post("/start", validateBody(startJourneySchema), startJourney);
router.patch(
  "/:id/location",
  validateBody(updateLocationSchema),
  updateLocation,
);
router.patch("/:id/complete", completeJourney);
router.patch("/:id/cancel", cancelJourney);

export default router;
