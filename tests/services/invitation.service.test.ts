import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    invitationCode: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

import invitationService from "../../src/services/invitation.service.js";

describe("InvitationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns paginated invitation codes with role", async () => {
      const mockInvitations = [
        { id: 1, code: "ABC123", roleId: 2, role: { name: "Teacher" } },
        { id: 2, code: "DEF456", roleId: 2, role: { name: "Teacher" } },
      ];
      mockPrisma.invitationCode.findMany.mockResolvedValue(mockInvitations);
      mockPrisma.invitationCode.count.mockResolvedValue(2);

      const result = await invitationService.getAll(1, 10);

      expect(mockPrisma.invitationCode.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        include: { role: true },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual({ data: mockInvitations, totalCount: 2 });
    });

    it("uses default pagination values", async () => {
      mockPrisma.invitationCode.findMany.mockResolvedValue([]);
      mockPrisma.invitationCode.count.mockResolvedValue(0);

      await invitationService.getAll();

      expect(mockPrisma.invitationCode.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        include: { role: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("calculates skip correctly for page 2", async () => {
      mockPrisma.invitationCode.findMany.mockResolvedValue([]);
      mockPrisma.invitationCode.count.mockResolvedValue(0);

      await invitationService.getAll(2, 5);

      expect(mockPrisma.invitationCode.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        include: { role: true },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("create", () => {
    it("creates invitation code with random hex code", async () => {
      const mockInvitation = {
        id: 1,
        code: "ABCD1234",
        roleId: 2,
        role: { name: "Teacher" },
      };
      mockPrisma.invitationCode.create.mockResolvedValue(mockInvitation);

      const result = await invitationService.create(2);

      expect(mockPrisma.invitationCode.create).toHaveBeenCalledWith({
        data: {
          code: expect.stringMatching(/^[A-F0-9]{8}$/),
          roleId: 2,
        },
        include: { role: true },
      });
      expect(result).toEqual(mockInvitation);
    });
  });

  describe("update", () => {
    it("updates invitation code with provided data", async () => {
      const mockUpdated = {
        id: 1,
        code: "ABC123",
        isUsed: true,
        roleId: 2,
        role: { name: "Teacher" },
      };
      mockPrisma.invitationCode.update.mockResolvedValue(mockUpdated);

      const result = await invitationService.update(1, { isUsed: true });

      expect(mockPrisma.invitationCode.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isUsed: true },
        include: { role: true },
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe("validateAndConsume", () => {
    it("validates and marks invitation as used", async () => {
      const mockTx = {
        invitationCode: {
          findUnique: vi.fn().mockResolvedValue({
            id: 1,
            code: "ABC123",
            isUsed: false,
          }),
          update: vi.fn().mockResolvedValue({
            id: 1,
            code: "ABC123",
            isUsed: true,
            role: { name: "Teacher" },
          }),
        },
      };

      const result = await invitationService.validateAndConsume("ABC123", mockTx);

      expect(mockTx.invitationCode.findUnique).toHaveBeenCalledWith({
        where: { code: "ABC123" },
      });
      expect(mockTx.invitationCode.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isUsed: true },
        include: { role: true },
      });
      expect(result.isUsed).toBe(true);
    });

    it("throws error when invitation code not found", async () => {
      const mockTx = {
        invitationCode: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      await expect(
        invitationService.validateAndConsume("INVALID", mockTx)
      ).rejects.toThrow("Invitation code not found");
    });

    it("throws error when invitation code already used", async () => {
      const mockTx = {
        invitationCode: {
          findUnique: vi.fn().mockResolvedValue({
            id: 1,
            code: "ABC123",
            isUsed: true,
          }),
        },
      };

      await expect(
        invitationService.validateAndConsume("ABC123", mockTx)
      ).rejects.toThrow("Invitation code already used");
    });
  });
});
