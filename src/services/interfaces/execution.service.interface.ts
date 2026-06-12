import type { ExecutionResult } from "../../types/responses/execution-result.response.js";
import type { CodeFile } from "../../types/models/execution/code-file.model.js";

export interface IExecutionService {
  runCode(languageId: number, code: string, stdin?: string): Promise<ExecutionResult>;
  runCodeWithFiles(
    languageId: number,
    files: CodeFile[],
    entryPoint: string,
    stdinBase64?: string
  ): Promise<ExecutionResult>;
  pullAndPrepImage(imageName: string): Promise<void>;
}
