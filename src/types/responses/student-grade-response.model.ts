import type { StudentSubmissionResponse } from "./student-submission-response.model.js";

export interface StudentGradeResponse {
  student: {
    id: string;
    name: string;
    lastName: string;
    email: string;
    identifier: string | null;
  };
  finalGrade: number | null;
  submissions: StudentSubmissionResponse[];
}
