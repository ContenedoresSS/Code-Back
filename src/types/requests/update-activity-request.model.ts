import type { CodeFile } from "../models/execution/code-file.model.js";
import type { ActivityRulesPatch } from "../../config/activity-rules.catalog.js";

export interface UpdateActivityRequest {
  title?: string;
  description?: string;
  languageId?: number;
  starterCode?: CodeFile[];
  maxAttempts?: number;
  rules?: ActivityRulesPatch;
}
