import { Router } from "express";
import {
  listUsers,
  getUserStats,
  updateUserRole,
  updateUserStatus,
  updateFcmToken,
} from "../controllers/userController";
import { authMiddleware, requireStaff, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(authMiddleware as any);

// User-level endpoints (any authenticated user)
router.post("/fcm-token", updateFcmToken);

// Staff and Admins can view user directory and statistics
router.get("/", requireStaff as any, listUsers);
router.get("/stats", requireStaff as any, getUserStats);

// Elevation or suspension actions require Super/Admin role
router.patch("/:id/role", requireAdmin as any, updateUserRole);
router.patch("/:id/status", requireAdmin as any, updateUserStatus);

export default router;
