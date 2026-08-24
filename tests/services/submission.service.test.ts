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
    programmingLanguage: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

import { SubmissionService } from "../../src/services/submission.service.js";
import { SubmissionStatus } from "../../src/types/enums/submission-status.enum.js";

const mockedEvaluationService = { evaluateSubmission: vi.fn() };
const mockedEnrollmentService = {
  enrollStudent: vi.fn(),
  getEnrollments: vi.fn(),
  unenroll: vi.fn(),
  ensureEnrollment: vi.fn(),
};
const submissionService = new SubmissionService(mockedEvaluationService, mockedEnrollmentService);

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
      expect(result).toEqual({ ...mockEvaluationResult, saved: true });
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
      expect(mockedEnrollmentService.ensureEnrollment).not.toHaveBeenCalled();
      expect(result).toEqual({ ...mockEvaluationResult, saved: false });
    });

    it("auto-enrolls the student in the activity's subject", async () => {
      const mockActivity = {
        id: "1",
        subjectId: 42,
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
      mockedEnrollmentService.ensureEnrollment.mockResolvedValue();

      await submissionService.processSubmission("1", mockFiles, "student-1");

      expect(mockedEnrollmentService.ensureEnrollment).toHaveBeenCalledWith("student-1", 42);
    });

    it("does not auto-enroll when max attempts are reached", async () => {
      const mockActivity = {
        id: "1",
        subjectId: 42,
        languageId: 1,
        maxAttempts: 1,
        testCases: [],
      };

      mockPrisma.activity.findUnique.mockResolvedValue(mockActivity);
      mockPrisma.submission.count.mockResolvedValue(1);

      await expect(
        submissionService.processSubmission("1", mockFiles, "student-1")
      ).rejects.toThrow("Has alcanzado el l");

      expect(mockedEnrollmentService.ensureEnrollment).not.toHaveBeenCalled();
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

  describe("processSubmission — rule enforcement", () => {
    const MAIN_LF = "aW50IG1haW4oKSB7CiAgcmV0dXJuIDA7Cn0=";
    const MAIN_EDITED = "aW50IG1haW4oKSB7CiAgcmV0dXJuIDQyOwp9";
    const HELPER = "aW50IGhlbHBlcigpIHsgcmV0dXJuIDE7IH0=";

    const starterCode = [{ name: "main.cpp", content: MAIN_LF }];
    const untouched = [{ name: "main.cpp", content: MAIN_LF }];
    const edited = [{ name: "main.cpp", content: MAIN_EDITED }];

    const evaluationResult = {
      status: SubmissionStatus.ACCEPTED,
      finalGrade: 100,
      passedTests: 1,
      totalTests: 1,
      executionTimeMs: 100,
      compilerOutput: null,
      languageId: 1,
    };

    const activityWith = (rules: Record<string, boolean>, starter: unknown = starterCode) => ({
      id: "1",
      languageId: 1,
      maxAttempts: 0,
      starterCode: starter,
      rules,
      testCases: [],
    });

    beforeEach(() => {
      mockedEvaluationService.evaluateSubmission.mockResolvedValue(evaluationResult);
      mockPrisma.submission.create.mockResolvedValue({});
    });

    describe("allowCodeEdit", () => {
      it("rejects a submission whose code differs from the starter code", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(activityWith({ allowCodeEdit: false }));

        await expect(submissionService.processSubmission("1", edited, "student-1")).rejects.toThrow(
          "no permite modificar el c"
        );
        expect(mockedEvaluationService.evaluateSubmission).not.toHaveBeenCalled();
      });

      it("accepts a submission identical to the starter code", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(activityWith({ allowCodeEdit: false }));

        await submissionService.processSubmission("1", untouched, "student-1");

        expect(mockedEvaluationService.evaluateSubmission).toHaveBeenCalled();
      });

      it("does not enforce the rule when the activity has no starter code", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(
          activityWith({ allowCodeEdit: false }, null)
        );

        await submissionService.processSubmission("1", edited, "student-1");

        expect(mockedEvaluationService.evaluateSubmission).toHaveBeenCalled();
      });

      it("allows edited code when the rule is enabled", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(activityWith({ allowCodeEdit: true }));

        await submissionService.processSubmission("1", edited, "student-1");

        expect(mockedEvaluationService.evaluateSubmission).toHaveBeenCalled();
      });
    });

    describe("allowFileUpload", () => {
      it("rejects a submission that adds a file", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(activityWith({ allowFileUpload: false }));

        await expect(
          submissionService.processSubmission(
            "1",
            [...untouched, { name: "extra.cpp", content: HELPER }],
            "student-1"
          )
        ).rejects.toThrow("no permite agregar ni quitar archivos");
        expect(mockedEvaluationService.evaluateSubmission).not.toHaveBeenCalled();
      });

      it("accepts an edited file as long as no file was added", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(activityWith({ allowFileUpload: false }));

        await submissionService.processSubmission("1", edited, "student-1");

        expect(mockedEvaluationService.evaluateSubmission).toHaveBeenCalled();
      });

      it("does not enforce the rule when the activity has no starter code", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(
          activityWith({ allowFileUpload: false }, null)
        );

        await submissionService.processSubmission(
          "1",
          [{ name: "brand-new.cpp", content: HELPER }],
          "student-1"
        );

        expect(mockedEvaluationService.evaluateSubmission).toHaveBeenCalled();
      });
    });

    describe("allowLanguageChange", () => {
      it("ignores the requested language when the rule is disabled", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(
          activityWith({ allowLanguageChange: false })
        );

        await submissionService.processSubmission("1", untouched, "student-1", 7);

        expect(mockPrisma.programmingLanguage.findUnique).not.toHaveBeenCalled();
        expect(mockedEvaluationService.evaluateSubmission).toHaveBeenCalledWith(1, [], untouched);
      });

      it("evaluates with the requested language when the rule is enabled", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(
          activityWith({ allowLanguageChange: true })
        );
        mockPrisma.programmingLanguage.findUnique.mockResolvedValue({ id: 7, name: "Java" });

        await submissionService.processSubmission("1", untouched, "student-1", 7);

        expect(mockPrisma.programmingLanguage.findUnique).toHaveBeenCalledWith({
          where: { id: 7 },
        });
        expect(mockedEvaluationService.evaluateSubmission).toHaveBeenCalledWith(7, [], untouched);
      });

      it("rejects a requested language that does not exist", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(
          activityWith({ allowLanguageChange: true })
        );
        mockPrisma.programmingLanguage.findUnique.mockResolvedValue(null);

        await expect(
          submissionService.processSubmission("1", untouched, "student-1", 999)
        ).rejects.toThrow("lenguaje de programaci");
        expect(mockedEvaluationService.evaluateSubmission).not.toHaveBeenCalled();
      });

      it("falls back to the activity language when none is requested", async () => {
        mockPrisma.activity.findUnique.mockResolvedValue(
          activityWith({ allowLanguageChange: true })
        );

        await submissionService.processSubmission("1", untouched, "student-1");

        expect(mockPrisma.programmingLanguage.findUnique).not.toHaveBeenCalled();
        expect(mockedEvaluationService.evaluateSubmission).toHaveBeenCalledWith(1, [], untouched);
      });
    });
  });
});
