import prisma from "../config/prisma.js";
import type { IActivityService } from "./interfaces/activity.service.interface.js";
import type { CreateActivityRequest } from "../types/requests/create-activity-request.model.js";
import type { UpdateActivityRequest } from "../types/requests/update-activity-request.model.js";
import type { ActivityResponse } from "../types/responses/activity-response.model.js";
import type { ActivitySummaryResponse } from "../types/responses/activity-summary-response.model.js";
import type { PaginationData } from "../types/shared/pagination-data.shared.js";
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

  public async getActivityById(activityId: string, professorId: string): Promise<ActivityResponse> {
    try {
      const activity = await prisma.activity.findFirst({
        where: { id: activityId, professorId },
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
    professorId: string,
    data: UpdateActivityRequest
  ): Promise<ActivityResponse> {
    try {
      const existingActivity = await this.getActivityById(activityId, professorId);

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

  public async deleteActivity(activityId: string, professorId: string): Promise<void> {
    try {
      await this.getActivityById(activityId, professorId);

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
}

export default new ActivityService();
