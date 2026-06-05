import type { Request, Response } from "express";
import type { CreateTestCaseRequest } from "../types/requests/create-test-case-request.model.js";
import type { UpdateTestCaseRequest } from "../types/requests/update-test-case-request.model.js";
import testCaseService from "../services/test-case.service.js";
import { parseStringParam, parseIdParam } from "../helpers/param.helper.js";

class TestCaseController {
  public async create(req: Request, res: Response) {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;
      const data: CreateTestCaseRequest = req.body;

      const newTestCase = await testCaseService.createTestCase(activityId, userRole, userId, data);
      return res.status(201).json(newTestCase);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  public async getAll(req: Request, res: Response) {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      const testCases = await testCaseService.getTestCasesByActivity(activityId, userRole, userId);
      return res.status(200).json(testCases);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const testCaseId = parseIdParam(req.params.testCaseId, "ID del caso de prueba");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;
      const data: UpdateTestCaseRequest = req.body;

      const updatedTestCase = await testCaseService.updateTestCase(
        testCaseId,
        activityId,
        userRole,
        userId,
        data
      );
      return res.status(200).json(updatedTestCase);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const testCaseId = parseIdParam(req.params.testCaseId, "ID del caso de prueba");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      await testCaseService.deleteTestCase(testCaseId, activityId, userRole, userId);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new TestCaseController();
