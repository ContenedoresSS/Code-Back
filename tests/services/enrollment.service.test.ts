import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    enrollment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
    subject: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

import enrollmentService from "../../src/services/enrollment.service.js";
import { Prisma } from "@prisma/client";
import { UserRole } from "../../src/types/enums/role.enum.js";

describe("EnrollmentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("enrollStudent", () => {
    it("creates an enrollment when subject exists", async () => {
      const mockSubject = { id: 1, name: "Mathematics" };
      const createdAt = new Date();
      const mockEnrollment = {
        id: "enroll-1",
        studentId: "student-1",
        subjectId: 1,
        createdAt,
      };

      mockPrisma.subject.findUnique.mockResolvedValue(mockSubject);
      mockPrisma.enrollment.create.mockResolvedValue(mockEnrollment);

      const result = await enrollmentService.enrollStudent("student-1", {
        subjectId: 1,
      });

      expect(mockPrisma.subject.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.enrollment.create).toHaveBeenCalledWith({
        data: { studentId: "student-1", subjectId: 1 },
      });
      expect(result).toEqual({ ...mockEnrollment, createdAt: createdAt.toISOString() });
    });

    it("throws error when subject does not exist", async () => {
      mockPrisma.subject.findUnique.mockResolvedValue(null);

      await expect(
        enrollmentService.enrollStudent("student-1", { subjectId: 999 })
      ).rejects.toThrow("La materia no existe.");
    });

    it("throws error when student is already enrolled", async () => {
      const mockSubject = { id: 1, name: "Mathematics" };
      mockPrisma.subject.findUnique.mockResolvedValue(mockSubject);

      const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      });
      mockPrisma.enrollment.create.mockRejectedValue(prismaError);

      await expect(enrollmentService.enrollStudent("student-1", { subjectId: 1 })).rejects.toThrow(
        "Ya estas inscrito en esta materia."
      );
    });

    it("throws error when database fails with unexpected error", async () => {
      const mockSubject = { id: 1, name: "Mathematics" };
      mockPrisma.subject.findUnique.mockResolvedValue(mockSubject);
      mockPrisma.enrollment.create.mockRejectedValue(new Error("DB error"));

      await expect(enrollmentService.enrollStudent("student-1", { subjectId: 1 })).rejects.toThrow(
        "Error al inscribirse: DB error"
      );
    });
  });

  describe("ensureEnrollment", () => {
    it("creates an enrollment when the student is not enrolled", async () => {
      mockPrisma.enrollment.upsert.mockResolvedValue({});

      await enrollmentService.ensureEnrollment("student-1", 1);

      expect(mockPrisma.enrollment.upsert).toHaveBeenCalledWith({
        where: { studentId_subjectId: { studentId: "student-1", subjectId: 1 } },
        update: {},
        create: { studentId: "student-1", subjectId: 1 },
      });
    });

    it("is idempotent when the student is already enrolled", async () => {
      mockPrisma.enrollment.upsert.mockResolvedValue({ id: "enroll-1" });

      await expect(enrollmentService.ensureEnrollment("student-1", 1)).resolves.toBeUndefined();

      expect(mockPrisma.enrollment.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("getEnrollments", () => {
    it("returns enrollments for student role with their own enrollments", async () => {
      const mockEnrollments = [
        {
          id: "enroll-1",
          studentId: "student-1",
          subjectId: 1,
          createdAt: new Date(),
          subject: { id: 1, name: "Math" },
        },
      ];
      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.enrollment.count.mockResolvedValue(1);
      mockPrisma.$transaction.mockImplementation(async (queries: any[]) => {
        return Promise.all(queries);
      });

      const result = await enrollmentService.getEnrollments("student-1", UserRole.Student, 0, 10);

      const expectedData = mockEnrollments.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      }));

      expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith({
        where: { studentId: "student-1" },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: { name: true, lastName: true, email: true },
          },
          subject: {
            select: { id: true, name: true },
          },
        },
      });
      expect(result).toEqual({ data: expectedData, totalCount: 1 });
    });

    it("returns enrollments for teacher role filtering by their subjects", async () => {
      const mockEnrollments = [
        {
          id: "enroll-1",
          studentId: "student-1",
          subjectId: 1,
          createdAt: new Date(),
          student: { name: "John", lastName: "Doe", email: "john@test.com" },
          subject: { id: 1, name: "Math" },
        },
      ];
      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.enrollment.count.mockResolvedValue(1);
      mockPrisma.$transaction.mockImplementation(async (queries: any[]) => {
        return Promise.all(queries);
      });

      await enrollmentService.getEnrollments("teacher-1", UserRole.Teacher, 0, 10);

      expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith({
        where: { subject: { userId: "teacher-1" } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: { name: true, lastName: true, email: true },
          },
          subject: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it("returns all enrollments for God role", async () => {
      const mockEnrollments = [
        {
          id: "enroll-1",
          studentId: "student-1",
          subjectId: 1,
          createdAt: new Date(),
          student: { name: "John", lastName: "Doe", email: "john@test.com" },
          subject: { id: 1, name: "Math" },
        },
      ];
      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.enrollment.count.mockResolvedValue(1);
      mockPrisma.$transaction.mockImplementation(async (queries: any[]) => {
        return Promise.all(queries);
      });

      await enrollmentService.getEnrollments("god-1", UserRole.God, 0, 10);

      expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: { name: true, lastName: true, email: true },
          },
          subject: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it("filters enrollments by search term for student role", async () => {
      const mockEnrollments = [
        {
          id: "enroll-1",
          studentId: "student-1",
          subjectId: 1,
          createdAt: new Date(),
          subject: { id: 1, name: "Math" },
        },
      ];
      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.enrollment.count.mockResolvedValue(1);
      mockPrisma.$transaction.mockImplementation(async (queries: any[]) => {
        return Promise.all(queries);
      });

      await enrollmentService.getEnrollments("student-1", UserRole.Student, 0, 10, "Math");

      expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith({
        where: {
          studentId: "student-1",
          subject: { name: { contains: "Math", mode: "insensitive" } },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: { name: true, lastName: true, email: true },
          },
          subject: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it("filters enrollments by search term for teacher role", async () => {
      const mockEnrollments: any[] = [];
      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.enrollment.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (queries: any[]) => {
        return Promise.all(queries);
      });

      await enrollmentService.getEnrollments("teacher-1", UserRole.Teacher, 0, 10, "John");

      expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith({
        where: {
          subject: { userId: "teacher-1" },
          student: {
            OR: [
              { name: { contains: "John", mode: "insensitive" } },
              { lastName: { contains: "John", mode: "insensitive" } },
              { email: { contains: "John", mode: "insensitive" } },
            ],
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: { name: true, lastName: true, email: true },
          },
          subject: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it("throws error when database operation fails", async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));

      await expect(
        enrollmentService.getEnrollments("student-1", UserRole.Student, 0, 10)
      ).rejects.toThrow("Error al listar inscripciones: DB error");
    });
  });

  describe("unenroll", () => {
    it("allows student to unenroll from their own enrollment", async () => {
      const mockEnrollment = {
        id: "enroll-1",
        studentId: "student-1",
        subjectId: 1,
      };

      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.enrollment.delete.mockResolvedValue(mockEnrollment);

      await enrollmentService.unenroll("enroll-1", "student-1", UserRole.Student);

      expect(mockPrisma.enrollment.findUnique).toHaveBeenCalledWith({
        where: { id: "enroll-1" },
        include: { subject: { select: { userId: true } } },
      });
      expect(mockPrisma.enrollment.delete).toHaveBeenCalledWith({
        where: { id: "enroll-1" },
      });
    });

    it("prevents student from unenrolling another student", async () => {
      const mockEnrollment = {
        id: "enroll-1",
        studentId: "student-2",
        subjectId: 1,
      };

      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);

      await expect(
        enrollmentService.unenroll("enroll-1", "student-1", UserRole.Student)
      ).rejects.toThrow("No tienes permiso para eliminar esta inscripcion.");
    });

    it("allows teacher to unenroll students from their own subjects", async () => {
      const mockEnrollment = {
        id: "enroll-1",
        studentId: "student-1",
        subjectId: 1,
        subject: { userId: "teacher-1" },
      };

      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.enrollment.delete.mockResolvedValue(mockEnrollment);

      await enrollmentService.unenroll("enroll-1", "teacher-1", UserRole.Teacher);

      expect(mockPrisma.enrollment.findUnique).toHaveBeenCalledWith({
        where: { id: "enroll-1" },
        include: { subject: { select: { userId: true } } },
      });
      expect(mockPrisma.enrollment.delete).toHaveBeenCalledWith({
        where: { id: "enroll-1" },
      });
    });

    it("prevents teacher from unenrolling students from other teachers' subjects", async () => {
      const mockEnrollment = {
        id: "enroll-1",
        studentId: "student-1",
        subjectId: 1,
        subject: { userId: "teacher-2" },
      };

      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);

      await expect(
        enrollmentService.unenroll("enroll-1", "teacher-1", UserRole.Teacher)
      ).rejects.toThrow("No tienes permiso para eliminar esta inscripcion.");
    });

    it("allows God to unenroll any student", async () => {
      const mockEnrollment = {
        id: "enroll-1",
        studentId: "student-1",
        subjectId: 1,
      };

      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.enrollment.delete.mockResolvedValue(mockEnrollment);

      await enrollmentService.unenroll("enroll-1", "god-1", UserRole.God);

      expect(mockPrisma.enrollment.findUnique).toHaveBeenCalledWith({
        where: { id: "enroll-1" },
        include: { subject: { select: { userId: true } } },
      });
      expect(mockPrisma.enrollment.delete).toHaveBeenCalledWith({
        where: { id: "enroll-1" },
      });
    });

    it("throws error when enrollment not found", async () => {
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(
        enrollmentService.unenroll("nonexistent", "student-1", UserRole.Student)
      ).rejects.toThrow("Inscripcion no encontrada.");
    });

    it("throws error when database operation fails", async () => {
      const mockEnrollment = {
        id: "enroll-1",
        studentId: "student-1",
        subjectId: 1,
        subject: { userId: "any" },
      };

      mockPrisma.enrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.enrollment.delete.mockRejectedValue(new Error("DB error"));

      await expect(
        enrollmentService.unenroll("enroll-1", "student-1", UserRole.Student)
      ).rejects.toThrow("Error al desinscribir: DB error");
    });
  });
});
