import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { AuthenticatedRequest } from "../middleware/auth";
import { AppError } from "../errors/AppError";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { user, token } = await AuthService.register(req.body);
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { user, token } = await AuthService.login(
      req.body.email,
      req.body.password,
    );
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const user = await AuthService.getUserProfile(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const user = await AuthService.updateUserProfile(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    next(err);
  }
}
