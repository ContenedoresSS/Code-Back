import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    testCase: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

vi.mock("../../src/services/activity.service.js", () => ({
  default: {
    getActivityById: vi.fn(),
  },
}));

import testCaseService from "../../src/services/test-case.service.js";
import activityService from "../../src/services/activity.service.js";
import { UserRole } from "../../src/types/enums/role.enum.js";

const mockedActivityService = vi.mocked(activityService);

describe("TestCaseService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTestCase", () => {
    it("creates test case with provided data", async () => {
      const mockTestCase = {
        id: 1,
        activityId: "1",
        input: "aW5wdXQ=",
        expectedOutput: "b3V0cHV0",
        isHidden: false,
      };

      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.create.mockResolvedValue(mockTestCase);

      const result = await testCaseService.createTestCase(
        "1",
        UserRole.Teacher,
        "teacher-1",
        { input: "aW5wdXQ=", expectedOutput: "b3V0cHV0", isHidden: false }
      );

      expect(mockedActivityService.getActivityById).toHaveBeenCalledWith(
        "1",
        UserRole.Teacher,
        "teacher-1"
      );
      expect(mockPrisma.testCase.create).toHaveBeenCalledWith({
        data: {
          activityId: "1",
          input: "aW5wdXQ=",
          expectedOutput: "b3V0cHV0",
          isHidden: false,
        },
      });
      expect(result).toEqual(mockTestCase);
    });

    it("creates test case with null input", async () => {
      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.create.mockResolvedValue({
        id: 1,
        activityId: "1",
        input: null,
        expectedOutput: "b3V0cHV0",
        isHidden: false,
      });

      await testCaseService.createTestCase("1", UserRole.Teacher, "teacher-1", {
        expectedOutput: "b3V0cHV0",
      });

      expect(mockPrisma.testCase.create).toHaveBeenCalledWith({
        data: {
          activityId: "1",
          input: null,
          expectedOutput: "b3V0cHV0",
          isHidden: false,
        },
      });
    });

    it("sets isHidden default to false", async () => {
      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.create.mockResolvedValue({});

      await testCaseService.createTestCase("1", UserRole.Teacher, "teacher-1", {
        expectedOutput: "b3V0cHV0",
      });

      expect(mockPrisma.testCase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isHidden: false }),
      });
    });

    it("throws error when activity not found", async () => {
      mockedActivityService.getActivityById.mockRejectedValue(
        new Error("Actividad no encontrada")
      );

      await expect(
        testCaseService.createTestCase("999", UserRole.Teacher, "teacher-1", {
          expectedOutput: "b3V0cHV0",
        })
      ).rejects.toThrow();
    });
  });

  describe("getTestCasesByActivity", () => {
    it("returns test cases ordered by id", async () => {
      const mockTestCases = [
        { id: 1, activityId: "1", input: "aW5wdXQ=", expectedOutput: "b3V0cHV0", isHidden: false },
        { id: 2, activityId: "1", input: null, expectedOutput: "b3V0cHV0Mg==", isHidden: true },
      ];

      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.findMany.mockResolvedValue(mockTestCases);

      const result = await testCaseService.getTestCasesByActivity(
        "1",
        UserRole.Teacher,
        "teacher-1"
      );

      expect(mockPrisma.testCase.findMany).toHaveBeenCalledWith({
        where: { activityId: "1" },
        orderBy: { id: "asc" },
      });
      expect(result).toEqual(mockTestCases);
    });

    it("returns empty array when no test cases", async () => {
      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.findMany.mockResolvedValue([]);

      const result = await testCaseService.getTestCasesByActivity(
        "1",
        UserRole.Teacher,
        "teacher-1"
      );

      expect(result).toEqual([]);
    });
  });

  describe("updateTestCase", () => {
    it("updates test case fields", async () => {
      const existingTestCase = { id: 1, activityId: "1", input: "aW5wdXQ=", expectedOutput: "b3V0cHV0", isHidden: false };
      const updatedTestCase = { id: 1, activityId: "1", input: "bmV3", expectedOutput: "b3V0cHV0", isHidden: true };

      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.findFirst.mockResolvedValue(existingTestCase);
      mockPrisma.testCase.update.mockResolvedValue(updatedTestCase);

      const result = await testCaseService.updateTestCase(
        1,
        "1",
        UserRole.Teacher,
        "teacher-1",
        { input: "bmV3", isHidden: true }
      );

      expect(mockPrisma.testCase.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { input: "bmV3", isHidden: true },
      });
      expect(result).toEqual(updatedTestCase);
    });

    it("sets input to null when explicitly provided as null", async () => {
      const existingTestCase = { id: 1, activityId: "1", input: "aW5wdXQ=", expectedOutput: "b3V0cHV0", isHidden: false };

      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.findFirst.mockResolvedValue(existingTestCase);
      mockPrisma.testCase.update.mockResolvedValue({ ...existingTestCase, input: null });

      await testCaseService.updateTestCase(1, "1", UserRole.Teacher, "teacher-1", {
        input: null,
      });

      expect(mockPrisma.testCase.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { input: null },
      });
    });

    it("returns existing test case when no updates provided", async () => {
      const existingTestCase = { id: 1, activityId: "1", input: "aW5wdXQ=", expectedOutput: "b3V0cHV0", isHidden: false };

      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.findFirst.mockResolvedValue(existingTestCase);

      const result = await testCaseService.updateTestCase(
        1,
        "1",
        UserRole.Teacher,
        "teacher-1",
        {}
      );

      expect(mockPrisma.testCase.update).not.toHaveBeenCalled();
      expect(result).toEqual(existingTestCase);
    });

    it("throws error when test case not found in activity", async () => {
      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.findFirst.mockResolvedValue(null);

      await expect(
        testCaseService.updateTestCase(999, "1", UserRole.Teacher, "teacher-1", {
          input: "bmV3",
        })
      ).rejects.toThrow("Caso de prueba no encontrado en esta actividad.");
    });
  });

  describe("deleteTestCase", () => {
    it("deletes test case when found in activity", async () => {
      const existingTestCase = { id: 1, activityId: "1" };

      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.findFirst.mockResolvedValue(existingTestCase);
      mockPrisma.testCase.delete.mockResolvedValue(existingTestCase);

      await testCaseService.deleteTestCase(1, "1", UserRole.Teacher, "teacher-1");

      expect(mockPrisma.testCase.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("throws error when test case not found in activity", async () => {
      mockedActivityService.getActivityById.mockResolvedValue({} as any);
      mockPrisma.testCase.findFirst.mockResolvedValue(null);

      await expect(
        testCaseService.deleteTestCase(999, "1", UserRole.Teacher, "teacher-1")
      ).rejects.toThrow("Caso de prueba no encontrado en esta actividad.");
    });
  });
});
