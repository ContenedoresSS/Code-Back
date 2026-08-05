import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    subject: {
      findFirst: vi.fn(),
    },
    programmingLanguage: {
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
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

import activityService from "../../src/services/activity.service.js";
import { UserRole } from "../../src/types/enums/role.enum.js";

describe("ActivityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createActivity", () => {
    it("creates activity with valid subject and language", async () => {
      const mockSubject = { id: 1, userId: "teacher-1" };
      const mockLanguage = { id: 1, name: "Python" };
      const mockActivity = {
        id: "1",
        professorId: "teacher-1",
        subjectId: 1,
        languageId: 1,
        title: "Hello World",
        maxAttempts: 3,
        allowCopy: true,
        allowPaste: true,
      };

      mockPrisma.subject.findFirst.mockResolvedValue(mockSubject);
      mockPrisma.programmingLanguage.findUnique.mockResolvedValue(mockLanguage);
      mockPrisma.activity.create.mockResolvedValue(mockActivity);

      const result = await activityService.createActivity("teacher-1", {
        subjectId: 1,
        languageId: 1,
        title: "Hello World",
        maxAttempts: 3,
      });

      expect(result).toEqual(mockActivity);
    });

    it("throws error when subject not found", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(
        activityService.createActivity("teacher-1", {
          subjectId: 999,
          languageId: 1,
          title: "Test",
        })
      ).rejects.toThrow("El curso no existe o no tienes permisos sobre");
    });

    it("throws error when language not found", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue({ id: 1, userId: "teacher-1" });
      mockPrisma.programmingLanguage.findUnique.mockResolvedValue(null);

      await expect(
        activityService.createActivity("teacher-1", {
          subjectId: 1,
          languageId: 999,
          title: "Test",
        })
      ).rejects.toThrow("lenguaje de programaci");
    });
  });

  describe("getAllActivities", () => {
    it("returns activities for teacher", async () => {
      const mockActivities = [{ id: "1", title: "Activity 1", professorId: "teacher-1" }];
      mockPrisma.activity.findMany.mockResolvedValue(mockActivities);
      mockPrisma.activity.count.mockResolvedValue(1);
      mockPrisma.$transaction.mockImplementation(async (queries) => Promise.all(queries));

      const result = await activityService.getAllActivities("teacher-1", UserRole.Teacher, 0, 10);

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { professorId: "teacher-1" },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        select: expect.any(Object),
      });
      expect(result).toEqual({ data: mockActivities, totalCount: 1 });
    });

    it("returns all activities for God role", async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (queries) => Promise.all(queries));

      await activityService.getAllActivities("god-1", UserRole.God, 0, 10);

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        select: expect.any(Object),
      });
    });

    it("filters activities by subjectId", async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (queries) => Promise.all(queries));

      await activityService.getAllActivities("teacher-1", UserRole.Teacher, 0, 10, 5);

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { professorId: "teacher-1", subjectId: 5 },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        select: expect.any(Object),
      });
    });
  });

  describe("getActivityById", () => {
    it("returns activity when found and owned by user", async () => {
      const mockActivity = { id: "1", title: "Test", professorId: "teacher-1" };
      mockPrisma.activity.findFirst.mockResolvedValue(mockActivity);

      const result = await activityService.getActivityById("1", UserRole.Teacher, "teacher-1");

      expect(mockPrisma.activity.findFirst).toHaveBeenCalledWith({
        where: { id: "1", professorId: "teacher-1" },
      });
      expect(result).toEqual(mockActivity);
    });

    it("returns any activity for God role", async () => {
      const mockActivity = { id: "1", title: "Test", professorId: "teacher-1" };
      mockPrisma.activity.findFirst.mockResolvedValue(mockActivity);

      await activityService.getActivityById("1", UserRole.God, "god-1");

      expect(mockPrisma.activity.findFirst).toHaveBeenCalledWith({
        where: { id: "1" },
      });
    });

    it("throws error when activity not found", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      await expect(
        activityService.getActivityById("999", UserRole.Teacher, "teacher-1")
      ).rejects.toThrow("Actividad no encontrada o no tienes permisos para acceder a ella.");
    });
  });

  describe("updateActivity", () => {
    it("updates activity fields", async () => {
      const existingActivity = { id: "1", title: "Old", professorId: "teacher-1" };
      const updatedActivity = { id: "1", title: "New", professorId: "teacher-1" };

      mockPrisma.activity.findFirst.mockResolvedValue(existingActivity);
      mockPrisma.activity.update.mockResolvedValue(updatedActivity);

      const result = await activityService.updateActivity("1", UserRole.Teacher, "teacher-1", {
        title: "New",
      });

      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { title: "New" },
      });
      expect(result).toEqual(updatedActivity);
    });

    it("updates languageId when language exists", async () => {
      const existingActivity = { id: "1", title: "Old", professorId: "teacher-1" };
      const mockLanguage = { id: 2, name: "JavaScript" };
      const updatedActivity = { id: "1", languageId: 2, professorId: "teacher-1" };

      mockPrisma.activity.findFirst.mockResolvedValue(existingActivity);
      mockPrisma.programmingLanguage.findUnique.mockResolvedValue(mockLanguage);
      mockPrisma.activity.update.mockResolvedValue(updatedActivity);

      const result = await activityService.updateActivity("1", UserRole.Teacher, "teacher-1", {
        languageId: 2,
      });

      expect(mockPrisma.programmingLanguage.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { languageId: 2 },
      });
      expect(result).toEqual(updatedActivity);
    });

    it("throws error when languageId is invalid", async () => {
      const existingActivity = { id: "1", title: "Old", professorId: "teacher-1" };
      mockPrisma.activity.findFirst.mockResolvedValue(existingActivity);
      mockPrisma.programmingLanguage.findUnique.mockResolvedValue(null);

      await expect(
        activityService.updateActivity("1", UserRole.Teacher, "teacher-1", {
          languageId: 999,
        })
      ).rejects.toThrow("lenguaje de programaci");
    });

    it("throws error when activity not found", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      await expect(
        activityService.updateActivity("999", UserRole.Teacher, "teacher-1", { title: "Test" })
      ).rejects.toThrow("Actividad no encontrada o no tienes permisos para acceder a ella.");
    });
  });

  describe("deleteActivity", () => {
    it("deletes activity when found and owned by user", async () => {
      const existingActivity = { id: "1", title: "Test", professorId: "teacher-1" };
      mockPrisma.activity.findFirst.mockResolvedValue(existingActivity);
      mockPrisma.activity.delete.mockResolvedValue(existingActivity);

      await activityService.deleteActivity("1", UserRole.Teacher, "teacher-1");

      expect(mockPrisma.activity.delete).toHaveBeenCalledWith({ where: { id: "1" } });
    });

    it("throws error when activity not found", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      await expect(
        activityService.deleteActivity("999", UserRole.Teacher, "teacher-1")
      ).rejects.toThrow("Actividad no encontrada o no tienes permisos para acceder a ella.");
    });
  });

  describe("getWorkspaceForStudent", () => {
    it("returns workspace with public test cases only", async () => {
      const mockActivity = {
        id: "1",
        title: "Hello World",
        description: "Description",
        starterCode: "print('hello')",
        allowCopy: true,
        allowPaste: true,
        maxAttempts: 3,
        language: { id: 1, name: "Python", fileExtension: "py" },
        testCases: [
          { id: 1, isHidden: false, input: "aW5wdXQ=", expectedOutput: "b3V0cHV0" },
          { id: 2, isHidden: true, input: null, expectedOutput: null },
        ],
      };
      mockPrisma.activity.findUnique.mockResolvedValue(mockActivity);

      const result = await activityService.getWorkspaceForStudent("1");

      expect(result.activityId).toBe("1");
      expect(result.language).toEqual({ id: 1, name: "Python", fileExtension: "py" });
      expect(result.testCases).toHaveLength(2);
      expect(result.testCases[0]).toEqual({
        id: 1,
        isHidden: false,
        input: "aW5wdXQ=",
        expectedOutput: "b3V0cHV0",
      });
      expect(result.testCases[1]).toEqual({ id: 2, isHidden: true });
    });

    it("throws error when activity not found", async () => {
      mockPrisma.activity.findUnique.mockResolvedValue(null);

      await expect(activityService.getWorkspaceForStudent("999")).rejects.toThrow(
        "La actividad no existe o no est"
      );
    });

    it("includes input only when not null", async () => {
      const mockActivity = {
        id: "1",
        title: "Test",
        description: null,
        starterCode: null,
        allowCopy: true,
        allowPaste: true,
        maxAttempts: 0,
        language: { id: 1, name: "Python", fileExtension: "py" },
        testCases: [{ id: 1, isHidden: false, input: null, expectedOutput: "b3V0cHV0" }],
      };
      mockPrisma.activity.findUnique.mockResolvedValue(mockActivity);

      const result = await activityService.getWorkspaceForStudent("1");

      expect(result.testCases[0]).toEqual({
        id: 1,
        isHidden: false,
        expectedOutput: "b3V0cHV0",
      });
      expect(result.testCases[0]).not.toHaveProperty("input");
    });
  });
});
