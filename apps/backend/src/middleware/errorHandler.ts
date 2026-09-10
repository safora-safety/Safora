import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details || null,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Unhandled internal server error
  console.error("[CRITICAL ERROR]", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : null,
    timestamp: new Date().toISOString(),
  });
}
