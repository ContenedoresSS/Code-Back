import type { CodeFile } from "../models/execution/code-file.model.js";
import type { ActivityRulesPatch } from "../../config/activity-rules.catalog.js";

export interface CreateActivityRequest {
  subjectId: number;
  languageId: number;
  title: string;
  description?: string;
  starterCode?: CodeFile[];
  maxAttempts?: number;
  rules?: ActivityRulesPatch;
}
