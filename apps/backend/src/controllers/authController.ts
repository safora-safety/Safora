import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { AuthenticatedRequest } from "../middleware/auth";
import { AppError } from "../errors/AppError";
import { CloudinaryService } from "../services/cloudinaryService";

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

export async function googleAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { user, token } = await AuthService.loginWithGoogle(req.body.idToken);
    res.status(200).json({
      success: true,
      message: "Google authentication successful",
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

export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const oldPassword = req.body.oldPassword || req.body.old_password;
    const newPassword = req.body.newPassword || req.body.new_password;
    if (!oldPassword || !newPassword) {
      throw new AppError(
        "Both current password and new password are required",
        400,
      );
    }

    await AuthService.changePassword(req.user.id, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadProfilePhoto(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }
    const file = (req as any).file;
    if (!file) {
      throw new AppError("No photo file provided", 400);
    }

    const result = await CloudinaryService.uploadAvatar(
      file.buffer,
      req.user.id,
    );

    const updatedUser = await AuthService.updateUserProfile(req.user.id, {
      avatarUrl: result.url,
    });

    res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      photoUrl: result.url,
      avatarUrl: result.url,
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
}
