import { SubmissionStatus } from "../enums/submission-status.enum.js";

export interface EvaluationResult {
  status: SubmissionStatus;
  finalGrade: number;
  passedTests: number;
  totalTests: number;
  executionTimeMs: number;
  compilerOutput: string | null;
  languageId: number;
}
