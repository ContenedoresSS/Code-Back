import type { Request, Response } from "express";
import ExecutionService from "../services/execution.service.js";
import type { RunCodeWithFilesBody } from "../types/requests/run-code-with-files.request.js";

class ExecutionController {
  async run(req: Request, res: Response) {
    const { languageId, code, stdin } = req.body;

    try {
      if (!languageId || !code) {
        return res.status(400).json({ error: "Faltan parámetros: languageId o code" });
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

  public runWithFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { languageId, files, entryPoint, stdin } = req.body as RunCodeWithFilesBody;

      if (!languageId || !files || !entryPoint) {
        res.status(400).json({
          error: "Faltan campos obligatorios: 'languageId', 'files' y 'entryPoint' son requeridos.",
        });
        return;
      }

      if (!Array.isArray(files) || files.length === 0) {
        res.status(400).json({
          error: "El campo 'files' debe ser un arreglo no vacío.",
        });
        return;
      }

      const output = await ExecutionService.runCodeWithFiles(languageId, files, entryPoint, stdin);

      res.status(200).json(output);
    } catch (error: any) {
      if (error.message === "Unsupported language") {
        res.status(400).json({ success: false, error: error.message });
        return;
      }

      console.error("Error crítico durante la ejecución:", error);

      res.status(500).json({
        success: false,
        error: "Ocurrió un error inesperado al procesar el código.",
        details: error.message,
      });
    }
  };
}

export default new ExecutionController();
