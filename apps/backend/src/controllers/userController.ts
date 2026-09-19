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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
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
      res
        .status(400)
        .json({
          success: false,
          message: "Invalid role. Must be 'user', 'moderator', or 'admin'.",
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
    const errorMsg = err instanceof Error ? err.message : String(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update user role",
        error: errorMsg,
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
    const errorMsg = err instanceof Error ? err.message : String(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update user status",
        error: errorMsg,
      });
  }
}
