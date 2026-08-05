import prisma from "../config/prisma.js";
import type { ISubjectService } from "./interfaces/subject.service.interface.js";
import type { CreateSubjectRequest } from "../types/requests/create-subject-request.model.js";
import type { UpdateSubjectRequest } from "../types/requests/update-subject-request.model.js";
import type { SubjectResponse } from "../types/responses/subject-reponse.model.js";
import type { EnrolledStudentResponse } from "../types/responses/enrolled-student-response.model.js";
import type { PaginationData } from "../types/shared/pagination-data.shared.js";
import { UserRole } from "../types/enums/role.enum.js";

export class SubjectService implements ISubjectService {
  public async createSubject(userId: string, data: CreateSubjectRequest): Promise<SubjectResponse> {
    try {
      const newSubject = await prisma.subject.create({
        data: {
          name: data.name,
          userId: userId,
          imageUrl: data.imageUrl ?? null,
        },
      });

      return newSubject;
    } catch (error: any) {
      throw new Error(`Error al crear el curso: ${error.message}`);
    }
  }

  public async getSubjects(
    userId: string,
    userRole: UserRole,
    skip: number = 0,
    take: number = 10,
    searchTerm?: string
  ): Promise<PaginationData<SubjectResponse>> {
    try {
      const isTeacher = userRole === UserRole.Teacher;

      const whereClause: any = {
        ...(isTeacher ? { userId } : {}),
        ...(searchTerm ? { name: { contains: searchTerm, mode: "insensitive" } } : {}),
      };

      const [subjects, totalCount] = await prisma.$transaction([
        prisma.subject.findMany({
          where: whereClause,
          skip,
          take,
          orderBy: { id: "desc" },
          include: {
            professor: {
              select: { name: true, lastName: true },
            },
          },
        }),
        prisma.subject.count({
          where: whereClause,
        }),
      ]);

      return {
        data: subjects,
        totalCount,
      };
    } catch (error: any) {
      throw new Error(`Error al listar los cursos: ${error.message}`);
    }
  }

  public async getSubjectById(subjectId: number, userId: string): Promise<SubjectResponse> {
    try {
      const subject = await prisma.subject.findFirst({
        where: {
          id: subjectId,
          userId: userId,
        },
      });

      if (!subject) {
        throw new Error("Materia no encontrada o no tienes permisos para acceder a ella.");
      }

      return subject;
    } catch (error: any) {
      if (error.message.includes("Materia no encontrada")) {
        throw error;
      }
      throw new Error(`Error al buscar el curso: ${error.message}`);
    }
  }

  public async updateSubject(
    subjectId: number,
    userId: string,
    data: UpdateSubjectRequest
  ): Promise<SubjectResponse> {
    try {
      const existingSubject = await this.getSubjectById(subjectId, userId);

      const updateData: { name?: string; imageUrl?: string | null } = {};

      if (data.name !== undefined) {
        updateData.name = data.name;
      }

      if (data.imageUrl !== undefined) {
        updateData.imageUrl = data.imageUrl;
      }

      if (Object.keys(updateData).length === 0) {
        return existingSubject;
      }

      const updatedSubject = await prisma.subject.update({
        where: { id: subjectId },
        data: updateData,
      });

      return updatedSubject;
    } catch (error: any) {
      if (error.message.includes("Materia no encontrada")) {
        throw error;
      }
      throw new Error(`Error al actualizar el curso: ${error.message}`);
    }
  }

  public async deleteSubject(subjectId: number, userId: string): Promise<void> {
    try {
      await this.getSubjectById(subjectId, userId);

      await prisma.subject.delete({
        where: { id: subjectId },
      });
    } catch (error: any) {
      if (error.message.includes("Materia no encontrada")) {
        throw error;
      }
      throw new Error(`Error al eliminar el curso: ${error.message}`);
    }
  }

  public async getStudentsBySubject(
    subjectId: number,
    userId: string,
    skip: number = 0,
    take: number = 10,
    searchTerm?: string
  ): Promise<PaginationData<EnrolledStudentResponse>> {
    try {
      await this.getSubjectById(subjectId, userId);

      const enrollmentWhere: any = { subjectId };

      if (searchTerm) {
        enrollmentWhere.student = {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { lastName: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
          ],
        };
      }

      const [enrollments, totalCount] = await prisma.$transaction([
        prisma.enrollment.findMany({
          where: enrollmentWhere,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                identifier: true,
              },
            },
          },
        }),
        prisma.enrollment.count({
          where: enrollmentWhere,
        }),
      ]);

      const students: EnrolledStudentResponse[] = enrollments.map((e) => ({
        id: e.student.id,
        name: e.student.name,
        lastName: e.student.lastName,
        email: e.student.email,
        identifier: e.student.identifier,
        enrolledAt: e.createdAt.toISOString(),
      }));

      return {
        data: students,
        totalCount,
      };
    } catch (error: any) {
      if (error.message.includes("Materia no encontrada")) {
        throw error;
      }
      throw new Error(`Error al listar alumnos: ${error.message}`);
    }
  }
}

export default new SubjectService();
