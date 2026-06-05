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
  allowCopy: boolean;
  allowPaste: boolean;
  maxAttempts: number;
  testCases: PublicTestCase[];
}
