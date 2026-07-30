import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

import userService from "../../src/services/user.service.js";

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates user with provided data using prisma", async () => {
      const userData = {
        email: "test@example.com",
        passwordHash: "hashed",
        name: "John",
        lastName: "Doe",
        identifier: "ID123",
        roleId: 1,
      };
      const mockUser = { id: "user-1", ...userData };
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await userService.create(userData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: userData });
      expect(result).toEqual(mockUser);
    });

    it("uses transaction when tx is provided", async () => {
      const mockTx = {
        user: { create: vi.fn().mockResolvedValue({ id: "user-1" }) },
      };
      const userData = { email: "test@example.com" };

      await userService.create(userData, mockTx);

      expect(mockTx.user.create).toHaveBeenCalledWith({ data: userData });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe("findByAnyIdentifierAndRole", () => {
    it("finds user by email", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        role: { name: "Student" },
      };
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await userService.findByAnyIdentifierAndRole("test@example.com");

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: "test@example.com" }, { identifier: "test@example.com" }],
        },
        include: { role: true },
      });
      expect(result).toEqual(mockUser);
    });

    it("finds user by identifier", async () => {
      const mockUser = {
        id: "user-1",
        identifier: "STU001",
        role: { name: "Student" },
      };
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await userService.findByAnyIdentifierAndRole("STU001");

      expect(result).toEqual(mockUser);
    });

    it("returns null when user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await userService.findByAnyIdentifierAndRole("nonexistent");

      expect(result).toBeNull();
    });

    it("throws error when prisma throws", async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error("DB error"));

      await expect(
        userService.findByAnyIdentifierAndRole("test")
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("findByIdWithRole", () => {
    it("finds user by id with role", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        role: { name: "Teacher" },
      };
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await userService.findByIdWithRole("user-1");

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: "user-1" },
        include: { role: true },
      });
      expect(result).toEqual(mockUser);
    });

    it("returns null when user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await userService.findByIdWithRole("nonexistent");

      expect(result).toBeNull();
    });

    it("throws error when prisma throws", async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error("DB error"));

      await expect(userService.findByIdWithRole("user-1")).rejects.toThrow(
        "Invalid credentials"
      );
    });
  });

  describe("getProfile", () => {
    it("returns user profile with selected fields", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "John",
        lastName: "Doe",
        identifier: "ID123",
        createdAt: new Date(),
        role: { name: "Student" },
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getProfile("user-1");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          identifier: true,
          createdAt: true,
          role: true,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it("throws error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getProfile("nonexistent")).rejects.toThrow(
        "Usuario no encontrado"
      );
    });
  });

  describe("updateProfile", () => {
    it("updates user profile with provided data", async () => {
      const updateData = { name: "Jane", lastName: "Smith" };
      const mockUpdatedUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Jane",
        lastName: "Smith",
        identifier: "ID123",
        createdAt: new Date(),
      };
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateProfile("user-1", updateData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          identifier: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe("updatePassword", () => {
    it("updates user password hash", async () => {
      mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

      const result = await userService.updatePassword("user-1", "newHashedPassword");

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: "newHashedPassword" },
        select: { id: true },
      });
      expect(result).toEqual({ id: "user-1" });
    });
  });

  describe("getPasswordHash", () => {
    it("returns password hash for existing user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ passwordHash: "hashed123" });

      const result = await userService.getPasswordHash("user-1");

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { passwordHash: true },
      });
      expect(result).toBe("hashed123");
    });

    it("throws error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getPasswordHash("nonexistent")).rejects.toThrow(
        "Usuario no encontrado"
      );
    });
  });
});
