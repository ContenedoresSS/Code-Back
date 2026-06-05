import prisma from "../config/prisma.js";
import type { IActivityService } from "./interfaces/activity.service.interface.js";
import type { CreateActivityRequest } from "../types/requests/create-activity-request.model.js";
import type { UpdateActivityRequest } from "../types/requests/update-activity-request.model.js";
import type { ActivityResponse } from "../types/responses/activity-response.model.js";
import type { ActivitySummaryResponse } from "../types/responses/activity-summary-response.model.js";
import type { PaginationData } from "../types/shared/pagination-data.shared.js";
import type {
  StudentWorkspaceResponse,
  PublicTestCase,
} from "../types/responses/student-workspace-response.js";
import { UserRole } from "../types/enums/role.enum.js";

export class ActivityService implements IActivityService {
  public async createActivity(
    professorId: string,
    data: CreateActivityRequest
  ): Promise<ActivityResponse> {
    try {
      const subject = await prisma.subject.findFirst({
        where: { id: data.subjectId, userId: professorId },
      });

      if (!subject) {
        throw new Error("El curso no existe o no tienes permisos sobre él.");
      }

      const language = await prisma.programmingLanguage.findUnique({
        where: { id: data.languageId },
      });

      if (!language) {
        throw new Error("El lenguaje de programación especificado no existe.");
      }

      const newActivity = await prisma.activity.create({
        data: {
          professorId,
          subjectId: data.subjectId,
          languageId: data.languageId,
          title: data.title,
          description: data.description ?? null,
          starterCode: data.starterCode ? (data.starterCode as any) : null,
          maxAttempts: data.maxAttempts ?? 0,
          allowCopy: data.allowCopy ?? true,
          allowPaste: data.allowPaste ?? true,
        },
      });

      return newActivity as ActivityResponse;
    } catch (error: any) {
      if (error.message.includes("curso no existe") || error.message.includes("lenguaje")) {
        throw error;
      }
      throw new Error(`Error al crear la actividad: ${error.message}`);
    }
  }

  public async getAllActivities(
    userId: string,
    userRole: UserRole,
    skip: number = 0,
    take: number = 10
  ): Promise<PaginationData<ActivitySummaryResponse>> {
    try {
      const isAdmin = userRole === UserRole.God;
      const whereClause = isAdmin ? {} : { professorId: userId };

      const [activities, totalCount] = await prisma.$transaction([
        prisma.activity.findMany({
          where: whereClause,
          select: {
            id: true,
            professorId: true,
            languageId: true,
            subjectId: true,
            title: true,
            description: true,
            createdAt: true,
          },
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.activity.count({
          where: whereClause,
        }),
      ]);

      return {
        data: activities,
        totalCount,
      };
    } catch (error: any) {
      throw new Error(`Error al listar las actividades: ${error.message}`);
    }
  }

  public async getActivityById(
    activityId: string,
    userRole: UserRole,
    userId: string
  ): Promise<ActivityResponse> {
    try {
      const isGod = userRole === UserRole.God;

      const whereClause = isGod ? { id: activityId } : { id: activityId, professorId: userId };

      const activity = await prisma.activity.findFirst({
        where: whereClause,
      });

      if (!activity) {
        throw new Error("Actividad no encontrada o no tienes permisos para acceder a ella.");
      }

      return activity as ActivityResponse;
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada")) {
        throw error;
      }
      throw new Error(`Error al buscar la actividad: ${error.message}`);
    }
  }

  public async updateActivity(
    activityId: string,
    userRole: UserRole,
    userId: string,
    data: UpdateActivityRequest
  ): Promise<ActivityResponse> {
    try {
      const existingActivity = await this.getActivityById(activityId, userRole, userId);

      const updateData: any = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description ?? null;
      if (data.maxAttempts !== undefined) updateData.maxAttempts = data.maxAttempts;
      if (data.allowCopy !== undefined) updateData.allowCopy = data.allowCopy;
      if (data.allowPaste !== undefined) updateData.allowPaste = data.allowPaste;

      if (data.starterCode !== undefined) {
        updateData.starterCode = data.starterCode ? (data.starterCode as any) : null;
      }

      if (Object.keys(updateData).length === 0) {
        return existingActivity;
      }

      const updatedActivity = await prisma.activity.update({
        where: { id: activityId },
        data: updateData,
      });

      return updatedActivity as ActivityResponse;
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada")) {
        throw error;
      }
      throw new Error(`Error al actualizar la actividad: ${error.message}`);
    }
  }

  public async deleteActivity(
    activityId: string,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    try {
      await this.getActivityById(activityId, userRole, userId);

      await prisma.activity.delete({
        where: { id: activityId },
      });
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada")) {
        throw error;
      }
      throw new Error(`Error al eliminar la actividad: ${error.message}`);
    }
  }

  public async getWorkspaceForStudent(activityId: string): Promise<StudentWorkspaceResponse> {
    try {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          language: true,
          testCases: {
            orderBy: { id: "asc" },
          },
        },
      });

      if (!activity) {
        throw new Error("La actividad no existe o no está disponible.");
      }

      const secureTestCases: PublicTestCase[] = activity.testCases.map((tc) => {
        if (tc.isHidden) {
          return {
            id: tc.id,
            isHidden: true,
          };
        }
        const publicTc: PublicTestCase = {
          id: tc.id,
          isHidden: false,
          expectedOutput: tc.expectedOutput,
          ...(tc.input !== null && { input: tc.input }),
        };

        return publicTc;
      });

      return {
        activityId: activity.id,
        title: activity.title,
        description: activity.description,
        language: {
          id: activity.language.id,
          name: activity.language.name,
          fileExtension: activity.language.fileExtension,
        },
        starterCode: activity.starterCode,
        allowCopy: activity.allowCopy,
        allowPaste: activity.allowPaste,
        maxAttempts: activity.maxAttempts,
        testCases: secureTestCases,
      };
    } catch (error: any) {
      throw new Error(`Error al cargar el entorno de trabajo: ${error.message}`);
    }
  }
}

export default new ActivityService();
