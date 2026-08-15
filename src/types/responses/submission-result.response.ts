import type { EvaluationResult } from "./evaluation-result.response.js";

export interface SubmissionResult extends EvaluationResult {
  /**
   * Indica si el envío se persistió en la base de datos. Es `false` cuando el
   * usuario no está autenticado: el código se evalúa pero no se guarda.
   */
  saved: boolean;
}
