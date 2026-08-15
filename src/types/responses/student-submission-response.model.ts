export interface StudentSubmissionResponse {
  id: string;
  finalGrade: number | null;
  passedTests: number;
  totalTests: number;
  executionTimeMs: number | null;
  status: string;
  submittedAt: string;
}
