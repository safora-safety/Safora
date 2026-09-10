import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
} from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from "../validation/schemas";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", authMiddleware as any, getMe);
router.patch(
  "/profile",
  authMiddleware as any,
  validateBody(updateProfileSchema),
  updateProfile,
);

export default router;
