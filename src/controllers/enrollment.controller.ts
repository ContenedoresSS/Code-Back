import type { Request, Response } from "express";
import type { CreateEnrollmentRequest } from "../types/requests/create-enrollment-request.model.js";
import { getPaginationParams } from "../helpers/pagination.helper.js";
import { parseStringParam } from "../helpers/param.helper.js";
import enrollmentService from "../services/enrollment.service.js";
import type { UserRole } from "../types/enums/role.enum.js";

class EnrollmentController {
  public async enroll(req: Request, res: Response) {
    try {
      const data: CreateEnrollmentRequest = req.body;
      const userId = req.user as string;

      const enrollment = await enrollmentService.enrollStudent(userId, data);
      return res.status(201).json(enrollment);
    } catch (error: any) {
      if (error.message === "Ya estas inscrito en esta materia.") {
        return res.status(409).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  public async getAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user as string;
      const userRole = (req as any).role as UserRole;

      const { skip, take } = getPaginationParams(req);

      const searchParam = req.query.search;
      const searchTerm = typeof searchParam === "string" ? searchParam.trim() : undefined;

      const paginatedEnrollments = await enrollmentService.getEnrollments(
        userId,
        userRole,
        skip,
        take,
        searchTerm
      );

      return res.status(200).json(paginatedEnrollments);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const enrollmentId = parseStringParam(req.params.id, "enrollmentId");
      const userId = (req as any).user as string;
      const userRole = (req as any).role as UserRole;

      await enrollmentService.unenroll(enrollmentId, userId, userRole);

      return res.status(204).send();
    } catch (error: any) {
      if (error.message === "Inscripcion no encontrada.") {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === "No tienes permiso para eliminar esta inscripcion.") {
        return res.status(403).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new EnrollmentController();
