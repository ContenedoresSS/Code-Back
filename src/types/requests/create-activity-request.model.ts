import type { CodeFile } from "../models/execution/code-file.model.js";

export interface CreateActivityRequest {
  subjectId: number;
  languageId: number;
  title: string;
  description?: string;
  starterCode?: CodeFile[];
  maxAttempts?: number;
  allowCopy?: boolean;
  allowPaste?: boolean;
}
