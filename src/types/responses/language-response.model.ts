export interface LanguageResponse {
  id: number;
  name: string;
  editorIdentifier: string;
  version: string;
  dockerImage: string;
  executionCommand: string;
  fileExtension: string;
}
