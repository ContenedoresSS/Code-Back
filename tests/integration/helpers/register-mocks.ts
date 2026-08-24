import { vi } from "vitest";
import { asValue } from "awilix";
import { container } from "../../../src/config/container.js";

export const mockAuthService = {
  register: vi.fn(),
  login: vi.fn(),
  refreshAccessToken: vi.fn(),
  forgotPassword: vi.fn(),
  verifyResetCode: vi.fn(),
  resetPassword: vi.fn(),
};

export const mockActivityService = {
  createActivity: vi.fn(),
  getActivityById: vi.fn(),
  getAllActivities: vi.fn(),
  updateActivity: vi.fn(),
  deleteActivity: vi.fn(),
  getWorkspaceForStudent: vi.fn(),
  getActivityGrades: vi.fn(),
  getSubmissionDetail: vi.fn(),
};

export const mockEnrollmentService = {
  enrollStudent: vi.fn(),
  getEnrollments: vi.fn(),
  unenroll: vi.fn(),
  ensureEnrollment: vi.fn(),
};

export const mockSettingService = {
  getAllowedEmailDomains: vi.fn(),
  setAllowedEmailDomains: vi.fn(),
};

export const mockSubjectService = {
  createSubject: vi.fn(),
  getSubjects: vi.fn(),
  getSubjectById: vi.fn(),
  updateSubject: vi.fn(),
  deleteSubject: vi.fn(),
  getStudentsBySubject: vi.fn(),
  duplicateSubject: vi.fn(),
};

export const mockSubmissionService = {
  processSubmission: vi.fn(),
};

export const mockUserService = {
  create: vi.fn(),
  findByAnyIdentifierAndRole: vi.fn(),
  findByIdWithRole: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  getPasswordHash: vi.fn(),
  findByEmail: vi.fn(),
  saveResetCode: vi.fn(),
  clearResetCode: vi.fn(),
  listUsers: vi.fn(),
  updateUserByAdmin: vi.fn(),
};

container.register({
  authService: asValue(mockAuthService as never),
  activityService: asValue(mockActivityService as never),
  enrollmentService: asValue(mockEnrollmentService as never),
  settingService: asValue(mockSettingService as never),
  subjectService: asValue(mockSubjectService as never),
  submissionService: asValue(mockSubmissionService as never),
  userService: asValue(mockUserService as never),
});
