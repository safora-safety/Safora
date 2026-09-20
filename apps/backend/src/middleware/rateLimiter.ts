import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

export function createRateLimiter(options: RateLimiterOptions) {
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
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = hits.get(key);

    const setupSkipSuccess = () => {
      if (
        options.skipSuccessfulRequests &&
        !res.locals?.[`_rateLimitSkipBound_${key}`]
      ) {
        if (!res.locals) {
          res.locals = {};
        }
        res.locals[`_rateLimitSkipBound_${key}`] = true;
        res.on("finish", () => {
          if (res.statusCode < 400) {
            const current = hits.get(key);
            if (current) {
              current.count = Math.max(0, current.count - 1);
            }
          }
        });
      }
    };

    if (!record || now > record.resetTime) {
      hits.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      setupSkipSuccess();
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

    setupSkipSuccess();
    next();
  };
}

/**
 * Key generator for authenticated routes: keys by `user:${req.user.id}`
 * falling back to `ip:${req.ip}` if unauthenticated.
 * Prevents mobile carrier CGNAT and campus Wi-Fi shared IPs from exhausting individual limits.
 */
export const userOrIpKeyGenerator = (req: Request): string => {
  const userId = (req as any).user?.id;
  if (userId !== undefined && userId !== null) {
    return `user:${userId}`;
  }
  return `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
};

/**
 * Key generator for login attempts by account email.
 */
export const loginEmailKeyGenerator = (req: Request): string => {
  const email = req.body?.email;
  if (typeof email === "string" && email.trim()) {
    return `email:${email.trim().toLowerCase()}`;
  }
  return `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
};

/**
 * Key generator for login attempts by network IP.
 */
export const loginIpKeyGenerator = (req: Request): string => {
  return `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
};

// Registration rate limiters:
// 1. Per-email limit: 5 registration attempts per 15 minutes to prevent hammering a single email address
export const registerEmailRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: loginEmailKeyGenerator,
  message:
    "Too many registration attempts for this email address. Please try again after 15 minutes.",
});

// 2. Network IP ceiling: 60 registrations per 15 minutes per IP (supports classrooms/evaluators on campus Wi-Fi)
export const registerIpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: loginIpKeyGenerator,
  message:
    "Too many account registrations from this network. Please try again after 15 minutes.",
});

// Backward-compatible alias for registration IP limiter
export const authRateLimiter = registerIpRateLimiter;

// Dual-tier login limiters:
// 1. Per-account limit: 10 failed attempts per 15 minutes, successful logins skipped
export const loginEmailRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: loginEmailKeyGenerator,
  skipSuccessfulRequests: true,
  message:
    "Too many failed login attempts for this account. Please try again after 15 minutes.",
});

// 2. Network ceiling: 100 attempts per 15 minutes, successful logins skipped
export const loginIpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: loginIpKeyGenerator,
  skipSuccessfulRequests: true,
  message:
    "Too many login attempts from this network. Please try again after 15 minutes.",
});

// 10 requests per minute for emergency SOS trigger (keyed by user ID)
export const sosRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: userOrIpKeyGenerator,
  message:
    "Too many SOS requests triggered in a short period. Please wait 1 minute.",
});

// 20 reports per 15 minutes (keyed by user ID)
export const reportCreateRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: userOrIpKeyGenerator,
  message:
    "Too many safety incident reports submitted. Please wait before reporting again.",
});

// 30 requests per 15 minutes for checking registered guardian accounts (keyed by user ID)
export const checkGuardianRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: userOrIpKeyGenerator,
  message:
    "Too many guardian verification requests. Please wait before checking again.",
});

// 5 audio evidence uploads per 15 minutes (keyed by user ID)
export const uploadAudioRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: userOrIpKeyGenerator,
  message:
    "Too many audio evidence uploads. Please wait before uploading again.",
});

// 5 test guardian drills per 15 minutes (keyed by user ID)
export const testGuardianRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: userOrIpKeyGenerator,
  message:
    "Too many test safety drills dispatched. Please wait before testing again.",
});
