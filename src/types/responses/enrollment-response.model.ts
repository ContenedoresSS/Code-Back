export interface EnrollmentResponse {
  id: string;
  studentId: string;
  subjectId: number;
  createdAt: string;
  student?: {
    name: string;
    lastName: string;
    email: string;
  };
  subject?: {
    id: number;
    name: string;
  };
}
