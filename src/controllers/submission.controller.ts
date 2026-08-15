import type { Request, Response } from "express";
import type { CodeFile } from "../types/models/execution/code-file.model.js";
import submissionService from "../services/submission.service.js";
import { parseStringParam } from "../helpers/param.helper.js";
import { isBase64 } from "../helpers/base64-validator.helper.js";
import { QueueTimeoutError } from "../helpers/concurrency-limiter.helper.js";

class SubmissionController {
  public async submit(req: Request, res: Response) {
    try {
      const activityId = parseStringParam(req.params.id, "ID de la actividad");
      const files: CodeFile[] = req.body.files;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          error:
            "El campo 'files' es requerido y debe ser un arreglo válido con el código a evaluar.",
        });
      }

      const userId = (req as any).user as string | undefined;

      const rawLanguageId: unknown = req.body.languageId;
      let requestedLanguageId: number | undefined;

      if (rawLanguageId !== undefined && rawLanguageId !== null) {
        const parsed = Number(rawLanguageId);

        if (!Number.isInteger(parsed) || parsed <= 0) {
          return res.status(400).json({
            error: "El campo 'languageId' debe ser un entero positivo.",
          });
        }

        requestedLanguageId = parsed;
      }

      for (const file of files) {
        if (!file.name || !file.content) {
          return res.status(400).json({ error: "Cada archivo debe incluir 'name' y 'content'." });
        }
        if (!isBase64(file.content)) {
          return res.status(400).json({
            error: `El contenido del archivo '${file.name}' debe estar codificado estrictamente en Base64.`,
          });
        }
      }

      const result = await submissionService.processSubmission(
        activityId,
        files,
        userId,
        requestedLanguageId
      );

      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof QueueTimeoutError) {
        return res.status(429).json({ error: error.message });
      }

      if (error.message.includes("no existe")) {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes("límite máximo") || error.message.includes("no permite")) {
        return res.status(403).json({ error: error.message });
      }

      return res.status(400).json({ error: error.message });
    }
  }
}

export default new SubmissionController();
