import { describe, it, expect } from "@jest/globals";
import {
  requireAdmin,
  requireStaff,
  AuthenticatedRequest,
} from "../middleware/auth";
import { Response } from "express";

function mockResponse(): {
  res: Partial<Response>;
  statusCode: number | null;
  jsonData: any;
} {
  let statusCode: number | null = null;
  let jsonData: any = null;

  const res: Partial<Response> = {
    status: (code: number) => {
      statusCode = code;
      return res as Response;
    },
    json: (data: any) => {
      jsonData = data;
      return res as Response;
    },
  };

  return {
    res,
    get statusCode() {
      return statusCode;
    },
    get jsonData() {
      return jsonData;
    },
  };
}

describe("Auth Middleware Role Guards", () => {
  describe("requireAdmin", () => {
    it("should allow request when user has admin role", () => {
      const req = {
        user: { id: 1, email: "admin@safora.safety", role: "admin" },
      } as AuthenticatedRequest;
      const { res } = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      requireAdmin(req, res as Response, next);

      expect(nextCalled).toBe(true);
    });

    it("should reject with 403 when user is standard member", () => {
      const req = {
        user: { id: 2, email: "citizen@safora.safety", role: "user" },
      } as AuthenticatedRequest;
      const mock = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      requireAdmin(req, mock.res as Response, next);

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(403);
      expect(mock.jsonData?.message).toMatch(/Admin privileges required/);
    });

    it("should reject with 403 when user has moderator role", () => {
      const req = {
        user: { id: 3, email: "mod@safora.safety", role: "moderator" },
      } as AuthenticatedRequest;
      const mock = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      requireAdmin(req, mock.res as Response, next);

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(403);
    });

    it("should reject with 403 when req.user is missing", () => {
      const req = {} as AuthenticatedRequest;
      const mock = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      requireAdmin(req, mock.res as Response, next);

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(403);
    });
  });

  describe("requireStaff", () => {
    it("should allow request when user is admin", () => {
      const req = {
        user: { id: 1, email: "admin@safora.safety", role: "admin" },
      } as AuthenticatedRequest;
      const { res } = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      requireStaff(req, res as Response, next);

      expect(nextCalled).toBe(true);
    });

    it("should allow request when user is moderator", () => {
      const req = {
        user: { id: 4, email: "mod@safora.safety", role: "moderator" },
      } as AuthenticatedRequest;
      const { res } = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      requireStaff(req, res as Response, next);

      expect(nextCalled).toBe(true);
    });

    it("should reject standard user with 403 Forbidden", () => {
      const req = {
        user: { id: 5, email: "user@safora.safety", role: "user" },
      } as AuthenticatedRequest;
      const mock = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      requireStaff(req, mock.res as Response, next);

      expect(nextCalled).toBe(false);
      expect(mock.statusCode).toBe(403);
      expect(mock.jsonData?.message).toMatch(/Staff privileges required/);
    });
  });

  describe("Journey Resource Ownership Verification", () => {
    function isAllowedToMutateJourney(
      journeyOwnerId: string | number,
      actingUserId: string | number,
      actingUserRole?: string,
    ): boolean {
      if (String(journeyOwnerId) === String(actingUserId)) return true;
      if (actingUserRole === "admin" || actingUserRole === "moderator")
        return true;
      return false;
    }

    it("should authorize journey owner to mutate their active journey", () => {
      expect(isAllowedToMutateJourney(101, 101, "user")).toBe(true);
    });

    it("should block another standard user from mutating someone else's journey", () => {
      expect(isAllowedToMutateJourney(101, 102, "user")).toBe(false);
    });

    it("should allow administrative staff to intervene in an emergency journey", () => {
      expect(isAllowedToMutateJourney(101, 999, "admin")).toBe(true);
      expect(isAllowedToMutateJourney(101, 888, "moderator")).toBe(true);
    });
  });
});
