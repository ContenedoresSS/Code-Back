import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("../../src/services/token.service.js", () => ({
  default: {
    verifyAccessToken: vi.fn(),
  },
}));

import { authenticate, optionalAuthenticate } from "../../src/middlewares/auth.middleware.js";
import tokenService from "../../src/services/token.service.js";
import { UserRole } from "../../src/types/enums/role.enum.js";

const mockedTokenService = vi.mocked(tokenService);

const createMockRequest = (authHeader?: string): Request => {
  return {
    headers: {
      authorization: authHeader,
    },
  } as unknown as Request;
};

const createMockResponse = (): Response & { statusCode: number; jsonBody: any } => {
  const res: any = {
    statusCode: 200,
    jsonBody: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.jsonBody = body;
      return this;
    },
  };
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

describe("Auth Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authenticate", () => {
    it("returns 401 when no authorization header", () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.jsonBody).toEqual({ message: "No token provided or invalid format" });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when authorization header does not start with Bearer", () => {
      const req = createMockRequest("Basic token123");
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.jsonBody).toEqual({ message: "No token provided or invalid format" });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when token is empty after Bearer", () => {
      const req = createMockRequest("Bearer ");
      const res = createMockResponse();
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when token is invalid", () => {
      const req = createMockRequest("Bearer invalid-token");
      const res = createMockResponse();
      const next = createMockNext();

      mockedTokenService.verifyAccessToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.jsonBody).toEqual({ message: "Invalid or expired token" });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when role is invalid", () => {
      const req = createMockRequest("Bearer valid-token");
      const res = createMockResponse();
      const next = createMockNext();

      mockedTokenService.verifyAccessToken.mockReturnValue({
        sub: "user-1",
        role: "InvalidRole",
        name: "John",
      });

      authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.jsonBody).toEqual({ message: "Invalid or expired token" });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next when token is valid", () => {
      const req = createMockRequest("Bearer valid-token") as any;
      const res = createMockResponse();
      const next = createMockNext();

      mockedTokenService.verifyAccessToken.mockReturnValue({
        sub: "user-1",
        role: UserRole.Student,
        name: "John",
      });

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBe("user-1");
      expect(req.role).toBe(UserRole.Student);
    });

    it("sets user and role on request object", () => {
      const req = createMockRequest("Bearer valid-token") as any;
      const res = createMockResponse();
      const next = createMockNext();

      mockedTokenService.verifyAccessToken.mockReturnValue({
        sub: "user-123",
        role: UserRole.Teacher,
        name: "Jane",
      });

      authenticate(req, res, next);

      expect(req.user).toBe("user-123");
      expect(req.role).toBe(UserRole.Teacher);
    });
  });

  describe("optionalAuthenticate", () => {
    it("calls next when no authorization header", () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("calls next when authorization header does not start with Bearer", () => {
      const req = createMockRequest("Basic token123");
      const res = createMockResponse();
      const next = createMockNext();

      optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("calls next and sets user when token is valid", () => {
      const req = createMockRequest("Bearer valid-token") as any;
      const res = createMockResponse();
      const next = createMockNext();

      mockedTokenService.verifyAccessToken.mockReturnValue({
        sub: "user-1",
        role: UserRole.Student,
        name: "John",
      });

      optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBe("user-1");
      expect(req.role).toBe(UserRole.Student);
    });

    it("calls next without setting user when token is invalid", () => {
      const req = createMockRequest("Bearer invalid-token") as any;
      const res = createMockResponse();
      const next = createMockNext();

      mockedTokenService.verifyAccessToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(req.role).toBeUndefined();
    });

    it("does not set role when role is invalid", () => {
      const req = createMockRequest("Bearer valid-token") as any;
      const res = createMockResponse();
      const next = createMockNext();

      mockedTokenService.verifyAccessToken.mockReturnValue({
        sub: "user-1",
        role: "InvalidRole",
        name: "John",
      });

      optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBe("user-1");
      expect(req.role).toBeUndefined();
    });
  });
});
