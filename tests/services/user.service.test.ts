import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
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

import { UserService } from "../../src/services/user.service.js";
import bcrypt from "bcrypt";

const userService = new UserService();
const mockedBcrypt = vi.mocked(bcrypt);

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

      await expect(userService.findByAnyIdentifierAndRole("test")).rejects.toThrow(
        "Invalid credentials"
      );
    });
  });

  describe("findByIdWithRole", () => {
    it("throws error when prisma throws", async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error("DB error"));

      await expect(userService.findByIdWithRole("user-1")).rejects.toThrow("Invalid credentials");
    });
  });

  describe("getProfile", () => {
    it("throws error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getProfile("nonexistent")).rejects.toThrow("Usuario no encontrado");
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

  describe("listUsers", () => {
    it("returns paginated users with createdAt serialized", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: "u1",
          email: "a@x.com",
          name: "Alan",
          lastName: "Turing",
          identifier: "A1",
          isActive: true,
          createdAt: new Date("2024-01-01"),
          role: { id: 1, name: "Student" },
        },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.$transaction.mockImplementation(async (queries) => Promise.all(queries));

      const result = await userService.listUsers(undefined, undefined, 0, 10);

      expect(result.totalCount).toBe(1);
      expect(result.data[0].name).toBe("Alan");
      expect(result.data[0].createdAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("filters by role and search term", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (queries) => Promise.all(queries));

      await userService.listUsers("Teacher", "tur", 0, 10);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: { name: "Teacher" },
            OR: [
              { name: { contains: "tur", mode: "insensitive" } },
              { lastName: { contains: "tur", mode: "insensitive" } },
            ],
          },
          skip: 0,
          take: 10,
        })
      );
    });
  });

  describe("updateUserByAdmin", () => {
    const mockTx = () => ({
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      role: {
        findUnique: vi.fn(),
      },
      $queryRaw: vi.fn(),
    });

    beforeEach(() => {
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx()));
    });

    it("updates password, role and active status", async () => {
      const tx = mockTx();
      tx.user.findUnique.mockResolvedValue({ id: "u1", isActive: true, role: { name: "Teacher" } });
      tx.role.findUnique.mockResolvedValue({ id: 1, name: "God" });
      tx.user.update.mockResolvedValue({
        id: "u1",
        email: "a@x.com",
        name: "Alan",
        lastName: "Turing",
        identifier: null,
        isActive: true,
        createdAt: new Date("2024-01-01"),
        role: { id: 1, name: "God" },
      });
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

      const result = await userService.updateUserByAdmin("u1", {
        password: "newpass123",
        role: "God",
        isActive: true,
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith("newpass123", 10);
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: "$2b$10$hashedpassword",
            isActive: true,
            role: { connect: { id: 1 } },
          }),
        })
      );
      expect(result.isActive).toBe(true);
    });

    it("throws error when user not found", async () => {
      const tx = mockTx();
      tx.user.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

      await expect(userService.updateUserByAdmin("nope", { isActive: false })).rejects.toThrow(
        "Usuario no encontrado"
      );
    });

    it("blocks deactivating the last active admin", async () => {
      const tx = mockTx();
      tx.user.findUnique.mockResolvedValue({ id: "u1", isActive: true, role: { name: "God" } });
      tx.$queryRaw.mockResolvedValue([{ id: "u1" }]);
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

      await expect(userService.updateUserByAdmin("u1", { isActive: false })).rejects.toThrow(
        "último administrador activo"
      );
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it("blocks demoting the last active admin", async () => {
      const tx = mockTx();
      tx.user.findUnique.mockResolvedValue({ id: "u1", isActive: true, role: { name: "God" } });
      tx.$queryRaw.mockResolvedValue([{ id: "u1" }]);
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

      await expect(userService.updateUserByAdmin("u1", { role: "Teacher" })).rejects.toThrow(
        "último administrador activo"
      );
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it("allows deactivating an admin when another active admin exists", async () => {
      const tx = mockTx();
      tx.user.findUnique.mockResolvedValue({ id: "u1", isActive: true, role: { name: "God" } });
      tx.$queryRaw.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
      tx.user.update.mockResolvedValue({
        id: "u1",
        email: "a@x.com",
        name: "Alan",
        lastName: "Turing",
        identifier: null,
        isActive: false,
        createdAt: new Date("2024-01-01"),
        role: { id: 1, name: "God" },
      });
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

      await userService.updateUserByAdmin("u1", { isActive: false });

      expect(tx.user.update).toHaveBeenCalled();
    });

    it("does not protect a non-admin target", async () => {
      const tx = mockTx();
      tx.user.findUnique.mockResolvedValue({ id: "u1", isActive: true, role: { name: "Teacher" } });
      tx.role.findUnique.mockResolvedValue({ id: 2, name: "Student" });
      tx.user.update.mockResolvedValue({
        id: "u1",
        email: "a@x.com",
        name: "Alan",
        lastName: "Turing",
        identifier: null,
        isActive: true,
        createdAt: new Date("2024-01-01"),
        role: { id: 2, name: "Student" },
      });
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

      await userService.updateUserByAdmin("u1", { role: "Student" });

      expect(tx.$queryRaw).not.toHaveBeenCalled();
    });

    it("throws error when the target role does not exist", async () => {
      const tx = mockTx();
      tx.user.findUnique.mockResolvedValue({ id: "u1", isActive: true, role: { name: "Teacher" } });
      tx.role.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

      await expect(userService.updateUserByAdmin("u1", { role: "Nope" })).rejects.toThrow(
        "El rol no existe"
      );
    });
  });
});
