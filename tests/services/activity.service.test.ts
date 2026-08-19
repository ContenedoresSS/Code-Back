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
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    submission: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

import activityService from "../../src/services/activity.service.js";
import { UserRole } from "../../src/types/enums/role.enum.js";
import { getDefaultActivityRules } from "../../src/helpers/activity-rules.helper.js";

const DEFAULT_RULES = getDefaultActivityRules();

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
        rules: DEFAULT_RULES,
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

    it("persists catalog defaults when no rules are provided", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue({ id: 1, userId: "teacher-1" });
      mockPrisma.programmingLanguage.findUnique.mockResolvedValue({ id: 1, name: "Python" });
      mockPrisma.activity.create.mockResolvedValue({ id: "1", rules: DEFAULT_RULES });

      await activityService.createActivity("teacher-1", {
        subjectId: 1,
        languageId: 1,
        title: "Hello World",
      });

      expect(mockPrisma.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ rules: DEFAULT_RULES }),
      });
    });

    it("merges a partial rules patch over the catalog defaults", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue({ id: 1, userId: "teacher-1" });
      mockPrisma.programmingLanguage.findUnique.mockResolvedValue({ id: 1, name: "Python" });
      mockPrisma.activity.create.mockResolvedValue({ id: "1", rules: DEFAULT_RULES });

      await activityService.createActivity("teacher-1", {
        subjectId: 1,
        languageId: 1,
        title: "Hello World",
        rules: { allowCopy: false, allowLanguageChange: true },
      });

      expect(mockPrisma.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rules: {
            ...DEFAULT_RULES,
            allowCopy: false,
            allowLanguageChange: true,
          },
        }),
      });
    });

    it("returns rules resolved from what the database stored", async () => {
      mockPrisma.subject.findFirst.mockResolvedValue({ id: 1, userId: "teacher-1" });
      mockPrisma.programmingLanguage.findUnique.mockResolvedValue({ id: 1, name: "Python" });
      mockPrisma.activity.create.mockResolvedValue({
        id: "1",
        rules: { allowCopy: false },
      });

      const result = await activityService.createActivity("teacher-1", {
        subjectId: 1,
        languageId: 1,
        title: "Hello World",
      });

      expect(result.rules).toEqual({ ...DEFAULT_RULES, allowCopy: false });
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
      expect(result).toEqual({ ...mockActivity, rules: DEFAULT_RULES });
    });

    it("resolves partial stored rules against the catalog defaults", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "1",
        professorId: "teacher-1",
        rules: { allowCopy: false, allowLanguageChange: true },
      });

      const result = await activityService.getActivityById("1", UserRole.Teacher, "teacher-1");

      expect(result.rules).toEqual({
        ...DEFAULT_RULES,
        allowCopy: false,
        allowLanguageChange: true,
      });
    });

    it("returns catalog defaults when stored rules are null", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "1",
        professorId: "teacher-1",
        rules: null,
      });

      const result = await activityService.getActivityById("1", UserRole.Teacher, "teacher-1");

      expect(result.rules).toEqual(DEFAULT_RULES);
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
      expect(result).toEqual({ ...updatedActivity, rules: DEFAULT_RULES });
    });

    it("merges a rules patch over the stored rules", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "1",
        professorId: "teacher-1",
        rules: { allowCopy: false },
      });
      mockPrisma.activity.update.mockResolvedValue({ id: "1", rules: {} });

      await activityService.updateActivity("1", UserRole.Teacher, "teacher-1", {
        rules: { allowCodeEdit: false },
      });

      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: {
          rules: { ...DEFAULT_RULES, allowCopy: false, allowCodeEdit: false },
        },
      });
    });

    it("does not write rules when the patch omits them", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "1",
        professorId: "teacher-1",
        rules: { allowCopy: false },
      });
      mockPrisma.activity.update.mockResolvedValue({ id: "1", rules: { allowCopy: false } });

      await activityService.updateActivity("1", UserRole.Teacher, "teacher-1", { title: "New" });

      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { title: "New" },
      });
    });

    it("returns the existing activity when the patch is empty", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "1",
        professorId: "teacher-1",
        rules: { allowPaste: false },
      });

      const result = await activityService.updateActivity("1", UserRole.Teacher, "teacher-1", {});

      expect(mockPrisma.activity.update).not.toHaveBeenCalled();
      expect(result.rules).toEqual({ ...DEFAULT_RULES, allowPaste: false });
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
      expect(result).toEqual({ ...updatedActivity, rules: DEFAULT_RULES });
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
        rules: { allowCopy: false, allowPaste: false },
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

    it("returns rules resolved against the catalog defaults", async () => {
      mockPrisma.activity.findUnique.mockResolvedValue({
        id: "1",
        title: "Test",
        description: null,
        starterCode: null,
        rules: { allowCopy: false, allowFileUpload: false },
        maxAttempts: 0,
        language: { id: 1, name: "Python", fileExtension: "py" },
        testCases: [],
      });

      const result = await activityService.getWorkspaceForStudent("1");

      expect(result.rules).toEqual({
        ...DEFAULT_RULES,
        allowCopy: false,
        allowFileUpload: false,
      });
    });

    it("returns catalog defaults when the activity has no stored rules", async () => {
      mockPrisma.activity.findUnique.mockResolvedValue({
        id: "1",
        title: "Test",
        description: null,
        starterCode: null,
        rules: null,
        maxAttempts: 0,
        language: { id: 1, name: "Python", fileExtension: "py" },
        testCases: [],
      });

      const result = await activityService.getWorkspaceForStudent("1");

      expect(result.rules).toEqual(DEFAULT_RULES);
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
        rules: null,
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

  describe("getActivityGrades", () => {
    it("returns paginated grades grouped by student with the highest final grade", async () => {
      const mockActivity = {
        id: "a1",
        subjectId: 1,
        subject: { userId: "teacher-1" },
      };
      const mockStudents = [
        { id: "s1", name: "Alan", lastName: "Turing", email: "alan@uady.mx", identifier: "A001" },
        { id: "s2", name: "Grace", lastName: "Hopper", email: "grace@uady.mx", identifier: "A002" },
      ];
      const mockMaxGrades = [
        { studentId: "s1", _max: { finalGrade: 90 } },
        { studentId: "s2", _max: { finalGrade: 75 } },
      ];
      const mockSubmissions = [
        {
          id: "sub-1",
          studentId: "s1",
          finalGrade: 90,
          passedTests: 9,
          totalTests: 10,
          executionTimeMs: 120,
          status: "ACCEPTED",
          submittedAt: new Date("2024-01-02"),
        },
        {
          id: "sub-2",
          studentId: "s1",
          finalGrade: 85,
          passedTests: 8,
          totalTests: 10,
          executionTimeMs: 150,
          status: "WRONG_ANSWER",
          submittedAt: new Date("2024-01-01"),
        },
        {
          id: "sub-3",
          studentId: "s2",
          finalGrade: 75,
          passedTests: 7,
          totalTests: 10,
          executionTimeMs: 200,
          status: "ACCEPTED",
          submittedAt: new Date("2024-01-03"),
        },
      ];

      mockPrisma.activity.findFirst.mockResolvedValue(mockActivity);
      mockPrisma.user.findMany.mockResolvedValue(mockStudents);
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.submission.groupBy.mockResolvedValue(mockMaxGrades);
      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.$transaction.mockImplementation(async (queries) => Promise.all(queries));

      const result = await activityService.getActivityGrades(
        "a1",
        UserRole.Teacher,
        "teacher-1",
        0,
        10
      );

      expect(result.totalCount).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].student).toEqual({
        id: "s1",
        name: "Alan",
        lastName: "Turing",
        email: "alan@uady.mx",
        identifier: "A001",
      });
      expect(result.data[0].finalGrade).toBe(90);
      expect(result.data[0].submissions).toHaveLength(2);
      expect(result.data[0].submissions[0].status).toBe("ACCEPTED");
      expect(result.data[1].finalGrade).toBe(75);
      expect(result.data[1].submissions).toHaveLength(1);
    });

    it("returns null finalGrade when the student has no graded submission", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "a1",
        subjectId: 1,
        subject: { userId: "teacher-1" },
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "s1", name: "Alan", lastName: "Turing", email: "alan@uady.mx", identifier: "A001" },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.submission.groupBy.mockResolvedValue([
        { studentId: "s1", _max: { finalGrade: null } },
      ]);
      mockPrisma.submission.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (queries) => Promise.all(queries));

      const result = await activityService.getActivityGrades(
        "a1",
        UserRole.Teacher,
        "teacher-1",
        0,
        10
      );

      expect(result.data[0].finalGrade).toBeNull();
      expect(result.data[0].submissions).toEqual([]);
    });

    it("throws forbidden when the teacher is not the subject owner", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "a1",
        subjectId: 1,
        subject: { userId: "other-teacher" },
      });

      await expect(
        activityService.getActivityGrades("a1", UserRole.Teacher, "teacher-1", 0, 10)
      ).rejects.toThrow("No tienes permiso para ver las calificaciones");
    });

    it("throws not found when the activity does not exist", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      await expect(
        activityService.getActivityGrades("a1", UserRole.Teacher, "teacher-1", 0, 10)
      ).rejects.toThrow("Actividad no encontrada o no tienes permisos");
    });

    it("applies the search filter over name, last name, email or identifier", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "a1",
        subjectId: 1,
        subject: { userId: "teacher-1" },
      });
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.submission.groupBy.mockResolvedValue([]);
      mockPrisma.submission.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (queries) => Promise.all(queries));

      await activityService.getActivityGrades("a1", UserRole.Teacher, "teacher-1", 0, 10, "turing");

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            submissions: { some: { activityId: "a1" } },
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe("getSubmissionDetail", () => {
    const mockSubmission = {
      id: "sub-1",
      studentId: "s1",
      activityId: "a1",
      languageId: 1,
      codeSnapshot: [{ name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" }],
      finalGrade: 90,
      passedTests: 9,
      totalTests: 10,
      executionTimeMs: 120,
      status: "ACCEPTED",
      compilerOutput: null,
      submittedAt: new Date("2024-01-02"),
    };

    it("returns the full submission detail for the subject owner teacher", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "a1",
        subject: { userId: "teacher-1" },
      });
      mockPrisma.submission.findFirst.mockResolvedValue(mockSubmission);

      const result = await activityService.getSubmissionDetail(
        "a1",
        "sub-1",
        UserRole.Teacher,
        "teacher-1"
      );

      expect(result).toEqual({
        id: "sub-1",
        studentId: "s1",
        activityId: "a1",
        languageId: 1,
        codeSnapshot: [{ name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" }],
        finalGrade: 90,
        passedTests: 9,
        totalTests: 10,
        executionTimeMs: 120,
        status: "ACCEPTED",
        compilerOutput: null,
        submittedAt: "2024-01-02T00:00:00.000Z",
      });
    });

    it("returns the detail for God even when not the owner", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "a1",
        subject: { userId: "teacher-1" },
      });
      mockPrisma.submission.findFirst.mockResolvedValue(mockSubmission);

      const result = await activityService.getSubmissionDetail(
        "a1",
        "sub-1",
        UserRole.God,
        "admin"
      );

      expect(result.id).toBe("sub-1");
    });

    it("throws forbidden when the teacher is not the subject owner", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "a1",
        subject: { userId: "other-teacher" },
      });

      await expect(
        activityService.getSubmissionDetail("a1", "sub-1", UserRole.Teacher, "teacher-1")
      ).rejects.toThrow("No tienes permiso para ver este envío");
    });

    it("throws not found when the activity does not exist", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      await expect(
        activityService.getSubmissionDetail("a1", "sub-1", UserRole.Teacher, "teacher-1")
      ).rejects.toThrow("Actividad no encontrada o no tienes permisos para acceder a ella");
    });

    it("throws not found when the submission does not exist", async () => {
      mockPrisma.activity.findFirst.mockResolvedValue({
        id: "a1",
        subject: { userId: "teacher-1" },
      });
      mockPrisma.submission.findFirst.mockResolvedValue(null);

      await expect(
        activityService.getSubmissionDetail("a1", "sub-999", UserRole.Teacher, "teacher-1")
      ).rejects.toThrow("Envío no encontrado");
    });
  });
});
