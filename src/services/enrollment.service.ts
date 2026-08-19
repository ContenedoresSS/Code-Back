import prisma from "../config/prisma.js";
import { Prisma } from "@prisma/client";
import type { IEnrollmentService } from "./interfaces/enrollment.service.interface.js";
import type { CreateEnrollmentRequest } from "../types/requests/create-enrollment-request.model.js";
import type { EnrollmentResponse } from "../types/responses/enrollment-response.model.js";
import type { PaginationData } from "../types/shared/pagination-data.shared.js";
import { UserRole } from "../types/enums/role.enum.js";

export class EnrollmentService implements IEnrollmentService {
  public async enrollStudent(
    studentId: string,
    data: CreateEnrollmentRequest
  ): Promise<EnrollmentResponse> {
    try {
      const subject = await prisma.subject.findUnique({
        where: { id: data.subjectId },
      });

      if (!subject) {
        throw new Error("La materia no existe.");
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          studentId,
          subjectId: data.subjectId,
        },
      });

      return {
        ...enrollment,
        createdAt: enrollment.createdAt.toISOString(),
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "La materia no existe.") {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("Ya estas inscrito en esta materia.");
      }

      throw new Error(
        `Error al inscribirse: ${error instanceof Error ? error.message : "error desconocido"}`
      );
    }
  }

  public async ensureEnrollment(studentId: string, subjectId: number): Promise<void> {
    await prisma.enrollment.upsert({
      where: { studentId_subjectId: { studentId, subjectId } },
      update: {},
      create: { studentId, subjectId },
    });
  }

  public async getEnrollments(
    userId: string,
    userRole: UserRole,
    skip: number = 0,
    take: number = 10,
    searchTerm?: string
  ): Promise<PaginationData<EnrollmentResponse>> {
    try {
      const isStudent = userRole === UserRole.Student;
      const isTeacher = userRole === UserRole.Teacher;

      const baseInclude = {
        student: {
          select: { name: true, lastName: true, email: true },
        },
        subject: {
          select: { id: true, name: true },
        },
      };

      const whereClause: Prisma.EnrollmentWhereInput = {};

      if (isStudent) {
        whereClause.studentId = userId;
      } else if (isTeacher) {
        whereClause.subject = { userId };
      }

      if (searchTerm) {
        if (isStudent) {
          whereClause.subject = {
            name: { contains: searchTerm, mode: "insensitive" },
          };
        } else if (isTeacher) {
          whereClause.student = {
            OR: [
              { name: { contains: searchTerm, mode: "insensitive" } },
              { lastName: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
            ],
          };
        } else {
          whereClause.OR = [
            { subject: { name: { contains: searchTerm, mode: "insensitive" } } },
            { student: { name: { contains: searchTerm, mode: "insensitive" } } },
            { student: { lastName: { contains: searchTerm, mode: "insensitive" } } },
          ];
        }
      }

      const [enrollments, totalCount] = await prisma.$transaction([
        prisma.enrollment.findMany({
          where: whereClause,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: baseInclude,
        }),
        prisma.enrollment.count({
          where: whereClause,
        }),
      ]);

      const mappedEnrollments: EnrollmentResponse[] = enrollments.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      }));

      return {
        data: mappedEnrollments,
        totalCount,
      };
    } catch (error: unknown) {
      throw new Error(
        `Error al listar inscripciones: ${error instanceof Error ? error.message : "error desconocido"}`
      );
    }
  }

  public async unenroll(enrollmentId: string, userId: string, userRole: UserRole): Promise<void> {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { subject: { select: { userId: true } } },
      });

      if (!enrollment) {
        throw new Error("Inscripcion no encontrada.");
      }

      if (userRole !== UserRole.God) {
        if (userRole === UserRole.Student && enrollment.studentId !== userId) {
          throw new Error("No tienes permiso para eliminar esta inscripcion.");
        }

        if (userRole === UserRole.Teacher && enrollment.subject.userId !== userId) {
          throw new Error("No tienes permiso para eliminar esta inscripcion.");
        }
      }

      await prisma.enrollment.delete({
        where: { id: enrollmentId },
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.message === "No tienes permiso para eliminar esta inscripcion." ||
          error.message === "Inscripcion no encontrada.")
      ) {
        throw error;
      }
      throw new Error(
        `Error al desinscribir: ${error instanceof Error ? error.message : "error desconocido"}`
      );
    }
  }
}

export default new EnrollmentService();
