import type { CodeFile } from "../types/models/execution/code-file.model.js";
import type { EvaluationResult } from "../types/responses/evaluation-result.response.js";
import type { ISubmissionService } from "./interfaces/submission.service.interface.js";
import prisma from "../config/prisma.js";
import evaluationService from "./evaluation.service.js";

export class SubmissionService implements ISubmissionService {
  async processSubmission(
    activityId: string,
    files: CodeFile[],
    userId?: string
  ): Promise<EvaluationResult> {
    try {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          testCases: true,
        },
      });

      if (!activity) {
        throw new Error("La actividad no existe.");
      }

      if (userId) {
        if (activity.maxAttempts > 0) {
          const currentAttempts = await prisma.submission.count({
            where: {
              studentId: userId,
              activityId: activityId,
            },
          });

          if (currentAttempts >= activity.maxAttempts) {
            throw new Error("Has alcanzado el límite máximo de intentos para esta actividad.");
          }
        }
      }

      const evaluationResult = await evaluationService.evaluateSubmission(
        activity.languageId,
        activity.testCases,
        files
      );

      // Solo para usuarios registrados
      if (userId) {
        await prisma.submission.create({
          data: {
            studentId: userId,
            activityId: activityId,
            languageId: evaluationResult.languageId,
            codeSnapshot: files as any,
            finalGrade: evaluationResult.finalGrade,
            passedTests: evaluationResult.passedTests,
            totalTests: evaluationResult.totalTests,
            executionTimeMs: evaluationResult.executionTimeMs,
            status: evaluationResult.status,
            compilerOutput: evaluationResult.compilerOutput,
          },
        });
      }

      return evaluationResult;
    } catch (error: any) {
      if (error.message.includes("límite máximo") || error.message.includes("no existe")) {
        throw error;
      }
      throw new Error(`Error al procesar el envío: ${error.message}`);
    }
  }
}

export default new SubmissionService();
