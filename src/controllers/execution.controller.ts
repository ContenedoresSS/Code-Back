import type { Request, Response } from "express";
import ExecutionService from "../services/execution.service.js";

class ExecutionController {
  async run(req: Request, res: Response) {
    const { languageId, code } = req.body;

    try {
      if (!languageId || !code) {
        return res.status(400).json({ error: "Faltan parámetros: languageId o code" });
      }

      const output = await ExecutionService.runCode(Number(languageId), code);

      return res.status(200).json({
        success: true,
        output,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new ExecutionController();
