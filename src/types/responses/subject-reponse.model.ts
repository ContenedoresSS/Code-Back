export interface SubjectResponse {
  id: number;
  name: string;
  userId: string;
  imageUrl?: string | null;
  professor?: {
    name: string;
    lastName: string;
  };
}
