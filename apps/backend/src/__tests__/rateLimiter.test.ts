import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { EventEmitter } from "events";
import {
  createRateLimiter,
  userOrIpKeyGenerator,
  loginEmailKeyGenerator,
  loginIpKeyGenerator,
  uploadAudioRateLimiter,
  sosRateLimiter,
  loginEmailRateLimiter,
  loginIpRateLimiter,
  registerEmailRateLimiter,
  registerIpRateLimiter,
} from "../middleware/rateLimiter";

// Helper to simulate Express mock response with event emitter for res.on("finish")
function createMockResponse() {
  const emitter = new EventEmitter();
  const res: any = {
    statusCode: 200,
    status: jest.fn().mockImplementation((...args: any[]) => {
      res.statusCode = args[0];
      return res;
    }),
    json: jest.fn().mockImplementation((...args: any[]) => {
      res.body = args[0];
      return res;
    }),
    on: jest.fn().mockImplementation((...args: any[]) => {
      emitter.on(args[0], args[1]);
      return res;
    }),
    emitFinish: () => {
      emitter.emit("finish");
    },
  };
  return res;
}

describe("Rate Limiter Network & Identity Hardening", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Shared IP Isolation (Campus Wi-Fi / Mobile CGNAT)", () => {
    it("should isolate rate limits per user so User A does not block User B on the same shared IP", () => {
      // 5 requests per window, keyed by user ID or IP
      const limiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 5,
        keyGenerator: userOrIpKeyGenerator,
        message: "Too many requests.",
      });

      const sharedIp = "203.0.113.195"; // Shared NAT IP
      const reqUserA: any = { user: { id: 101 }, ip: sharedIp };
      const reqUserB: any = { user: { id: 102 }, ip: sharedIp };

      // User A makes 5 requests (all should succeed)
      for (let i = 0; i < 5; i++) {
        const resA = createMockResponse();
        const nextA = jest.fn();
        limiter(reqUserA, resA, nextA);
        expect(nextA).toHaveBeenCalledTimes(1);
      }

      // User A makes a 6th request -> hits rate limit (429)
      const resA6 = createMockResponse();
      const nextA6 = jest.fn();
      limiter(reqUserA, resA6, nextA6);
      expect(nextA6).not.toHaveBeenCalled();
      expect(resA6.status).toHaveBeenCalledWith(429);

      // User B makes a request from the exact same shared IP -> MUST NOT BE BLOCKED
      const resB1 = createMockResponse();
      const nextB1 = jest.fn();
      limiter(reqUserB, resB1, nextB1);
      expect(nextB1).toHaveBeenCalledTimes(1);
      expect(resB1.status).not.toHaveBeenCalledWith(429);
    });

    it("should fall back to IP keying when request is unauthenticated", () => {
      const limiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 2,
        keyGenerator: userOrIpKeyGenerator,
      });

      const reqAnon: any = { ip: "198.51.100.22" };

      const res1 = createMockResponse();
      const next1 = jest.fn();
      limiter(reqAnon, res1, next1);
      expect(next1).toHaveBeenCalledTimes(1);

      const res2 = createMockResponse();
      const next2 = jest.fn();
      limiter(reqAnon, res2, next2);
      expect(next2).toHaveBeenCalledTimes(1);

      // 3rd unauthenticated request from same IP is blocked
      const res3 = createMockResponse();
      const next3 = jest.fn();
      limiter(reqAnon, res3, next3);
      expect(next3).not.toHaveBeenCalled();
      expect(res3.status).toHaveBeenCalledWith(429);
    });
  });

  describe("Login Dual-Tier Rate Limiting", () => {
    it("should rate limit 10 failed login attempts for a specific account email", () => {
      const emailLimiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 10,
        keyGenerator: loginEmailKeyGenerator,
        skipSuccessfulRequests: true,
      });

      const targetEmail = "victim-student@campus.edu";
      const sharedIp = "192.0.2.55";

      // 10 failed login attempts (statusCode 401)
      for (let i = 0; i < 10; i++) {
        const req: any = { body: { email: targetEmail }, ip: sharedIp };
        const res = createMockResponse();
        const next = jest.fn();

        emailLimiter(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);

        // Simulate failed login finish
        res.statusCode = 401;
        res.emitFinish();
      }

      // 11th failed attempt for target email is blocked with 429
      const reqBlocked: any = { body: { email: targetEmail }, ip: sharedIp };
      const resBlocked = createMockResponse();
      const nextBlocked = jest.fn();
      emailLimiter(reqBlocked, resBlocked, nextBlocked);

      expect(nextBlocked).not.toHaveBeenCalled();
      expect(resBlocked.status).toHaveBeenCalledWith(429);

      // A different email from the same IP is NOT blocked
      const reqOther: any = {
        body: { email: "roommate@campus.edu" },
        ip: sharedIp,
      };
      const resOther = createMockResponse();
      const nextOther = jest.fn();
      emailLimiter(reqOther, resOther, nextOther);

      expect(nextOther).toHaveBeenCalledTimes(1);
      expect(resOther.status).not.toHaveBeenCalledWith(429);
    });

    it("should not penalize successful logins when skipSuccessfulRequests is true", () => {
      const emailLimiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 5,
        keyGenerator: loginEmailKeyGenerator,
        skipSuccessfulRequests: true,
      });

      const legitimateEmail = "legit-user@safora.safety";

      // 15 successful logins (e.g. active daily student sessions)
      for (let i = 0; i < 15; i++) {
        const req: any = {
          body: { email: legitimateEmail },
          ip: "192.168.1.100",
        };
        const res = createMockResponse();
        const next = jest.fn();

        emailLimiter(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);

        // Successful authentication
        res.statusCode = 200;
        res.emitFinish();
      }

      // After 15 successful logins, the user is still NOT blocked
      const reqNext: any = {
        body: { email: legitimateEmail },
        ip: "192.168.1.100",
      };
      const resNext = createMockResponse();
      const nextNext = jest.fn();
      emailLimiter(reqNext, resNext, nextNext);

      expect(nextNext).toHaveBeenCalledTimes(1);
      expect(resNext.status).not.toHaveBeenCalledWith(429);
    });

    it("should enforce the network IP ceiling when flooding login across multiple accounts", () => {
      const ipLimiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 5, // smaller ceiling for test execution speed
        keyGenerator: loginIpKeyGenerator,
        skipSuccessfulRequests: true,
      });

      const attackerIp = "198.51.100.99";

      // Attacker tries 5 different emails from the same IP (all failing)
      for (let i = 0; i < 5; i++) {
        const req: any = {
          body: { email: `random_user_${i}@target.com` },
          ip: attackerIp,
        };
        const res = createMockResponse();
        const next = jest.fn();

        ipLimiter(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);

        res.statusCode = 401;
        res.emitFinish();
      }

      // 6th attempt from the attacker IP is blocked even with a new email
      const req6: any = {
        body: { email: "fresh_target@target.com" },
        ip: attackerIp,
      };
      const res6 = createMockResponse();
      const next6 = jest.fn();
      ipLimiter(req6, res6, next6);

      expect(next6).not.toHaveBeenCalled();
      expect(res6.status).toHaveBeenCalledWith(429);
    });
  });

  describe("Registration Campus Network & Per-Email Rate Limiting", () => {
    it("should allow many distinct student registrations from the same campus Wi-Fi IP without 429", () => {
      const campusWifiIp = "172.16.50.10";

      // 25 distinct students registering from the same campus Wi-Fi IP
      for (let i = 0; i < 25; i++) {
        const req: any = {
          body: { email: `student_${i}@dbuu.ac.in` },
          ip: campusWifiIp,
        };
        const res = createMockResponse();
        const next = jest.fn();

        registerIpRateLimiter(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalledWith(429);
      }
    });

    it("should enforce the 5-attempt per-email registration limiter to prevent spamming single addresses", () => {
      const targetEmail = "repeat_reg@dbuu.ac.in";
      const req: any = {
        body: { email: targetEmail },
        ip: "10.10.10.1",
      };

      for (let i = 0; i < 5; i++) {
        const res = createMockResponse();
        const next = jest.fn();
        registerEmailRateLimiter(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
      }

      // 6th attempt for the exact same email address is blocked with 429
      const resBlocked = createMockResponse();
      const nextBlocked = jest.fn();
      registerEmailRateLimiter(req, resBlocked, nextBlocked);

      expect(nextBlocked).not.toHaveBeenCalled();
      expect(resBlocked.status).toHaveBeenCalledWith(429);
      expect(resBlocked.body.message).toMatch(
        /Too many registration attempts for this email address/,
      );
    });
  });
});
