import type { Activity, Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import type { IActivityService } from "./interfaces/activity.service.interface.js";
import type { CreateActivityRequest } from "../types/requests/create-activity-request.model.js";
import type { UpdateActivityRequest } from "../types/requests/update-activity-request.model.js";
import type { ActivityResponse } from "../types/responses/activity-response.model.js";
import type { ActivitySummaryResponse } from "../types/responses/activity-summary-response.model.js";
import type { StudentGradeResponse } from "../types/responses/student-grade-response.model.js";
import type { PaginationData } from "../types/shared/pagination-data.shared.js";
import type {
  StudentWorkspaceResponse,
  PublicTestCase,
} from "../types/responses/student-workspace-response.js";
import { UserRole } from "../types/enums/role.enum.js";
import {
  getDefaultActivityRules,
  mergeActivityRules,
  resolveActivityRules,
} from "../helpers/activity-rules.helper.js";

export class ActivityService implements IActivityService {
  private toActivityResponse(activity: Activity): ActivityResponse {
    return {
      ...activity,
      rules: resolveActivityRules(activity.rules),
    };
  }

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
          rules: mergeActivityRules(getDefaultActivityRules(), data.rules ?? {}),
        },
      });

      return this.toActivityResponse(newActivity);
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
    take: number = 10,
    subjectId?: number
  ): Promise<PaginationData<ActivitySummaryResponse>> {
    try {
      const isAdmin = userRole === UserRole.God;
      const whereClause = {
        ...(isAdmin ? {} : { professorId: userId }),
        ...(subjectId !== undefined ? { subjectId } : {}),
      };

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

      return this.toActivityResponse(activity);
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

      if (data.rules !== undefined) {
        updateData.rules = mergeActivityRules(existingActivity.rules, data.rules);
      }

      if (data.starterCode !== undefined) {
        updateData.starterCode = data.starterCode ? (data.starterCode as any) : null;
      }

      if (data.languageId !== undefined) {
        const language = await prisma.programmingLanguage.findUnique({
          where: { id: data.languageId },
        });

        if (!language) {
          throw new Error("El lenguaje de programación especificado no existe.");
        }

        updateData.languageId = data.languageId;
      }

      if (Object.keys(updateData).length === 0) {
        return existingActivity;
      }

      const updatedActivity = await prisma.activity.update({
        where: { id: activityId },
        data: updateData,
      });

      return this.toActivityResponse(updatedActivity);
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada") || error.message.includes("lenguaje")) {
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

  public async getActivityGrades(
    activityId: string,
    userRole: UserRole,
    userId: string,
    skip: number = 0,
    take: number = 10,
    searchTerm?: string
  ): Promise<PaginationData<StudentGradeResponse>> {
    try {
      const activity = await prisma.activity.findFirst({
        where: { id: activityId },
        include: { subject: { select: { userId: true } } },
      });

      if (!activity) {
        throw new Error("Actividad no encontrada o no tienes permisos para acceder a ella.");
      }

      if (userRole !== UserRole.God && activity.subject.userId !== userId) {
        throw new Error("No tienes permiso para ver las calificaciones de esta actividad.");
      }

      const userWhere: Prisma.UserWhereInput = {
        submissions: { some: { activityId } },
        ...(searchTerm
          ? {
              OR: [
                { name: { contains: searchTerm, mode: "insensitive" } },
                { lastName: { contains: searchTerm, mode: "insensitive" } },
                { email: { contains: searchTerm, mode: "insensitive" } },
                { identifier: { contains: searchTerm, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [students, totalCount] = await prisma.$transaction([
        prisma.user.findMany({
          where: userWhere,
          select: { id: true, name: true, lastName: true, email: true, identifier: true },
          orderBy: [{ lastName: "asc" }, { name: "asc" }],
          skip,
          take,
        }),
        prisma.user.count({ where: userWhere }),
      ]);

      const studentIds = students.map((student) => student.id);

      const [maxGrades, submissions] = await Promise.all([
        prisma.submission.groupBy({
          by: ["studentId"],
          where: { activityId, studentId: { in: studentIds } },
          _max: { finalGrade: true },
        }),
        prisma.submission.findMany({
          where: { activityId, studentId: { in: studentIds } },
          orderBy: { submittedAt: "desc" },
          select: {
            id: true,
            studentId: true,
            finalGrade: true,
            passedTests: true,
            totalTests: true,
            executionTimeMs: true,
            status: true,
            submittedAt: true,
          },
        }),
      ]);

      const maxGradeByStudent = new Map(
        maxGrades.map((group) => [group.studentId, group._max.finalGrade])
      );

      const submissionsByStudent = new Map<string, typeof submissions>();
      for (const submission of submissions) {
        const list = submissionsByStudent.get(submission.studentId) ?? [];
        list.push(submission);
        submissionsByStudent.set(submission.studentId, list);
      }

      const data: StudentGradeResponse[] = students.map((student) => {
        const maxGrade = maxGradeByStudent.get(student.id) ?? null;
        const studentSubmissions = submissionsByStudent.get(student.id) ?? [];

        return {
          student: {
            id: student.id,
            name: student.name,
            lastName: student.lastName,
            email: student.email,
            identifier: student.identifier,
          },
          finalGrade: maxGrade !== null ? Number(maxGrade) : null,
          submissions: studentSubmissions.map((submission) => ({
            id: submission.id,
            finalGrade: submission.finalGrade !== null ? Number(submission.finalGrade) : null,
            passedTests: submission.passedTests,
            totalTests: submission.totalTests,
            executionTimeMs: submission.executionTimeMs,
            status: submission.status,
            submittedAt: submission.submittedAt.toISOString(),
          })),
        };
      });

      return {
        data,
        totalCount,
      };
    } catch (error: any) {
      if (
        error.message.includes("Actividad no encontrada") ||
        error.message.includes("No tienes permiso para ver las calificaciones")
      ) {
        throw error;
      }
      throw new Error(`Error al listar las calificaciones: ${error.message}`);
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
        rules: resolveActivityRules(activity.rules),
        maxAttempts: activity.maxAttempts,
        testCases: secureTestCases,
      };
    } catch (error: any) {
      throw new Error(`Error al cargar el entorno de trabajo: ${error.message}`);
    }
  }
}

export default new ActivityService();
