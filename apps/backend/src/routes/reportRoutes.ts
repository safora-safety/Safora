import { Router } from "express";
import {
  createReport,
  getReports,
  getNearbyReports,
} from "../controllers/reportController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/", getReports);
router.get("/nearby", getNearbyReports);
// Allow both authenticated users and guests to report for demo flexibility
router.post(
  "/",
  (req, res, next) => {
    if (req.headers.authorization) {
      return (authMiddleware as any)(req, res, next);
    }
    next();
  },
  createReport as any,
);

export default router;
