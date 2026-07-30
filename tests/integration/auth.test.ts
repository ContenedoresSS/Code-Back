import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import authService from "../../src/services/auth.service.js";
import { UserRole } from "../../src/types/enums/role.enum.js";

vi.mock("../../src/services/auth.service.js");

const mockedAuthService = vi.mocked(authService);

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

      mockedAuthService.register.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
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

      mockedAuthService.register.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
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
      mockedAuthService.register.mockRejectedValue(
        new Error("Invitation code is invalid or already used")
      );

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "teacher@example.com",
          password: "password123",
          name: "Jane",
          invitationCode: "INVALID",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 400 when Student role not found", async () => {
      mockedAuthService.register.mockRejectedValue(new Error("Default role not found"));

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "student@example.com",
          password: "password123",
          name: "John",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("returns tokens for valid credentials", async () => {
      const mockLoginResult = {
        token: "access-token-123",
        refreshToken: "refresh-token-456",
      };

      mockedAuthService.login.mockResolvedValue(mockLoginResult);

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          identifier: "student@example.com",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.token).toBe("access-token-123");
    });

    it("returns 401 when user not found", async () => {
      mockedAuthService.login.mockRejectedValue(new Error("Invalid credentials"));

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          identifier: "nonexistent@example.com",
          password: "password123",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 401 for invalid password", async () => {
      mockedAuthService.login.mockRejectedValue(new Error("Invalid credentials"));

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          identifier: "student@example.com",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("returns new token pair for valid refresh token", async () => {
      const mockRefreshResult = {
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      mockedAuthService.refreshAccessToken.mockResolvedValue(mockRefreshResult);

      const response = await request(app)
        .post("/api/v1/auth/refresh")
        .send({
          refreshToken: "valid-refresh-token",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("refreshToken");
    });

    it("returns 400 for invalid refresh token", async () => {
      mockedAuthService.refreshAccessToken.mockRejectedValue(
        new Error("Invalid or expired refresh token")
      );

      const response = await request(app)
        .post("/api/v1/auth/refresh")
        .send({
          refreshToken: "invalid-token",
        });

      expect(response.status).toBe(400);
    });
  });
});
