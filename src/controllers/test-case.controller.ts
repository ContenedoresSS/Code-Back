import type { Request, Response } from "express";
import type { CreateTestCaseRequest } from "../types/requests/create-test-case-request.model.js";
import type { UpdateTestCaseRequest } from "../types/requests/update-test-case-request.model.js";
import type { ITestCaseService } from "../services/interfaces/test-case.service.interface.js";
import { parseStringParam, parseIdParam } from "../helpers/param.helper.js";

export class TestCaseController {
  constructor(private readonly testCaseService: ITestCaseService) {}

  public create = async (req: Request, res: Response) => {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;
      const data: CreateTestCaseRequest = req.body;

      const newTestCase = await this.testCaseService.createTestCase(
        activityId,
        userRole,
        userId,
        data
      );
      return res.status(201).json(newTestCase);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };

  public getAll = async (req: Request, res: Response) => {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      const testCases = await this.testCaseService.getTestCasesByActivity(
        activityId,
        userRole,
        userId
      );
      return res.status(200).json(testCases);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };

  public update = async (req: Request, res: Response) => {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const testCaseId = parseIdParam(req.params.testCaseId, "ID del caso de prueba");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;
      const data: UpdateTestCaseRequest = req.body;

      const updatedTestCase = await this.testCaseService.updateTestCase(
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
  };

  public delete = async (req: Request, res: Response) => {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const testCaseId = parseIdParam(req.params.testCaseId, "ID del caso de prueba");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      await this.testCaseService.deleteTestCase(testCaseId, activityId, userRole, userId);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };
}
