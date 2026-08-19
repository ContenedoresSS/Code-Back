import type { UserRole } from "../../types/enums/role.enum.js";
import type { CreateSubjectRequest } from "../../types/requests/create-subject-request.model.js";
import type { UpdateSubjectRequest } from "../../types/requests/update-subject-request.model.js";
import type { SubjectResponse } from "../../types/responses/subject-reponse.model.js";
import type { DuplicateSubjectResponse } from "../../types/responses/duplicate-subject-response.model.js";
import type { EnrolledStudentResponse } from "../../types/responses/enrolled-student-response.model.js";
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
   * Obtiene un curso específico. Los profesores solo ven sus propios cursos;
   * el rol God puede acceder a cualquiera.
   */
  getSubjectById(subjectId: number, userRole: UserRole, userId: string): Promise<SubjectResponse>;

  /**
   * Actualiza el nombre de un curso.
   */
  updateSubject(
    subjectId: number,
    userRole: UserRole,
    userId: string,
    data: UpdateSubjectRequest
  ): Promise<SubjectResponse>;

  /**
   * Elimina un curso verificando su pertenencia.
   */
  deleteSubject(subjectId: number, userRole: UserRole, userId: string): Promise<void>;

  /**
   * Obtiene la lista paginada de alumnos inscritos en una materia.
   */
  getStudentsBySubject(
    subjectId: number,
    userRole: UserRole,
    userId: string,
    skip: number,
    take: number,
    searchTerm?: string
  ): Promise<PaginationData<EnrolledStudentResponse>>;

  /**
   * Duplica una materia clonando sus actividades y casos de prueba.
   * No clona inscripciones ni envíos.
   */
  duplicateSubject(
    subjectId: number,
    userRole: UserRole,
    userId: string,
    data: { name?: string }
  ): Promise<DuplicateSubjectResponse>;
}
