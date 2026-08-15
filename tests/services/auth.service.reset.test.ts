import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    role: {
      findUnique: vi.fn(),
    },
    invitationCode: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$hashedcode"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../../src/services/user.service.js", () => ({
  default: {
    create: vi.fn(),
    findByAnyIdentifierAndRole: vi.fn(),
    findByIdWithRole: vi.fn(),
    findByEmail: vi.fn(),
    saveResetCode: vi.fn(),
    clearResetCode: vi.fn(),
    updatePassword: vi.fn(),
  },
}));

vi.mock("../../src/services/token.service.js", () => ({
  default: {
    generateTokenPair: vi.fn(),
    verifyRefreshToken: vi.fn(),
    generateResetToken: vi.fn().mockReturnValue("reset-token"),
    verifyResetToken: vi.fn().mockReturnValue("user-1"),
  },
}));

vi.mock("../../src/services/mail/mail-provider.factory.js", () => ({
  default: {
    create: vi.fn(),
  },
}));

import authService from "../../src/services/auth.service.js";
import userService from "../../src/services/user.service.js";
import tokenService from "../../src/services/token.service.js";
import mailProviderFactory from "../../src/services/mail/mail-provider.factory.js";
import { MailProviderNotConfiguredError } from "../../src/services/mail/mail-provider-not-configured.error.js";
import bcrypt from "bcrypt";

const mockedUserService = vi.mocked(userService);
const mockedTokenService = vi.mocked(tokenService);
const mockedFactory = vi.mocked(mailProviderFactory);
const mockedBcrypt = vi.mocked(bcrypt);

describe("AuthService reset flow", () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend = vi.fn().mockResolvedValue(undefined);
    mockedFactory.create.mockReturnValue({ send: mockSend } as never);
  });

  describe("forgotPassword", () => {
    it("stores a hashed reset code with expiry and sends it by email", async () => {
      mockedUserService.findByEmail.mockResolvedValue({
        id: "user-1",
        email: "student@example.com",
        name: "John",
        resetTokenHash: null,
        resetTokenExpires: null,
      });

      await authService.forgotPassword({ email: "student@example.com" });

      expect(mockedUserService.findByEmail).toHaveBeenCalledWith("student@example.com");
      expect(mockedBcrypt.hash).toHaveBeenCalled();
      expect(mockedUserService.saveResetCode).toHaveBeenCalledWith(
        "user-1",
        "$2b$10$hashedcode",
        expect.any(Date)
      );
      expect(mockedFactory.create).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "student@example.com",
          html: expect.stringMatching(/\d{6}/),
        })
      );
    });

    it("does nothing when the email does not exist (anti-enumeration)", async () => {
      mockedUserService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.forgotPassword({ email: "ghost@example.com" })
      ).resolves.toBeUndefined();

      expect(mockedUserService.saveResetCode).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("throws MailProviderNotConfiguredError when no provider is configured", async () => {
      mockedFactory.create.mockImplementation(() => {
        throw new MailProviderNotConfiguredError();
      });

      await expect(authService.forgotPassword({ email: "student@example.com" })).rejects.toThrow(
        MailProviderNotConfiguredError
      );

      expect(mockedUserService.findByEmail).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("verifyResetCode", () => {
    it("returns a reset token for a valid, non-expired code", async () => {
      const future = new Date(Date.now() + 600_000);
      mockedUserService.findByEmail.mockResolvedValue({
        id: "user-1",
        email: "student@example.com",
        name: "John",
        resetTokenHash: "$2b$10$hashedcode",
        resetTokenExpires: future,
      });

      const result = await authService.verifyResetCode({
        email: "student@example.com",
        code: "123456",
      });

      expect(mockedBcrypt.compare).toHaveBeenCalledWith("123456", "$2b$10$hashedcode");
      expect(mockedTokenService.generateResetToken).toHaveBeenCalledWith("user-1");
      expect(result).toEqual({ resetToken: "reset-token" });
    });

    it("throws when the code is invalid", async () => {
      const future = new Date(Date.now() + 600_000);
      mockedUserService.findByEmail.mockResolvedValue({
        id: "user-1",
        email: "student@example.com",
        name: "John",
        resetTokenHash: "$2b$10$hashedcode",
        resetTokenExpires: future,
      });
      mockedBcrypt.compare.mockImplementation(async () => false);

      await expect(
        authService.verifyResetCode({ email: "student@example.com", code: "000000" })
      ).rejects.toThrow("Invalid or expired reset code");
    });

    it("throws when the code is expired", async () => {
      const past = new Date(Date.now() - 600_000);
      mockedUserService.findByEmail.mockResolvedValue({
        id: "user-1",
        email: "student@example.com",
        name: "John",
        resetTokenHash: "$2b$10$hashedcode",
        resetTokenExpires: past,
      });

      await expect(
        authService.verifyResetCode({ email: "student@example.com", code: "123456" })
      ).rejects.toThrow("Invalid or expired reset code");
    });

    it("throws when there is no pending reset for the user", async () => {
      mockedUserService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.verifyResetCode({ email: "ghost@example.com", code: "123456" })
      ).rejects.toThrow("Invalid or expired reset code");
    });
  });

  describe("resetPassword", () => {
    it("updates the password hash and clears the stored code", async () => {
      mockedTokenService.verifyResetToken.mockReturnValue("user-1");

      await authService.resetPassword({
        resetToken: "reset-token",
        newPassword: "new-password-123",
      });

      expect(mockedTokenService.verifyResetToken).toHaveBeenCalledWith("reset-token");
      expect(mockedBcrypt.hash).toHaveBeenCalledWith("new-password-123", expect.any(Number));
      expect(mockedUserService.updatePassword).toHaveBeenCalledWith("user-1", "$2b$10$hashedcode");
      expect(mockedUserService.clearResetCode).toHaveBeenCalledWith("user-1");
    });

    it("throws when the reset token is invalid", async () => {
      mockedTokenService.verifyResetToken.mockImplementation(() => {
        throw new Error("Invalid or expired reset token");
      });

      await expect(
        authService.resetPassword({ resetToken: "bad-token", newPassword: "new-password-123" })
      ).rejects.toThrow("Invalid or expired reset token");
    });
  });
});
