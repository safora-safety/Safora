import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/database";
import { AuthenticatedRequest } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET || "safora_jwt_secret_fallback_key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    res
      .status(400)
      .json({
        success: false,
        message: "Name, email, and password are required",
      });
    return;
  }

  try {
    const existing = await db.query("SELECT id FROM users WHERE email = $1;", [
      email.toLowerCase().trim(),
    ]);
    if (existing.rows.length > 0) {
      res
        .status(409)
        .json({
          success: false,
          message: "An account with this email already exists",
        });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (name, email, phone, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, role, created_at;`,
      [name.trim(), email.toLowerCase().trim(), phone || null, hashedPassword],
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN as any,
      },
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[ERROR] Register failed:", errorMsg);
    res
      .status(500)
      .json({ success: false, message: "Server error during registration" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
    return;
  }

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1;", [
      email.toLowerCase().trim(),
    ]);
    if (result.rows.length === 0) {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN as any,
      },
    );

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[ERROR] Login failed:", errorMsg);
    res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const result = await db.query(
      "SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1;",
      [req.user.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, user: result.rows[0] });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: errorMsg });
  }
}
