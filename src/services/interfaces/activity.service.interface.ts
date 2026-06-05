import type { CreateActivityRequest } from "../../types/requests/create-activity-request.model.js";
import type { UpdateActivityRequest } from "../../types/requests/update-activity-request.model.js";
import type { ActivityResponse } from "../../types/responses/activity-response.model.js";
import type { ActivitySummaryResponse } from "../../types/responses/activity-summary-response.model.js";
import type { PaginationData } from "../../types/shared/pagination-data.shared.js";
import type { StudentWorkspaceResponse } from "../../types/responses/student-workspace-response.js";
import { UserRole } from "../../types/enums/role.enum.js";

export interface IActivityService {
  createActivity(professorId: string, data: CreateActivityRequest): Promise<ActivityResponse>;
  getActivityById(
    activityId: string,
    userRole: UserRole,
    userId: string
  ): Promise<ActivityResponse>;
  getAllActivities(
    userId: string,
    userRole: UserRole,
    skip: number,
    take: number
  ): Promise<PaginationData<ActivitySummaryResponse>>;
  updateActivity(
    activityId: string,
    userRole: UserRole,
    userId: string,
    data: UpdateActivityRequest
  ): Promise<ActivityResponse>;
  deleteActivity(activityId: string, userRole: UserRole, userId: string): Promise<void>;
  getWorkspaceForStudent(activityId: string): Promise<StudentWorkspaceResponse>;
}
