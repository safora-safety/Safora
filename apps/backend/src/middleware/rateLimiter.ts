import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const hits = new Map<string, RateLimitRecord>();

  // Periodically clean up expired entries every 5 minutes
  const cleanupTimer = setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of hits.entries()) {
        if (now > record.resetTime) {
          hits.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  );
  cleanupTimer.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Obtain client IP address (works with app.set('trust proxy', 1))
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = hits.get(ip);

    if (!record || now > record.resetTime) {
      hits.set(ip, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    record.count++;
    if (record.count > options.max) {
      res.status(429).json({
        success: false,
        message:
          options.message || "Too many requests. Please try again later.",
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

// 15 requests per 15 minutes for authentication
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message:
    "Too many authentication attempts from this IP. Please try again after 15 minutes.",
});

// 10 requests per minute for emergency SOS trigger
export const sosRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message:
    "Too many SOS requests triggered in a short period. Please wait 1 minute.",
});

// 20 reports per 15 minutes
export const reportCreateRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message:
    "Too many safety incident reports submitted from this IP. Please wait before reporting again.",
});

// 30 requests per 15 minutes for checking registered guardian accounts
export const checkGuardianRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message:
    "Too many guardian verification requests from this IP. Please wait before checking again.",
});

// 5 audio evidence uploads per 15 minutes
export const uploadAudioRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "Too many audio evidence uploads from this IP. Please wait before uploading again.",
});

// 5 test guardian drills per 15 minutes
export const testGuardianRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "Too many test safety drills dispatched. Please wait before testing again.",
});
