import type { ActivityRules } from "../../config/activity-rules.catalog.js";

export interface ActivityResponse {
  id: string;
  professorId: string;
  subjectId: number;
  languageId: number;
  title: string;
  description: string | null;
  starterCode: any | null;
  maxAttempts: number;
  rules: ActivityRules;
  createdAt: Date;
}
