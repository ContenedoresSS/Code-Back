import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { mockAuthService } from "./helpers/register-mocks.js";
import app from "../../src/app.js";

describe("Integration: Auth Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/auth/register", () => {
    it("registers a student without invitation code", async () => {
      const mockUser = {
        id: "user-1",
        username: "student@example.com",
        email: "student@example.com",
        name: "John",
        lastName: "Doe",
        role: "Student",
      };

      mockAuthService.register.mockResolvedValue(mockUser);

      const response = await request(app).post("/api/v1/auth/register").send({
        email: "student@example.com",
        password: "password123",
        name: "John",
        lastName: "Doe",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe("student@example.com");
      expect(response.body.user.role).toBe("Student");
    });

    it("registers a teacher with valid invitation code", async () => {
      const mockUser = {
        id: "user-2",
        username: "teacher@example.com",
        email: "teacher@example.com",
        name: "Jane",
        lastName: "Smith",
        role: "Teacher",
      };

      mockAuthService.register.mockResolvedValue(mockUser);

      const response = await request(app).post("/api/v1/auth/register").send({
        email: "teacher@example.com",
        password: "password123",
        name: "Jane",
        lastName: "Smith",
        invitationCode: "ABC123",
      });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe("Teacher");
    });

    it("returns 400 for invalid invitation code", async () => {
      mockAuthService.register.mockRejectedValue(
        new Error("Invitation code is invalid or already used")
      );

      const response = await request(app).post("/api/v1/auth/register").send({
        email: "teacher@example.com",
        password: "password123",
        name: "Jane",
        invitationCode: "INVALID",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 409 for duplicate email (Prisma P2002)", async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint violation", {
        code: "P2002",
        clientVersion: "5.0.0",
        meta: { target: ["email"] },
      });

      mockAuthService.register.mockRejectedValue(prismaError);

      const response = await request(app).post("/api/v1/auth/register").send({
        email: "existing@example.com",
        password: "password123",
        name: "John",
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("code", "UNIQUE_CONSTRAINT_VIOLATION");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("returns tokens for valid credentials", async () => {
      const mockLoginResult = {
        token: "access-token-123",
        refreshToken: "refresh-token-456",
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const response = await request(app).post("/api/v1/auth/login").send({
        identifier: "student@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.token).toBe("access-token-123");
    });

    it("returns 401 for invalid credentials", async () => {
      mockAuthService.login.mockRejectedValue(new Error("Invalid credentials"));

      const response = await request(app).post("/api/v1/auth/login").send({
        identifier: "student@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 403 when the account is deactivated", async () => {
      mockAuthService.login.mockRejectedValue(new Error("La cuenta está desactivada."));

      const response = await request(app).post("/api/v1/auth/login").send({
        identifier: "student@example.com",
        password: "password123",
      });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("desactivada");
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("returns new token pair for valid refresh token", async () => {
      const mockRefreshResult = {
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      mockAuthService.refreshAccessToken.mockResolvedValue(mockRefreshResult);

      const response = await request(app).post("/api/v1/auth/refresh").send({
        refreshToken: "valid-refresh-token",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("refreshToken");
    });

    it("returns 400 for invalid refresh token", async () => {
      mockAuthService.refreshAccessToken.mockRejectedValue(
        new Error("Invalid or expired refresh token")
      );

      const response = await request(app).post("/api/v1/auth/refresh").send({
        refreshToken: "invalid-token",
      });

      expect(response.status).toBe(400);
    });

    it("returns 403 when the account is deactivated", async () => {
      mockAuthService.refreshAccessToken.mockRejectedValue(
        new Error("La cuenta está desactivada.")
      );

      const response = await request(app).post("/api/v1/auth/refresh").send({
        refreshToken: "valid-refresh-token",
      });

      expect(response.status).toBe(403);
    });
  });
});
