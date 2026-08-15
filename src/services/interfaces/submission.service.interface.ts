import type { CodeFile } from "../../types/models/execution/code-file.model.js";
import type { SubmissionResult } from "../../types/responses/submission-result.response.js";

export interface ISubmissionService {
  processSubmission(
    activityId: string,
    files: CodeFile[],
    userId?: string,
    requestedLanguageId?: number
  ): Promise<SubmissionResult>;
}
