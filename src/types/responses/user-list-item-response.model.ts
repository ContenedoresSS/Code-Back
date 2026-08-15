export interface UserListItemResponse {
  id: string;
  email: string;
  name: string;
  lastName: string;
  identifier: string | null;
  isActive: boolean;
  createdAt: string;
  role: {
    id: number;
    name: string;
  };
}
