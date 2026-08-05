import type { CodeFile } from "../models/execution/code-file.model.js";

export interface UpdateActivityRequest {
  title?: string;
  description?: string;
  languageId?: number;
  starterCode?: CodeFile[];
  maxAttempts?: number;
  allowCopy?: boolean;
  allowPaste?: boolean;
}
