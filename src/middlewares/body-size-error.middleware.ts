import type { Request, Response, NextFunction } from "express";

interface BodyParserError {
  type?: string;
  status?: number;
  statusCode?: number;
}

function isPayloadTooLargeError(error: unknown): error is BodyParserError {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as Record<string, unknown>;
  return (
    candidate.type === "entity.too.large" ||
    candidate.status === 413 ||
    candidate.statusCode === 413
  );
}

export function payloadTooLargeErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (isPayloadTooLargeError(error)) {
    res.status(413).json({ error: "El cuerpo de la solicitud excede el tamaño máximo permitido." });
    return;
  }

  next(error);
}
