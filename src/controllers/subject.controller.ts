import type { Request, Response } from "express";
import type { CreateSubjectRequest } from "../types/requests/create-subject-request.model.js";
import type { UpdateSubjectRequest } from "../types/requests/update-subject-request.model.js";
import { getPaginationParams } from "../helpers/pagination.helper.js";
import { parseIdParam } from "../helpers/param.helper.js";
import subjectService from "../services/subject.service.js";
import type { UserRole } from "../types/enums/role.enum.js";

class SubjectController {
  public async create(req: Request, res: Response) {
    try {
      const data: CreateSubjectRequest = req.body;
      const userId = req.user as string;

      const newSubject = await subjectService.createSubject(userId, data);
      return res.status(201).json(newSubject);
    } catch (error: any) {
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

      const paginatedSubjects = await subjectService.getSubjects(
        userId,
        userRole,
        skip,
        take,
        searchTerm
      );

      return res.status(200).json(paginatedSubjects);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  public async getOne(req: Request, res: Response) {
    try {
      const subjectId = parseIdParam(req.params.id);
      const userId = req.user as string;
      const userRole = (req as any).role as UserRole;

      if (isNaN(subjectId)) {
        return res.status(400).json({ error: "El ID proporcionado no es válido." });
      }

      const subject = await subjectService.getSubjectById(subjectId, userRole, userId);
      return res.status(200).json(subject);
    } catch (error: any) {
      if (error.message.includes("Materia no encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  public async update(req: Request, res: Response) {
    try {
      const subjectId = parseIdParam(req.params.id);
      const userId = req.user as string;
      const userRole = (req as any).role as UserRole;
      const data: UpdateSubjectRequest = req.body;

      if (isNaN(subjectId)) {
        return res.status(400).json({ error: "El ID proporcionado no es válido." });
      }

      const updatedSubject = await subjectService.updateSubject(subjectId, userRole, userId, data);
      return res.status(200).json(updatedSubject);
    } catch (error: any) {
      if (error.message.includes("Materia no encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  public async delete(req: Request, res: Response) {
    try {
      const subjectId = parseIdParam(req.params.id);
      const userId = req.user as string;
      const userRole = (req as any).role as UserRole;

      if (isNaN(subjectId)) {
        return res.status(400).json({ error: "El ID proporcionado no es válido." });
      }

      await subjectService.deleteSubject(subjectId, userRole, userId);

      return res.status(204).send();
    } catch (error: any) {
      if (error.message.includes("Materia no encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  public async getStudents(req: Request, res: Response) {
    try {
      const subjectId = parseIdParam(req.params.id);
      const userId = req.user as string;
      const userRole = (req as any).role as UserRole;

      if (isNaN(subjectId)) {
        return res.status(400).json({ error: "El ID proporcionado no es válido." });
      }

      const { skip, take } = getPaginationParams(req);

      const searchParam = req.query.search;
      const searchTerm = typeof searchParam === "string" ? searchParam.trim() : undefined;

      const paginatedStudents = await subjectService.getStudentsBySubject(
        subjectId,
        userRole,
        userId,
        skip,
        take,
        searchTerm
      );

      return res.status(200).json(paginatedStudents);
    } catch (error: any) {
      if (error.message.includes("Materia no encontrada")) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new SubjectController();
