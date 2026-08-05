import type { ActivityRules } from "../../config/activity-rules.catalog.js";

export interface PublicTestCase {
  id: number;
  isHidden: boolean;
  input?: string;
  expectedOutput?: string;
}

export interface StudentWorkspaceResponse {
  activityId: string;
  title: string;
  description: string | null;
  language: {
    id: number;
    name: string;
    fileExtension: string;
  };
  starterCode: any;
  rules: ActivityRules;
  maxAttempts: number;
  testCases: PublicTestCase[];
}
