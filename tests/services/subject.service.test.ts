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
    enrollment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
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
        imageUrl: null,
      };
      mockPrisma.subject.create.mockResolvedValue(mockSubject);

      const result = await subjectService.createSubject("teacher-1", {
        name: "Mathematics",
      });

      expect(mockPrisma.subject.create).toHaveBeenCalledWith({
        data: {
          name: "Mathematics",
          userId: "teacher-1",
          imageUrl: null,
        },
      });
      expect(result).toEqual(mockSubject);
    });

    it("creates subject with imageUrl when provided", async () => {
      const mockSubject = {
        id: 1,
        name: "Mathematics",
        userId: "teacher-1",
        imageUrl: "https://example.com/image.jpg",
      };
      mockPrisma.subject.create.mockResolvedValue(mockSubject);

      const result = await subjectService.createSubject("teacher-1", {
        name: "Mathematics",
        imageUrl: "https://example.com/image.jpg",
      });

      expect(mockPrisma.subject.create).toHaveBeenCalledWith({
        data: {
          name: "Mathematics",
          userId: "teacher-1",
          imageUrl: "https://example.com/image.jpg",
        },
      });
      expect(result).toEqual(mockSubject);
    });

    it("throws error when database operation fails", async () => {
      mockPrisma.subject.create.mockRejectedValue(new Error("DB error"));

      await expect(subjectService.createSubject("teacher-1", { name: "Math" })).rejects.toThrow(
        "Error al crear el curso: DB error"
      );
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

      const result = await subjectService.getSubjects("teacher-1", UserRole.Teacher, 0, 10);

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
      const mockSubjects = [{ id: 1, name: "Math", professor: { name: "John", lastName: "Doe" } }];
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

    it("returns only enrolled subjects for Student role", async () => {
      const mockSubjects = [{ id: 1, name: "Math", professor: { name: "John", lastName: "Doe" } }];
      mockPrisma.subject.findMany.mockResolvedValue(mockSubjects);
      mockPrisma.subject.count.mockResolvedValue(1);
      mockPrisma.$transaction.mockImplementation(async (queries) => {
        return Promise.all(queries);
      });

      await subjectService.getSubjects("student-1", UserRole.Student, 0, 10);

      expect(mockPrisma.subject.findMany).toHaveBeenCalledWith({
        where: { enrollments: { some: { studentId: "student-1" } } },
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

      await subjectService.getSubjects("teacher-1", UserRole.Teacher, 0, 10, "Math");

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

      const result = await subjectService.getSubjectById(1, UserRole.Teacher, "teacher-1");

      expect(mockPrisma.subject.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: "teacher-1" },
      });
      expect(result).toEqual(mockSubject);
    });

    it("returns any subject for God role without ownership filter", async () => {
      const mockSubject = { id: 1, name: "Math", userId: "teacher-1" };
      mockPrisma.subject.findFirst.mockResolvedValue(mockSubject);

      const result = await subjectService.getSubjectById(1, UserRole.God, "god-1");

      expect(mockPrisma.subject.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockSubject);
    });

    it("throws error when subject not found", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        subjectService.getSubjectById(999, UserRole.Teacher, "teacher-1")
      ).rejects.toThrow("Materia no encontrada o no tienes permisos para acceder a ella.");
    });
  });

  describe("updateSubject", () => {
    it("updates subject name", async () => {
      const existingSubject = { id: 1, name: "Math", userId: "teacher-1", imageUrl: null };
      const updatedSubject = { id: 1, name: "Advanced Math", userId: "teacher-1", imageUrl: null };

      mockPrisma.subject.findFirst.mockResolvedValue(existingSubject);
      mockPrisma.subject.update.mockResolvedValue(updatedSubject);

      const result = await subjectService.updateSubject(1, UserRole.Teacher, "teacher-1", {
        name: "Advanced Math",
      });

      expect(mockPrisma.subject.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: "Advanced Math" },
      });
      expect(result).toEqual(updatedSubject);
    });

    it("updates subject imageUrl", async () => {
      const existingSubject = { id: 1, name: "Math", userId: "teacher-1", imageUrl: null };
      const updatedSubject = {
        id: 1,
        name: "Math",
        userId: "teacher-1",
        imageUrl: "https://example.com/image.jpg",
      };

      mockPrisma.subject.findFirst.mockResolvedValue(existingSubject);
      mockPrisma.subject.update.mockResolvedValue(updatedSubject);

      const result = await subjectService.updateSubject(1, UserRole.Teacher, "teacher-1", {
        imageUrl: "https://example.com/image.jpg",
      });

      expect(mockPrisma.subject.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { imageUrl: "https://example.com/image.jpg" },
      });
      expect(result).toEqual(updatedSubject);
    });

    it("clears subject imageUrl when set to null", async () => {
      const existingSubject = {
        id: 1,
        name: "Math",
        userId: "teacher-1",
        imageUrl: "https://example.com/image.jpg",
      };
      const updatedSubject = { id: 1, name: "Math", userId: "teacher-1", imageUrl: null };

      mockPrisma.subject.findFirst.mockResolvedValue(existingSubject);
      mockPrisma.subject.update.mockResolvedValue(updatedSubject);

      const result = await subjectService.updateSubject(1, UserRole.Teacher, "teacher-1", {
        imageUrl: null,
      });

      expect(mockPrisma.subject.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { imageUrl: null },
      });
      expect(result).toEqual(updatedSubject);
    });

    it("throws error when subject not found", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        subjectService.updateSubject(999, UserRole.Teacher, "teacher-1", { name: "Test" })
      ).rejects.toThrow("Materia no encontrada o no tienes permisos para acceder a ella.");
    });
  });

  describe("deleteSubject", () => {
    it("deletes subject when found and owned by user", async () => {
      const existingSubject = { id: 1, name: "Math", userId: "teacher-1" };
      mockPrisma.subject.findFirst.mockResolvedValue(existingSubject);
      mockPrisma.subject.delete.mockResolvedValue(existingSubject);

      await subjectService.deleteSubject(1, UserRole.Teacher, "teacher-1");

      expect(mockPrisma.subject.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("throws error when subject not found", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        subjectService.deleteSubject(999, UserRole.Teacher, "teacher-1")
      ).rejects.toThrow("Materia no encontrada o no tienes permisos para acceder a ella.");
    });
  });

  describe("getStudentsBySubject", () => {
    it("returns enrolled students for the owning teacher", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue({ id: 1, userId: "teacher-1" });
      const mockEnrollments = [
        {
          createdAt: new Date("2024-01-01"),
          student: { id: "s1", name: "Alan", lastName: "Turing", email: "alan@uady.mx" },
        },
      ];
      mockPrisma.enrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.enrollment.count.mockResolvedValue(1);
      mockPrisma.$transaction.mockImplementation(async (queries) => Promise.all(queries));

      const result = await subjectService.getStudentsBySubject(
        1,
        UserRole.Teacher,
        "teacher-1",
        0,
        10
      );

      expect(mockPrisma.subject.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: "teacher-1" },
      });
      expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith({
        where: { subjectId: 1 },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              identifier: true,
            },
          },
        },
      });
      expect(result.totalCount).toBe(1);
      expect(result.data[0].name).toBe("Alan");
    });

    it("allows God role to list students of any subject", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue({ id: 1, userId: "teacher-1" });
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (queries) => Promise.all(queries));

      await subjectService.getStudentsBySubject(1, UserRole.God, "god-1", 0, 10);

      expect(mockPrisma.subject.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("throws error when the teacher does not own the subject", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        subjectService.getStudentsBySubject(1, UserRole.Teacher, "other-teacher", 0, 10)
      ).rejects.toThrow("Materia no encontrada o no tienes permisos para acceder a ella.");
    });
  });

  describe("duplicateSubject", () => {
    const sourceSubject = {
      id: 1,
      name: "Mathematics",
      userId: "teacher-1",
      imageUrl: null,
    };

    const sourceActivities = [
      {
        id: "a1",
        professorId: "teacher-1",
        languageId: 1,
        subjectId: 1,
        title: "Suma",
        description: "Sumar dos números",
        starterCode: [{ name: "main.py", content: "cA==" }],
        maxAttempts: 3,
        rules: { allowCodeEdit: true },
        testCases: [
          { id: 1, input: "1 2", expectedOutput: "3", isHidden: false },
          { id: 2, input: "5 5", expectedOutput: "10", isHidden: true },
        ],
      },
      {
        id: "a2",
        professorId: "teacher-1",
        languageId: 1,
        subjectId: 1,
        title: "Resta",
        description: null,
        starterCode: null,
        maxAttempts: 0,
        rules: null,
        testCases: [],
      },
    ];

    const clonedSubject = {
      id: 2,
      name: "Mathematics (copia)",
      userId: "teacher-1",
      imageUrl: null,
    };

    it("clones subject with activities and test cases using default name", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(sourceSubject);
      mockPrisma.activity.findMany.mockResolvedValue(sourceActivities);
      mockPrisma.subject.create.mockResolvedValue(clonedSubject);

      const result = await subjectService.duplicateSubject(1, UserRole.Teacher, "teacher-1", {});

      expect(mockPrisma.subject.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: "teacher-1" },
      });
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { subjectId: 1 },
        include: { testCases: true },
      });
      expect(mockPrisma.subject.create).toHaveBeenCalledWith({
        data: {
          userId: "teacher-1",
          name: "Mathematics (copia)",
          imageUrl: null,
          activities: {
            create: [
              {
                professorId: "teacher-1",
                languageId: 1,
                title: "Suma",
                description: "Sumar dos números",
                starterCode: [{ name: "main.py", content: "cA==" }],
                maxAttempts: 3,
                rules: { allowCodeEdit: true },
                testCases: {
                  create: [
                    { input: "1 2", expectedOutput: "3", isHidden: false },
                    { input: "5 5", expectedOutput: "10", isHidden: true },
                  ],
                },
              },
              {
                professorId: "teacher-1",
                languageId: 1,
                title: "Resta",
                description: null,
                starterCode: null,
                maxAttempts: 0,
                rules: null,
                testCases: { create: [] },
              },
            ],
          },
        },
      });
      expect(result).toEqual({
        subject: clonedSubject,
        activitiesCloned: 2,
        testCasesCloned: 2,
      });
    });

    it("uses a custom name when provided", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(sourceSubject);
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.subject.create.mockResolvedValue({
        ...clonedSubject,
        name: "Matemáticas 2026",
      });

      const result = await subjectService.duplicateSubject(1, UserRole.Teacher, "teacher-1", {
        name: "Matemáticas 2026",
      });

      expect(mockPrisma.subject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Matemáticas 2026" }),
        })
      );
      expect(result.subject.name).toBe("Matemáticas 2026");
    });

    it("allows God role to duplicate any subject keeping the owner", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(sourceSubject);
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.subject.create.mockResolvedValue(clonedSubject);

      await subjectService.duplicateSubject(1, UserRole.God, "god-1", {});

      expect(mockPrisma.subject.findFirst).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockPrisma.subject.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: "teacher-1" }),
      });
    });

    it("throws error when the subject is not found", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        subjectService.duplicateSubject(999, UserRole.Teacher, "teacher-1", {})
      ).rejects.toThrow("Materia no encontrada o no tienes permisos para acceder a ella.");
    });
  });
});
