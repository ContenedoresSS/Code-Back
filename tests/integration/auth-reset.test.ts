import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import authService from "../../src/services/auth.service.js";
import { MailProviderNotConfiguredError } from "../../src/services/mail/mail-provider-not-configured.error.js";

vi.mock("../../src/services/auth.service.js");

const mockedAuthService = vi.mocked(authService);

describe("Integration: Password Reset Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("returns 200 for an existing email", async () => {
      mockedAuthService.forgotPassword.mockResolvedValue();

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "student@example.com" });

      expect(response.status).toBe(200);
      expect(mockedAuthService.forgotPassword).toHaveBeenCalledWith({
        email: "student@example.com",
      });
    });

    it("returns 200 for a non-existing email (anti-enumeration)", async () => {
      mockedAuthService.forgotPassword.mockResolvedValue();

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "ghost@example.com" });

      expect(response.status).toBe(200);
    });

    it("returns 400 when the service fails", async () => {
      mockedAuthService.forgotPassword.mockRejectedValue(new Error("Email could not be sent"));

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "student@example.com" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 500 when no mail provider is configured", async () => {
      mockedAuthService.forgotPassword.mockRejectedValue(new MailProviderNotConfiguredError());

      const response = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "student@example.com" });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Servicio de correo no configurado" });
    });
  });

  describe("POST /api/v1/auth/verify-reset-code", () => {
    it("returns a reset token for a valid code", async () => {
      mockedAuthService.verifyResetCode.mockResolvedValue({ resetToken: "reset-token-123" });

      const response = await request(app)
        .post("/api/v1/auth/verify-reset-code")
        .send({ email: "student@example.com", code: "123456" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ resetToken: "reset-token-123" });
    });

    it("returns 400 for an invalid or expired code", async () => {
      mockedAuthService.verifyResetCode.mockRejectedValue(
        new Error("Invalid or expired reset code")
      );

      const response = await request(app)
        .post("/api/v1/auth/verify-reset-code")
        .send({ email: "student@example.com", code: "000000" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /api/v1/auth/reset-password", () => {
    it("returns 200 when the password is reset", async () => {
      mockedAuthService.resetPassword.mockResolvedValue();

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ resetToken: "reset-token-123", newPassword: "new-password-123" });

      expect(response.status).toBe(200);
      expect(mockedAuthService.resetPassword).toHaveBeenCalledWith({
        resetToken: "reset-token-123",
        newPassword: "new-password-123",
      });
    });

    it("returns 400 for an invalid reset token", async () => {
      mockedAuthService.resetPassword.mockRejectedValue(
        new Error("Invalid or expired reset token")
      );

      const response = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ resetToken: "bad-token", newPassword: "new-password-123" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});
