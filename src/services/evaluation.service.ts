import type { TestCase } from "@prisma/client";
import prisma from "../config/prisma.js";
import { ExecutionStatus } from "../types/enums/execution-status.enum.js";
import { SubmissionStatus } from "../types/enums/submission-status.enum.js";
import type { CodeFile } from "../types/models/execution/code-file.model.js";
import type { EvaluationResult } from "../types/responses/evaluation-result.response.js";
import executionService from "./execution.service.js";
import type { IEvaluationService } from "./interfaces/evaluation.service.interface.js";
import { QueueTimeoutError } from "../helpers/concurrency-limiter.helper.js";

export class EvaluationService implements IEvaluationService {
  public async evaluateSubmission(
    languageId: number,
    testCases: TestCase[],
    files: CodeFile[]
  ): Promise<EvaluationResult> {
    try {
      const totalTests = testCases.length;
      if (totalTests === 0) throw new Error("La actividad no tiene casos de prueba configurados");

      let passedTests = 0;
      let maxExecutionTimeMs = 0;
      let globalStatus: SubmissionStatus = SubmissionStatus.ACCEPTED;
      let compilerOutput: string | null = null;

      const entryPoint = files[0]?.name || "main";

      for (const testCase of testCases) {
        const executionResult = await executionService.runCodeWithFiles(
          languageId,
          files,
          entryPoint,
          testCase.input ?? undefined
        );

        if (executionResult.timeMs > maxExecutionTimeMs) {
          maxExecutionTimeMs = executionResult.timeMs;
        }

        //Fail cases
        if (executionResult.status === ExecutionStatus.COMPILE_ERROR) {
          globalStatus = SubmissionStatus.COMPILE_ERROR;
          compilerOutput = executionResult.stderr;
          break;
        }

        if (executionResult.status === ExecutionStatus.RUNTIME_ERROR) {
          globalStatus = SubmissionStatus.RUNTIME_ERROR;
          compilerOutput = executionResult.stderr;
          break;
        }

        if (executionResult.status === ExecutionStatus.TIME_LIMIT_EXCEEDED) {
          globalStatus = SubmissionStatus.TIME_LIMIT_EXCEEDED;
          break;
        }

        //Success case
        if (executionResult.status === ExecutionStatus.SUCCESS) {
          const studentOutput = executionResult.stdout.trim();
          const expectedOutput = Buffer.from(testCase.expectedOutput, "base64")
            .toString("utf-8")
            .trim();

          if (studentOutput === expectedOutput) {
            passedTests++;
          } else {
            if (globalStatus === SubmissionStatus.ACCEPTED) {
              globalStatus = SubmissionStatus.WRONG_ANSWER;
            }
          }
        }
      }

      let finalGrade = 0;
      if (
        globalStatus !== SubmissionStatus.COMPILE_ERROR &&
        globalStatus !== SubmissionStatus.RUNTIME_ERROR &&
        globalStatus !== SubmissionStatus.TIME_LIMIT_EXCEEDED
      ) {
        finalGrade = parseFloat(((passedTests / totalTests) * 100).toFixed(2));
      }

      return {
        status: globalStatus,
        finalGrade,
        passedTests,
        totalTests,
        executionTimeMs: maxExecutionTimeMs,
        compilerOutput,
        languageId: languageId,
      };
    } catch (error: any) {
      if (error instanceof QueueTimeoutError) throw error;
      throw new Error(`Error en el motor de evaluación: ${error.message}`);
    }
  }
}

export default new EvaluationService();
