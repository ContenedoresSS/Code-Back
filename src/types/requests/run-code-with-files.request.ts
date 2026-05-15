import type { CodeFile } from "../models/execution/code-file.model.js";

export interface RunCodeWithFilesBody {
  languageId: number;
  files: CodeFile[];
  entryPoint: string;
  stdin: string;
}
