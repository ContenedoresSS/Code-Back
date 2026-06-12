import type { UserRole } from "../../types/enums/role.enum.js";
import type { CreateSubjectRequest } from "../../types/requests/create-subject-request.model.js";
import type { UpdateSubjectRequest } from "../../types/requests/update-subject-request.model.js";
import type { SubjectResponse } from "../../types/responses/subject-reponse.model.js";
import type { PaginationData } from "../../types/shared/pagination-data.shared.js";

export interface ISubjectService {
  /**
   * Crea un nuevo curso asociado al profesor.
   */
  createSubject(userId: string, data: CreateSubjectRequest): Promise<SubjectResponse>;

  /**
   * Obtiene la lista paginada de cursos
   */
  getSubjects(
    userId: string,
    userRole: UserRole,
    skip: number,
    take: number,
    searchTerm?: string
  ): Promise<PaginationData<SubjectResponse>>;

  /**
   * Obtiene un curso específico, validando que pertenezca al usuario.
   */
  getSubjectById(subjectId: number, userId: string): Promise<SubjectResponse>;

  /**
   * Actualiza el nombre de un curso.
   */
  updateSubject(
    subjectId: number,
    userId: string,
    data: UpdateSubjectRequest
  ): Promise<SubjectResponse>;

  /**
   * Elimina un curso verificando su pertenencia.
   */
  deleteSubject(subjectId: number, userId: string): Promise<void>;
}
