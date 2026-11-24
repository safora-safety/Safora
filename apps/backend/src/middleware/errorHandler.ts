import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { SystemLogService } from "../services/systemLogService";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const metadata = {
    url: _req.originalUrl || _req.url,
    method: _req.method,
    ip: _req.ip,
  };

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      SystemLogService.recordLog(
        "CRASH",
        "errorHandler",
        err.message,
        err.stack,
        metadata,
      );
    } else {
      SystemLogService.recordLog(
        "WARN",
        "errorHandler",
        err.message,
        undefined,
        metadata,
      );
    }
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      message: err.message,
      details: err.details || null,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Unhandled internal server error / crash
  console.error("[CRITICAL ERROR]", err);
  SystemLogService.recordLog(
    "CRASH",
    "errorHandler.unhandled",
    err.message,
    err.stack,
    metadata,
  );
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : null,
    timestamp: new Date().toISOString(),
  });
}
