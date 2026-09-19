import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { UserRepository } from "../repositories/userRepository";
import { UserModel } from "../models/User";

export async function listUsers(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const search = req.query.search ? String(req.query.search) : undefined;
    const role = req.query.role ? String(req.query.role) : undefined;
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit || "50"), 10)),
    );
    const offset = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      UserRepository.findAll({ search, role, limit, offset }),
      UserRepository.countAll({ search, role }),
    ]);

    const users = rows.map((row) => UserModel.fromRow(row));

    res.status(200).json({
      success: true,
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: errorMsg,
    });
  }
}

export async function getUserStats(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const [total, adminCount, modCount, regularCount] = await Promise.all([
      UserRepository.countAll(),
      UserRepository.countAll({ role: "admin" }),
      UserRepository.countAll({ role: "moderator" }),
      UserRepository.countAll({ role: "user" }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        admins: adminCount,
        moderators: modCount,
        users: regularCount,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user stats",
      error: errorMsg,
    });
  }
}

export async function updateUserRole(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { role } = req.body;

    if (!role || !["user", "moderator", "admin"].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'user', 'moderator', or 'admin'.",
      });
      return;
    }

    if (String(req.user?.id) === String(id) && role !== "admin") {
      res.status(400).json({
        success: false,
        message: "Administrators cannot demote their own account.",
      });
      return;
    }

    const updated = await UserRepository.updateRole(id, role);
    if (!updated) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      user: UserModel.fromRow(updated),
    });
  } catch (err: unknown) {
    console.error("[UserController.updateUserRole]:", err);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred while updating user role",
    });
  }
}

export async function updateUserStatus(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res
        .status(400)
        .json({ success: false, message: "isActive must be a boolean" });
      return;
    }

    if (String(req.user?.id) === String(id) && !isActive) {
      res.status(400).json({
        success: false,
        message: "Administrators cannot suspend their own account.",
      });
      return;
    }

    const updated = await UserRepository.updateStatus(id, isActive);
    if (!updated) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User status set to ${isActive ? "active" : "suspended"}`,
      user: UserModel.fromRow(updated),
    });
  } catch (err: unknown) {
    console.error("[UserController.updateUserStatus]:", err);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred while updating user status",
    });
  }
}

export async function updateFcmToken(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { token } = req.body;
    if (token !== null && typeof token !== "string") {
      res
        .status(400)
        .json({ success: false, message: "token must be a string or null" });
      return;
    }

    await UserRepository.updateUser(req.user.id, {
      fcm_token: token ? token.trim() : null,
    });
    res.status(200).json({
      success: true,
      message: "Push notification token updated successfully",
    });
  } catch (err: unknown) {
    console.error("[UserController.updateFcmToken]:", err);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred while updating push token",
    });
  }
}
