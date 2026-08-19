import type { CodeFile } from "../models/execution/code-file.model.js";

export interface SubmissionDetailResponse {
  id: string;
  studentId: string;
  activityId: string;
  languageId: number;
  codeSnapshot: CodeFile[];
  finalGrade: number | null;
  passedTests: number;
  totalTests: number;
  executionTimeMs: number | null;
  status: string;
  compilerOutput: string | null;
  submittedAt: string;
}
