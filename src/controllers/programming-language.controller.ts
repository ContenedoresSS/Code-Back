import type { Request, Response } from "express";
import ProgrammingLanguageService from "../services/programming-language.service.js";
import type { CreateLanguageRequest } from "../types/requests/create-language.request.js";
import type { UpdateLanguageRequest } from "../types/requests/update-language.response.js";

class ProgrammingLanguageController {
  async create(req: Request, res: Response) {
    try {
      const data: CreateLanguageRequest = req.body;
      const newLanguage = await ProgrammingLanguageService.create(data);
      return res.status(201).json(newLanguage);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const languages = await ProgrammingLanguageService.findAll();
      return res.status(200).json(languages);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Invalid or missing ID parameter" });
      }

      const numericId = parseInt(id, 10);
      const language = await ProgrammingLanguageService.findById(numericId);
      return res.status(200).json(language);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Invalid or missing ID parameter" });
      }

      const numericId = parseInt(id, 10);

      const data: UpdateLanguageRequest = req.body;
      const updated = await ProgrammingLanguageService.update(numericId, data);
      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Invalid or missing ID parameter" });
      }

      const numericId = parseInt(id, 10);
      const result = await ProgrammingLanguageService.delete(numericId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new ProgrammingLanguageController();
