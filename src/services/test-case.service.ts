import prisma from "../config/prisma.js";
import activityService from "./activity.service.js";
import { UserRole } from "../types/enums/role.enum.js";
import type { CreateTestCaseRequest } from "../types/requests/create-test-case-request.model.js";
import type { UpdateTestCaseRequest } from "../types/requests/update-test-case-request.model.js";
import type { TestCaseResponse } from "../types/responses/test-case-response.model.js";
import type { ITestCaseService } from "./interfaces/test-case.service.interface.js";

export class TestCaseService implements ITestCaseService {
  public async createTestCase(
    activityId: string,
    userRole: UserRole,
    userId: string,
    data: CreateTestCaseRequest
  ): Promise<TestCaseResponse> {
    try {
      await activityService.getActivityById(activityId, userRole, userId);

      const newTestCase = await prisma.testCase.create({
        data: {
          activityId,
          input: data.input ?? null,
          expectedOutput: data.expectedOutput,
          isHidden: data.isHidden ?? false,
        },
      });

      return newTestCase;
    } catch (error: any) {
      throw new Error(`Error al crear el caso de prueba: ${error.message}`);
    }
  }

  public async getTestCasesByActivity(
    activityId: string,
    userRole: UserRole,
    userId: string
  ): Promise<TestCaseResponse[]> {
    try {
      await activityService.getActivityById(activityId, userRole, userId);

      const testCases = await prisma.testCase.findMany({
        where: { activityId },
        orderBy: { id: "asc" },
      });

      return testCases;
    } catch (error: any) {
      throw new Error(`Error al obtener los casos de prueba: ${error.message}`);
    }
  }

  public async updateTestCase(
    testCaseId: number,
    activityId: string,
    userRole: UserRole,
    userId: string,
    data: UpdateTestCaseRequest
  ): Promise<TestCaseResponse> {
    try {
      await activityService.getActivityById(activityId, userRole, userId);

      const testCase = await prisma.testCase.findFirst({
        where: { id: testCaseId, activityId },
      });

      if (!testCase) {
        throw new Error("Caso de prueba no encontrado en esta actividad.");
      }

      const updateData: any = {};
      if (data.input !== undefined) updateData.input = data.input ?? null;
      if (data.expectedOutput !== undefined) updateData.expectedOutput = data.expectedOutput;
      if (data.isHidden !== undefined) updateData.isHidden = data.isHidden;

      if (Object.keys(updateData).length === 0) return testCase;

      const updatedTestCase = await prisma.testCase.update({
        where: { id: testCaseId },
        data: updateData,
      });

      return updatedTestCase;
    } catch (error: any) {
      throw new Error(`Error al actualizar el caso de prueba: ${error.message}`);
    }
  }

  public async deleteTestCase(
    testCaseId: number,
    activityId: string,
    userRole: UserRole,
    userId: string
  ): Promise<void> {
    try {
      await activityService.getActivityById(activityId, userRole, userId);

      const testCase = await prisma.testCase.findFirst({
        where: { id: testCaseId, activityId },
      });

      if (!testCase) {
        throw new Error("Caso de prueba no encontrado en esta actividad.");
      }

      await prisma.testCase.delete({
        where: { id: testCaseId },
      });
    } catch (error: any) {
      throw new Error(`Error al eliminar el caso de prueba: ${error.message}`);
    }
  }
}

export default new TestCaseService();
