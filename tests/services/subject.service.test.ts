import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    subject: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

import subjectService from "../../src/services/subject.service.js";
import { UserRole } from "../../src/types/enums/role.enum.js";

describe("SubjectService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSubject", () => {
    it("creates subject with provided data", async () => {
      const mockSubject = {
        id: 1,
        name: "Mathematics",
        userId: "teacher-1",
      };
      mockPrisma.subject.create.mockResolvedValue(mockSubject);

      const result = await subjectService.createSubject("teacher-1", {
        name: "Mathematics",
      });

      expect(mockPrisma.subject.create).toHaveBeenCalledWith({
        data: {
          name: "Mathematics",
          userId: "teacher-1",
        },
      });
      expect(result).toEqual(mockSubject);
    });

    it("throws error when database operation fails", async () => {
      mockPrisma.subject.create.mockRejectedValue(new Error("DB error"));

      await expect(
        subjectService.createSubject("teacher-1", { name: "Math" })
      ).rejects.toThrow("Error al crear el curso: DB error");
    });
  });

  describe("getSubjects", () => {
    it("returns subjects for teacher with pagination", async () => {
      const mockSubjects = [
        { id: 1, name: "Math", professor: { name: "John", lastName: "Doe" } },
        { id: 2, name: "Physics", professor: { name: "John", lastName: "Doe" } },
      ];
      mockPrisma.subject.findMany.mockResolvedValue(mockSubjects);
      mockPrisma.subject.count.mockResolvedValue(2);
      mockPrisma.$transaction.mockImplementation(async (queries) => {
        return Promise.all(queries);
      });

      const result = await subjectService.getSubjects(
        "teacher-1",
        UserRole.Teacher,
        0,
        10
      );

      expect(mockPrisma.subject.findMany).toHaveBeenCalledWith({
        where: { userId: "teacher-1" },
        skip: 0,
        take: 10,
        orderBy: { id: "desc" },
        include: {
          professor: {
            select: { name: true, lastName: true },
          },
        },
      });
      expect(result).toEqual({ data: mockSubjects, totalCount: 2 });
    });

    it("returns all subjects for God role", async () => {
      const mockSubjects = [
        { id: 1, name: "Math", professor: { name: "John", lastName: "Doe" } },
      ];
      mockPrisma.subject.findMany.mockResolvedValue(mockSubjects);
      mockPrisma.subject.count.mockResolvedValue(1);
      mockPrisma.$transaction.mockImplementation(async (queries) => {
        return Promise.all(queries);
      });

      await subjectService.getSubjects("god-1", UserRole.God, 0, 10);

      expect(mockPrisma.subject.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { id: "desc" },
        include: {
          professor: {
            select: { name: true, lastName: true },
          },
        },
      });
    });

    it("filters subjects by search term", async () => {
      const mockSubjects = [
        { id: 1, name: "Mathematics", professor: { name: "John", lastName: "Doe" } },
      ];
      mockPrisma.subject.findMany.mockResolvedValue(mockSubjects);
      mockPrisma.subject.count.mockResolvedValue(1);
      mockPrisma.$transaction.mockImplementation(async (queries) => {
        return Promise.all(queries);
      });

      await subjectService.getSubjects(
        "teacher-1",
        UserRole.Teacher,
        0,
        10,
        "Math"
      );

      expect(mockPrisma.subject.findMany).toHaveBeenCalledWith({
        where: {
          userId: "teacher-1",
          name: { contains: "Math", mode: "insensitive" },
        },
        skip: 0,
        take: 10,
        orderBy: { id: "desc" },
        include: {
          professor: {
            select: { name: true, lastName: true },
          },
        },
      });
    });
  });

  describe("getSubjectById", () => {
    it("returns subject when found and owned by user", async () => {
      const mockSubject = { id: 1, name: "Math", userId: "teacher-1" };
      mockPrisma.subject.findFirst.mockResolvedValue(mockSubject);

      const result = await subjectService.getSubjectById(1, "teacher-1");

      expect(mockPrisma.subject.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: "teacher-1" },
      });
      expect(result).toEqual(mockSubject);
    });

    it("throws error when subject not found", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(subjectService.getSubjectById(999, "teacher-1")).rejects.toThrow(
        "Materia no encontrada o no tienes permisos para acceder a ella."
      );
    });
  });

  describe("updateSubject", () => {
    it("updates subject name", async () => {
      const existingSubject = { id: 1, name: "Math", userId: "teacher-1" };
      const updatedSubject = { id: 1, name: "Advanced Math", userId: "teacher-1" };

      mockPrisma.subject.findFirst.mockResolvedValue(existingSubject);
      mockPrisma.subject.update.mockResolvedValue(updatedSubject);

      const result = await subjectService.updateSubject(1, "teacher-1", {
        name: "Advanced Math",
      });

      expect(mockPrisma.subject.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: "Advanced Math" },
      });
      expect(result).toEqual(updatedSubject);
    });

    it("throws error when subject not found", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        subjectService.updateSubject(999, "teacher-1", { name: "Test" })
      ).rejects.toThrow("Materia no encontrada o no tienes permisos para acceder a ella.");
    });
  });

  describe("deleteSubject", () => {
    it("deletes subject when found and owned by user", async () => {
      const existingSubject = { id: 1, name: "Math", userId: "teacher-1" };
      mockPrisma.subject.findFirst.mockResolvedValue(existingSubject);
      mockPrisma.subject.delete.mockResolvedValue(existingSubject);

      await subjectService.deleteSubject(1, "teacher-1");

      expect(mockPrisma.subject.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("throws error when subject not found", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(subjectService.deleteSubject(999, "teacher-1")).rejects.toThrow(
        "Materia no encontrada o no tienes permisos para acceder a ella."
      );
    });
  });
});
