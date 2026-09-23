import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/userRepository";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "FATAL: JWT_SECRET environment variable is not defined. Refusing to start with insecure fallbacks.",
  );
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role?: string;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ success: false, message: "Authentication required" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET!, {
      algorithms: ["HS256"],
    }) as {
      id: number;
      email: string;
      role?: string;
    };

    const user = await UserRepository.findById(decoded.id);
    if (!user || user.is_active === false) {
      res.status(401).json({
        success: false,
        message: "User account is inactive or suspended",
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Forbidden: Admin privileges required",
    });
    return;
  }
  next();
}

export function requireStaff(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (
    !req.user ||
    (req.user.role !== "admin" && req.user.role !== "moderator")
  ) {
    res.status(403).json({
      success: false,
      message: "Forbidden: Staff privileges required",
    });
    return;
  }
  next();
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET!, {
      algorithms: ["HS256"],
    }) as {
      id: number;
      email: string;
      role?: string;
    };

    const user = await UserRepository.findById(decoded.id);
    if (user && user.is_active !== false) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }
  } catch {
    // Non-blocking: unauthenticated / invalid token continues as public visitor
  }
  next();
}
