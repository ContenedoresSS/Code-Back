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
    it("throws error when prisma throws", async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error("DB error"));

      await expect(
        userService.findByAnyIdentifierAndRole("test")
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("findByIdWithRole", () => {
    it("throws error when prisma throws", async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error("DB error"));

      await expect(userService.findByIdWithRole("user-1")).rejects.toThrow(
        "Invalid credentials"
      );
    });
  });

  describe("getProfile", () => {
    it("throws error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getProfile("nonexistent")).rejects.toThrow(
        "Usuario no encontrado"
      );
    });
  });

  describe("getPasswordHash", () => {
    it("throws error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getPasswordHash("nonexistent")).rejects.toThrow(
        "Usuario no encontrado"
      );
    });
  });
});
