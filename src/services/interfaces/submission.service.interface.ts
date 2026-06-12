import type { CodeFile } from "../../types/models/execution/code-file.model.js";
import type { EvaluationResult } from "../../types/responses/evaluation-result.response.js";

export interface ISubmissionService {
  processSubmission(
    activityId: string,
    files: CodeFile[],
    userId?: string
  ): Promise<EvaluationResult>;
}
