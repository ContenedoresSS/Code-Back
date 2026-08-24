import type { Request, Response } from "express";
import type { CreateActivityRequest } from "../types/requests/create-activity-request.model.js";
import type { UpdateActivityRequest } from "../types/requests/update-activity-request.model.js";
import type { IActivityService } from "../services/interfaces/activity.service.interface.js";
import { parseStringParam } from "../helpers/param.helper.js";
import { getPaginationParams } from "../helpers/pagination.helper.js";

export class ActivityController {
  constructor(private readonly activityService: IActivityService) {}

  public create = async (req: Request, res: Response) => {
    try {
      const data: CreateActivityRequest = req.body;
      const userId = (req as any).user as string;

      const newActivity = await this.activityService.createActivity(userId, data);
      return res.status(201).json(newActivity);
    } catch (error: any) {
      if (error.message.includes("curso no existe") || error.message.includes("lenguaje")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  };

  public getAll = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      const { skip, take } = getPaginationParams(req);

      const subjectQuery = req.query.subjectId;
      const parsedSubjectId =
        typeof subjectQuery === "string" ? parseInt(subjectQuery, 10) : undefined;
      const subjectId = parsedSubjectId && !isNaN(parsedSubjectId) ? parsedSubjectId : undefined;

      const paginatedActivities = await this.activityService.getAllActivities(
        userId,
        userRole,
        skip,
        take,
        subjectId
      );

      return res.status(200).json(paginatedActivities);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };

  public getOne = async (req: Request, res: Response) => {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      if (!activityId) {
        return res.status(400).json({ error: "El ID de la actividad es requerido." });
      }

      const activity = await this.activityService.getActivityById(activityId, userRole, userId);
      return res.status(200).json(activity);
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  };

  public update = async (req: Request, res: Response) => {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;
      const data: UpdateActivityRequest = req.body;

      if (!activityId) {
        return res.status(400).json({ error: "El ID de la actividad es requerido." });
      }

      const updatedActivity = await this.activityService.updateActivity(
        activityId,
        userRole,
        userId,
        data
      );
      return res.status(200).json(updatedActivity);
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada") || error.message.includes("lenguaje")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  };

  public delete = async (req: Request, res: Response) => {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      if (!activityId) {
        return res.status(400).json({ error: "El ID de la actividad es requerido." });
      }

      await this.activityService.deleteActivity(activityId, userRole, userId);
      return res.status(204).send();
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  };

  public getGrades = async (req: Request, res: Response) => {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      const { skip, take } = getPaginationParams(req);

      const searchParam = req.query.search;
      const searchTerm = typeof searchParam === "string" ? searchParam.trim() : undefined;

      const paginatedGrades = await this.activityService.getActivityGrades(
        activityId,
        userRole,
        userId,
        skip,
        take,
        searchTerm
      );

      return res.status(200).json(paginatedGrades);
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes("No tienes permiso para ver las calificaciones")) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  };

  public getSubmissionDetail = async (req: Request, res: Response) => {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const submissionId = parseStringParam(req.params.submissionId, "ID del envío");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      const detail = await this.activityService.getSubmissionDetail(
        activityId,
        submissionId,
        userRole,
        userId
      );

      return res.status(200).json(detail);
    } catch (error: any) {
      if (
        error.message.includes("Actividad no encontrada") ||
        error.message.includes("Envío no encontrado")
      ) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes("No tienes permiso para ver este envío")) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  };

  public getWorkspace = async (req: Request, res: Response) => {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");

      const workspaceData = await this.activityService.getWorkspaceForStudent(activityId);
      return res.status(200).json(workspaceData);
    } catch (error: any) {
      if (error.message.includes("no existe")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  };
}
