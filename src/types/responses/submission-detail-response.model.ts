import type { CodeFile } from "../models/execution/code-file.model.js";

export interface SubmissionLanguage {
  id: number;
  name: string;
  editorIdentifier: string;
  version: string;
  fileExtension: string;
}

export interface SubmissionDetailResponse {
  id: string;
  studentId: string;
  activityId: string;
  language: SubmissionLanguage;
  codeSnapshot: CodeFile[];
  finalGrade: number | null;
  passedTests: number;
  totalTests: number;
  executionTimeMs: number | null;
  status: string;
  compilerOutput: string | null;
  submittedAt: string;
}
