import { Router } from "express";
import {
  listUsers,
  getUserStats,
  updateUserRole,
  updateUserStatus,
} from "../controllers/userController";
import { authMiddleware, requireStaff, requireAdmin } from "../middleware/auth";

const router = Router();

// Staff and Admins can view user directory and statistics
router.use(authMiddleware as any);
router.use(requireStaff as any);

router.get("/", listUsers);
router.get("/stats", getUserStats);

// Elevation or suspension actions require Super/Admin role
router.patch("/:id/role", requireAdmin as any, updateUserRole);
router.patch("/:id/status", requireAdmin as any, updateUserStatus);

export default router;
