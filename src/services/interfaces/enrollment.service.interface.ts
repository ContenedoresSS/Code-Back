import type { UserRole } from "../../types/enums/role.enum.js";
import type { CreateEnrollmentRequest } from "../../types/requests/create-enrollment-request.model.js";
import type { EnrollmentResponse } from "../../types/responses/enrollment-response.model.js";
import type { PaginationData } from "../../types/shared/pagination-data.shared.js";

export interface IEnrollmentService {
  enrollStudent(studentId: string, data: CreateEnrollmentRequest): Promise<EnrollmentResponse>;
  getEnrollments(
    userId: string,
    userRole: UserRole,
    skip: number,
    take: number,
    searchTerm?: string
  ): Promise<PaginationData<EnrollmentResponse>>;
  unenroll(enrollmentId: string, userId: string, userRole: UserRole): Promise<void>;
  ensureEnrollment(studentId: string, subjectId: number): Promise<void>;
}
