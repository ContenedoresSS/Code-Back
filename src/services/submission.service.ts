import type { CodeFile } from "../types/models/execution/code-file.model.js";
import type { SubmissionResult } from "../types/responses/submission-result.response.js";
import type { ISubmissionService } from "./interfaces/submission.service.interface.js";
import type { IEvaluationService } from "./interfaces/evaluation.service.interface.js";
import type { IEnrollmentService } from "./interfaces/enrollment.service.interface.js";
import type { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import { resolveActivityRules } from "../helpers/activity-rules.helper.js";
import { QueueTimeoutError } from "../helpers/concurrency-limiter.helper.js";
import {
  parseStarterCode,
  fileNamesMatchStarter,
  codeMatchesStarter,
} from "../helpers/submission-rules.helper.js";

export class SubmissionService implements ISubmissionService {
  constructor(
    private readonly evaluationService: IEvaluationService,
    private readonly enrollmentService: IEnrollmentService
  ) {}

  // Sin starterCode no hay referencia contra la que comparar, así que las reglas
  // no se aplican: bloquear dejaría la actividad inentregable.
  private assertSubmissionAllowed(
    allowCodeEdit: boolean,
    allowFileUpload: boolean,
    starterCode: CodeFile[],
    files: CodeFile[]
  ): void {
    if (starterCode.length === 0) {
      return;
    }

    if (!allowCodeEdit && !codeMatchesStarter(starterCode, files)) {
      throw new Error("Esta actividad no permite modificar el código inicial.");
    }

    if (!allowFileUpload && !fileNamesMatchStarter(starterCode, files)) {
      throw new Error("Esta actividad no permite agregar ni quitar archivos.");
    }
  }

  private async resolveLanguageId(
    activityLanguageId: number,
    allowLanguageChange: boolean,
    requestedLanguageId?: number
  ): Promise<number> {
    if (!allowLanguageChange || requestedLanguageId === undefined) {
      return activityLanguageId;
    }

    const language = await prisma.programmingLanguage.findUnique({
      where: { id: requestedLanguageId },
    });

    if (!language) {
      throw new Error("El lenguaje de programación especificado no existe.");
    }

    return requestedLanguageId;
  }

  async processSubmission(
    activityId: string,
    files: CodeFile[],
    userId?: string,
    requestedLanguageId?: number
  ): Promise<SubmissionResult> {
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

      const rules = resolveActivityRules(activity.rules);

      this.assertSubmissionAllowed(
        rules.allowCodeEdit,
        rules.allowFileUpload,
        parseStarterCode(activity.starterCode),
        files
      );

      const languageId = await this.resolveLanguageId(
        activity.languageId,
        rules.allowLanguageChange,
        requestedLanguageId
      );

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

        await this.enrollmentService.ensureEnrollment(userId, activity.subjectId);
      }

      const evaluationResult = await this.evaluationService.evaluateSubmission(
        languageId,
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
            codeSnapshot: files as unknown as Prisma.InputJsonValue,
            finalGrade: evaluationResult.finalGrade,
            passedTests: evaluationResult.passedTests,
            totalTests: evaluationResult.totalTests,
            executionTimeMs: evaluationResult.executionTimeMs,
            status: evaluationResult.status,
            compilerOutput: evaluationResult.compilerOutput,
          },
        });
      }

      return {
        ...evaluationResult,
        saved: userId !== undefined,
      };
    } catch (error: unknown) {
      if (error instanceof QueueTimeoutError) throw error;
      if (error instanceof Error) {
        if (
          error.message.includes("límite máximo") ||
          error.message.includes("no existe") ||
          error.message.includes("no permite")
        ) {
          throw error;
        }
        throw new Error(`Error al procesar el envío: ${error.message}`);
      }
      throw new Error("Error al procesar el envío: error desconocido");
    }
  }
}
