export interface SubjectResponse {
  id: number;
  name: string;
  userId: string;
  professor?: {
    name: string;
    lastName: string;
  };
}
