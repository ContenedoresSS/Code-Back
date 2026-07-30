import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    activity: {
      findUnique: vi.fn(),
    },
    submission: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

vi.mock("../../src/services/evaluation.service.js", () => ({
  default: {
    evaluateSubmission: vi.fn(),
  },
}));

import submissionService from "../../src/services/submission.service.js";
import evaluationService from "../../src/services/evaluation.service.js";
import { SubmissionStatus } from "../../src/types/enums/submission-status.enum.js";

const mockedEvaluationService = vi.mocked(evaluationService);

describe("SubmissionService", () => {
  const mockFiles = [{ name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processSubmission", () => {
    it("evaluates and saves submission for authenticated user", async () => {
      const mockActivity = {
        id: "1",
        languageId: 1,
        maxAttempts: 3,
        testCases: [{ id: 1, input: "aW5wdXQ=", expectedOutput: "b3V0cHV0" }],
      };
      const mockEvaluationResult = {
        status: SubmissionStatus.ACCEPTED,
        finalGrade: 100,
        passedTests: 1,
        totalTests: 1,
        executionTimeMs: 100,
        compilerOutput: null,
        languageId: 1,
      };

      mockPrisma.activity.findUnique.mockResolvedValue(mockActivity);
      mockPrisma.submission.count.mockResolvedValue(0);
      mockedEvaluationService.evaluateSubmission.mockResolvedValue(mockEvaluationResult);
      mockPrisma.submission.create.mockResolvedValue({});

      const result = await submissionService.processSubmission("1", mockFiles, "student-1");

      expect(mockPrisma.activity.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
        include: { testCases: true },
      });
      expect(mockPrisma.submission.count).toHaveBeenCalledWith({
        where: { studentId: "student-1", activityId: "1" },
      });
      expect(mockedEvaluationService.evaluateSubmission).toHaveBeenCalledWith(
        1,
        mockActivity.testCases,
        mockFiles
      );
      expect(mockPrisma.submission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studentId: "student-1",
          activityId: "1",
          languageId: 1,
          finalGrade: 100,
          status: SubmissionStatus.ACCEPTED,
        }),
      });
      expect(result).toEqual(mockEvaluationResult);
    });

    it("does not save submission for anonymous user", async () => {
      const mockActivity = {
        id: "1",
        languageId: 1,
        maxAttempts: 0,
        testCases: [],
      };
      const mockEvaluationResult = {
        status: SubmissionStatus.ACCEPTED,
        finalGrade: 100,
        passedTests: 1,
        totalTests: 1,
        executionTimeMs: 100,
        compilerOutput: null,
        languageId: 1,
      };

      mockPrisma.activity.findUnique.mockResolvedValue(mockActivity);
      mockedEvaluationService.evaluateSubmission.mockResolvedValue(mockEvaluationResult);

      const result = await submissionService.processSubmission("1", mockFiles);

      expect(mockPrisma.submission.count).not.toHaveBeenCalled();
      expect(mockPrisma.submission.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockEvaluationResult);
    });

    it("throws error when activity not found", async () => {
      mockPrisma.activity.findUnique.mockResolvedValue(null);

      await expect(
        submissionService.processSubmission("999", mockFiles, "student-1")
      ).rejects.toThrow("La actividad no existe.");
    });

    it("throws error when max attempts reached", async () => {
      const mockActivity = {
        id: "1",
        languageId: 1,
        maxAttempts: 3,
        testCases: [],
      };

      mockPrisma.activity.findUnique.mockResolvedValue(mockActivity);
      mockPrisma.submission.count.mockResolvedValue(3);

      await expect(
        submissionService.processSubmission("1", mockFiles, "student-1")
      ).rejects.toThrow("Has alcanzado el l");
    });

    it("allows submission when maxAttempts is 0 (unlimited)", async () => {
      const mockActivity = {
        id: "1",
        languageId: 1,
        maxAttempts: 0,
        testCases: [],
      };
      const mockEvaluationResult = {
        status: SubmissionStatus.ACCEPTED,
        finalGrade: 100,
        passedTests: 1,
        totalTests: 1,
        executionTimeMs: 100,
        compilerOutput: null,
        languageId: 1,
      };

      mockPrisma.activity.findUnique.mockResolvedValue(mockActivity);
      mockedEvaluationService.evaluateSubmission.mockResolvedValue(mockEvaluationResult);
      mockPrisma.submission.create.mockResolvedValue({});

      await submissionService.processSubmission("1", mockFiles, "student-1");

      expect(mockPrisma.submission.count).not.toHaveBeenCalled();
    });
  });
});
