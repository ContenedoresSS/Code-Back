import type { TestCase } from "@prisma/client";
import type { CodeFile } from "../../types/models/execution/code-file.model.js";
import type { EvaluationResult } from "../../types/responses/evaluation-result.response.js";

export interface IEvaluationService {
  evaluateSubmission(
    languageId: number,
    testCases: TestCase[],
    files: CodeFile[]
  ): Promise<EvaluationResult>;
}
