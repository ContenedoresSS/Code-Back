import type { CodeFile } from "../types/models/execution/code-file.model.js";
import { decodedBase64Size } from "./base64-size.helper.js";

export interface ExecutionSizeLimits {
  maxCodeBytes: number;
  maxStdinBytes: number;
}

export interface ExecutionInput {
  code?: string;
  files?: CodeFile[];
  stdin?: string;
}

export function validateExecutionInputSize(
  input: ExecutionInput,
  limits: ExecutionSizeLimits
): string | null {
  if (input.code !== undefined && decodedBase64Size(input.code) > limits.maxCodeBytes) {
    return `El código excede el tamaño máximo permitido (${limits.maxCodeBytes} bytes).`;
  }

  for (const file of input.files ?? []) {
    if (decodedBase64Size(file.content) > limits.maxCodeBytes) {
      return `El archivo '${file.name}' excede el tamaño máximo permitido (${limits.maxCodeBytes} bytes).`;
    }
  }

  if (input.stdin !== undefined && decodedBase64Size(input.stdin) > limits.maxStdinBytes) {
    return `La entrada (stdin) excede el tamaño máximo permitido (${limits.maxStdinBytes} bytes).`;
  }

  return null;
}
