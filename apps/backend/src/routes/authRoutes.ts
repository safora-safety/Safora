import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { authRateLimiter } from "../middleware/rateLimiter";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validation/schemas";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validateBody(registerSchema),
  register,
);
router.post("/login", authRateLimiter, validateBody(loginSchema), login);
router.get("/me", authMiddleware as any, getMe);
router.patch(
  "/profile",
  authMiddleware as any,
  validateBody(updateProfileSchema),
  updateProfile,
);
router.post(
  "/change-password",
  authMiddleware as any,
  validateBody(changePasswordSchema),
  changePassword,
);

export default router;
