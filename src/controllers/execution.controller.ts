import type { Request, Response } from "express";
import type { RunCodeWithFilesBody } from "../types/requests/run-code-with-files.request.js";
import ExecutionService from "../services/execution.service.js";
import { isBase64 } from "../helpers/base64-validator.helper.js";

class ExecutionController {
  async run(req: Request, res: Response): Promise<Response> {
    const { languageId, code, stdin } = req.body;

    try {
      if (!languageId || !code) {
        return res.status(400).json({ error: "Faltan parámetros: languageId o code" });
      }

      if (!isBase64(code)) {
        return res
          .status(400)
          .json({
            error: "El contenido del código debe estar codificado estrictamente en Base64.",
          });
      }

      if (stdin && !isBase64(stdin)) {
        return res
          .status(400)
          .json({
            error: "El contenido de la entrada debe estar codificado estrictamente en Base64.",
          });
      }

      const output = await ExecutionService.runCode(Number(languageId), code, stdin);

      return res.status(200).json(output);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  public runWithFiles = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { languageId, files, entryPoint, stdin } = req.body as RunCodeWithFilesBody;

      if (!languageId || !files || !entryPoint) {
        return res.status(400).json({
          error: "Faltan campos obligatorios: 'languageId', 'files' y 'entryPoint' son requeridos.",
        });
      }

      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          error: "El campo 'files' debe ser un arreglo no vacío.",
        });
      }

      if (stdin && !isBase64(stdin)) {
        return res
          .status(400)
          .json({
            error: "El contenido de la entrada debe estar codificado estrictamente en Base64.",
          });
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

      const output = await ExecutionService.runCodeWithFiles(languageId, files, entryPoint, stdin);

      return res.status(200).json(output);
    } catch (error: any) {
      if (error.message === "Unsupported language") {
        return res.status(400).json({ success: false, error: error.message });
      }

      console.error("Error crítico durante la ejecución:", error);

      return res.status(500).json({
        success: false,
        error: "Ocurrió un error inesperado al procesar el código.",
        details: error.message,
      });
    }
  };
}

export default new ExecutionController();
