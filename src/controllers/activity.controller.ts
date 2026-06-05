import type { Request, Response } from "express";
import type { CreateActivityRequest } from "../types/requests/create-activity-request.model.js";
import type { UpdateActivityRequest } from "../types/requests/update-activity-request.model.js";
import { ActivityService } from "../services/activity.service.js";
import { parseStringParam } from "../helpers/param.helper.js";
import { getPaginationParams } from "../helpers/pagination.helper.js";

const activityService = new ActivityService();

class ActivityController {
  public async create(req: Request, res: Response) {
    try {
      const data: CreateActivityRequest = req.body;
      const userId = (req as any).user as string;

      const newActivity = await activityService.createActivity(userId, data);
      return res.status(201).json(newActivity);
    } catch (error: any) {
      if (error.message.includes("curso no existe") || error.message.includes("lenguaje")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  public async getAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      const { skip, take } = getPaginationParams(req);

      const paginatedActivities = await activityService.getAllActivities(
        userId,
        userRole,
        skip,
        take
      );

      return res.status(200).json(paginatedActivities);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  public async getOne(req: Request, res: Response) {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      if (!activityId) {
        return res.status(400).json({ error: "El ID de la actividad es requerido." });
      }

      const activity = await activityService.getActivityById(activityId, userRole, userId);
      return res.status(200).json(activity);
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;
      const data: UpdateActivityRequest = req.body;

      if (!activityId) {
        return res.status(400).json({ error: "El ID de la actividad es requerido." });
      }

      const updatedActivity = await activityService.updateActivity(
        activityId,
        userRole,
        userId,
        data
      );
      return res.status(200).json(updatedActivity);
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const userId = (req as any).user as string;
      const userRole = (req as any).role;

      if (!activityId) {
        return res.status(400).json({ error: "El ID de la actividad es requerido." });
      }

      await activityService.deleteActivity(activityId, userRole, userId);
      return res.status(204).send();
    } catch (error: any) {
      if (error.message.includes("Actividad no encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  public async getWorkspace(req: Request, res: Response) {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");

      const workspaceData = await activityService.getWorkspaceForStudent(activityId);
      return res.status(200).json(workspaceData);
    } catch (error: any) {
      if (error.message.includes("no existe")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new ActivityController();
