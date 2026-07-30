import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExecutionStatus } from "../../src/types/enums/execution-status.enum.js";
import { SubmissionStatus } from "../../src/types/enums/submission-status.enum.js";
import type { TestCase } from "@prisma/client";
import type { CodeFile } from "../../src/types/models/execution/code-file.model.js";

vi.mock("../../src/services/execution.service.js", () => ({
  default: {
    runCodeWithFiles: vi.fn(),
  },
}));

import evaluationService from "../../src/services/evaluation.service.js";
import executionService from "../../src/services/execution.service.js";

const mockedExecutionService = vi.mocked(executionService);

describe("EvaluationService", () => {
  const mockFiles: CodeFile[] = [
    { name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" },
  ];

  const createTestCase = (input: string, expectedOutput: string): TestCase =>
    ({
      id: 1,
      activityId: "1",
      input: Buffer.from(input).toString("base64"),
      expectedOutput: Buffer.from(expectedOutput).toString("base64"),
      isHidden: false,
    }) as TestCase;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("evaluateSubmission", () => {
    it("throws error when no test cases provided", async () => {
      await expect(
        evaluationService.evaluateSubmission(1, [], mockFiles)
      ).rejects.toThrow("La actividad no tiene casos de prueba configurados");
    });

    it("returns ACCEPTED with grade 100 when all tests pass", async () => {
      const testCases = [
        createTestCase("input1", "output1"),
        createTestCase("input2", "output2"),
      ];

      mockedExecutionService.runCodeWithFiles
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          stdout: "output1",
          stderr: "",
          timeMs: 100,
        })
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          stdout: "output2",
          stderr: "",
          timeMs: 150,
        });

      const result = await evaluationService.evaluateSubmission(1, testCases, mockFiles);

      expect(result.status).toBe(SubmissionStatus.ACCEPTED);
      expect(result.finalGrade).toBe(100);
      expect(result.passedTests).toBe(2);
      expect(result.totalTests).toBe(2);
    });

    it("returns WRONG_ANSWER with proportional grade when some tests fail", async () => {
      const testCases = [
        createTestCase("input1", "output1"),
        createTestCase("input2", "output2"),
      ];

      mockedExecutionService.runCodeWithFiles
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          stdout: "output1",
          stderr: "",
          timeMs: 100,
        })
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          stdout: "wrong",
          stderr: "",
          timeMs: 120,
        });

      const result = await evaluationService.evaluateSubmission(1, testCases, mockFiles);

      expect(result.status).toBe(SubmissionStatus.WRONG_ANSWER);
      expect(result.finalGrade).toBe(50);
      expect(result.passedTests).toBe(1);
      expect(result.totalTests).toBe(2);
    });

    it("returns COMPILE_ERROR with grade 0 and aborts on compile error", async () => {
      const testCases = [
        createTestCase("input1", "output1"),
        createTestCase("input2", "output2"),
      ];

      mockedExecutionService.runCodeWithFiles.mockResolvedValueOnce({
        status: ExecutionStatus.COMPILE_ERROR,
        stdout: "",
        stderr: "SyntaxError: unexpected token",
        timeMs: 50,
      });

      const result = await evaluationService.evaluateSubmission(1, testCases, mockFiles);

      expect(result.status).toBe(SubmissionStatus.COMPILE_ERROR);
      expect(result.finalGrade).toBe(0);
      expect(result.compilerOutput).toBe("SyntaxError: unexpected token");
      expect(mockedExecutionService.runCodeWithFiles).toHaveBeenCalledTimes(1);
    });

    it("returns RUNTIME_ERROR with grade 0 and aborts on runtime error", async () => {
      const testCases = [
        createTestCase("input1", "output1"),
        createTestCase("input2", "output2"),
      ];

      mockedExecutionService.runCodeWithFiles.mockResolvedValueOnce({
        status: ExecutionStatus.RUNTIME_ERROR,
        stdout: "",
        stderr: "TypeError: undefined is not a function",
        timeMs: 80,
      });

      const result = await evaluationService.evaluateSubmission(1, testCases, mockFiles);

      expect(result.status).toBe(SubmissionStatus.RUNTIME_ERROR);
      expect(result.finalGrade).toBe(0);
      expect(result.compilerOutput).toBe("TypeError: undefined is not a function");
      expect(mockedExecutionService.runCodeWithFiles).toHaveBeenCalledTimes(1);
    });

    it("returns TIME_LIMIT_EXCEEDED with grade 0 and aborts on timeout", async () => {
      const testCases = [
        createTestCase("input1", "output1"),
        createTestCase("input2", "output2"),
      ];

      mockedExecutionService.runCodeWithFiles.mockResolvedValueOnce({
        status: ExecutionStatus.TIME_LIMIT_EXCEEDED,
        stdout: "",
        stderr: "",
        timeMs: 10000,
      });

      const result = await evaluationService.evaluateSubmission(1, testCases, mockFiles);

      expect(result.status).toBe(SubmissionStatus.TIME_LIMIT_EXCEEDED);
      expect(result.finalGrade).toBe(0);
      expect(mockedExecutionService.runCodeWithFiles).toHaveBeenCalledTimes(1);
    });

    it("tracks maximum execution time across all tests", async () => {
      const testCases = [
        createTestCase("input1", "output1"),
        createTestCase("input2", "output2"),
        createTestCase("input3", "output3"),
      ];

      mockedExecutionService.runCodeWithFiles
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          stdout: "output1",
          stderr: "",
          timeMs: 100,
        })
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          stdout: "output2",
          stderr: "",
          timeMs: 250,
        })
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          stdout: "output3",
          stderr: "",
          timeMs: 150,
        });

      const result = await evaluationService.evaluateSubmission(1, testCases, mockFiles);

      expect(result.executionTimeMs).toBe(250);
    });

    it("compares output with trimming (ignores trailing whitespace)", async () => {
      const testCases = [createTestCase("input", "output")];

      mockedExecutionService.runCodeWithFiles.mockResolvedValueOnce({
        status: ExecutionStatus.SUCCESS,
        stdout: "output   ",
        stderr: "",
        timeMs: 100,
      });

      const result = await evaluationService.evaluateSubmission(1, testCases, mockFiles);

      expect(result.status).toBe(SubmissionStatus.ACCEPTED);
      expect(result.passedTests).toBe(1);
    });

    it("handles test case with null input", async () => {
      const testCase = {
        id: 1,
        activityId: "1",
        input: null,
        expectedOutput: Buffer.from("output").toString("base64"),
        isHidden: false,
      } as TestCase;

      mockedExecutionService.runCodeWithFiles.mockResolvedValueOnce({
        status: ExecutionStatus.SUCCESS,
        stdout: "output",
        stderr: "",
        timeMs: 100,
      });

      const result = await evaluationService.evaluateSubmission(1, [testCase], mockFiles);

      expect(mockedExecutionService.runCodeWithFiles).toHaveBeenCalledWith(
        1,
        mockFiles,
        "main.py",
        undefined
      );
      expect(result.status).toBe(SubmissionStatus.ACCEPTED);
    });

    it("uses first file name as entry point", async () => {
      const files: CodeFile[] = [
        { name: "solution.py", content: "cHJpbnQoJ0hlbGxvJyk=" },
        { name: "helper.py", content: "ZGVmIGhlbHAoKTogcGFzcw==" },
      ];

      const testCases = [createTestCase("input", "output")];

      mockedExecutionService.runCodeWithFiles.mockResolvedValueOnce({
        status: ExecutionStatus.SUCCESS,
        stdout: "output",
        stderr: "",
        timeMs: 100,
      });

      await evaluationService.evaluateSubmission(1, testCases, files);

      expect(mockedExecutionService.runCodeWithFiles).toHaveBeenCalledWith(
        1,
        files,
        "solution.py",
        expect.any(String)
      );
    });

    it("returns correct languageId in result", async () => {
      const testCases = [createTestCase("input", "output")];

      mockedExecutionService.runCodeWithFiles.mockResolvedValueOnce({
        status: ExecutionStatus.SUCCESS,
        stdout: "output",
        stderr: "",
        timeMs: 100,
      });

      const result = await evaluationService.evaluateSubmission(42, testCases, mockFiles);

      expect(result.languageId).toBe(42);
    });

    it("calculates grade with 2 decimal precision", async () => {
      const testCases = [
        createTestCase("i1", "o1"),
        createTestCase("i2", "o2"),
        createTestCase("i3", "o3"),
      ];

      mockedExecutionService.runCodeWithFiles
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          stdout: "o1",
          stderr: "",
          timeMs: 100,
        })
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          stdout: "o2",
          stderr: "",
          timeMs: 100,
        })
        .mockResolvedValueOnce({
          status: ExecutionStatus.SUCCESS,
          stdout: "wrong",
          stderr: "",
          timeMs: 100,
        });

      const result = await evaluationService.evaluateSubmission(1, testCases, mockFiles);

      expect(result.finalGrade).toBe(66.67);
    });
  });
});
