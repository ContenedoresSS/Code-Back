import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    invitationCode: {
      findUnique: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$hashedpassword"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

import { AuthService } from "../../src/services/auth.service.js";
import bcrypt from "bcrypt";

const mockedUserService = {
  create: vi.fn(),
  findByAnyIdentifierAndRole: vi.fn(),
  findByIdWithRole: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  getPasswordHash: vi.fn(),
  findByEmail: vi.fn(),
  saveResetCode: vi.fn(),
  clearResetCode: vi.fn(),
  listUsers: vi.fn(),
  updateUserByAdmin: vi.fn(),
};
const mockedInvitationService = {
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  validateAndConsume: vi.fn(),
};
const mockedTokenService = {
  generateTokenPair: vi.fn(),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  generateResetToken: vi.fn(),
  verifyResetToken: vi.fn(),
};
const mockedSettingService = {
  getAllowedEmailDomains: vi.fn(),
  setAllowedEmailDomains: vi.fn(),
};
const mockedMailProviderFactory = { create: vi.fn() };
const mockedMailTemplateService = { renderPasswordReset: vi.fn() };
const mockedBcrypt = vi.mocked(bcrypt);

const authService = new AuthService(
  mockedUserService,
  mockedTokenService,
  mockedInvitationService,
  mockedMailProviderFactory,
  mockedMailTemplateService,
  mockedSettingService
);

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSettingService.getAllowedEmailDomains.mockResolvedValue([]);
  });

  describe("register", () => {
    it("registers student without invitation code", async () => {
      const registerData = {
        email: "student@example.com",
        password: "password123",
        name: "John",
        lastName: "Doe",
      };

      const mockStudentRole = { id: 1, name: "Student" };
      const mockUser = {
        id: "user-1",
        username: "student@example.com",
        email: "student@example.com",
        name: "John",
        lastName: "Doe",
      };

      mockPrisma.role.findUnique.mockResolvedValue(mockStudentRole);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {};
        mockedUserService.create.mockResolvedValue(mockUser);
        return callback(mockTx);
      });

      const result = await authService.register(registerData);

      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: "Student" },
      });
      expect(mockedUserService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "student@example.com",
          name: "John",
          lastName: "Doe",
          roleId: 1,
        }),
        expect.any(Object)
      );
      expect(result).toEqual({
        id: "user-1",
        username: "student@example.com",
        email: "student@example.com",
        name: "John",
        lastName: "Doe",
        role: "Student",
      });
    });

    it("registers teacher with valid invitation code", async () => {
      const registerData = {
        email: "teacher@example.com",
        password: "password123",
        name: "Jane",
        lastName: "Smith",
        invitationCode: "ABC123",
      };

      const mockInvitation = {
        id: 1,
        code: "ABC123",
        roleId: 2,
        isUsed: false,
        role: { name: "Teacher" },
      };
      const mockUser = {
        id: "user-2",
        username: "teacher@example.com",
        email: "teacher@example.com",
        name: "Jane",
        lastName: "Smith",
      };

      mockPrisma.invitationCode.findUnique.mockResolvedValue(mockInvitation);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {};
        mockedUserService.create.mockResolvedValue(mockUser);
        mockedInvitationService.validateAndConsume.mockResolvedValue(mockInvitation);
        return callback(mockTx);
      });

      const result = await authService.register(registerData);

      expect(mockPrisma.invitationCode.findUnique).toHaveBeenCalledWith({
        where: { code: "ABC123" },
        include: { role: true },
      });
      expect(mockedInvitationService.validateAndConsume).toHaveBeenCalledWith(
        "ABC123",
        expect.any(Object)
      );
      expect(result.role).toBe("Teacher");
    });

    it("throws error for invalid or already used invitation code", async () => {
      const registerData = {
        email: "teacher@example.com",
        password: "password123",
        name: "Jane",
        invitationCode: "INVALID",
      };

      mockPrisma.invitationCode.findUnique.mockResolvedValue(null);

      await expect(authService.register(registerData)).rejects.toThrow(
        "Invitation code is invalid or already used"
      );
    });

    it("throws error when Student role not found", async () => {
      const registerData = {
        email: "student@example.com",
        password: "password123",
        name: "John",
      };

      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(authService.register(registerData)).rejects.toThrow("Default role not found");
    });

    it("rejects registration when the email domain is not allowed", async () => {
      const registerData = {
        email: "student@gmail.com",
        password: "password123",
        name: "John",
        lastName: "Doe",
      };

      mockedSettingService.getAllowedEmailDomains.mockResolvedValue(["uady.mx"]);

      await expect(authService.register(registerData)).rejects.toThrow(
        "El dominio del correo no está permitido"
      );
      expect(mockedUserService.create).not.toHaveBeenCalled();
    });

    it("allows registration when the email domain is allowed", async () => {
      const registerData = {
        email: "student@uady.mx",
        password: "password123",
        name: "John",
        lastName: "Doe",
      };

      const mockStudentRole = { id: 1, name: "Student" };
      const mockUser = {
        id: "user-1",
        username: "student@uady.mx",
        email: "student@uady.mx",
        name: "John",
        lastName: "Doe",
      };

      mockedSettingService.getAllowedEmailDomains.mockResolvedValue(["uady.mx"]);
      mockPrisma.role.findUnique.mockResolvedValue(mockStudentRole);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {};
        mockedUserService.create.mockResolvedValue(mockUser);
        return callback(mockTx);
      });

      const result = await authService.register(registerData);

      expect(mockedUserService.create).toHaveBeenCalled();
      expect(result.email).toBe("student@uady.mx");
    });
  });

  describe("login", () => {
    it("returns tokens for valid credentials", async () => {
      const loginData = {
        identifier: "student@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user-1",
        passwordHash: "$2b$10$hashedpassword",
        role: { name: "Student" },
        name: "John",
        isActive: true,
      };

      const mockTokenPair = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      mockedUserService.findByAnyIdentifierAndRole.mockResolvedValue(mockUser);
      mockedTokenService.generateTokenPair.mockResolvedValue(mockTokenPair);

      const result = await authService.login(loginData);

      expect(mockedUserService.findByAnyIdentifierAndRole).toHaveBeenCalledWith(
        "student@example.com"
      );
      expect(mockedTokenService.generateTokenPair).toHaveBeenCalledWith({
        sub: "user-1",
        role: "Student",
        name: "John",
      });
      expect(result).toEqual({
        token: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("throws error when user not found", async () => {
      const loginData = {
        identifier: "nonexistent@example.com",
        password: "password123",
      };

      mockedUserService.findByAnyIdentifierAndRole.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow("Invalid credentials");
    });

    it("throws error for invalid password", async () => {
      const loginData = {
        identifier: "student@example.com",
        password: "wrongpassword",
      };

      const mockUser = {
        id: "user-1",
        passwordHash: "$2b$10$hashedpassword",
        role: { name: "Student" },
        name: "John",
      };

      mockedUserService.findByAnyIdentifierAndRole.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow("Invalid credentials");
    });

    it("rejects login when the account is deactivated", async () => {
      const loginData = {
        identifier: "student@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user-1",
        passwordHash: "$2b$10$hashedpassword",
        role: { name: "Student" },
        name: "John",
        isActive: false,
      };

      mockedUserService.findByAnyIdentifierAndRole.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);

      await expect(authService.login(loginData)).rejects.toThrow("La cuenta está desactivada");
      expect(mockedTokenService.generateTokenPair).not.toHaveBeenCalled();
    });
  });

  describe("refreshAccessToken", () => {
    it("returns new token pair for valid refresh token", async () => {
      const mockDecoded = { sub: "user-1" };
      const mockUser = {
        id: "user-1",
        role: { name: "Student" },
        name: "John",
        isActive: true,
      };
      const mockTokenPair = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      mockedTokenService.verifyRefreshToken.mockReturnValue(mockDecoded);
      mockedUserService.findByIdWithRole.mockResolvedValue(mockUser);
      mockedTokenService.generateTokenPair.mockResolvedValue(mockTokenPair);

      const result = await authService.refreshAccessToken("valid-refresh-token");

      expect(mockedTokenService.verifyRefreshToken).toHaveBeenCalledWith("valid-refresh-token");
      expect(mockedUserService.findByIdWithRole).toHaveBeenCalledWith("user-1");
      expect(mockedTokenService.generateTokenPair).toHaveBeenCalledWith({
        sub: "user-1",
        role: "Student",
        name: "John",
      });
      expect(result).toEqual({
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      });
    });

    it("throws error for invalid refresh token", async () => {
      mockedTokenService.verifyRefreshToken.mockImplementation(() => {
        throw new Error("Invalid or expired refresh token");
      });

      await expect(authService.refreshAccessToken("invalid-token")).rejects.toThrow(
        "Invalid or expired refresh token"
      );
    });

    it("throws error when user not found", async () => {
      const mockDecoded = { sub: "nonexistent" };

      mockedTokenService.verifyRefreshToken.mockReturnValue(mockDecoded);
      mockedUserService.findByIdWithRole.mockResolvedValue(null);

      await expect(authService.refreshAccessToken("valid-refresh-token")).rejects.toThrow(
        "User not found"
      );
    });

    it("rejects refresh when the account is deactivated", async () => {
      const mockDecoded = { sub: "user-1" };

      mockedTokenService.verifyRefreshToken.mockReturnValue(mockDecoded);
      mockedUserService.findByIdWithRole.mockResolvedValue({
        id: "user-1",
        role: { name: "Student" },
        name: "John",
        isActive: false,
      });

      await expect(authService.refreshAccessToken("valid-refresh-token")).rejects.toThrow(
        "La cuenta está desactivada"
      );
      expect(mockedTokenService.generateTokenPair).not.toHaveBeenCalled();
    });
  });
});
