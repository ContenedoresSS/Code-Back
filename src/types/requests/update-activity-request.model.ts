import type { CodeFile } from "../models/execution/code-file.model.js";

export interface UpdateActivityRequest {
  title?: string;
  description?: string;
  starterCode?: CodeFile[];
  maxAttempts?: number;
  allowCopy?: boolean;
  allowPaste?: boolean;
}
