import { describe, it, expect, vi } from "vitest";
import { container } from "../../src/config/container.js";
import { EvaluationService } from "../../src/services/evaluation.service.js";
import type { IExecutionService } from "../../src/services/interfaces/execution.service.interface.js";
import { ExecutionStatus } from "../../src/types/enums/execution-status.enum.js";
import { SubmissionStatus } from "../../src/types/enums/submission-status.enum.js";

describe("DI container", () => {
  it("builds the full service graph without errors", () => {
    const cradle = container.cradle;
    expect(cradle.evaluationService).toBeInstanceOf(EvaluationService);
    expect(cradle.submissionService).toBeDefined();
    expect(cradle.authService).toBeDefined();
    expect(cradle.activityService).toBeDefined();
    expect(cradle.subjectService).toBeDefined();
    expect(cradle.testCaseService).toBeDefined();
    expect(cradle.tokenService).toBeDefined();
    expect(cradle.userService).toBeDefined();
    expect(cradle.enrollmentService).toBeDefined();
    expect(cradle.invitationService).toBeDefined();
    expect(cradle.programmingLanguageService).toBeDefined();
    expect(cradle.settingService).toBeDefined();
    expect(cradle.authenticate).toBeTypeOf("function");
    expect(cradle.rbac).toBeTypeOf("function");
  });

  it("builds EvaluationService with a mocked IExecutionService", async () => {
    const mockExecutionService: IExecutionService = {
      runCode: vi.fn(),
      runCodeWithFiles: vi.fn().mockResolvedValue({
        status: ExecutionStatus.SUCCESS,
        stdout: "output",
        stderr: "",
        timeMs: 100,
      }),
      pullAndPrepImage: vi.fn(),
    };

    const evaluationService = new EvaluationService(mockExecutionService);

    const result = await evaluationService.evaluateSubmission(
      1,
      [
        {
          id: 1,
          activityId: "1",
          input: Buffer.from("input").toString("base64"),
          expectedOutput: Buffer.from("output").toString("base64"),
          isHidden: false,
        },
      ],
      [{ name: "main.py", content: Buffer.from("print('x')").toString("base64") }]
    );

    expect(result.status).toBe(SubmissionStatus.ACCEPTED);
    expect(result.finalGrade).toBe(100);
    expect(mockExecutionService.runCodeWithFiles).toHaveBeenCalledTimes(1);
  });

  it("resolves services as singletons", () => {
    expect(container.resolve("tokenService")).toBe(container.resolve("tokenService"));
    expect(container.resolve("authService")).toBe(container.resolve("authService"));
  });
});
