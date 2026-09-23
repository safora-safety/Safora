import { Router, Request, Response, NextFunction } from "express";
import { WatchdogService } from "../services/watchdogService";

const router = Router();

/**
 * POST /api/internal/tick
 * Protected by shared-secret header X-Internal-Secret (NOT JWT-protected).
 * Called by external pinger (cron-job.org) every 5 minutes to keep Render alive
 * and trigger an immediate watchdog deviation scan.
 */
router.post(
  "/tick",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const secret = req.header("X-Internal-Secret");
    const expectedSecret = process.env.INTERNAL_TICK_SECRET;

    if (!expectedSecret || !secret || secret !== expectedSecret) {
      res.status(401).end();
      return;
    }

    try {
      const result = await WatchdogService.scan();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
