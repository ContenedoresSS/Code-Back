import type { UserRole } from "../../types/enums/role.enum.js";
import type { CreateTestCaseRequest } from "../../types/requests/create-test-case-request.model.js";
import type { UpdateTestCaseRequest } from "../../types/requests/update-test-case-request.model.js";
import type { TestCaseResponse } from "../../types/responses/test-case-response.model.js";

export interface ITestCaseService {
  /**
   * Crea un nuevo caso de prueba para una actividad específica.
   */
  createTestCase(
    activityId: string,
    userRole: UserRole,
    userId: string,
    data: CreateTestCaseRequest
  ): Promise<TestCaseResponse>;

  /**
   * Obtiene todos los casos de prueba asociados a una actividad.
   */
  getTestCasesByActivity(
    activityId: string,
    userRole: UserRole,
    userId: string
  ): Promise<TestCaseResponse[]>;

  /**
   * Actualiza un caso de prueba existente.
   */
  updateTestCase(
    testCaseId: number,
    activityId: string,
    userRole: UserRole,
    userId: string,
    data: UpdateTestCaseRequest
  ): Promise<TestCaseResponse>;

  /**
   * Elimina un caso de prueba.
   */
  deleteTestCase(
    testCaseId: number,
    activityId: string,
    userRole: UserRole,
    userId: string
  ): Promise<void>;
}
