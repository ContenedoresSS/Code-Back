import prisma from "../config/prisma.js";
import type { ISubjectService } from "./interfaces/subject.service.interface.js";
import type { CreateSubjectRequest } from "../types/requests/create-subject-request.model.js";
import type { UpdateSubjectRequest } from "../types/requests/update-subject-request.model.js";
import type { SubjectResponse } from "../types/responses/subject-reponse.model.js";
import type { PaginationData } from "../types/shared/pagination-data.shared.js";

export class SubjectService implements ISubjectService {
  public async createSubject(userId: string, data: CreateSubjectRequest): Promise<SubjectResponse> {
    try {
      const newSubject = await prisma.subject.create({
        data: {
          name: data.name,
          userId: userId,
        },
      });

      return newSubject;
    } catch (error: any) {
      throw new Error(`Error al crear el curso: ${error.message}`);
    }
  }

  public async getSubjectsByUser(
    userId: string,
    skip: number = 0,
    take: number = 10
  ): Promise<PaginationData<SubjectResponse>> {
    try {
      const [subjects, totalCount] = await prisma.$transaction([
        prisma.subject.findMany({
          where: { userId },
          skip,
          take,
          orderBy: { id: "desc" },
        }),
        prisma.subject.count({
          where: { userId },
        }),
      ]);

      return {
        data: subjects,
        totalCount,
      };
    } catch (error: any) {
      throw new Error(`Error al obtener la lista de cursos: ${error.message}`);
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

      const updateData: { name?: string } = {};

      if (data.name !== undefined) {
        updateData.name = data.name;
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
}

export default new SubjectService();
