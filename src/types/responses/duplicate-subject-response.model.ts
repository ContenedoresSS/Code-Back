import type { SubjectResponse } from "./subject-reponse.model.js";

export interface DuplicateSubjectResponse {
  subject: SubjectResponse;
  activitiesCloned: number;
  testCasesCloned: number;
}
