export interface UpdateLanguageRequest {
  name?: string;
  editorIdentifier?: string;
  version?: string;
  dockerImage?: string;
  executionCommand?: string;
  fileExtension?: string;
}
