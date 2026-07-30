import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("../../src/services/token.service.js", () => ({
  default: {
    verifyAccessToken: vi.fn(),
  },
}));

import { rbac } from "../../src/middlewares/rbac.middleware.js";
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

describe("RBAC Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authorization header", () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = rbac([UserRole.Teacher]);
    middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ message: "No token provided or invalid format" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization header does not start with Bearer", () => {
    const req = createMockRequest("Basic token123");
    const res = createMockResponse();
    const next = createMockNext();

    const middleware = rbac([UserRole.Teacher]);
    middleware(req, res, next);

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

    const middleware = rbac([UserRole.Teacher]);
    middleware(req, res, next);

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

    const middleware = rbac([UserRole.Teacher]);
    middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when role is not in allowed roles", () => {
    const req = createMockRequest("Bearer valid-token");
    const res = createMockResponse();
    const next = createMockNext();

    mockedTokenService.verifyAccessToken.mockReturnValue({
      sub: "user-1",
      role: UserRole.Student,
      name: "John",
    });

    const middleware = rbac([UserRole.Teacher]);
    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonBody).toEqual({ message: "You do not have permission for this action" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when role is in allowed roles", () => {
    const req = createMockRequest("Bearer valid-token");
    const res = createMockResponse();
    const next = createMockNext();

    mockedTokenService.verifyAccessToken.mockReturnValue({
      sub: "user-1",
      role: UserRole.Teacher,
      name: "Jane",
    });

    const middleware = rbac([UserRole.Teacher]);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("calls next when role is God (bypass)", () => {
    const req = createMockRequest("Bearer valid-token");
    const res = createMockResponse();
    const next = createMockNext();

    mockedTokenService.verifyAccessToken.mockReturnValue({
      sub: "user-1",
      role: UserRole.God,
      name: "Admin",
    });

    const middleware = rbac([UserRole.Teacher]);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("calls next when multiple roles are allowed and user has one", () => {
    const req = createMockRequest("Bearer valid-token");
    const res = createMockResponse();
    const next = createMockNext();

    mockedTokenService.verifyAccessToken.mockReturnValue({
      sub: "user-1",
      role: UserRole.Student,
      name: "John",
    });

    const middleware = rbac([UserRole.Teacher, UserRole.Student]);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
