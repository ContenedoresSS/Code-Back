import type { Request, Response } from "express";
import type { IProgrammingLanguageService } from "../services/interfaces/programming-language.service.interface.js";
import type { CreateLanguageRequest } from "../types/requests/create-language.request.js";
import type { UpdateLanguageRequest } from "../types/requests/update-language.response.js";

export class ProgrammingLanguageController {
  constructor(private readonly programmingLanguageService: IProgrammingLanguageService) {}

  create = async (req: Request, res: Response) => {
    try {
      const data: CreateLanguageRequest = req.body;
      const newLanguage = await this.programmingLanguageService.create(data);
      return res.status(201).json(newLanguage);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const languages = await this.programmingLanguageService.findAll();
      return res.status(200).json(languages);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Invalid or missing ID parameter" });
      }

      const numericId = parseInt(id, 10);
      const language = await this.programmingLanguageService.findById(numericId);
      return res.status(200).json(language);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Invalid or missing ID parameter" });
      }

      const numericId = parseInt(id, 10);

      const data: UpdateLanguageRequest = req.body;
      const updated = await this.programmingLanguageService.update(numericId, data);
      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Invalid or missing ID parameter" });
      }

      const numericId = parseInt(id, 10);
      const result = await this.programmingLanguageService.delete(numericId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };
}
